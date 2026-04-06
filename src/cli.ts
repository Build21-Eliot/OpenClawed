#!/usr/bin/env node
import { createAdapterServer } from "./server.js";

function envString(key: string, defaultValue: string): string {
  const v = process.env[key];
  return v !== undefined && v !== "" ? v : defaultValue;
}

function envInt(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") {
    return defaultValue;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : defaultValue;
}

function envBool(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === "") {
    return defaultValue;
  }
  return raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
}

const host = envString("OPENCLAW_CLAUDE_ADAPTER_HOST", "127.0.0.1");
const port = envInt("OPENCLAW_CLAUDE_ADAPTER_PORT", 18789);
const modelId = envString("OPENCLAW_CLAUDE_ADAPTER_MODEL", "claude-code-local");
const claudeBinary = envString("CLAUDE_BIN", "claude");
const cwd = envString("OPENCLAW_CLAUDE_ADAPTER_CWD", process.cwd());
/** Default false: normal Claude Code auth. true: --bare (e.g. ANTHROPIC_API_KEY only). */
const bare = envBool("OPENCLAW_CLAUDE_ADAPTER_BARE", false);

const server = createAdapterServer({
  host,
  port,
  modelId,
  claudeBinary,
  cwd,
  bare,
});

server.listen(port, host, () => {
  process.stderr.write(
    `openclaw-claude-code-adapter listening on http://${host}:${port} (model ${modelId})\n`,
  );
});

server.on("error", (err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${msg}\n`);
  if (err instanceof Error && "code" in err && err.code === "EADDRINUSE") {
    process.stderr.write(
      `Port ${port} is in use. Stop the other process (e.g. lsof -iTCP:${port} -sTCP:LISTEN) or set OPENCLAW_CLAUDE_ADAPTER_PORT to a free port.\n`,
    );
  }
  process.exit(1);
});
