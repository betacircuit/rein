#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function occurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while (true) {
    const index = haystack.indexOf(needle, offset);
    if (index === -1) return count;
    count += 1;
    offset = index + needle.length;
  }
}

const ledgerText = read("requirements/requirements.json");
let ledger;
try {
  ledger = JSON.parse(ledgerText);
} catch (error) {
  fail(`requirements/requirements.json is not valid JSON: ${error.message}`);
  ledger = { requirements: [] };
}

const requirements = Array.isArray(ledger.requirements) ? ledger.requirements : [];
if (!Array.isArray(ledger.requirements)) {
  fail("requirements/requirements.json must contain a requirements array.");
}
if (requirements.length === 0) {
  fail("Requirement ledger is empty.");
}

const allowedPriorities = new Set(["P0", "P1", "P2"]);
const allowedPhases = new Set([
  "00",
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "backlog",
]);
const idPattern = /^(CTX|CORE|TUT|MON|SUB|GROW|HOM|DASH|INT|UX|SEC|FUT)-\d{3}$/;
const seen = new Set();
const byArea = new Map();
const byPhase = new Map();
const byPriority = new Map();

for (const item of requirements) {
  for (const key of ["id", "area", "priority", "phase", "requirement", "acceptance"]) {
    if (typeof item[key] !== "string" || item[key].trim() === "") {
      fail(`Requirement ${item.id ?? "<unknown>"} has an empty or invalid ${key}.`);
    }
  }
  if (typeof item.id !== "string") continue;
  if (!idPattern.test(item.id)) fail(`Invalid requirement ID format: ${item.id}`);
  if (seen.has(item.id)) fail(`Duplicate requirement ID: ${item.id}`);
  seen.add(item.id);
  if (!allowedPriorities.has(item.priority))
    fail(`${item.id} has unsupported priority ${item.priority}.`);
  if (!allowedPhases.has(item.phase)) fail(`${item.id} has unsupported phase ${item.phase}.`);
  byArea.set(item.area, (byArea.get(item.area) ?? 0) + 1);
  byPhase.set(item.phase, (byPhase.get(item.phase) ?? 0) + 1);
  byPriority.set(item.priority, (byPriority.get(item.priority) ?? 0) + 1);
}

const product = read("PRODUCT_REQUIREMENTS.md");
const traceability = read("TRACEABILITY_MATRIX.md");
const masterPrompt = read("MASTER_CODEX_PROMPT.md");
const acceptance = read("ACCEPTANCE_CRITERIA.md");
const plans = read("PLANS.md");

const phaseFiles = new Map([
  ["00", "harness/build/phase-00-foundation.md"],
  ["01", "harness/build/phase-01-auth-household-boundary.md"],
  ["02", "harness/build/phase-02-tutoring.md"],
  ["03", "harness/build/phase-03-money-receivables.md"],
  ["04", "harness/build/phase-04-subscriptions.md"],
  ["05", "harness/build/phase-05-household-operations.md"],
  ["06", "harness/build/phase-06-shared-money.md"],
  ["07", "harness/build/phase-07-home-grow-analytics.md"],
  ["08", "harness/build/phase-08-integrations.md"],
  ["09", "harness/build/phase-09-hardening-release.md"],
  ["backlog", "harness/build/backlog.md"],
]);

const harnessTexts = new Map();
for (const [phase, relativePath] of phaseFiles) {
  harnessTexts.set(phase, read(relativePath));
}
const allHarness = [...harnessTexts.values()].join("\n");

for (const item of requirements) {
  const id = item.id;
  if (occurrences(product, `| ${id} |`) !== 1) {
    fail(`${id} must occur exactly once as a row in PRODUCT_REQUIREMENTS.md.`);
  }
  if (occurrences(traceability, `| ${id} |`) !== 1) {
    fail(`${id} must occur exactly once as a row in TRACEABILITY_MATRIX.md.`);
  }
  if (occurrences(masterPrompt, `**${id} `) !== 1) {
    fail(`${id} must occur exactly once in the master prompt requirement ledger.`);
  }
  const expectedHarness = harnessTexts.get(item.phase) ?? "";
  if (occurrences(expectedHarness, `### [ ] ${id} `) !== 1) {
    fail(`${id} is missing from its planned harness phase ${item.phase}.`);
  }
  if (occurrences(allHarness, `### [ ] ${id} `) !== 1) {
    fail(`${id} must occur in exactly one harness file.`);
  }
}

const knownIds = new Set(requirements.map((item) => item.id));
for (const [relativePath, text] of [
  ["PRODUCT_REQUIREMENTS.md", product],
  ["TRACEABILITY_MATRIX.md", traceability],
  ["MASTER_CODEX_PROMPT.md", masterPrompt],
  ["ACCEPTANCE_CRITERIA.md", acceptance],
  ["PLANS.md", plans],
  ...[...phaseFiles.entries()].map(([phase, relativePath]) => [
    relativePath,
    harnessTexts.get(phase) ?? "",
  ]),
]) {
  const found =
    text.match(/\b(?:CTX|CORE|TUT|MON|SUB|GROW|HOM|DASH|INT|UX|SEC|FUT)-\d{3}\b/g) ?? [];
  for (const id of found) {
    if (!knownIds.has(id)) fail(`${relativePath} references unknown requirement ID ${id}.`);
  }
}

const p0p1 = requirements.filter((item) => item.priority === "P0" || item.priority === "P1");
const acceptanceReferenced = p0p1.filter((item) => acceptance.includes(item.id));
if (acceptanceReferenced.length < 20) {
  fail("ACCEPTANCE_CRITERIA.md does not reference enough cross-cutting P0/P1 requirements.");
}

const expectedAreas = [
  "Context",
  "Core IA",
  "Tutoring",
  "Money",
  "Subscriptions",
  "Grow",
  "Household",
  "Home dashboard",
  "Integrations",
  "UX",
  "Security",
  "Backlog",
];
for (const area of expectedAreas) {
  if (!byArea.has(area)) fail(`Requirement ledger is missing area: ${area}`);
}

if (!masterPrompt.includes("Continue through phases without waiting for another prompt")) {
  fail(
    "MASTER_CODEX_PROMPT.md must explicitly direct Codex to continue autonomously through phases.",
  );
}
if (!masterPrompt.includes("There is absolutely no makeup/보강")) {
  fail("MASTER_CODEX_PROMPT.md must preserve the no-makeup tutoring invariant.");
}
if (!masterPrompt.includes("chicken breast and Monster")) {
  fail("MASTER_CODEX_PROMPT.md must preserve the exact household inventory context.");
}
if (!masterPrompt.includes("Monthly subscriptions")) {
  warn(
    "Master prompt subscription heading wording changed; verify subscription hierarchy remains explicit.",
  );
}

console.log("Student OS specification coverage");
console.log(`- Requirements: ${requirements.length}`);
console.log(`- Unique IDs: ${seen.size}`);
console.log(
  `- Areas: ${[...byArea.entries()].map(([key, value]) => `${key}=${value}`).join(", ")}`,
);
console.log(
  `- Phases: ${[...byPhase.entries()]
    .sort()
    .map(([key, value]) => `${key}=${value}`)
    .join(", ")}`,
);
console.log(
  `- Priorities: ${[...byPriority.entries()]
    .sort()
    .map(([key, value]) => `${key}=${value}`)
    .join(", ")}`,
);

for (const message of warnings) console.warn(`WARN: ${message}`);
if (failures.length > 0) {
  for (const message of failures) console.error(`FAIL: ${message}`);
  process.exit(1);
}
console.log(
  "PASS: every requirement is unique and traceable through the ledger, product spec, master prompt, and exactly one build phase.",
);
