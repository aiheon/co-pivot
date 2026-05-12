import {useEffect, useMemo, useRef, useState} from 'react';
import type {
  SessionSortOption,
  SessionResumeNoteSource,
  SessionSourceResult,
  SessionSummary,
} from '@/features/sessions/types/session';
import {mockSessions} from './mockSessions';
import {rankSessionsByQuery} from './searchRanking';
import {generateResumeNoteDraft} from './resumeNoteDraft';
import {loadSessions} from './sessionSource';

const FAVORITES_KEY = 'co-pivot-favorite-session-ids';
const FAVORITES_ONLY_KEY = 'co-pivot-favorites-only';
const SORT_KEY = 'co-pivot-session-sort';
const SEARCH_QUERY_KEY = 'co-pivot-session-search-query';
const TITLE_OVERRIDES_KEY = 'co-pivot-session-title-overrides';
const RESUME_NOTES_KEY = 'co-pivot-session-resume-notes';
const AUTO_REFRESH_INTERVAL_MS = 30_000;

interface ResumeNoteEntry {
  note: string;
  source: SessionResumeNoteSource;
  updatedAt: string;
}

export function useSessionWorkspace() {
  const [baseSessions, setBaseSessions] = useState<SessionSummary[]>([]);
  const [mode, setMode] = useState<SessionSourceResult['mode']>(() =>
    typeof window !== 'undefined' && window.coPivot ? 'local' : 'mock',
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readFavoriteIds());
  const [favoritesOnly, setFavoritesOnlyState] = useState<boolean>(() => readFavoritesOnly());
  const [sortOption, setSortOptionState] = useState<SessionSortOption>(() => readSortOption());
  const [searchQuery, setSearchQueryState] = useState<string>(() => readSearchQuery());
  const [titleOverrides, setTitleOverridesState] = useState<Record<string, string>>(() => readTitleOverrides());
  const [resumeNotes, setResumeNotesState] = useState<Record<string, ResumeNoteEntry>>(() => readResumeNotes());
  const refreshInFlightRef = useRef(false);

  const refresh = async ({silent = false}: {silent?: boolean} = {}) => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;

    if (!silent) {
      setIsLoading(true);
    }

    try {
      const result = await loadSessions();
      setMode(result.mode);
      setLoadError(result.error ?? null);
      setBaseSessions(result.sessions);
    } finally {
      refreshInFlightRef.current = false;
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh({silent: true});
      }
    }, AUTO_REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh({silent: true});
      }
    };

    const handleWindowFocus = () => {
      void refresh({silent: true});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  useEffect(() => {
    setActiveIds((current) => {
      const validIds = current.filter((id) => baseSessions.some((session) => session.id === id));

      if (validIds.length > 0 || baseSessions.length === 0) {
        return validIds;
      }

      return baseSessions.slice(0, 2).map((session) => session.id);
    });
  }, [baseSessions]);

  const sessions = useMemo(() => {
    const sessionsWithTitles = baseSessions.map((session) => applyTitleOverride(session, titleOverrides));
    const sessionsWithLocalMetadata = sessionsWithTitles.map((session) => applyResumeNote(session, resumeNotes));
    const sorted = [...sessionsWithLocalMetadata].sort((left, right) => compareSessions(left, right, sortOption));
    const favoriteSet = new Set(favoriteIds);
    const nonEmptySessions = sorted.filter((session) => session.messageCount > 0);
    const filteredByFavorites = favoritesOnly
      ? nonEmptySessions.filter((session) => favoriteSet.has(session.id))
      : nonEmptySessions;

    return rankSessionsByQuery(filteredByFavorites, searchQuery);
  }, [baseSessions, favoriteIds, favoritesOnly, resumeNotes, searchQuery, sortOption, titleOverrides]);

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

  const setSearchQuery = (value: string) => {
    setSearchQueryState(value);
    localStorage.setItem(SEARCH_QUERY_KEY, value);
  };

  const setCustomTitle = (sessionId: string, value: string) => {
    setTitleOverridesState((current) => {
      const next = updateTitleOverrides(current, baseSessions, sessionId, value);
      localStorage.setItem(TITLE_OVERRIDES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetCustomTitle = (sessionId: string) => {
    setTitleOverridesState((current) => {
      const next = {...current};
      delete next[sessionId];
      localStorage.setItem(TITLE_OVERRIDES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const saveResumeNote = (
    sessionId: string,
    note: string,
    source: SessionResumeNoteSource = 'edited',
  ) => {
    setResumeNotesState((current) => {
      const next = {...current};
      const normalized = note.trim();

      if (!normalized) {
        delete next[sessionId];
      } else {
        next[sessionId] = {
          note: normalized,
          source,
          updatedAt: new Date().toISOString(),
        };
      }

      localStorage.setItem(RESUME_NOTES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const clearResumeNote = (sessionId: string) => {
    setResumeNotesState((current) => {
      const next = {...current};
      delete next[sessionId];
      localStorage.setItem(RESUME_NOTES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const generateResumeNote = (sessionId: string) => {
    const session = baseSessions
      .map((item) => applyTitleOverride(item, titleOverrides))
      .find((item) => item.id === sessionId);

    if (!session) {
      return;
    }

    saveResumeNote(sessionId, generateResumeNoteDraft(session), 'generated');
  };

  return {
    sessions,
    mode,
    loadError,
    isLoading,
    refresh,
    activeIds,
    setActiveIds,
    favoriteIds,
    toggleFavorite,
    favoritesOnly,
    setFavoritesOnly,
    sortOption,
    setSortOption,
    searchQuery,
    setSearchQuery,
    setCustomTitle,
    resetCustomTitle,
    saveResumeNote,
    clearResumeNote,
    generateResumeNote,
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

function readSortOption(): SessionSortOption {
  const raw = localStorage.getItem(SORT_KEY);
  return raw === 'oldest' || raw === 'workspace' ? raw : 'recent';
}

function readSearchQuery() {
  return localStorage.getItem(SEARCH_QUERY_KEY) ?? '';
}

function readTitleOverrides() {
  try {
    const raw = localStorage.getItem(TITLE_OVERRIDES_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === 'string' && typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

function readResumeNotes() {
  try {
    const raw = localStorage.getItem(RESUME_NOTES_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) => {
        if (
          typeof key !== 'string' ||
          !value ||
          typeof value !== 'object' ||
          Array.isArray(value) ||
          typeof (value as ResumeNoteEntry).note !== 'string' ||
          typeof (value as ResumeNoteEntry).updatedAt !== 'string' ||
          !['generated', 'edited'].includes(String((value as ResumeNoteEntry).source))
        ) {
          return [];
        }

        return [[key, value as ResumeNoteEntry]];
      }),
    );
  } catch {
    return {};
  }
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

function applyTitleOverride(
  session: SessionSummary,
  titleOverrides: Record<string, string>,
): SessionSummary {
  const override = titleOverrides[session.id]?.trim();

  if (!override || override === session.title) {
    return {
      ...session,
      sourceTitle: undefined,
      hasCustomTitle: false,
    };
  }

  return {
    ...session,
    title: override,
    sourceTitle: session.title,
    hasCustomTitle: true,
  };
}

function applyResumeNote(
  session: SessionSummary,
  resumeNotes: Record<string, ResumeNoteEntry>,
): SessionSummary {
  const entry = resumeNotes[session.id];

  if (!entry?.note.trim()) {
    return {
      ...session,
      resumeNote: undefined,
      resumeNoteSource: undefined,
      resumeNoteUpdatedAt: undefined,
    };
  }

  return {
    ...session,
    resumeNote: entry.note,
    resumeNoteSource: entry.source,
    resumeNoteUpdatedAt: entry.updatedAt,
  };
}

function updateTitleOverrides(
  current: Record<string, string>,
  baseSessions: SessionSummary[],
  sessionId: string,
  value: string,
) {
  const next = {...current};
  const normalized = value.trim();
  const baseTitle = baseSessions.find((session) => session.id === sessionId)?.title?.trim();

  if (!normalized || normalized === baseTitle) {
    delete next[sessionId];
    return next;
  }

  next[sessionId] = normalized;
  return next;
}
