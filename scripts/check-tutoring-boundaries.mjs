#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roots = ["src", "supabase", "e2e"];
const allowedExtensions = new Set([".ts", ".tsx", ".sql", ".json"]);
const forbiddenTerms = [["make", "up"].join(""), String.fromCodePoint(0xbcf4, 0xac15)];
const failures = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return allowedExtensions.has(path.extname(entry.name)) ? [target] : [];
  });
}

const files = roots.flatMap((directory) => walk(path.join(root, directory)));
for (const file of files) {
  const relative = path.relative(root, file);
  const contents = fs.readFileSync(file, "utf8").toLowerCase();
  for (const term of forbiddenTerms) {
    if (contents.includes(term)) failures.push(`${relative}: 허용되지 않은 수업 상태 용어`);
  }
  if (
    relative.includes(`${path.sep}tutoring${path.sep}`) &&
    /type\s*=\s*["']file["']/i.test(contents)
  ) {
    failures.push(`${relative}: 과외 MVP에 문서 업로드 입력이 있음`);
  }
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log(`PASS: ${files.length}개 파일에서 과외 상태 및 업로드 경계를 확인했습니다.`);
