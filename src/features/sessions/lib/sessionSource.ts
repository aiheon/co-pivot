import type {SessionSourceResult, SessionSummary} from '@/features/sessions/types/session';
import {mockSessions} from './mockSessions';

export type PreferredTerminal = 'iterm' | 'terminal';

declare global {
  interface Window {
    coPivot?: {
      listSessions: () => Promise<SessionSummary[]>;
      openPath: (targetPath: string) => Promise<string>;
      resumeSession: (sessionId: string, terminal: PreferredTerminal) => Promise<{ok: boolean}>;
      getPreferredTerminal: () => Promise<PreferredTerminal>;
      setPreferredTerminal: (terminal: PreferredTerminal) => Promise<PreferredTerminal>;
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

export async function resumeSession(sessionId: string, terminal: PreferredTerminal) {
  if (!window.coPivot) {
    throw new Error('Resume is only available in the Electron app.');
  }

  return window.coPivot.resumeSession(sessionId, terminal);
}

export async function getPreferredTerminal(): Promise<PreferredTerminal> {
  if (!window.coPivot) {
    return 'iterm';
  }

  try {
    return await window.coPivot.getPreferredTerminal();
  } catch {
    return 'iterm';
  }
}

export async function setPreferredTerminal(terminal: PreferredTerminal): Promise<PreferredTerminal> {
  if (!window.coPivot) {
    return terminal;
  }

  return window.coPivot.setPreferredTerminal(terminal);
}
