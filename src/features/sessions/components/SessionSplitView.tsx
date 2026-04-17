import {useEffect, useRef, useState} from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Divider,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconEdit,
  IconPlayerPlay,
  IconRestore,
  IconX,
} from '@tabler/icons-react';
import {
  resumeSession,
  type PreferredTerminal,
} from '@/features/sessions/lib/sessionSource';
import type {SessionSummary} from '@/features/sessions/types/session';

interface SessionSplitViewProps {
  preferredTerminal: PreferredTerminal;
  sessions: SessionSummary[];
  splitView: boolean;
  onSaveTitle: (sessionId: string, title: string) => void;
  onResetTitle: (sessionId: string) => void;
  onCloseSession: (id: string) => void;
}

export function SessionSplitView({
  preferredTerminal,
  sessions,
  splitView,
  onSaveTitle,
  onResetTitle,
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
        onSaveTitle={onSaveTitle}
        onResetTitle={onResetTitle}
        onClose={() => onCloseSession(sessions[0].id)}
      />
    );
  }

  return (
    <SimpleGrid cols={{base: 1, lg: 2}} spacing="md" h="100%">
      <SessionPanel
        preferredTerminal={preferredTerminal}
        session={sessions[0]}
        onSaveTitle={onSaveTitle}
        onResetTitle={onResetTitle}
        onClose={() => onCloseSession(sessions[0].id)}
      />
      <SessionPanel
        preferredTerminal={preferredTerminal}
        session={sessions[1]}
        onSaveTitle={onSaveTitle}
        onResetTitle={onResetTitle}
        onClose={() => onCloseSession(sessions[1].id)}
      />
    </SimpleGrid>
  );
}

function SessionPanel({
  preferredTerminal,
  session,
  onSaveTitle,
  onResetTitle,
  onClose,
}: {
  preferredTerminal: PreferredTerminal;
  session: SessionSummary;
  onSaveTitle: (sessionId: string, title: string) => void;
  onResetTitle: (sessionId: string) => void;
  onClose: () => void;
}) {
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(session.title);
  const conversationViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = conversationViewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, [session.id, session.messages.length]);

  useEffect(() => {
    setIsEditingTitle(false);
    setTitleDraft(session.title);
  }, [session.id, session.title]);

  const handleResume = async () => {
    setResumeError(null);
    setIsResuming(true);

    try {
      await resumeSession(session.id, preferredTerminal);
    } catch (error) {
      const known =
        error instanceof Error &&
        ['COPILOT_NOT_FOUND', 'ITERM_UNAVAILABLE'].includes((error as Error & {code?: string}).code ?? '');
      const message = known
        ? (error as Error).message
        : 'Unable to resume this Copilot session. Please try again or restart the app.';
      setResumeError(message);
    } finally {
      setIsResuming(false);
    }
  };

  const handleSaveTitle = () => {
    onSaveTitle(session.id, titleDraft);
    setIsEditingTitle(false);
  };

  const handleCancelTitleEdit = () => {
    setTitleDraft(session.title);
    setIsEditingTitle(false);
  };

  return (
    <Card withBorder padding="lg" radius="xl" className="session-detail-card">
      <Stack gap="md" h="100%">
        <Group justify="space-between" align="flex-start">
          <Stack gap={6} style={{flex: 1}}>
            {isEditingTitle ? (
              <Group gap="xs" wrap="nowrap" align="flex-start">
                <TextInput
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.currentTarget.value)}
                  placeholder="Give this session a clearer title"
                  style={{flex: 1}}
                  autoFocus
                />
                <ActionIcon
                  variant="light"
                  color="teal"
                  aria-label="Save custom title"
                  onClick={handleSaveTitle}
                >
                  <IconCheck size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="gray"
                  aria-label="Cancel title edit"
                  onClick={handleCancelTitleEdit}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            ) : (
              <Group gap="xs" align="center" wrap="wrap">
                <Text fw={700} size="lg">
                  {session.title}
                </Text>
                {session.hasCustomTitle ? (
                  <Badge size="sm" variant="light" color="yellow">
                    Custom title
                  </Badge>
                ) : null}
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Edit title"
                  onClick={() => setIsEditingTitle(true)}
                >
                  <IconEdit size={16} />
                </ActionIcon>
                {session.hasCustomTitle ? (
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Reset custom title"
                    onClick={() => onResetTitle(session.id)}
                  >
                    <IconRestore size={16} />
                  </ActionIcon>
                ) : null}
              </Group>
            )}
            <Text size="sm" c="dimmed">
              {session.workspacePath}
            </Text>
            {session.hasCustomTitle && session.sourceTitle ? (
              <Text size="xs" c="dimmed">
                Original title: {session.sourceTitle}
              </Text>
            ) : null}
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
