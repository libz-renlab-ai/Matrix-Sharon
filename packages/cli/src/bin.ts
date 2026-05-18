#!/usr/bin/env node
import { installCommand, parseSlugAt } from "./commands/install.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { publishCommand } from "./commands/publish.js";
import { scanCommand } from "./commands/scan.js";
import { receiveCommand } from "./commands/receive.js";

const HELP = `\
sharon — Matrix-Sharon CLI

Usage:
  sharon <command> [args]

Commands:
  install <slug>[@<semver>]   Install a skill into ~/.claude/skills/<slug>/
  uninstall <slug>            Remove an installed skill
  publish <dir>               Submit a local skill directory for approval
  scan                        Detect local ~/.claude/skills/* and post as candidates
  receive                     Poll inbox + dispatch leader pushes locally
  --help, -h                  Show this help

Env vars:
  SHARON_BASE_URL   sharon server URL (default: http://127.0.0.1:4321)
  SHARON_TOKEN      session cookie value (paste from browser DevTools → sharon_session)

Examples:
  SHARON_TOKEN=… sharon install sql-safety-gate
  SHARON_TOKEN=… sharon install pr-review-checklist@2
  SHARON_TOKEN=… sharon uninstall sql-safety-gate
  SHARON_TOKEN=… sharon publish ./my-skill-dir
  SHARON_TOKEN=… sharon receive
`;

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "--help" || cmd === "-h") {
    process.stdout.write(HELP);
    return;
  }
  switch (cmd) {
    case "install": {
      const arg = rest[0];
      if (!arg) throw new Error("usage: sharon install <slug>[@<semver>]");
      await installCommand(parseSlugAt(arg));
      return;
    }
    case "uninstall": {
      const slug = rest[0];
      if (!slug) throw new Error("usage: sharon uninstall <slug>");
      await uninstallCommand({ slug });
      return;
    }
    case "publish": {
      const dir = rest[0];
      if (!dir) throw new Error("usage: sharon publish <dir>");
      await publishCommand({ dir });
      return;
    }
    case "scan": {
      await scanCommand();
      return;
    }
    case "receive": {
      await receiveCommand();
      return;
    }
    default:
      process.stderr.write(`sharon: unknown command '${cmd}'. Run 'sharon --help'.\n`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error((err as Error).message ?? err);
  process.exit(1);
});
