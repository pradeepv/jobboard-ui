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
            experience: "5 years",
            skills: ["React", "TypeScript", "Node.js", "Python"],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setAnalysisResults(result);
    } catch (error: any) {
      setAnalysisError(error?.message || String(error));
    } finally {
      setAnalyzing(false);
    }
  }, []);

  return {
    analyzing,
    analysisError,
    analysisResults,
    startAnalysis,
  };
}
