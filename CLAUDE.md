# Termex - Claude Code Rules

> Terminal + Experience | Open-source AI-native SSH client

## Project Overview

Termex is an open-source, AI-native SSH client built with Tauri v2 (Rust backend) + Vue 3 (TypeScript frontend). It targets developers and ops engineers who need a beautiful, fast, intelligent, and free SSH client.

## Tech Stack

- **Runtime**: Tauri v2
- **Backend**: Rust (russh, ring, SQLCipher, tokio)
- **Frontend**: Vue 3 + Vite + TypeScript
- **UI**: Element Plus + Tailwind CSS
- **Terminal**: xterm.js (WebGL renderer)
- **State**: Pinia
- **Database**: SQLite + SQLCipher (encrypted)

## Architecture

```
src-tauri/src/           # Rust backend
├── commands/            # Tauri IPC command handlers
├── ssh/                 # SSH protocol (russh)
├── sftp/                # SFTP operations
├── crypto/              # AES-256-GCM encryption, Argon2id KDF
├── storage/             # SQLCipher database
├── ai/                  # AI provider abstraction (Claude/OpenAI/Ollama)
└── state.rs             # Global AppState

src/                     # Vue 3 frontend
├── components/          # Vue components (sidebar/, terminal/, ai/, sftp/, settings/)
├── composables/         # Composition API hooks (useSSH, useTerminal, useAi, etc.)
├── stores/              # Pinia stores (serverStore, sessionStore, settingsStore, aiStore)
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

## Code Conventions

### Rust (src-tauri/)

- All Tauri commands are in `src/commands/`, one file per module
- Business logic lives in dedicated modules (`ssh/`, `crypto/`, `ai/`), NOT in command handlers
- Command handlers are thin wrappers: validate input → call module → return result
- Use `thiserror` for error types, map to `String` at the command boundary
- All async operations use `tokio`
- Never log passwords, API keys, or any sensitive data
- Use `uuid::Uuid::new_v4()` for all IDs
- Database timestamps use ISO 8601 format (`chrono::Utc::now().to_rfc3339()`)
- Encrypted fields (passwords, API keys) use the `_enc` suffix and store as `BLOB`
- All public functions must have doc comments

### TypeScript / Vue (src/)

- Use `<script setup lang="ts">` for all Vue components
- Use Composition API exclusively, no Options API
- Component naming: PascalCase files, multi-word names (e.g., `ServerItem.vue`, not `Item.vue`)
- All Tauri IPC calls go through `src/utils/tauri.ts` wrapper functions
- Type definitions in `src/types/`, one file per domain
- Pinia stores in `src/stores/`, one file per store
- Composables in `src/composables/`, prefixed with `use`
- CSS: use Tailwind utility classes first, Element Plus components for complex widgets, custom CSS only when necessary
- No inline styles except for dynamic values (e.g., `style="width: ${w}px"`)
- Event naming: kebab-case for template events, camelCase for emits

### General

- Commit messages: `<type>(<scope>): <description>` (e.g., `feat(ssh): add RSA key authentication`)
- Types: feat, fix, refactor, style, docs, test, chore
- Scopes: ssh, sftp, ui, ai, crypto, storage, config
- No `any` type in TypeScript — define proper interfaces
- No `unwrap()` in Rust production code — use `?` operator or proper error handling
- No hardcoded strings for user-facing text — prepare for i18n

## Security Rules (CRITICAL)

- **NEVER** store passwords or API keys in plaintext — always AES-256-GCM encrypt
- **NEVER** log sensitive data (passwords, keys, tokens) at any log level
- **NEVER** send credentials to AI providers — only send command text and server metadata (OS, hostname)
- **NEVER** include secrets in error messages returned to frontend
- All encryption uses `ring` crate with AES-256-GCM
- Key derivation uses Argon2id (m=64MB, t=3, p=4)
- Master key exists only in memory, zeroed on app lock
- Export files use independent password + salt, decoupled from master password

## IPC Conventions

- Frontend → Backend: `invoke("module_action", { params })` (e.g., `invoke("ssh_connect", { server_id })`)
- Backend → Frontend events: `emit("module://event/id", data)` (e.g., `emit("ssh://data/{session_id}", bytes)`)
- All IPC commands return `Result<T, String>`
- SSH terminal data uses high-frequency events, not request-response

## Testing

- Rust: `cargo test` for unit tests, `cargo test --test` for integration tests
- Frontend: Vitest for unit/component tests
- Crypto module must have comprehensive test coverage
- SSH tests use mock server where possible

## Performance Guidelines

- Startup time target: < 2 seconds
- Terminal input latency: < 16ms (60fps)
- Memory per session: < 100MB
- Support 20+ simultaneous tabs
- Use WebGL renderer for xterm.js by default
- Lazy-load settings panels and SFTP panel
- Debounce search input (300ms)
- SSH data events: batch small writes, don't emit per-byte

## File Naming

- Rust: snake_case for files and modules (`port_forward.rs`)
- Vue: PascalCase for components (`ServerItem.vue`)
- TypeScript: camelCase for non-component files (`serverStore.ts`)
- CSS: kebab-case for class names when custom (`terminal-cursor`)
- Database: snake_case for tables and columns (`auth_type`, `created_at`)

## Key Design Decisions

1. **SQLCipher over plain SQLite**: All user data is encrypted at rest
2. **russh over ssh2-rs**: Pure Rust, no C dependency, better async support
3. **Pinia over Vuex**: Lighter, better TypeScript support, Composition API native
4. **ring over RustCrypto**: More battle-tested, used by major projects
5. **Argon2id over PBKDF2**: Stronger against GPU/ASIC attacks for KDF
6. **Event-driven SSH data**: Events over invoke for real-time terminal data streaming
7. **Multi-provider AI**: Abstract trait allows plugging any LLM backend
8. **User brings own key**: No proxy server, no Termex backend, pure local app

## Documentation

- `docs/requirements.md` — Product requirements and feature specs
- `docs/detailed-design.md` — System architecture, database schema, API design
- `docs/prototype.html` — Interactive UI prototype (open in browser)

## What NOT to Do

- Do not add Electron or any web-based runtime alternative
- Do not create a backend server / SaaS component — this is a pure local app
- Do not add telemetry or analytics without explicit user consent
- Do not bypass SQLCipher encryption for "convenience"
- Do not store master password anywhere — it must be entered each session
- Do not make AI features mandatory — they must work with AI disabled
- Do not break cross-platform compatibility (test on Mac, Windows, Linux)
