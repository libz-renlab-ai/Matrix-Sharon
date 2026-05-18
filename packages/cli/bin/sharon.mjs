#!/usr/bin/env node
// Entry shim: load the TypeScript bin via tsx's programmatic API.
// This is the bin field target in package.json so `pnpm exec sharon` works
// without requiring a separate build step.
import { tsImport } from "tsx/esm/api";
await tsImport("../src/bin.ts", import.meta.url);
