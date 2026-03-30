import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Group,
  ScrollArea,
  SegmentedControl,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import {IconStar, IconStarFilled} from '@tabler/icons-react';
import type {
  SessionSortOption,
  SessionSummary,
} from '@/features/sessions/types/session';

interface SessionListPaneProps {
  sessions: SessionSummary[];
  activeIds: string[];
  favoriteIds: string[];
  favoritesOnly: boolean;
  splitView: boolean;
  sortOption: SessionSortOption;
  onSelectSession: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onFavoritesOnlyChange: (value: boolean) => void;
  onSortChange: (option: SessionSortOption) => void;
}

export function SessionListPane({
  sessions,
  activeIds,
  favoriteIds,
  favoritesOnly,
  splitView,
  sortOption,
  onSelectSession,
  onToggleFavorite,
  onFavoritesOnlyChange,
  onSortChange,
}: SessionListPaneProps) {
  const favoriteSet = new Set(favoriteIds);

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

      <Group justify="space-between" align="center">
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
        <Switch
          checked={favoritesOnly}
          onChange={(event) => onFavoritesOnlyChange(event.currentTarget.checked)}
          size="sm"
          label="Favorites only"
        />
      </Group>

      <ScrollArea type="never" offsetScrollbars scrollbarSize={6} flex={1}>
        <Stack gap="sm">
          {sessions.map((session) => {
            const isActive = activeIds.includes(session.id);
            const isFavorite = favoriteSet.has(session.id);

            return (
              <Card
                key={session.id}
                className={isActive ? 'session-card active' : 'session-card'}
                withBorder
                onClick={() => onSelectSession(session.id)}
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Box maw="72%">
                      <Text fw={600}>{session.title}</Text>
                      <Text size="sm" c="dimmed" truncate>
                        {session.workspaceLabel}
                      </Text>
                    </Box>
                    <Group gap={6} wrap="nowrap">
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
                      <Badge size="sm" color={statusColor[session.status]} variant="light">
                        {session.status}
                      </Badge>
                    </Group>
                  </Group>

                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {session.lastSnippet}
                  </Text>

                  <Group justify="space-between">
                    <Group gap={6}>
                      {session.tags.map((tag) => (
                        <Badge key={tag} variant="dot" color="gray">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {session.messageCount} msgs
                    </Text>
                  </Group>
                </Stack>
              </Card>
            );
          })}

          {sessions.length === 0 ? (
            <Card withBorder radius="lg" padding="lg">
              <Text fw={600}>No favorite sessions yet</Text>
              <Text size="sm" c="dimmed">
                Star a session to keep it in your favorites list.
              </Text>
            </Card>
          ) : null}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

const statusColor = {
  active: 'teal',
  paused: 'yellow',
  closed: 'gray',
  stale: 'red',
} as const;
