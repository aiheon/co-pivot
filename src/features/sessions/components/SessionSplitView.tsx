import {useEffect, useRef, useState} from 'react';
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
import {IconAlertCircle, IconPlayerPlay, IconX} from '@tabler/icons-react';
import {
  resumeSession,
  type PreferredTerminal,
} from '@/features/sessions/lib/sessionSource';
import type {SessionSummary} from '@/features/sessions/types/session';

interface SessionSplitViewProps {
  preferredTerminal: PreferredTerminal;
  sessions: SessionSummary[];
  splitView: boolean;
  onCloseSession: (id: string) => void;
}

export function SessionSplitView({
  preferredTerminal,
  sessions,
  splitView,
  onCloseSession,
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
    return (
      <SessionPanel
        preferredTerminal={preferredTerminal}
        session={sessions[0]}
        onClose={() => onCloseSession(sessions[0].id)}
      />
    );
  }

  return (
    <SimpleGrid cols={{base: 1, lg: 2}} spacing="md" h="100%">
      <SessionPanel
        preferredTerminal={preferredTerminal}
        session={sessions[0]}
        onClose={() => onCloseSession(sessions[0].id)}
      />
      <SessionPanel
        preferredTerminal={preferredTerminal}
        session={sessions[1]}
        onClose={() => onCloseSession(sessions[1].id)}
      />
    </SimpleGrid>
  );
}

function SessionPanel({
  preferredTerminal,
  session,
  onClose,
}: {
  preferredTerminal: PreferredTerminal;
  session: SessionSummary;
  onClose: () => void;
}) {
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const conversationViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = conversationViewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, [session.id, session.messages.length]);

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
            <Button
              variant="default"
              size="xs"
              leftSection={<IconX size={14} />}
              onClick={onClose}
            >
              Close pane
            </Button>
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

        <Stack gap="xs" style={{flex: 1, minHeight: 0}}>
          <Card withBorder radius="lg" padding="md" className="conversation-shell" style={{flex: 1, minHeight: 0}}>
            <ScrollArea
              h="100%"
              offsetScrollbars
              scrollbarSize={6}
              viewportRef={conversationViewportRef}
            >
              <Stack gap="sm" className="conversation-log">
                {session.messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.role === 'user'
                        ? 'conversation-entry conversation-entry-user'
                        : 'conversation-entry conversation-entry-assistant'
                    }
                  >
                    <div className="conversation-entry-header">
                      <span
                        className={
                          message.role === 'user'
                            ? 'conversation-role conversation-role-user'
                            : 'conversation-role conversation-role-assistant'
                        }
                      >
                        {message.role === 'user' ? 'You' : 'Copilot'}
                      </span>
                      <span className="conversation-time">{formatTimestamp(message.createdAt)}</span>
                    </div>
                    <pre className="conversation-message">{message.text}</pre>
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
    <Card withBorder padding="xl" radius="xl" className="empty-state-card">
      <Stack align="center" justify="center" gap="md" h="100%" ta="center">
        <img
          src="/co-pivot-icon.png"
          alt="co-pivot app icon"
          className="empty-state-image"
        />
        <Stack gap={6} align="center">
          <Text fw={700} size="xl">
            {title}
          </Text>
          <Text c="dimmed" maw={420}>
            {description}
          </Text>
        </Stack>
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

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
