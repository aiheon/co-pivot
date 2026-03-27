import {useMemo, useState} from 'react';
import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Burger,
  Button,
  Divider,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {
  IconArrowAutofitWidth,
  IconMoonStars,
  IconRefresh,
  IconSun,
} from '@tabler/icons-react';
import {SessionListPane} from '@/features/sessions/components/SessionListPane';
import {SessionSplitView} from '@/features/sessions/components/SessionSplitView';
import {useSessionWorkspace} from '@/features/sessions/lib/useSessionWorkspace';
import type {SessionSummary} from '@/features/sessions/types/session';

export default function App() {
  const [opened, {toggle}] = useDisclosure();
  const {
    sessions,
    refresh,
    isLoading,
    mode,
    activeIds,
    setActiveIds,
  } = useSessionWorkspace();
  const [splitView, setSplitView] = useState(true);

  const activeSessions = useMemo(() => {
    return activeIds
      .map((id) => sessions.find((session) => session.id === id))
      .filter((session): session is SessionSummary => Boolean(session));
  }, [activeIds, sessions]);

  return (
    <AppShell
      header={{height: 72}}
      navbar={{
        width: 360,
        breakpoint: 'sm',
        collapsed: {mobile: !opened},
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Stack gap={2}>
              <Group gap="xs">
                <Text fw={700} size="lg">
                  co-pivot
                </Text>
                <Badge variant="light" color="cyan">
                  local-first
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                Switch Copilot CLI sessions, compare context, resume quickly.
              </Text>
            </Stack>
          </Group>

          <Group gap="xs">
            <Badge color={mode === 'mock' ? 'yellow' : 'teal'} variant="dot">
              {mode === 'mock' ? 'Mock data' : 'Local data'}
            </Badge>
            <Tooltip label={splitView ? 'Disable split view' : 'Enable split view'}>
              <ActionIcon
                variant={splitView ? 'filled' : 'light'}
                color={splitView ? 'cyan' : 'gray'}
                size="lg"
                onClick={() => setSplitView((current) => !current)}
              >
                <IconArrowAutofitWidth size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Dark mode is the default for v1">
              <ActionIcon variant="light" size="lg" color="gray">
                <IconMoonStars size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Light mode is planned">
              <ActionIcon variant="subtle" size="lg" color="gray">
                <IconSun size={18} />
              </ActionIcon>
            </Tooltip>
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="light"
              loading={isLoading}
              onClick={() => void refresh()}
            >
              Refresh
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <SessionListPane
          sessions={sessions}
          activeIds={activeIds}
          splitView={splitView}
          onSelectSession={(id) => setActiveIds((current) => nextActiveIds(current, id, splitView))}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack gap="md">
          <Box className="hero-panel">
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Text className="eyebrow">Session Switchboard</Text>
                <Text className="hero-title">
                  Keep multiple Copilot CLI threads within reach.
                </Text>
                <Text c="dimmed" maw={720}>
                  co-pivot is designed to browse local Copilot CLI sessions,
                  compare conversations side by side, and relaunch the one you
                  need with minimal friction.
                </Text>
              </Stack>
              <Badge size="lg" variant="light" color="cyan">
                Split view ready
              </Badge>
            </Group>
          </Box>

          <Divider />

          <SessionSplitView
            sessions={activeSessions}
            splitView={splitView}
            onSelectSecondary={(id) => setActiveIds((current) => nextSecondaryId(current, id))}
          />
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}

function nextActiveIds(current: string[], id: string, splitView: boolean) {
  if (!splitView) {
    return [id];
  }

  if (current.includes(id)) {
    return current;
  }

  if (current.length === 0) {
    return [id];
  }

  if (current.length === 1) {
    return [current[0], id];
  }

  return [current[1], id];
}

function nextSecondaryId(current: string[], id: string) {
  if (current.length === 0) {
    return [id];
  }

  if (current.length === 1) {
    return [current[0], id];
  }

  return [current[0], id];
}
