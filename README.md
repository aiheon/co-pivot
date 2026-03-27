# co-pivot

co-pivot is a local-first desktop app for browsing GitHub Copilot CLI sessions, comparing them side by side, and resuming the right conversation quickly.

## Product direction

- Desktop-first with `Tauri + React + Mantine`
- Local-only v1 focused on GitHub Copilot CLI
- Split view supported from the start
- Dark mode by default, with light mode planned
- Resume action designed around `copilot --resume <id>`

## Current scaffold

- Mantine-based app shell with search and session list
- Free split view for two sessions
- Session domain model isolated under `src/features/sessions`
- Mock data fallback so UI work can continue before the local parser is wired
- Tauri shell scaffolded, but not yet connected to filesystem or CLI actions

## Planned milestones

1. Detect and parse local Copilot CLI session storage
2. Replace mock data with a filesystem-backed session source
3. Add resume/open-folder actions through Tauri commands
4. Add lightweight auto-refresh and better session health states
5. Add light theme polish and richer comparison workflows

## Local development

### Prerequisites

- `bun`
- Rust toolchain for Tauri (`rustup`, `cargo`, `rustc`)
- Tauri system prerequisites for macOS

### Install

```bash
bun install
```

### Run the web UI

```bash
bun run dev
```

### Run the desktop shell

```bash
bun run tauri dev
```

## Notes

- This repository currently uses mock sessions because the local Copilot CLI session format still needs to be mapped on your machine.
- Rust is not installed in the current environment, so the desktop shell cannot be launched from this session yet.
