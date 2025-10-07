export type SseEnvelope<T = any> = {
  type: string;
  timestamp: string;
  correlationId: string;
  eventId?: string | null;
  data: T;
};

export function parseSseEvent<T = any>(raw: MessageEvent): SseEnvelope<T> | null {
  try {
    const obj = JSON.parse(raw.data);
    if (!obj || typeof obj !== 'object') return null;
    if (typeof obj.type !== 'string') return null;
    if (typeof obj.timestamp !== 'string') return null;
    if (typeof obj.correlationId !== 'string') return null;
    if (!('data' in obj)) return null;
    return obj as SseEnvelope<T>;
  } catch {
    return null;
  }
}

