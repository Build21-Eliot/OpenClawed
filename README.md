# openclaw-claude-code-adapter

**Educational purposes only.** Not an official product. For learning how OpenClaw can talk to Claude Code on your computer. Use at your own risk. Check compliance, billing, security, and anything else yourself. Production/sensitive workloads not supported.

---

## Before anything else: Claude Code

1. **Install [Claude Code](https://code.claude.com/docs)** on your Mac or PC and finish the setup steps there.
2. **Open Claude Code** (for example in your code editor or terminal, depending on how you installed it).
3. **Sign in** with your Anthropic account and make sure it works (you can ask it a simple question).

You need this working **before** the steps below. This small project does not replace Claude Code; it connects to the `claude` tool that Claude Code installs.

---

## What you need on your computer

- **Claude Code** installed and signed in (see above).
- **Node.js** (version 20 or newer). If you are not sure: go to [https://nodejs.org](https://nodejs.org), download the **LTS** installer, run it, then fully quit and reopen your terminal app.

---

## Get this project onto your computer

Pick one:

- **Download a ZIP** from the page where this code is hosted (for example GitHub: green **Code** button → **Download ZIP**). Double-click the ZIP to unzip it. Remember the folder name and where you saved it (for example your **Downloads** or **Desktop**).
- **Or** if someone gave you a **folder** on a drive or in the cloud, use that folder as-is.

You do **not** install this from an app store. You keep it as a normal folder.

---

## Start the adapter (copy and paste)

1. Open the **Terminal** app (Mac) or **Command Prompt / PowerShell** (Windows).
2. Go into the project folder. The easiest way on a Mac: type `cd ` (with a space after `cd`), then **drag the project folder** from Finder into the Terminal window and press **Enter**. On Windows, you can copy the folder path from File Explorer and use `cd` with that path.
3. Run these three lines, **one after the other**, pressing **Enter** after each:

```bash
npm install
npm run build
npm start
```

4. Leave this window open while you use the adapter. You should see a line saying it is listening on an address like `http://127.0.0.1:18789`.

**Quick check:** in your web browser, open [http://127.0.0.1:18789/health](http://127.0.0.1:18789/health). You should see the word `ok`.

If something fails, check that Node.js is installed and that you opened the terminal **in the correct folder** (the one that contains `package.json`).

---

## Connect OpenClaw (optional)

If you use OpenClaw, copy the settings from [`examples/openclaw.provider.json`](examples/openclaw.provider.json) into your OpenClaw config file and adjust the address if you changed the port.

---

## Advanced (only if you want to tweak behavior)

You can set options as environment variables in the terminal before `npm start` (for example `OPENCLAW_CLAUDE_ADAPTER_PORT` for a different port, or `OPENCLAW_CLAUDE_ADAPTER_HOST` to listen on all interfaces). See the top of [`src/cli.ts`](src/cli.ts) for the full list. Most people can skip this.
