import type {SessionSourceResult, SessionSummary} from '@/features/sessions/types/session';
import {mockSessions} from './mockSessions';

declare global {
  interface Window {
    coPivot?: {
      listSessions: () => Promise<SessionSummary[]>;
    };
  }
}

export async function loadSessions(): Promise<SessionSourceResult> {
  if (!window.coPivot) {
    return {
      mode: 'mock',
      sessions: mockSessions,
    };
  }

  try {
    const sessions = await window.coPivot.listSessions();

    return {
      mode: sessions.length > 0 ? 'local' : 'mock',
      sessions: sessions.length > 0 ? sessions : mockSessions,
    };
  } catch {
    return {
      mode: 'mock',
      sessions: mockSessions,
    };
  }
}
