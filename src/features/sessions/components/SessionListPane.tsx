import {
  ActionIcon,
  Badge,
  Box,
  Card,
  CloseButton,
  Divider,
  Group,
  ScrollArea,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import {IconSearch, IconStar, IconStarFilled} from '@tabler/icons-react';
import type {
  SessionSortOption,
  SessionSummary,
} from '@/features/sessions/types/session';

interface SessionListPaneProps {
  sessions: SessionSummary[];
  activeIds: string[];
  favoriteIds: string[];
  favoritesOnly: boolean;
  searchQuery: string;
  showEmptySessions: boolean;
  splitView: boolean;
  sortOption: SessionSortOption;
  onSelectSession: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onFavoritesOnlyChange: (value: boolean) => void;
  onSearchQueryChange: (value: string) => void;
  onShowEmptySessionsChange: (value: boolean) => void;
  onSortChange: (option: SessionSortOption) => void;
}

export function SessionListPane({
  sessions,
  activeIds,
  favoriteIds,
  favoritesOnly,
  searchQuery,
  showEmptySessions,
  splitView,
  sortOption,
  onSelectSession,
  onToggleFavorite,
  onFavoritesOnlyChange,
  onSearchQueryChange,
  onShowEmptySessionsChange,
  onSortChange,
}: SessionListPaneProps) {
  const favoriteSet = new Set(favoriteIds);
  const groupedSessions =
    sortOption === 'workspace' ? null : groupSessionsByDate(sessions);

  return (
    <Stack gap="md" h="100%">
      <Box>
        <Text fw={600}>Sessions</Text>
        <Text size="sm" c="dimmed">
          Jump between conversations and keep context close at hand.
        </Text>
      </Box>

      <SegmentedControl
        fullWidth
        size="xs"
        radius="md"
        value={sortOption}
        onChange={(value) => onSortChange(value as SessionSortOption)}
        data={[
          {label: 'Recent', value: 'recent'},
          {label: 'Oldest', value: 'oldest'},
          {label: 'Workspace', value: 'workspace'},
        ]}
      />

      <TextInput
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
        placeholder="Search title, workspace, branch, tags, transcript..."
        leftSection={<IconSearch size={16} />}
        rightSection={
          searchQuery ? (
            <CloseButton
              aria-label="Clear search"
              onClick={() => onSearchQueryChange('')}
            />
          ) : null
        }
      />

      <Group justify="space-between" align="flex-start">
        <Group gap="xs">
          <Badge variant="light" color="cyan">
            {sessions.length} shown
          </Badge>
          <Badge variant="light" color="yellow">
            {favoriteIds.length} favorites
          </Badge>
          <Badge variant="light" color="grape">
            {splitView ? 'Split view on' : 'Single view'}
          </Badge>
        </Group>
        <Stack gap={6} align="stretch" maw={180}>
          <Switch
            checked={favoritesOnly}
            onChange={(event) => onFavoritesOnlyChange(event.currentTarget.checked)}
            size="sm"
            label="Favorites only"
          />
          <Switch
            checked={showEmptySessions}
            onChange={(event) => onShowEmptySessionsChange(event.currentTarget.checked)}
            size="sm"
            label="Show empty sessions"
          />
        </Stack>
      </Group>

      <ScrollArea type="never" offsetScrollbars scrollbarSize={6} flex={1}>
        <Stack gap="sm">
          {groupedSessions ? (
            groupedSessions.map((group) => (
              <Stack key={group.key} gap="sm" className="session-date-group">
                <Group gap="sm" wrap="nowrap" align="center" className="session-date-group-header">
                  <Text size="xs" fw={700} className="session-date-group-label">
                    {group.label}
                  </Text>
                  <Divider orientation="horizontal" style={{flex: 1}} />
                  <Text size="xs" c="dimmed" className="session-date-group-count">
                    {group.sessions.length}
                  </Text>
                </Group>

                {group.sessions.map((session) => (
                  <SessionListCard
                    key={session.id}
                    session={session}
                    isActive={activeIds.includes(session.id)}
                    isFavorite={favoriteSet.has(session.id)}
                    onSelectSession={onSelectSession}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </Stack>
            ))
          ) : (
            sessions.map((session) => (
              <SessionListCard
                key={session.id}
                session={session}
                isActive={activeIds.includes(session.id)}
                isFavorite={favoriteSet.has(session.id)}
                onSelectSession={onSelectSession}
                onToggleFavorite={onToggleFavorite}
              />
            ))
          )}

          {sessions.length === 0 ? (
            <Card withBorder radius="lg" padding="lg">
              <Text fw={600}>
                {searchQuery
                  ? 'No sessions match this search'
                  : favoritesOnly
                    ? 'No favorite sessions yet'
                    : 'No sessions to show'}
              </Text>
              <Text size="sm" c="dimmed">
                {searchQuery
                  ? 'Try a broader keyword or clear the search field.'
                  : favoritesOnly
                    ? 'Star a session to keep it in your favorites list.'
                    : 'Try changing the filters or refreshing the local session list.'}
              </Text>
            </Card>
          ) : null}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

function SessionListCard({
  session,
  isActive,
  isFavorite,
  onSelectSession,
  onToggleFavorite,
}: {
  session: SessionSummary;
  isActive: boolean;
  isFavorite: boolean;
  onSelectSession: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <Card
      className={isActive ? 'session-card active' : 'session-card'}
      withBorder
      onClick={() => onSelectSession(session.id)}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box maw="78%">
            <Text fw={600}>{session.title}</Text>
            <Text size="sm" c="dimmed" truncate>
              {session.workspaceLabel}
            </Text>
          </Box>
          <ActionIcon
            variant="subtle"
            color={isFavorite ? 'yellow' : 'gray'}
            aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(session.id);
            }}
          >
            {isFavorite ? <IconStarFilled size={16} /> : <IconStar size={16} />}
          </ActionIcon>
        </Group>

        <Text size="sm" fw={600}>
          Updated {formatListTimestamp(session.updatedAt)}
        </Text>

        <Group justify="space-between" align="flex-end" wrap="nowrap">
          <Group gap={6} wrap="wrap">
            <Badge size="sm" color={statusColor[session.status]} variant="light">
              {session.status}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {session.messageCount} msgs
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}

const statusColor = {
  active: 'teal',
  paused: 'yellow',
  closed: 'gray',
  stale: 'red',
} as const;

function groupSessionsByDate(sessions: SessionSummary[]) {
  const groups = new Map<string, SessionSummary[]>();

  for (const session of sessions) {
    const key = toDateKey(session.updatedAt);
    const current = groups.get(key) ?? [];
    current.push(session);
    groups.set(key, current);
  }

  return Array.from(groups.entries()).map(([key, groupedSessions]) => ({
    key,
    label: formatDateGroupLabel(key),
    sessions: groupedSessions,
  }));
}

function toDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateGroupLabel(dateKey: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const target = new Date(`${dateKey}T00:00:00`);
  const targetTime = target.getTime();

  if (targetTime === today.getTime()) {
    return 'TODAY';
  }

  if (targetTime === yesterday.getTime()) {
    return 'YESTERDAY';
  }

  return new Intl.DateTimeFormat('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
    .format(target)
    .toUpperCase();
}

function formatListTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
