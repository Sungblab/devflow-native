#!/usr/bin/env node
import { readHarnessSmoke } from "../packages/core/src/index.js";

const summary = await readHarnessSmoke(process.cwd());

console.log(JSON.stringify(summary, null, 2));
process.exitCode = summary.status === "failed" ? 1 : 0;
