# co-pivot

co-pivot is a local-first desktop app for browsing GitHub Copilot CLI sessions, comparing them side by side, and resuming the right conversation quickly.

## What it does today

- Runs as a desktop app with `Electron + React + Mantine`
- Reads local GitHub Copilot CLI sessions from `~/.copilot/session-state`
- Lists sessions with status, workspace, transcript previews, favorites, and sorting
- Supports a free split view for comparing two sessions side by side
- Opens `iTerm` or `Terminal.app` with `copilot --resume <session-id>` when you click `Resume`
- Lets you choose the preferred terminal in the app, with the choice persisted locally
- Supports dark and light themes, with dark mode enabled by default
- Uses a Gruvbox-inspired palette for the UI and transcript view
- Shows a clear in-app error if the `copilot` command is not available
- Falls back to mock data when the UI runs outside Electron
- Quits the Electron process when the last window closes

## Current architecture

- `src/`: React UI and session browsing experience
- `electron/main.cjs`: Electron main process, local session discovery, terminal preference persistence, and resume action
- `electron/preload.cjs`: secure bridge between Electron and the renderer
- `src/features/sessions/`: session models, mock data, loading logic, favorites, sorting, and resume wiring

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

## Build a macOS app

co-pivot can now be packaged as a real macOS application that you can move into `Applications` and launch from an app icon.

### Create a packaged app

```bash
bun run dist:dir
```

This produces a packaged `.app` bundle inside `release/mac`.

### Create distributable archives

```bash
bun run dist
```

This builds the app and generates macOS artifacts in `release/`, including a DMG.

### Install it in Applications

1. Run `bun run dist:dir` or `bun run dist`
2. Open the generated `release` folder
3. Drag `co-pivot.app` into `Applications`
4. Launch it from Launchpad, Spotlight, Finder, or the Applications folder

## Notes

- co-pivot currently targets GitHub Copilot CLI only.
- Session discovery is based on the local Copilot session-state format, so we should expect that format to evolve over time.
- `Resume` opens a new terminal window/tab and keeps co-pivot open.
- The preferred terminal is stored locally in Electron user data.
- Packaging currently uses the default Electron app icon until a custom icon is added.

## Next steps

1. Add a custom app icon for macOS packaging
2. Improve session status and preview derivation from richer event data
3. Explore richer multi-session workflows after the core actions feel solid
