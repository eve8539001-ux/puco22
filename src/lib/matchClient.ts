export interface MatchResultItem {
  code: string;
  reason: string;
}

export interface MatchResult {
  summary: string;
  activationSummary: string;
  missingIntent: boolean;
  intentNote: string;
  sensorGroups: {
    tof: boolean;
    camera: boolean;
  };
  SN: MatchResultItem[];
  MP: MatchResultItem[];
  PJ: MatchResultItem[];
  SP: MatchResultItem[];
}

/**
 * Client wrapper to call the /api/match serverless function.
 * This ensures the API key is never exposed to the frontend, 
 * as the frontend only communicates with this endpoint.
 */
export async function fetchMatch(scenario: string): Promise<MatchResult> {
  const response = await fetch('/api/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scenario }),
  });

  if (!response.ok) {
    let errorData = { error: '' };
    try {
      errorData = await response.json();
    } catch (e) {
      // Ignore parse error
    }
    throw new Error(errorData.error || `Failed to fetch match: ${response.statusText}`);
  }

  return response.json();
}
