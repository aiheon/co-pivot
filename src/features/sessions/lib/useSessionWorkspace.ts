import {useEffect, useState} from 'react';
import type {SessionSummary} from '@/features/sessions/types/session';
import {mockSessions} from './mockSessions';
import {loadSessions} from './sessionSource';

export function useSessionWorkspace() {
  const [sessions, setSessions] = useState<SessionSummary[]>(mockSessions);
  const [mode, setMode] = useState<'mock' | 'local'>('mock');
  const [isLoading, setIsLoading] = useState(true);
  const [activeIds, setActiveIds] = useState<string[]>([
    mockSessions[0].id,
    mockSessions[1].id,
  ]);

  const refresh = async () => {
    setIsLoading(true);

    const result = await loadSessions();
    setMode(result.sessions.length > 0 ? result.mode : 'mock');
    setSessions(result.sessions.length > 0 ? result.sessions : mockSessions);
    setIsLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return {
    sessions,
    mode,
    isLoading,
    refresh,
    activeIds,
    setActiveIds,
  };
}
