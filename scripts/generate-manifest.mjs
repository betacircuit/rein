#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const manifestPath = path.join(root, "SPEC_MANIFEST.json");
const ignoredNames = new Set(["SPEC_MANIFEST.json", "student-os-codex-pack.zip", ".DS_Store"]);
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".turbo",
  "artifacts",
  "graphify-out",
  "node_modules",
  "playwright-report",
  "test-results",
]);

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredNames.has(entry.name)) continue;
    if (entry.name.startsWith(".env") && !entry.name.endsWith(".example")) continue;
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(absolutePath));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }
  return files;
}

function isText(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  return !sample.includes(0);
}

const requirementLedger = JSON.parse(
  fs.readFileSync(path.join(root, "requirements", "requirements.json"), "utf8"),
);
const requirements = requirementLedger.requirements;
const areaCounts = {};
const phaseCounts = {};
const priorityCounts = {};
for (const requirement of requirements) {
  areaCounts[requirement.area] = (areaCounts[requirement.area] ?? 0) + 1;
  phaseCounts[requirement.phase] = (phaseCounts[requirement.phase] ?? 0) + 1;
  priorityCounts[requirement.priority] = (priorityCounts[requirement.priority] ?? 0) + 1;
}

const files = walk(root)
  .sort((a, b) => a.localeCompare(b))
  .map((absolutePath) => {
    const buffer = fs.readFileSync(absolutePath);
    const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
    const text = isText(buffer) ? buffer.toString("utf8") : null;
    return {
      path: relativePath,
      bytes: buffer.length,
      ...(text === null ? {} : { lines: text.length === 0 ? 0 : text.split(/\r?\n/).length }),
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    };
  });

const manifest = {
  project: "rein",
  artifact_kind: "codex-full-build-specification-pack",
  version: requirementLedger.version ?? "1.0.0",
  generated_at: new Date().toISOString(),
  locale: "ko-KR",
  currency: "KRW",
  timezone: "Asia/Seoul",
  top_navigation: ["Home", "Tutoring", "Money", "Household", "Settings"],
  requirement_count: requirements.length,
  requirement_counts_by_area: areaCounts,
  requirement_counts_by_phase: phaseCounts,
  requirement_counts_by_priority: priorityCounts,
  source_of_truth: [
    "AGENTS.md",
    "requirements/requirements.json",
    "PRODUCT_REQUIREMENTS.md",
    "DOMAIN_RULES.md",
    "TRACEABILITY_MATRIX.md",
  ],
  entrypoints: {
    human: "START_HERE.md",
    codex: "MASTER_CODEX_PROMPT.md",
    agent_instructions: "AGENTS.md",
    setup: "MCP_AND_SKILLS_SETUP.md",
  },
  file_count_excluding_manifest: files.length,
  files,
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, manifestPath)} with ${files.length} file checksums.`);
