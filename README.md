# openclaw-claude-code-adapter

Educational only. Not official; use at your own risk.

## Setup

1. [Claude Code](https://code.claude.com/docs) installed and signed in.
2. [Node.js](https://nodejs.org) 20+ (LTS).
3. Get the code — pick **one**:

   **Git clone** (needs [Git](https://git-scm.com)):

   ```bash
   git clone https://github.com/Build21-Eliot/OpenClawed.git
   cd OpenClawed
   ```

   **Download ZIP** (no Git): [download main branch](https://github.com/Build21-Eliot/OpenClawed/archive/refs/heads/main.zip) → unzip → `cd` into the `OpenClawed-main` folder (name may vary).

## Run

```bash
npm install && npm run build && npm start
```

Listens on **`http://127.0.0.1:18889`** (not **18789** — that’s usually OpenClaw’s gateway).

## OpenClaw

- **Custom provider** → **OpenAI-compatible**
- **Base URL:** `http://127.0.0.1:18889` (or `…/v1`)
- **API key:** skip / leave blank if the wizard allows it (the adapter doesn’t validate it)
- **Model ID:** **`claude-code-local`**

Optional: merge [`examples/openclaw.provider.json`](examples/openclaw.provider.json).

## Env

See [`src/cli.ts`](src/cli.ts). Defaults avoid hanging on permission prompts (`bypassPermissions`, `--tools default`).
