#!/usr/bin/env node
import { compactJson, readHookInput, runDevflow, writeHookContext } from "./devflow-hook-lib.mjs";

const input = await readHookInput();
const repoPath = input.cwd ?? process.cwd();
const doctor = runDevflow(repoPath, ["doctor", "--json"]);
const status = runDevflow(repoPath, ["status", "--json"]);

const context = [
  "Devflow start context:",
  "- Devflow is the repo-local continuity layer for Codex/Claude sessions.",
  "- Use structured state and compact summaries as the source of truth.",
  "- Keep Superpowers as an optional workflow profile, not a required runtime.",
  "- Do not generate HTML unless requested or the state is too dense for text.",
  "",
  "Doctor:",
  compactJson(doctor, 1800),
  "",
  "Status:",
  compactJson(status, 2200),
].join("\n");

writeHookContext(input.hook_event_name ?? "SessionStart", context);
