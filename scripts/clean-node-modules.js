import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const TARGETS = [
  "backend",
  "frontend",
  "frontend/renderer"
];

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function removeNodeModules(dir) {
  const nmPath = path.join(dir, "node_modules");
  if (await exists(nmPath)) {
    console.log(`🧹 Removing: ${nmPath}`);
    await fs.rm(nmPath, { recursive: true, force: true });
    return 1;
  }
  return 0;
}

async function main() {
  let removed = 0;

  for (const rel of TARGETS) {
    const abs = path.join(ROOT, rel);
    if (await exists(abs)) {
      removed += await removeNodeModules(abs);
    }
  }

  console.log(`\nDone. node_modules removed: ${removed}`);
}

main().catch((err) => {
  console.error("Clean failed:", err);
  process.exit(1);
});
