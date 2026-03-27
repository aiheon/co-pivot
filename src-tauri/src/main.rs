#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
use std::path::{Path, PathBuf};

use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionSummary {
    id: String,
    title: String,
    workspace_label: String,
    workspace_path: String,
    status: String,
    updated_at: String,
    started_at: String,
    last_snippet: String,
    message_count: usize,
    branch: Option<String>,
    tags: Vec<String>,
    messages: Vec<SessionMessage>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionMessage {
    id: String,
    role: String,
    text: String,
    created_at: String,
}

#[derive(Debug, Deserialize)]
struct WorkspaceMetadata {
    id: Option<String>,
    cwd: Option<String>,
    git_root: Option<String>,
    repository: Option<String>,
    host_type: Option<String>,
    branch: Option<String>,
    summary: Option<String>,
    created_at: Option<String>,
    updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Event {
    #[serde(rename = "type")]
    event_type: String,
    id: String,
    timestamp: String,
    data: EventData,
}

#[derive(Debug, Deserialize, Default)]
struct EventData {
    content: Option<String>,
}

#[tauri::command]
fn list_sessions() -> Result<Vec<SessionSummary>, String> {
    let session_root = session_state_root().ok_or_else(|| "Unable to determine session-state path".to_string())?;

    if !session_root.exists() {
        return Ok(Vec::new());
    }

    let mut sessions = Vec::new();
    let entries = fs::read_dir(&session_root).map_err(|err| err.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        if let Some(session) = parse_session_dir(&path) {
            sessions.push(session);
        }
    }

    sessions.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    Ok(sessions)
}

fn parse_session_dir(path: &Path) -> Option<SessionSummary> {
    let workspace = read_workspace(path.join("workspace.yaml"))?;
    let messages = read_messages(path.join("events.jsonl"));

    let updated_at = workspace
        .updated_at
        .clone()
        .or_else(|| messages.last().map(|message| message.created_at.clone()))
        .unwrap_or_default();
    let started_at = workspace
        .created_at
        .clone()
        .or_else(|| messages.first().map(|message| message.created_at.clone()))
        .unwrap_or_else(|| updated_at.clone());

    let workspace_path = workspace
        .cwd
        .clone()
        .or(workspace.git_root.clone())
        .unwrap_or_else(|| path.to_string_lossy().to_string());
    let workspace_label = derive_workspace_label(&workspace_path);
    let title = derive_title(&workspace, &messages, &workspace_label);
    let last_snippet = derive_last_snippet(&messages, &title);
    let status = derive_status(&updated_at);
    let tags = derive_tags(&workspace, &workspace_label);

    Some(SessionSummary {
        id: workspace
            .id
            .clone()
            .or_else(|| path.file_name().map(|name| name.to_string_lossy().to_string()))
            .unwrap_or_default(),
        title,
        workspace_label,
        workspace_path,
        status,
        updated_at,
        started_at,
        last_snippet,
        message_count: messages.len(),
        branch: workspace.branch.clone(),
        tags,
        messages,
    })
}

fn read_workspace(path: PathBuf) -> Option<WorkspaceMetadata> {
    let content = fs::read_to_string(path).ok()?;
    serde_yaml::from_str(&content).ok()
}

fn read_messages(path: PathBuf) -> Vec<SessionMessage> {
    let Ok(content) = fs::read_to_string(path) else {
        return Vec::new();
    };

    content
        .lines()
        .filter_map(|line| serde_json::from_str::<Event>(line).ok())
        .filter_map(|event| match event.event_type.as_str() {
            "user.message" => build_message(event, "user"),
            "assistant.message" => build_message(event, "assistant"),
            _ => None,
        })
        .collect()
}

fn build_message(event: Event, role: &str) -> Option<SessionMessage> {
    let text = event.data.content?.trim().to_string();
    if text.is_empty() {
        return None;
    }

    Some(SessionMessage {
        id: event.id,
        role: role.to_string(),
        text,
        created_at: event.timestamp,
    })
}

fn derive_workspace_label(workspace_path: &str) -> String {
    Path::new(workspace_path)
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| workspace_path.to_string())
}

fn derive_title(workspace: &WorkspaceMetadata, messages: &[SessionMessage], workspace_label: &str) -> String {
    if let Some(summary) = workspace.summary.as_ref().map(|value| value.trim()).filter(|value| !value.is_empty()) {
        return summary.to_string();
    }

    if let Some(message) = messages.first() {
        return truncate(&message.text, 64);
    }

    format!("Session in {}", workspace_label)
}

fn derive_last_snippet(messages: &[SessionMessage], title: &str) -> String {
    messages
        .last()
        .map(|message| truncate(&message.text, 140))
        .unwrap_or_else(|| title.to_string())
}

fn derive_status(updated_at: &str) -> String {
    let today = Utc::now().format("%Y-%m-%d").to_string();

    if updated_at.starts_with(&today) {
        return "active".to_string();
    }

    let current_month = &today[..7.min(today.len())];
    if updated_at.starts_with(current_month) {
        return "paused".to_string();
    }

    "stale".to_string()
}

fn derive_tags(workspace: &WorkspaceMetadata, workspace_label: &str) -> Vec<String> {
    let mut tags = Vec::new();

    if let Some(host_type) = workspace.host_type.as_ref().filter(|value| !value.is_empty()) {
        tags.push(host_type.to_string());
    }

    if let Some(repository) = workspace.repository.as_ref().and_then(|value| value.split('/').next_back()) {
        if repository != workspace_label {
            tags.push(repository.to_string());
        }
    }

    tags
}

fn truncate(value: &str, max_chars: usize) -> String {
    let mut chars = value.chars();
    let truncated: String = chars.by_ref().take(max_chars).collect();
    if chars.next().is_some() {
        format!("{}...", truncated.trim_end())
    } else {
        value.to_string()
    }
}


fn session_state_root() -> Option<PathBuf> {
    let home = env::var_os("HOME")?;
    Some(PathBuf::from(home).join(".copilot").join("session-state"))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![list_sessions])
        .run(tauri::generate_context!())
        .expect("error while running co-pivot");
}
