const {app, BrowserWindow, ipcMain, shell} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const yaml = require('js-yaml');

const DEV_SERVER_URL = 'http://localhost:1420';
const SESSION_ROOT = path.join(os.homedir(), '.copilot', 'session-state');
const PREFERENCES_PATH = path.join(app.getPath('userData'), 'preferences.json');
const DEFAULT_TERMINAL = 'iterm';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#071017',
    title: 'co-pivot',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (!app.isPackaged) {
    mainWindow.loadURL(DEV_SERVER_URL);
    return;
  }

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('sessions:list', async () => listSessions());
  ipcMain.handle('shell:openPath', async (_event, targetPath) => shell.openPath(targetPath));
  ipcMain.handle('sessions:resume', async (_event, payload) => resumeSession(payload));
  ipcMain.handle('preferences:getTerminal', async () => getPreferredTerminal());
  ipcMain.handle('preferences:setTerminal', async (_event, terminal) => setPreferredTerminal(terminal));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

function listSessions() {
  if (!fs.existsSync(SESSION_ROOT)) {
    return [];
  }

  const sessionDirs = fs
    .readdirSync(SESSION_ROOT, {withFileTypes: true})
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(SESSION_ROOT, entry.name));

  return sessionDirs
    .map(parseSessionDir)
    .filter(Boolean)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function parseSessionDir(sessionDir) {
  const workspacePath = path.join(sessionDir, 'workspace.yaml');
  if (!fs.existsSync(workspacePath)) {
    return null;
  }

  const workspace = readWorkspace(workspacePath);
  const messages = readMessages(path.join(sessionDir, 'events.jsonl'));
  const updatedAt = normalizeTimestamp(workspace.updated_at) || lastMessageDate(messages) || '';
  const startedAt = normalizeTimestamp(workspace.created_at) || firstMessageDate(messages) || updatedAt;
  const projectPath = workspace.cwd || workspace.git_root || sessionDir;
  const workspaceLabel = path.basename(projectPath);
  const title = deriveTitle(workspace, messages, workspaceLabel);

  return {
    id: workspace.id || path.basename(sessionDir),
    title,
    workspaceLabel,
    workspacePath: projectPath,
    status: deriveStatus(updatedAt),
    updatedAt,
    startedAt,
    lastSnippet: deriveLastSnippet(messages, title),
    messageCount: messages.length,
    branch: workspace.branch || undefined,
    tags: deriveTags(workspace, workspaceLabel),
    messages,
  };
}

function readWorkspace(filePath) {
  try {
    return yaml.load(fs.readFileSync(filePath, 'utf8')) || {};
  } catch {
    return {};
  }
}

function readMessages(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((event) => event.type === 'user.message' || event.type === 'assistant.message')
    .map((event) => ({
      id: event.id,
      role: event.type === 'user.message' ? 'user' : 'assistant',
      text: (event.data?.content || '').trim(),
      createdAt: event.timestamp,
    }))
    .filter((message) => message.text.length > 0);
}

function deriveTitle(workspace, messages, workspaceLabel) {
  if (typeof workspace.summary === 'string' && workspace.summary.trim()) {
    return workspace.summary.trim();
  }

  if (messages[0]?.text) {
    return truncate(messages[0].text, 64);
  }

  return `Session in ${workspaceLabel}`;
}

function deriveLastSnippet(messages, fallback) {
  if (messages.length === 0) {
    return fallback;
  }

  return truncate(messages[messages.length - 1].text, 140);
}

function normalizeTimestamp(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }

  return '';
}

function deriveStatus(updatedAt) {
  if (!updatedAt) {
    return 'stale';
  }

  const today = new Date().toISOString().slice(0, 10);
  if (updatedAt.startsWith(today)) {
    return 'active';
  }

  const currentMonth = today.slice(0, 7);
  if (updatedAt.startsWith(currentMonth)) {
    return 'paused';
  }

  return 'stale';
}

function deriveTags(workspace, workspaceLabel) {
  const tags = [];

  if (typeof workspace.host_type === 'string' && workspace.host_type) {
    tags.push(workspace.host_type);
  }

  if (typeof workspace.repository === 'string' && workspace.repository) {
    const repoName = workspace.repository.split('/').at(-1);
    if (repoName && repoName !== workspaceLabel) {
      tags.push(repoName);
    }
  }

  return tags;
}

function truncate(value, maxChars) {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars).trimEnd()}...`;
}

function firstMessageDate(messages) {
  return messages[0]?.createdAt || '';
}

function lastMessageDate(messages) {
  return messages[messages.length - 1]?.createdAt || '';
}

function resumeSession(payload) {
  const sessionId = typeof payload?.sessionId === 'string' ? payload.sessionId : '';
  const preferredTerminal = normalizeTerminal(payload?.terminal) || getPreferredTerminal();

  if (!sessionId) {
    throw new Error('A session id is required to resume a Copilot session.');
  }

  assertCopilotAvailable();

  if (preferredTerminal === 'terminal') {
    openInTerminal(sessionId);
  } else {
    openInITerm(sessionId);
  }

  return {ok: true};
}

function openInTerminal(sessionId) {
  const shellCommand = `copilot --resume ${shellEscape(sessionId)}`;
  execFileSync('osascript', ['-e', `tell application "Terminal" to do script ${appleScriptString(shellCommand)}`]);
  execFileSync('osascript', ['-e', 'tell application "Terminal" to activate']);
}

function openInITerm(sessionId) {
  const shellCommand = `copilot --resume ${shellEscape(sessionId)}`;
  const script = [
    'tell application "iTerm"',
    'activate',
    'create window with default profile',
    `tell current session of current window to write text ${appleScriptString(shellCommand)}`,
    'end tell',
  ].join('\n');

  try {
    execFileSync('osascript', ['-e', script]);
  } catch {
    const error = new Error('iTerm could not be opened. Make sure iTerm is installed or switch the selector back to Terminal.');
    error.code = 'ITERM_UNAVAILABLE';
    throw error;
  }
}

function assertCopilotAvailable() {
  try {
    execFileSync('bash', ['-lc', 'command -v copilot'], {stdio: 'ignore'});
  } catch {
    const error = new Error('GitHub Copilot CLI was not found in your shell PATH. Install it or make sure the `copilot` command is available, then try again.');
    error.code = 'COPILOT_NOT_FOUND';
    throw error;
  }
}

function getPreferredTerminal() {
  const preferences = readPreferences();
  return normalizeTerminal(preferences.terminal) || DEFAULT_TERMINAL;
}

function setPreferredTerminal(terminal) {
  const value = normalizeTerminal(terminal) || DEFAULT_TERMINAL;
  const preferences = readPreferences();
  preferences.terminal = value;
  fs.mkdirSync(path.dirname(PREFERENCES_PATH), {recursive: true});
  fs.writeFileSync(PREFERENCES_PATH, JSON.stringify(preferences, null, 2));
  return value;
}

function readPreferences() {
  try {
    return JSON.parse(fs.readFileSync(PREFERENCES_PATH, 'utf8')) || {};
  } catch {
    return {};
  }
}

function normalizeTerminal(value) {
  return value === 'terminal' ? 'terminal' : value === 'iterm' ? 'iterm' : null;
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function appleScriptString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
