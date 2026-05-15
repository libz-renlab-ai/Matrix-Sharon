#!/usr/bin/env node

const HELP = `\
sharon — Matrix-Sharon CLI

Usage:
  sharon <command> [args]

Commands (Phase 1: none implemented yet):
  init               Initialize local sharon config (Phase 2)
  login              Sign in via GitHub OAuth (Phase 2)
  publish <dir>      Publish a skill directory (Phase 4)
  install <slug>     Install a skill from Sharon (Phase 5)
  uninstall <slug>   Remove an installed skill (Phase 5)
  scan               Detect local candidate skills (Phase 4)
  --help, -h         Show this help

Phase 1 scaffold only. Run 'sharon --help' anytime.
`;

const arg = process.argv[2];
if (!arg || arg === "--help" || arg === "-h") {
  process.stdout.write(HELP);
  process.exit(0);
}
process.stderr.write(`sharon: unknown command '${arg}'. Run 'sharon --help'.\n`);
process.exit(1);
