import type {SessionSourceResult} from '@/features/sessions/types/session';
import {mockSessions} from './mockSessions';

export async function loadSessions(): Promise<SessionSourceResult> {
  try {
    return {
      mode: 'local',
      sessions: [],
    };
  } catch {
    return {
      mode: 'mock',
      sessions: mockSessions,
    };
  }
}
