# Termex

**Beautiful. Fast. Intelligent. Free.**

An open-source, AI-native SSH client for developers and ops engineers.

---

## Why Termex?

|  | Termius | Tabby | WindTerm | Termex |
|--|---------|-------|----------|--------|
| Beautiful UI | Yes | Yes | No | Yes |
| Native Performance | Yes | No (Electron) | Yes | Yes (Tauri/Rust) |
| AI Integrated | No | No | No | Yes |
| Free | No | Yes | Yes | Yes |
| Config Portable | No | Partial | Partial | Yes (Encrypted) |

## Features

### Core (V0.1 MVP)
- SSH connection management with encrypted credential storage
- Server grouping with tree view
- Password & RSA/Ed25519 key authentication
- Terminal emulator powered by xterm.js (WebGL)
- Multi-tab sessions

### Productivity (V0.5)
- SFTP file browser (dual-pane, drag & drop)
- SSH port forwarding (local / remote / dynamic)
- Encrypted config export & import (.termex format)
- Theme system (Dark / Light / Custom)

### AI-Powered (V1.0)
- Dangerous command detection & blocking
- AI command explanation (right-click any command)
- Natural language to shell commands
- Smart autocomplete based on server context
- Multi-provider support (Claude / OpenAI / Ollama)
- User brings own API key, fully local, no proxy

## Tech Stack

```
Tauri v2 + Rust          — Backend, SSH, encryption, storage
Vue 3 + TypeScript       — Frontend framework
Element Plus             — UI components
Tailwind CSS             — Styling
xterm.js                 — Terminal rendering (WebGL)
SQLCipher                — Encrypted local database
russh                    — Pure-Rust SSH2 protocol
ring + Argon2id          — AES-256-GCM encryption & key derivation
```

## Keyboard Shortcuts

All shortcuts use `Cmd` on macOS and `Ctrl` on Windows/Linux.

### General

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New connection |
| `Ctrl+,` | Open settings |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+I` | Toggle AI panel |
| `Ctrl+Shift+P` | Command palette |
| `Escape` | Close modal / menu |

### Tabs

| Shortcut | Action |
|----------|--------|
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+W` | Close current tab |
| `Ctrl+1` ~ `Ctrl+9` | Go to tab 1-9 |

### Terminal

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+C` | Copy from terminal |
| `Ctrl+Shift+V` | Paste to terminal |
| `Ctrl+F` | Search in terminal |
| `Ctrl+L` | Clear terminal |
| `Ctrl+Shift+H` | Split terminal horizontally |

### AI

| Shortcut | Action |
|----------|--------|
| `Ctrl+E` | Explain selected command |
| `Ctrl+Enter` | Send AI message (in AI panel) |

## Security

- All credentials encrypted with **AES-256-GCM**
- Master password derived via **Argon2id** (m=64MB, t=3, p=4)
- Database encrypted with **SQLCipher**
- Export files independently encrypted with user-set password
- AI requests **never** include passwords, keys, or tokens
- No telemetry, no analytics, no phone-home

## Project Structure

```
termex/
├── CLAUDE.md                   # Claude Code rules
├── README.md                   # This file
├── docs/
│   ├── requirements.md         # Product requirements
│   ├── detailed-design.md      # Technical design
│   └── prototype.html          # Interactive UI prototype
├── src-tauri/                  # Rust backend
│   └── src/
│       ├── commands/           # Tauri IPC handlers
│       ├── ssh/                # SSH session & channel
│       ├── sftp/               # SFTP operations
│       ├── crypto/             # Encryption (AES-256-GCM, Argon2id)
│       ├── storage/            # SQLCipher database
│       └── ai/                 # AI provider abstraction
└── src/                        # Vue 3 frontend
    ├── components/             # UI components
    ├── composables/            # Composition API hooks
    ├── stores/                 # Pinia state management
    ├── types/                  # TypeScript definitions
    └── utils/                  # Utility functions
```

## Development

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) (20+)
- [pnpm](https://pnpm.io/) (recommended)
- Platform-specific Tauri v2 dependencies ([guide](https://v2.tauri.app/start/prerequisites/))

### Setup

```bash
# Clone
git clone https://github.com/user/termex.git
cd termex

# Install frontend dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm tauri dev` | Start dev server with hot reload |
| `pnpm tauri build` | Build production app |
| `cargo test` | Run Rust tests |
| `cargo clippy` | Lint Rust code |
| `cargo fmt` | Format Rust code |
| `pnpm run test` | Run frontend tests |
| `pnpm run lint` | Lint frontend code |

## Roadmap

- [x] Product requirements & prototype
- [x] Detailed technical design
- [ ] V0.1 — MVP (SSH + Terminal + Server Management)
- [ ] V0.5 — SFTP + Port Forwarding + Config Export
- [ ] V1.0 — AI Features (Detection, Explanation, NL2Cmd)
- [ ] V1.5 — Session Recording, Monitoring, Plugins

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a PR.

## License

[MIT](LICENSE)
