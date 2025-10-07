export type ErrorEnvelope = {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  correlationId?: string | null;
  cause?: string | null;
};

export function isErrorEnvelope(x: any): x is ErrorEnvelope {
  return x && typeof x === 'object' && typeof x.code === 'string' && typeof x.message === 'string';
}

export async function parseErrorResponse(res: Response): Promise<ErrorEnvelope | null> {
  try {
    const txt = await res.text();
    try {
      const json = JSON.parse(txt);
      if (isErrorEnvelope(json)) return json;
      return {
        code: `HTTP_${res.status}`,
        message: json?.message || res.statusText || 'Request failed',
        details: json,
        correlationId: res.headers.get('X-Correlation-Id'),
      };
    } catch {
      return {
        code: `HTTP_${res.status}`,
        message: txt || res.statusText || 'Request failed',
        details: null,
        correlationId: res.headers.get('X-Correlation-Id'),
      };
    }
  } catch {
    return null;
  }
}

export function formatErrorMessage(e: ErrorEnvelope | null | undefined): string {
  if (!e) return 'Unexpected error';
  return e.code ? `${e.code}: ${e.message}` : e.message;
}

