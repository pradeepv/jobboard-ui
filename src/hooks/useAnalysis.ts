"use client";

import { useCallback, useRef, useState } from "react";
import { parseErrorResponse } from "../utils/api";
import { parseSseEvent } from "../utils/sse";

// Define the structure of the timeline events
export interface AnalysisEvent {
  kind: string;
  stage: string;
  message?: string;
  timestamp: string;
  [key: string]: any;
}

// Define the structure for parsed job details
export interface JobDetails {
  url: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  requirements?: string[];
  techStack?: string[];
}

// Define the structure for AI analysis results
export interface AiResults {
  companyInfo?: string;
  salaryRange?: string;
  roleDescription?: string;
  roleDuties?: string[];
  requirements?: string[];
  techStack?: string[];
  leadershipRole?: boolean;
  softSkills?: string[];
  experienceLevel?: string;
}

export function useAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [aiResults, setAiResults] = useState<AiResults | null>(null);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const sawCompleteRef = useRef(false);

  const startAnalysis = useCallback(async (jobUrl: string) => {
    if (!jobUrl) {
      setAnalysisError("No job URL provided");
      return;
    }

    try {
      setAnalyzing(true);
      setAnalysisError(null);
      setEvents([]);
      setJobDetails(null);
      setAiResults(null);
      setAnalysisCompleted(false);

      console.debug('[useAnalysis] POST /api/analysis/url', { jobUrl });
      const response = await fetch('/api/analysis/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobUrl }),
      });

      if (!response.ok) {
        const env = await parseErrorResponse(response);
        throw new Error(env ? `${env.code}: ${env.message}` : `Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      console.debug('[useAnalysis] analysis start result', result);
      
      if (result.sseUrl) {
        // In dev, proxies may drop SSE; log absolute URL consideration without changing behavior.
        const sseUrl: string = result.sseUrl;
        console.debug('[useAnalysis] opening SSE at', sseUrl);
        const eventSource = new EventSource(sseUrl);
        
        const handleEvent = (event: MessageEvent) => {
          try {
            const parsed = parseSseEvent<any>(event);
            if (!parsed) return;
            const outerType = parsed.type; // e.g., 'analysis'
            const data = parsed.data;
            const innerKind = data?.kind;  // e.g., 'parsingComplete', 'aiAnalysisComplete'
            const effectiveKind = innerKind || outerType;
            const evt: AnalysisEvent = { kind: effectiveKind, stage: data?.stage || effectiveKind, timestamp: parsed.timestamp, ...data };
            setEvents(prevEvents => [...prevEvents, evt]);
            console.debug('[useAnalysis] SSE event', { outerType, innerKind, effectiveKind, parsed });

            if (effectiveKind === 'parsingComplete' && data?.jobDetails) {
              setJobDetails(data.jobDetails);
            } else if (effectiveKind === 'aiAnalysisComplete' && data?.aiResults) {
              setAiResults(data.aiResults);
            } else if (effectiveKind === 'analysisComplete') {
              sawCompleteRef.current = true;
              setAnalyzing(false);
              setAnalysisCompleted(true);
              console.debug('[useAnalysis] analysisComplete, closing SSE');
              eventSource.close();
            } else if (effectiveKind === 'error') {
              setAnalysisError(data?.message || 'An unknown error occurred during analysis');
              setAnalyzing(false);
              console.debug('[useAnalysis] analysis error event, closing SSE');
              eventSource.close();
            }
          } catch (e) {
            console.warn('Failed to parse analysis event:', e);
          }
        };

        eventSource.addEventListener('analysis', handleEvent);
        eventSource.addEventListener('message', handleEvent);
        eventSource.addEventListener('open', () => {
          console.debug('[useAnalysis] SSE connection opened');
        });
        
        eventSource.addEventListener('error', (event) => {
          console.error('Analysis SSE error:', event);
          if (!sawCompleteRef.current) {
            setAnalysisError('Connection error during analysis');
          } else {
            console.debug('[useAnalysis] SSE closed after completion');
          }
          setAnalyzing(false);
          eventSource.close();
        });
        
      } else {
        throw new Error("SSE URL not provided in analysis response");
      }
      
    } catch (error: any) {
      console.error('[useAnalysis] startAnalysis failed', error);
      setAnalysisError(error?.message || String(error));
      setAnalyzing(false);
    }
  }, []);

  return {
    analyzing,
    analysisError,
    events,
    jobDetails,
    aiResults,
    analysisCompleted,
    startAnalysis,
  };
}
