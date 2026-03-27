# co-pivot

co-pivot is a local-first desktop app for browsing GitHub Copilot CLI sessions, comparing them side by side, and resuming the right conversation quickly.

## Product direction

- Desktop-first with `Electron + React + Mantine`
- Local-only v1 focused on GitHub Copilot CLI
- Split view supported from the start
- Dark mode by default, with light mode planned
- Resume action designed around `copilot --resume <id>`

## Current scaffold

- Mantine-based app shell with search and session list
- Free split view for two sessions
- Session domain model isolated under `src/features/sessions`
- Real local discovery of Copilot CLI sessions through `~/.copilot/session-state`
- Mock data fallback so UI work can continue outside Electron or when no local sessions are found
- Electron shell with preload bridge, ready for actions like resume and open-folder

## Planned milestones

1. Add resume/open-folder actions through Electron IPC
2. Add lightweight auto-refresh and better session health states
3. Improve status derivation and session summaries from richer event metadata
4. Add packaging and release flow for macOS

## Local development

### Prerequisites

- `bun`

### Install

```bash
bun install
```

### Run the desktop app

```bash
bun run dev
```

## Notes

- co-pivot reads Copilot CLI sessions from `~/.copilot/session-state`.
- In plain web mode, the app falls back to mock sessions because filesystem access goes through the Electron preload bridge.
