"use client";

import { useCallback, useState } from "react";

export interface AnalysisResult {
  resume: string;
  coverLetter: string;
  atsScore: number;
  insights: string[];
}

export function useAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);

  const startAnalysis = useCallback(async (jobIds: string[]) => {
    if (jobIds.length === 0) {
      setAnalysisError("No jobs selected");
      return;
    }

    try {
      setAnalyzing(true);
      setAnalysisError(null);
      setAnalysisResults(null);

      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobIds,
          userProfile: {
            name: "Demo User",
            experience: "5 years experience with React, TypeScript, Node.js, and Python",
            skills: ["React", "TypeScript", "Node.js", "Python"],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Start SSE connection to get real-time updates
      if (result.sseUrl) {
        const eventSource = new EventSource(result.sseUrl);
        
        eventSource.addEventListener('analysis', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Analysis event:', data);
            
            if (data.kind === 'analysisComplete' && data.results) {
              setAnalysisResults(data.results);
              setAnalyzing(false);
              eventSource.close();
            } else if (data.kind === 'analysisError') {
              setAnalysisError(data.error || 'Analysis failed');
              setAnalyzing(false);
              eventSource.close();
            }
            // Handle other progress events if needed
          } catch (e) {
            console.warn('Failed to parse analysis event:', e);
          }
        });
        
        eventSource.addEventListener('error', (event) => {
          console.error('Analysis SSE error:', event);
          setAnalysisError('Connection error during analysis');
          setAnalyzing(false);
          eventSource.close();
        });
        
        // Cleanup after 5 minutes
        setTimeout(() => {
          if (eventSource.readyState === EventSource.OPEN) {
            eventSource.close();
            if (analyzing) {
              setAnalysisError('Analysis timed out');
              setAnalyzing(false);
            }
          }
        }, 5 * 60 * 1000);
        
      } else {
        // Fallback to direct result if no SSE URL
        setAnalysisResults(result);
        setAnalyzing(false);
      }
      
    } catch (error: any) {
      setAnalysisError(error?.message || String(error));
      setAnalyzing(false);
    }
  }, [analyzing]);

  return {
    analyzing,
    analysisError,
    analysisResults,
    startAnalysis,
  };
}
