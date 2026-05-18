#!/usr/bin/env node
import { tsImport } from "tsx/esm/api";
const mod = await tsImport("../src/index.ts", import.meta.url);
await mod.main();
