import {useEffect, useMemo, useState} from 'react';
import type {
  SessionSortOption,
  SessionSummary,
} from '@/features/sessions/types/session';
import {mockSessions} from './mockSessions';
import {loadSessions} from './sessionSource';

const FAVORITES_KEY = 'co-pivot-favorite-session-ids';
const FAVORITES_ONLY_KEY = 'co-pivot-favorites-only';
const SORT_KEY = 'co-pivot-session-sort';
const SEARCH_QUERY_KEY = 'co-pivot-session-search-query';
const TITLE_OVERRIDES_KEY = 'co-pivot-session-title-overrides';

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
  const [sortOption, setSortOptionState] = useState<SessionSortOption>(() => readSortOption());
  const [searchQuery, setSearchQueryState] = useState<string>(() => readSearchQuery());
  const [titleOverrides, setTitleOverridesState] = useState<Record<string, string>>(() => readTitleOverrides());

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
    const sessionsWithTitles = baseSessions.map((session) => applyTitleOverride(session, titleOverrides));
    const sorted = [...sessionsWithTitles].sort((left, right) => compareSessions(left, right, sortOption));
    const favoriteSet = new Set(favoriteIds);
    const nonEmptySessions = sorted.filter((session) => session.messageCount > 0);
    const filteredByFavorites = favoritesOnly
      ? nonEmptySessions.filter((session) => favoriteSet.has(session.id))
      : nonEmptySessions;

    return rankSessionsByQuery(filteredByFavorites, searchQuery);
  }, [baseSessions, favoriteIds, favoritesOnly, searchQuery, sortOption, titleOverrides]);

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
    sortOption,
    setSortOption,
    searchQuery,
    setSearchQuery,
    setCustomTitle,
    resetCustomTitle,
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

function rankSessionsByQuery(sessions: SessionSummary[], searchQuery: string) {
  const normalizedQuery = normalizeSearchText(searchQuery).trim();
  const normalizedTerms = normalizedQuery.split(/\s+/).filter(Boolean);

  if (normalizedTerms.length === 0) {
    return sessions;
  }

  return sessions
    .map((session, index) => ({
      session,
      index,
      score: scoreSessionMatch(session, normalizedQuery, normalizedTerms),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.session);
}

function scoreSessionMatch(
  session: SessionSummary,
  normalizedQuery: string,
  normalizedTerms: string[],
) {
  const fields = {
    title: normalizeSearchText(session.title),
    sourceTitle: normalizeSearchText(session.sourceTitle ?? ''),
    workspaceLabel: normalizeSearchText(session.workspaceLabel),
    workspacePath: normalizeSearchText(session.workspacePath),
    status: normalizeSearchText(session.status),
    branch: normalizeSearchText(session.branch ?? ''),
    lastSnippet: normalizeSearchText(session.lastSnippet),
    tags: normalizeSearchText(session.tags.join(' ')),
    transcript: normalizeSearchText(session.messages.map((message) => message.text).join(' ')),
    id: normalizeSearchText(session.id),
  };

  const combinedStrongFields = [
    fields.title,
    fields.sourceTitle,
    fields.workspaceLabel,
    fields.workspacePath,
    fields.branch,
    fields.tags,
    fields.lastSnippet,
    fields.id,
    fields.status,
  ].join(' ');

  const combinedAllFields = `${combinedStrongFields} ${fields.transcript}`.trim();
  const allTermsInStrongFields = normalizedTerms.every((term) => combinedStrongFields.includes(term));
  const allTermsInAnyField = normalizedTerms.every((term) => combinedAllFields.includes(term));

  if (!allTermsInAnyField) {
    return 0;
  }

  let score = 0;

  if (fields.title === normalizedQuery) {
    score += 600;
  }
  if (fields.title.startsWith(normalizedQuery)) {
    score += 320;
  }
  if (fields.title.includes(normalizedQuery)) {
    score += 240;
  }

  if (fields.sourceTitle === normalizedQuery) {
    score += 220;
  }
  if (fields.sourceTitle.includes(normalizedQuery)) {
    score += 120;
  }

  if (fields.workspaceLabel === normalizedQuery) {
    score += 180;
  }
  if (fields.workspaceLabel.includes(normalizedQuery)) {
    score += 120;
  }
  if (fields.branch.includes(normalizedQuery)) {
    score += 110;
  }
  if (fields.tags.includes(normalizedQuery)) {
    score += 100;
  }
  if (fields.lastSnippet.includes(normalizedQuery)) {
    score += 80;
  }
  if (fields.transcript.includes(normalizedQuery)) {
    score += 40;
  }
  if (fields.id.includes(normalizedQuery)) {
    score += 60;
  }
  if (fields.status === normalizedQuery) {
    score += 40;
  }

  if (allTermsInStrongFields) {
    score += 180;
  }

  for (const term of normalizedTerms) {
    if (fields.title.includes(term)) {
      score += 90;
    }
    if (fields.sourceTitle.includes(term)) {
      score += 45;
    }
    if (fields.workspaceLabel.includes(term)) {
      score += 50;
    }
    if (fields.workspacePath.includes(term)) {
      score += 25;
    }
    if (fields.branch.includes(term)) {
      score += 45;
    }
    if (fields.tags.includes(term)) {
      score += 40;
    }
    if (fields.lastSnippet.includes(term)) {
      score += 25;
    }
    if (fields.transcript.includes(term)) {
      score += 8;
    }
    if (fields.id.includes(term)) {
      score += 20;
    }
    if (fields.status.includes(term)) {
      score += 12;
    }
  }

  return score;
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();
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
