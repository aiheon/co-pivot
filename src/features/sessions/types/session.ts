export type SessionStatus = 'active' | 'paused' | 'closed' | 'stale';
export type SessionSortOption = 'recent' | 'oldest' | 'workspace';

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  createdAt: string;
}

export interface SessionSearchMatch {
  matchedFields: Array<'title' | 'sourceTitle' | 'workspace' | 'branch' | 'tags' | 'snippet' | 'transcript' | 'id' | 'status'>;
  terms: string[];
  score: number;
}

export interface SessionSummary {
  id: string;
  title: string;
  sourceTitle?: string;
  hasCustomTitle?: boolean;
  searchMatch?: SessionSearchMatch;
  workspaceLabel: string;
  workspacePath: string;
  status: SessionStatus;
  updatedAt: string;
  startedAt: string;
  lastSnippet: string;
  messageCount: number;
  branch?: string;
  tags: string[];
  messages: SessionMessage[];
}

export interface SessionSourceResult {
  mode: 'mock' | 'local';
  sessions: SessionSummary[];
}
