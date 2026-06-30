import fs from "fs";
import path from "path";

const replacements = [['@/types"', '@/lib/types"']];
const skip = new Set(["node_modules", ".next", ".git"]);

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let next = content;

  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }

  if (next !== content) {
    fs.writeFileSync(filePath, next);
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(entryPath);
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry.name)) {
      updateFile(entryPath);
    }
  }
}

for (const target of ["app", "components", "lib", "middleware.ts", "instrumentation.ts"]) {
  if (!fs.existsSync(target)) {
    continue;
  }

  if (target.endsWith(".ts")) {
    updateFile(target);
    continue;
  }

  walk(target);
}

console.log("Type import paths updated.");
