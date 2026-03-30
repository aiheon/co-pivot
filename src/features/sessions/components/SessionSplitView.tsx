import {useState} from 'react';
import {
  Alert,
  Button,
  Card,
  Code,
  Divider,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import {IconAlertCircle, IconPlayerPlay, IconTerminal2} from '@tabler/icons-react';
import {
  resumeSession,
  type PreferredTerminal,
} from '@/features/sessions/lib/sessionSource';
import type {SessionSummary} from '@/features/sessions/types/session';

interface SessionSplitViewProps {
  preferredTerminal: PreferredTerminal;
  sessions: SessionSummary[];
  splitView: boolean;
  onSelectSecondary: (id: string) => void;
}

export function SessionSplitView({
  preferredTerminal,
  sessions,
  splitView,
  onSelectSecondary,
}: SessionSplitViewProps) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No session selected"
        description="Choose a session from the left panel to inspect it here."
      />
    );
  }

  if (!splitView || sessions.length === 1) {
    return <SessionPanel preferredTerminal={preferredTerminal} session={sessions[0]} />;
  }

  return (
    <SimpleGrid cols={{base: 1, lg: 2}} spacing="md">
      <SessionPanel preferredTerminal={preferredTerminal} session={sessions[0]} />
      <SessionPanel
        preferredTerminal={preferredTerminal}
        session={sessions[1]}
        onPromote={() => onSelectSecondary(sessions[1].id)}
      />
    </SimpleGrid>
  );
}

function SessionPanel({
  preferredTerminal,
  session,
  onPromote,
}: {
  preferredTerminal: PreferredTerminal;
  session: SessionSummary;
  onPromote?: () => void;
}) {
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  const handleResume = async () => {
    setResumeError(null);
    setIsResuming(true);

    try {
      await resumeSession(session.id, preferredTerminal);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to resume this Copilot session.';
      setResumeError(message);
    } finally {
      setIsResuming(false);
    }
  };

  return (
    <Card withBorder padding="lg" radius="xl" className="session-detail-card">
      <Stack gap="md" h="100%">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Text fw={700} size="lg">
              {session.title}
            </Text>
            <Text size="sm" c="dimmed">
              {session.workspacePath}
            </Text>
          </Stack>

          <Group gap="xs">
            {onPromote ? (
              <Button variant="subtle" size="xs" onClick={onPromote}>
                Keep on right
              </Button>
            ) : null}
            <Button
              leftSection={<IconPlayerPlay size={14} />}
              size="xs"
              loading={isResuming}
              onClick={() => void handleResume()}
            >
              Resume
            </Button>
          </Group>
        </Group>

        {resumeError ? (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
            {resumeError}
          </Alert>
        ) : null}

        <Group gap="xs">
          <Code>{session.id}</Code>
          {session.branch ? <Code>{session.branch}</Code> : null}
          <Code>{session.status}</Code>
          <Code>{preferredTerminal === 'iterm' ? 'iTerm' : 'Terminal'}</Code>
        </Group>

        <Divider />

        <Group justify="space-between">
          <Metric label="Started" value={formatDate(session.startedAt)} />
          <Metric label="Updated" value={formatDate(session.updatedAt)} />
          <Metric label="Messages" value={String(session.messageCount)} />
        </Group>

        <Divider />

        <Stack gap="xs" style={{flex: 1, minHeight: 0}}>          <Group gap={6}>
            <IconTerminal2 size={16} />
            <Text fw={600}>Conversation</Text>
          </Group>

          <Card withBorder radius="lg" padding="sm" className="terminal-shell" style={{flex: 1, minHeight: 0}}>            <Group justify="space-between" className="terminal-toolbar">
              <Group gap={8}>
                <span className="terminal-dot terminal-dot-red" />
                <span className="terminal-dot terminal-dot-yellow" />
                <span className="terminal-dot terminal-dot-green" />
              </Group>
              <Text size="xs" className="terminal-title">
                {session.workspaceLabel} :: {session.id.slice(0, 8)}
              </Text>
            </Group>

            <ScrollArea h="100%" offsetScrollbars scrollbarSize={6}>
              <Stack gap={0} className="terminal-log">
                {[...session.messages].reverse().map((message) => (
                  <div key={message.id} className="terminal-entry">
                    <div className="terminal-entry-header">
                      <span
                        className={
                          message.role === 'user'
                            ? 'terminal-role terminal-role-user'
                            : 'terminal-role terminal-role-assistant'
                        }
                      >
                        {message.role === 'user' ? '>' : '$'} {message.role}
                      </span>
                      <span className="terminal-time">{formatTime(message.createdAt)}</span>
                    </div>
                    <pre className="terminal-message">{message.text}</pre>
                  </div>
                ))}
              </Stack>
            </ScrollArea>
          </Card>
        </Stack>
      </Stack>
    </Card>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card withBorder padding="xl" radius="xl">
      <Stack gap="xs">
        <Text fw={700} size="lg">
          {title}
        </Text>
        <Text c="dimmed">{description}</Text>
      </Stack>
    </Card>
  );
}

function Metric({label, value}: {label: string; value: string}) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Stack>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
