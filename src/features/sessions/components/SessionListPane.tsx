import {useMemo, useState} from 'react';
import {
  Badge,
  Box,
  Card,
  Combobox,
  Group,
  Pill,
  PillsInput,
  ScrollArea,
  Stack,
  Text,
  useCombobox,
} from '@mantine/core';
import {IconSearch} from '@tabler/icons-react';
import type {SessionSummary} from '@/features/sessions/types/session';

interface SessionListPaneProps {
  sessions: SessionSummary[];
  activeIds: string[];
  splitView: boolean;
  onSelectSession: (id: string) => void;
}

export function SessionListPane({
  sessions,
  activeIds,
  splitView,
  onSelectSession,
}: SessionListPaneProps) {
  const [query, setQuery] = useState('');
  const combobox = useCombobox();

  const filteredSessions = useMemo(() => {
    const value = query.trim().toLowerCase();

    if (!value) {
      return sessions;
    }

    return sessions.filter((session) => {
      return [
        session.title,
        session.workspaceLabel,
        session.workspacePath,
        session.id,
        session.lastSnippet,
        ...session.tags,
      ]
        .join(' ')
        .toLowerCase()
        .includes(value);
    });
  }, [query, sessions]);

  return (
    <Stack gap="md" h="100%">
      <Box>
        <Text fw={600}>Sessions</Text>
        <Text size="sm" c="dimmed">
          Search, pin mentally, and jump between conversations fast.
        </Text>
      </Box>

      <Combobox
        store={combobox}
        onOptionSubmit={(value) => {
          onSelectSession(value);
          combobox.closeDropdown();
        }}
      >
        <Combobox.Target>
          <PillsInput onClick={() => combobox.openDropdown()}>
            <Pill.Group>
              <Pill withRemoveButton={false}>
                <IconSearch size={14} />
              </Pill>
              <PillsInput.Field
                value={query}
                placeholder="Search title, path, tag, or session id"
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                onChange={(event) => {
                  setQuery(event.currentTarget.value);
                  combobox.updateSelectedOptionIndex();
                }}
              />
            </Pill.Group>
          </PillsInput>
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options mah={240}>
            {filteredSessions.map((session) => (
              <Combobox.Option key={session.id} value={session.id}>
                <Text fw={600} size="sm">
                  {session.title}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  {session.workspacePath}
                </Text>
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>

      <Group gap="xs">
        <Badge variant="light" color="cyan">
          {sessions.length} total
        </Badge>
        <Badge variant="light" color="grape">
          {splitView ? 'Split view on' : 'Single view'}
        </Badge>
      </Group>

      <ScrollArea type="never" offsetScrollbars scrollbarSize={6} flex={1}>
        <Stack gap="sm">
          {filteredSessions.map((session) => {
            const isActive = activeIds.includes(session.id);

            return (
              <Card
                key={session.id}
                className={isActive ? 'session-card active' : 'session-card'}
                withBorder
                onClick={() => onSelectSession(session.id)}
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <Box maw="76%">
                      <Text fw={600}>{session.title}</Text>
                      <Text size="sm" c="dimmed" truncate>
                        {session.workspaceLabel}
                      </Text>
                    </Box>
                    <Badge size="sm" color={statusColor[session.status]} variant="light">
                      {session.status}
                    </Badge>
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
