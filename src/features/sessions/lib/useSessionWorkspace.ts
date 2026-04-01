import {useEffect, useMemo, useState} from 'react';
import type {
  SessionSortOption,
  SessionSummary,
} from '@/features/sessions/types/session';
import {mockSessions} from './mockSessions';
import {loadSessions} from './sessionSource';

const FAVORITES_KEY = 'co-pivot-favorite-session-ids';
const FAVORITES_ONLY_KEY = 'co-pivot-favorites-only';
const SHOW_EMPTY_SESSIONS_KEY = 'co-pivot-show-empty-sessions';
const SORT_KEY = 'co-pivot-session-sort';

export function useSessionWorkspace() {
  const [baseSessions, setBaseSessions] = useState<SessionSummary[]>(mockSessions);
  const [mode, setMode] = useState<'mock' | 'local'>('mock');
  const [isLoading, setIsLoading] = useState(true);
  const [activeIds, setActiveIds] = useState<string[]>([
    mockSessions[0].id,
    mockSessions[1].id,
  ]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readFavoriteIds());
  const [favoritesOnly, setFavoritesOnlyState] = useState<boolean>(() => readFavoritesOnly());
  const [showEmptySessions, setShowEmptySessionsState] = useState<boolean>(() => readShowEmptySessions());
  const [sortOption, setSortOptionState] = useState<SessionSortOption>(() => readSortOption());

  const refresh = async () => {
    setIsLoading(true);

    const result = await loadSessions();
    setMode(result.sessions.length > 0 ? result.mode : 'mock');
    setBaseSessions(result.sessions.length > 0 ? result.sessions : mockSessions);
    setIsLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const sessions = useMemo(() => {
    const sorted = [...baseSessions].sort((left, right) => compareSessions(left, right, sortOption));
    const favoriteSet = new Set(favoriteIds);
    const visible = showEmptySessions
      ? sorted
      : sorted.filter((session) => session.messageCount > 0);

    if (!favoritesOnly) {
      return visible;
    }

    return visible.filter((session) => favoriteSet.has(session.id));
  }, [baseSessions, favoriteIds, favoritesOnly, showEmptySessions, sortOption]);

  const toggleFavorite = (sessionId: string) => {
    setFavoriteIds((current) => {
      const next = current.includes(sessionId)
        ? current.filter((id) => id !== sessionId)
        : [sessionId, ...current];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const setSortOption = (option: SessionSortOption) => {
    setSortOptionState(option);
    localStorage.setItem(SORT_KEY, option);
  };

  const setFavoritesOnly = (value: boolean) => {
    setFavoritesOnlyState(value);
    localStorage.setItem(FAVORITES_ONLY_KEY, JSON.stringify(value));
  };

  const setShowEmptySessions = (value: boolean) => {
    setShowEmptySessionsState(value);
    localStorage.setItem(SHOW_EMPTY_SESSIONS_KEY, JSON.stringify(value));
  };

  return {
    sessions,
    mode,
    isLoading,
    refresh,
    activeIds,
    setActiveIds,
    favoriteIds,
    toggleFavorite,
    favoritesOnly,
    setFavoritesOnly,
    showEmptySessions,
    setShowEmptySessions,
    sortOption,
    setSortOption,
  };
}

function readFavoriteIds() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function readFavoritesOnly() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_ONLY_KEY) ?? 'false') === true;
  } catch {
    return false;
  }
}

function readShowEmptySessions() {
  try {
    return JSON.parse(localStorage.getItem(SHOW_EMPTY_SESSIONS_KEY) ?? 'false') === true;
  } catch {
    return false;
  }
}

function readSortOption(): SessionSortOption {
  const raw = localStorage.getItem(SORT_KEY);
  return raw === 'oldest' || raw === 'workspace' ? raw : 'recent';
}

function compareSessions(
  left: SessionSummary,
  right: SessionSummary,
  sortOption: SessionSortOption,
) {
  if (sortOption === 'workspace') {
    return (
      left.workspaceLabel.localeCompare(right.workspaceLabel) ||
      right.updatedAt.localeCompare(left.updatedAt)
    );
  }

  if (sortOption === 'oldest') {
    return left.updatedAt.localeCompare(right.updatedAt);
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}
