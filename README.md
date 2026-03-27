# co-pivot

co-pivot is a local-first desktop app for browsing GitHub Copilot CLI sessions, comparing them side by side, and resuming the right conversation quickly.

## What it does today

- Runs as a desktop app with `Electron + React + Mantine`
- Reads local GitHub Copilot CLI sessions from `~/.copilot/session-state`
- Lists sessions with status, workspace, and transcript previews
- Supports a free split view for comparing two sessions side by side
- Opens `iTerm` or `Terminal.app` with `copilot --resume <session-id>` when you click `Resume`
- Lets you choose the preferred terminal in the app, with the choice persisted locally
- Shows a clear in-app error if the `copilot` command is not available
- Falls back to mock data when the UI runs outside Electron
- Quits the Electron process when the last window closes

## Current architecture

- `src/`: React UI and session browsing experience
- `electron/main.cjs`: Electron main process, local session discovery, terminal preference persistence, and resume action
- `electron/preload.cjs`: secure bridge between Electron and the renderer
- `src/features/sessions/`: session models, mock data, loading logic, and resume wiring

## Local development

### Prerequisites

- `bun`
- GitHub Copilot CLI installed if you want the `Resume` action to work
- `iTerm` installed if you want to use `iTerm` as the preferred terminal

### Install dependencies

```bash
bun install
```

### Run the app

```bash
bun run dev
```

This starts Vite and Electron together.

### Type-check

```bash
bun run lint
```

## Notes

- co-pivot currently targets GitHub Copilot CLI only.
- Session discovery is based on the local Copilot session-state format, so we should expect that format to evolve over time.
- `Resume` opens a new terminal window/tab and keeps co-pivot open.
- The preferred terminal is stored locally in Electron user data.
- Packaging and release flow are still to be added.

## Next steps

1. Add `Open folder` from the session detail view
2. Improve session status and preview derivation from richer event data
3. Add packaging for macOS distribution
4. Explore richer multi-session workflows after the core actions feel solid
