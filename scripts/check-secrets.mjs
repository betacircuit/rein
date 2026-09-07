#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignored = new Set([
  ".git",
  "node_modules",
  "playwright-report",
  "test-results",
  "coverage",
  "graphify-out",
]);
const extensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".sql",
  ".css",
  ".html",
]);
const patterns = [
  { name: "private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "GitHub token", regex: /(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/ },
  { name: "Google API key", regex: /AIza[0-9A-Za-z_-]{30,}/ },
  { name: "Stripe/OpenAI-style secret", regex: /\bsk_(?:live_)?[A-Za-z0-9]{20,}\b/ },
  {
    name: "JWT-like credential",
    regex: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
  },
  {
    name: "public privileged environment name",
    regex: /NEXT_PUBLIC_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET|PRIVATE_KEY|ACCESS_TOKEN|REFRESH_TOKEN)/,
  },
];

const candidates = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (extensions.has(path.extname(entry.name)) || entry.name === ".env.example")
      candidates.push(absolute);
  }
}
walk(root);

const failures = [];
for (const file of candidates) {
  const relative = path.relative(root, file);
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of patterns) {
    if (pattern.regex.test(content)) failures.push(`${relative}: ${pattern.name}`);
  }
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}
console.log(
  `PASS: ${candidates.length}개 로컬 소스/설정 파일에서 실제 비밀값 패턴이 발견되지 않았습니다.`,
);
