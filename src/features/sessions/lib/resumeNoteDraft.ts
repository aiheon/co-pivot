import type {SessionSummary} from '@/features/sessions/types/session';

export function generateResumeNoteDraft(session: SessionSummary) {
  const goal = deriveGoal(session);
  const currentState = deriveCurrentState(session);
  const nextStep = deriveNextStep(session);

  return [
    `Goal: ${goal}`,
    `Now: ${currentState}`,
    `Next: ${nextStep}`,
  ].join('\n');
}

function deriveGoal(session: SessionSummary) {
  const firstUserMessage = session.messages.find((message) => message.role === 'user')?.text.trim();

  if (firstUserMessage) {
    return toSentence(firstUserMessage);
  }

  return toSentence(session.title);
}

function deriveCurrentState(session: SessionSummary) {
  if (session.lastSnippet.trim()) {
    return toSentence(session.lastSnippet);
  }

  const lastAssistantMessage = [...session.messages]
    .reverse()
    .find((message) => message.role === 'assistant')?.text.trim();

  if (lastAssistantMessage) {
    return toSentence(lastAssistantMessage);
  }

  return `Session has ${session.messageCount} messages in ${session.workspaceLabel}.`;
}

function deriveNextStep(session: SessionSummary) {
  const lastUserMessage = [...session.messages]
    .reverse()
    .find((message) => message.role === 'user')?.text.trim();

  if (lastUserMessage) {
    return `Continue from the latest user ask: ${toSentence(lastUserMessage)}`;
  }

  if (session.branch) {
    return `Re-open the session and continue on branch ${session.branch}.`;
  }

  return `Re-open the session and continue the investigation in ${session.workspaceLabel}.`;
}

function toSentence(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return 'No summary available.';
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}
