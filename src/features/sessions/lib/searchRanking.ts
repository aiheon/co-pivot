import type {SessionSearchMatch, SessionSummary} from '@/features/sessions/types/session';

interface SearchQueryAnalysis {
  normalizedQuery: string;
  normalizedTerms: string[];
  prefersMetadata: boolean;
  prefersTranscript: boolean;
  likelyIdentifierQuery: boolean;
}

interface ScoredSession {
  session: SessionSummary;
  score: number;
  matchedFields: Set<SessionSearchMatch['matchedFields'][number]>;
}

export function rankSessionsByQuery(sessions: SessionSummary[], searchQuery: string) {
  const analysis = analyzeSearchQuery(searchQuery);

  if (analysis.normalizedTerms.length === 0) {
    return sessions.map(clearSearchMatch);
  }

  return sessions
    .map((session, index) => ({
      index,
      scored: scoreSessionMatch(session, analysis),
    }))
    .filter((entry) => entry.scored.score > 0)
    .sort((left, right) => right.scored.score - left.scored.score || left.index - right.index)
    .map((entry) => ({
      ...entry.scored.session,
      searchMatch: {
        matchedFields: Array.from(entry.scored.matchedFields),
        terms: analysis.normalizedTerms,
        score: entry.scored.score,
      },
    }));
}

function clearSearchMatch(session: SessionSummary): SessionSummary {
  return {
    ...session,
    searchMatch: undefined,
  };
}

function analyzeSearchQuery(searchQuery: string): SearchQueryAnalysis {
  const normalizedQuery = normalizeSearchText(searchQuery).trim();
  const normalizedTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const queryHasBranchSeparators = /[/_-]/.test(searchQuery);
  const queryLooksLikePath = /[/.]/.test(searchQuery);
  const averageTermLength =
    normalizedTerms.length === 0
      ? 0
      : normalizedTerms.reduce((total, term) => total + term.length, 0) / normalizedTerms.length;

  return {
    normalizedQuery,
    normalizedTerms,
    prefersMetadata:
      queryHasBranchSeparators ||
      queryLooksLikePath ||
      normalizedTerms.some((term) => term === 'main' || term === 'master' || term.length <= 3),
    prefersTranscript:
      normalizedTerms.length >= 4 || (normalizedTerms.length >= 3 && averageTermLength >= 6),
    likelyIdentifierQuery:
      normalizedTerms.length <= 2 &&
      normalizedTerms.every((term) => /[a-z0-9/_-]+/.test(term)) &&
      normalizedTerms.some((term) => /[_/-]/.test(term) || term.length <= 5),
  };
}

function scoreSessionMatch(
  session: SessionSummary,
  analysis: SearchQueryAnalysis,
): ScoredSession {
  const matchedFields = new Set<SessionSearchMatch['matchedFields'][number]>();
  const fields = {
    title: normalizeSearchText(session.title),
    sourceTitle: normalizeSearchText(session.sourceTitle ?? ''),
    workspace: normalizeSearchText([session.workspaceLabel, session.workspacePath].join(' ')),
    branch: normalizeSearchText(session.branch ?? ''),
    tags: normalizeSearchText(session.tags.join(' ')),
    snippet: normalizeSearchText(session.lastSnippet),
    transcript: normalizeSearchText(session.messages.map((message) => message.text).join(' ')),
    id: normalizeSearchText(session.id),
    status: normalizeSearchText(session.status),
  };

  const strongFields = [
    fields.title,
    fields.sourceTitle,
    fields.workspace,
    fields.branch,
    fields.tags,
    fields.snippet,
    fields.id,
    fields.status,
  ].join(' ');
  const allFields = `${strongFields} ${fields.transcript}`.trim();

  if (!analysis.normalizedTerms.every((term) => allFields.includes(term))) {
    return {session, score: 0, matchedFields};
  }

  let score = 0;

  score += scoreField(fields.title, analysis, matchedFields, 'title', {
    exact: 720,
    prefix: 360,
    contains: 260,
    perTerm: 110,
  });
  score += scoreField(fields.sourceTitle, analysis, matchedFields, 'sourceTitle', {
    exact: 260,
    prefix: 150,
    contains: 120,
    perTerm: 55,
  });

  const metadataMultiplier = analysis.prefersMetadata || analysis.likelyIdentifierQuery ? 1.45 : 1;
  score += scoreField(fields.workspace, analysis, matchedFields, 'workspace', {
    exact: Math.round(220 * metadataMultiplier),
    prefix: Math.round(150 * metadataMultiplier),
    contains: Math.round(130 * metadataMultiplier),
    perTerm: Math.round(55 * metadataMultiplier),
  });
  score += scoreField(fields.branch, analysis, matchedFields, 'branch', {
    exact: Math.round(240 * metadataMultiplier),
    prefix: Math.round(180 * metadataMultiplier),
    contains: Math.round(145 * metadataMultiplier),
    perTerm: Math.round(60 * metadataMultiplier),
  });
  score += scoreField(fields.tags, analysis, matchedFields, 'tags', {
    exact: Math.round(180 * metadataMultiplier),
    prefix: Math.round(125 * metadataMultiplier),
    contains: Math.round(110 * metadataMultiplier),
    perTerm: Math.round(50 * metadataMultiplier),
  });
  score += scoreField(fields.id, analysis, matchedFields, 'id', {
    exact: Math.round(200 * metadataMultiplier),
    prefix: Math.round(130 * metadataMultiplier),
    contains: Math.round(90 * metadataMultiplier),
    perTerm: Math.round(35 * metadataMultiplier),
  });
  score += scoreField(fields.status, analysis, matchedFields, 'status', {
    exact: 60,
    prefix: 30,
    contains: 20,
    perTerm: 16,
  });
  score += scoreField(fields.snippet, analysis, matchedFields, 'snippet', {
    exact: 90,
    prefix: 60,
    contains: 45,
    perTerm: 24,
  });

  const transcriptMultiplier = analysis.prefersTranscript ? 1.4 : 0.65;
  score += scoreField(fields.transcript, analysis, matchedFields, 'transcript', {
    exact: Math.round(50 * transcriptMultiplier),
    prefix: Math.round(30 * transcriptMultiplier),
    contains: Math.round(24 * transcriptMultiplier),
    perTerm: Math.round(10 * transcriptMultiplier),
  });

  if (analysis.normalizedTerms.every((term) => strongFields.includes(term))) {
    score += analysis.prefersMetadata ? 180 : 135;
  }

  if (matchedFields.has('title') && matchedFields.size > 1) {
    score += 90;
  }

  if (analysis.likelyIdentifierQuery && (matchedFields.has('branch') || matchedFields.has('workspace') || matchedFields.has('id'))) {
    score += 110;
  }

  return {
    session,
    score,
    matchedFields,
  };
}

function scoreField(
  value: string,
  analysis: SearchQueryAnalysis,
  matchedFields: Set<SessionSearchMatch['matchedFields'][number]>,
  field: SessionSearchMatch['matchedFields'][number],
  weights: {
    exact: number;
    prefix: number;
    contains: number;
    perTerm: number;
  },
) {
  if (!value) {
    return 0;
  }

  let fieldScore = 0;

  if (value === analysis.normalizedQuery) {
    fieldScore += weights.exact;
  }
  if (value.startsWith(analysis.normalizedQuery)) {
    fieldScore += weights.prefix;
  }
  if (value.includes(analysis.normalizedQuery)) {
    fieldScore += weights.contains;
  }

  let matchedTermCount = 0;

  for (const term of analysis.normalizedTerms) {
    if (value.includes(term)) {
      matchedTermCount += 1;
      fieldScore += weights.perTerm;

      if (containsWholeWord(value, term)) {
        fieldScore += Math.round(weights.perTerm * 0.35);
      }
    }
  }

  if (matchedTermCount > 0) {
    matchedFields.add(field);
  }

  return fieldScore;
}

function containsWholeWord(value: string, term: string) {
  const escaped = escapeRegExp(term);
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();
}
