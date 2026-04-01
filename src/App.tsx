import {useEffect, useMemo, useState} from 'react';
import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Burger,
  Button,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
  useMantineColorScheme,
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
import {
  getPreferredTerminal,
  setPreferredTerminal,
  type PreferredTerminal,
} from '@/features/sessions/lib/sessionSource';
import {useSessionWorkspace} from '@/features/sessions/lib/useSessionWorkspace';
import type {SessionSummary} from '@/features/sessions/types/session';

const SESSION_PANE_SIDE_KEY = 'co-pivot-session-pane-side';
type SessionPaneSide = 'left' | 'right';

export default function App() {
  const [opened, {toggle}] = useDisclosure();
  const {colorScheme, setColorScheme} = useMantineColorScheme();
  const {
    sessions,
    refresh,
    isLoading,
    mode,
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
  } = useSessionWorkspace();
  const [splitView, setSplitView] = useState(true);
  const [preferredTerminal, setPreferredTerminalState] = useState<PreferredTerminal>('iterm');
  const [sessionPaneSide, setSessionPaneSide] = useState<SessionPaneSide>(() => readSessionPaneSide());

  useEffect(() => {
    void getPreferredTerminal().then(setPreferredTerminalState);
  }, []);

  const activeSessions = useMemo(() => {
    return activeIds
      .map((id) => sessions.find((session) => session.id === id))
      .filter((session): session is SessionSummary => Boolean(session));
  }, [activeIds, sessions]);

  const handleTerminalChange = async (value: string) => {
    const terminal = value === 'terminal' ? 'terminal' : 'iterm';
    const saved = await setPreferredTerminal(terminal);
    setPreferredTerminalState(saved);
  };

  const handleSessionPaneSideChange = (value: string) => {
    const next = value === 'right' ? 'right' : 'left';
    setSessionPaneSide(next);
    localStorage.setItem(SESSION_PANE_SIDE_KEY, next);
  };

  const toggleColorScheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

  const sessionPane = (
    <SessionListPane
      sessions={sessions}
      activeIds={activeIds}
      favoriteIds={favoriteIds}
      favoritesOnly={favoritesOnly}
      splitView={splitView}
      sortOption={sortOption}
      onSelectSession={(id) => setActiveIds((current) => nextActiveIds(current, id, splitView))}
      onToggleFavorite={toggleFavorite}
      onFavoritesOnlyChange={setFavoritesOnly}
      showEmptySessions={showEmptySessions}
      onShowEmptySessionsChange={setShowEmptySessions}
      onSortChange={setSortOption}
    />
  );

  return (
    <AppShell
      header={{height: 72}}
      navbar={{
        width: 420,
        breakpoint: 'sm',
        collapsed: {mobile: !opened, desktop: sessionPaneSide !== 'left'},
      }}
      aside={{
        width: 420,
        breakpoint: 'sm',
        collapsed: {mobile: !opened, desktop: sessionPaneSide !== 'right'},
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Stack gap={2}>
              <Text fw={700} size="lg">
                co-pivot
              </Text>
              <Text size="sm" c="dimmed">
                Switch Copilot CLI sessions, compare context, resume quickly.
              </Text>
            </Stack>
          </Group>

          <Group gap="xs">
            <SegmentedControl
              value={sessionPaneSide}
              onChange={handleSessionPaneSideChange}
              data={[
                {label: 'Left', value: 'left'},
                {label: 'Right', value: 'right'},
              ]}
              size="xs"
              radius="md"
              aria-label="Session pane side"
              styles={{
                root: {maxWidth: 124, flexShrink: 0},
                label: {paddingInline: 10, fontSize: 12},
              }}
            />
            <SegmentedControl
              value={preferredTerminal}
              onChange={(value) => void handleTerminalChange(value)}
              data={[
                {label: 'iTerm', value: 'iterm'},
                {label: 'Terminal', value: 'terminal'},
              ]}
              size="xs"
              radius="md"
              aria-label="Preferred terminal"
              styles={{
                root: {maxWidth: 152, flexShrink: 0},
                label: {paddingInline: 10, fontSize: 12},
              }}
            />
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
            <Tooltip label={colorScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <ActionIcon
                variant="light"
                size="lg"
                color="gray"
                onClick={toggleColorScheme}
              >
                {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoonStars size={18} />}
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

      <AppShell.Navbar p="md">{sessionPane}</AppShell.Navbar>

      <AppShell.Aside p="md">{sessionPane}</AppShell.Aside>

      <AppShell.Main style={{height: 'calc(100vh - 72px)', overflow: 'hidden'}}>
        <Stack gap="md" h="100%" style={{minHeight: 0}}>
          <Box style={{flex: 1, minHeight: 0}}>
            <SessionSplitView
              preferredTerminal={preferredTerminal}
              sessions={activeSessions}
              splitView={splitView}
              onCloseSession={(id) => setActiveIds((current) => current.filter((activeId) => activeId !== id))}
            />
          </Box>
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

function readSessionPaneSide(): SessionPaneSide {
  const raw = localStorage.getItem(SESSION_PANE_SIDE_KEY);
  return raw === 'right' ? 'right' : 'left';
}
