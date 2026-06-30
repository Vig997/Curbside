import fs from "fs";
import path from "path";

const replacements = [
  ['@/lib/constants"', '@/lib/config/constants"'],
  ['@/lib/env"', '@/lib/config/env"'],
  ['@/lib/feature-flags"', '@/lib/config/feature-flags"'],
  ['@/lib/validators"', '@/lib/helpers/validators"'],
  ['@/lib/profile"', '@/lib/helpers/profile"'],
  ['@/lib/safe-redirect"', '@/lib/helpers/safe-redirect"'],
  ['@/lib/mapbox"', '@/lib/integrations/mapbox"'],
  ['@/lib/geocoding"', '@/lib/integrations/geocoding"'],
  ['@/lib/listing-photos"', '@/lib/integrations/listing-photos"'],
  ['@/lib/utils"', '@/lib/helpers"']
];

const skip = new Set(["node_modules", ".next", ".git", "scripts"]);

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

    if (/\.(ts|tsx|mjs)$/.test(entry.name)) {
      updateFile(entryPath);
    }
  }
}

for (const target of ["app", "components", "lib", "types", "middleware.ts", "instrumentation.ts"]) {
  if (!fs.existsSync(target)) {
    continue;
  }

  if (target.endsWith(".ts")) {
    updateFile(target);
    continue;
  }

  walk(target);
}

console.log("Import paths updated.");
