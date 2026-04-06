import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { runClaudeOnce, runClaudeStream } from "./claude.js";
import { messagesToClaudePrompt, type ChatMessage } from "./prompt.js";

export type AdapterEnv = {
  host: string;
  port: number;
  modelId: string;
  claudeBinary: string;
  cwd: string;
  bare: boolean;
};

type ChatCompletionRequest = {
  model?: string;
  messages?: ChatMessage[];
  stream?: boolean;
};

function readJsonBody(req: import("node:http").IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw) as unknown);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
    req.on("error", (err) => {
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

function json(res: import("node:http").ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function openAiError(
  res: import("node:http").ServerResponse,
  status: number,
  message: string,
  type = "adapter_error",
): void {
  json(res, status, {
    error: {
      message,
      type,
      code: status,
    },
  });
}

export function createAdapterServer(env: AdapterEnv): import("node:http").Server {
  const server = createServer((req, res) => {
    void handleRequest(env, req, res).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) {
        openAiError(res, 500, msg, "internal_error");
      } else {
        res.destroy();
      }
    });
  });
  return server;
}

async function handleRequest(
  env: AdapterEnv,
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${env.host}`);

  if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/")) {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  if (req.method === "GET" && url.pathname === "/v1/models") {
    const created = Math.floor(Date.now() / 1000);
    json(res, 200, {
      object: "list",
      data: [
        {
          id: env.modelId,
          object: "model",
          created,
          owned_by: "openclaw-claude-code-adapter",
        },
      ],
    });
    return;
  }

  if (req.method !== "POST" || url.pathname !== "/v1/chat/completions") {
    openAiError(res, 404, "Not found");
    return;
  }

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    openAiError(res, 400, "Invalid JSON body");
    return;
  }

  if (!isRecord(body)) {
    openAiError(res, 400, "Expected JSON object");
    return;
  }

  const parsed = body as ChatCompletionRequest;
  const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
  const prompt = messagesToClaudePrompt(messages);
  if (!prompt) {
    openAiError(res, 400, "No usable messages (empty or tool-only)");
    return;
  }

  const model = typeof parsed.model === "string" ? parsed.model : env.modelId;
  const stream = parsed.stream === true;

  const runOpts = {
    claudeBinary: env.claudeBinary,
    cwd: env.cwd,
    bare: env.bare,
    prompt,
  };

  if (!stream) {
    try {
      const text = await runClaudeOnce(runOpts);
      const id = `chatcmpl-${randomUUID()}`;
      const created = Math.floor(Date.now() / 1000);
      json(res, 200, {
        id,
        object: "chat.completion",
        created,
        model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: text },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      openAiError(res, 502, msg, "claude_cli_error");
    }
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const id = `chatcmpl-${randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);

  try {
    for await (const delta of runClaudeStream(runOpts)) {
      const chunk = {
        id,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [
          {
            index: 0,
            delta: { content: delta },
            finish_reason: null,
          },
        ],
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    const finalChunk = {
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: "stop",
        },
      ],
    };
    res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const errPayload = {
      error: {
        message: msg,
        type: "claude_cli_error",
      },
    };
    res.write(`data: ${JSON.stringify(errPayload)}\n\n`);
    res.end();
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
