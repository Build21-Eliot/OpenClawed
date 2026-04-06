/**
 * v1: OpenAI-style messages → single transcript for `claude -p`.
 * - system, user, assistant: concatenated with role labels.
 * - tool / function: omitted (no mapping to Claude Code tools in v1).
 */

export type ChatMessage = {
  role: string;
  content: unknown;
};

function stringifyContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (content === null || content === undefined) {
    return "";
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "object" && part !== null && "text" in part) {
          return String((part as { text?: string }).text ?? "");
        }
        return typeof part === "string" ? part : JSON.stringify(part);
      })
      .join("");
  }
  return JSON.stringify(content);
}

export function messagesToClaudePrompt(messages: ChatMessage[]): string {
  const lines: string[] = [];
  for (const m of messages) {
    const role = m.role;
    if (role === "tool" || role === "function") {
      continue;
    }
    const text = stringifyContent(m.content).trim();
    if (!text) {
      continue;
    }
    const label =
      role === "system"
        ? "System"
        : role === "assistant"
          ? "Assistant"
          : role === "user"
            ? "User"
            : role;
    lines.push(`${label}:\n${text}`);
  }
  return lines.join("\n\n");
}
