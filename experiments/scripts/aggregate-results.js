#!/usr/bin/env node
import { readFile } from "node:fs/promises";

function usage() {
  return [
    "Usage: node experiments/scripts/aggregate-results.js <result-json> [result-json...]",
    "",
    "Aggregates scored run JSON files by condition.",
  ].join("\n");
}

function aggregate(results) {
  const byCondition = new Map();
  for (const result of results) {
    const condition = result.condition ?? "unknown";
    const bucket = byCondition.get(condition) ?? [];
    bucket.push(result);
    byCondition.set(condition, bucket);
  }

  return {
    conditions: [...byCondition.entries()].map(([condition, items]) => ({
      condition,
      runs: items.length,
      continuationSuccessRate: average(items.map((item) => Number(Boolean(item.continuationSuccess)))),
      falseCompletionRate: average(items.map((item) => Number(Boolean(item.falseCompletion)))),
      averageTokenCost: average(items.map((item) => item.tokenCost ?? 0)),
      averageHandoffCompleteness: average(items.map((item) => item.handoffCompleteness ?? 0)),
      averageHandoffFaithfulness: average(items.map((item) => item.handoffFaithfulness ?? 0)),
      averageHandoffMinimality: average(items.map((item) => item.handoffMinimality ?? 0)),
      averageHandoffActionability: average(items.map((item) => item.handoffActionability ?? 0)),
    })),
  };
}

function average(values) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.log(usage());
    return;
  }

  const results = [];
  for (const file of files) {
    results.push(JSON.parse(await readFile(file, "utf8")));
  }
  console.log(JSON.stringify(aggregate(results), null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
