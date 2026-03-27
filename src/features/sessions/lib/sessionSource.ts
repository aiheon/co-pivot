import type {SessionSourceResult, SessionSummary} from '@/features/sessions/types/session';
import {mockSessions} from './mockSessions';

export async function loadSessions(): Promise<SessionSourceResult> {
  if (!isTauriRuntime()) {
    return {
      mode: 'mock',
      sessions: mockSessions,
    };
  }

  try {
    const {invoke} = await import('@tauri-apps/api/core');
    const sessions = await invoke<SessionSummary[]>('list_sessions');

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

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
