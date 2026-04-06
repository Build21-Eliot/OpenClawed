import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractStreamTextDelta(line: unknown): string | null {
  if (!isRecord(line)) {
    return null;
  }
  if (line.type !== "stream_event") {
    return null;
  }
  const event = line.event;
  if (!isRecord(event)) {
    return null;
  }
  const delta = event.delta;
  if (!isRecord(delta)) {
    return null;
  }
  if (delta.type !== "text_delta") {
    return null;
  }
  const text = delta.text;
  return typeof text === "string" ? text : null;
}

function extractResultPayload(line: unknown): { text: string; isError: boolean } | null {
  if (!isRecord(line)) {
    return null;
  }
  if (line.type !== "result") {
    return null;
  }
  const result = line.result;
  const text = typeof result === "string" ? result : "";
  const isError = line.is_error === true;
  return { text, isError };
}

export type RunClaudeOptions = {
  claudeBinary: string;
  cwd: string;
  bare: boolean;
  prompt: string;
};

export async function runClaudeOnce(options: RunClaudeOptions): Promise<string> {
  const args: string[] = [];
  if (options.bare) {
    args.push("--bare");
  }
  args.push("-p", options.prompt);
  args.push("--output-format", "json");

  const child = spawn(options.claudeBinary, args, {
    cwd: options.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  const stderrChunks: string[] = [];
  child.stderr?.on("data", (chunk: Buffer) => {
    stderrChunks.push(chunk.toString("utf8"));
  });

  const raw = await readStreamToString(child.stdout);
  const code = await waitForExit(child);
  const parsed = parseJsonLine(raw);
  if (!parsed) {
    throw new Error(mergeStderr(stderrChunks) || `claude: empty or invalid JSON (exit ${code})`);
  }
  const result = extractResultPayload(parsed);
  if (result) {
    if (result.isError) {
      throw new Error(result.text || "claude reported an error");
    }
    return result.text;
  }
  if (code !== 0) {
    throw new Error(mergeStderr(stderrChunks) || `claude exited with code ${code}`);
  }
  return "";
}

function mergeStderr(chunks: string[]): string {
  const s = chunks.join("").trim();
  return s || "";
}

function readStreamToString(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}

function waitForExit(child: ReturnType<typeof spawn>): Promise<number> {
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function parseJsonLine(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const lines = trimmed.split("\n").filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line) {
        continue;
      }
      try {
        return JSON.parse(line) as unknown;
      } catch {
        continue;
      }
    }
    return null;
  }
}

export async function* runClaudeStream(
  options: RunClaudeOptions,
): AsyncGenerator<string, void, undefined> {
  const args: string[] = [];
  if (options.bare) {
    args.push("--bare");
  }
  args.push("-p", options.prompt);
  args.push("--output-format", "stream-json", "--verbose", "--include-partial-messages");

  const child = spawn(options.claudeBinary, args, {
    cwd: options.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  const stdout = child.stdout;
  if (!stdout) {
    await waitForExit(child);
    return;
  }

  const rl = createInterface({ input: stdout, crlfDelay: Infinity });
  let exitCode = 0;
  try {
    for await (const line of rl) {
      if (!line.trim()) {
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(line) as unknown;
      } catch {
        continue;
      }
      const delta = extractStreamTextDelta(parsed);
      if (delta) {
        yield delta;
      }
      const result = extractResultPayload(parsed);
      if (result?.isError) {
        throw new Error(result.text || "claude reported an error");
      }
    }
  } finally {
    exitCode = await waitForExit(child);
  }
  if (exitCode !== 0) {
    throw new Error(`claude exited with code ${exitCode}`);
  }
}
