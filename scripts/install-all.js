import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";

const ROOT = process.cwd();
const PROJECTS = [
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

function runNpmInstall(cwd) {
  return new Promise((resolve, reject) => {
    console.log(`Installing dependencies in: ${cwd}`);

    const proc = spawn(
      "npm",
      ["install"],
      {
        cwd,
        stdio: "inherit",
        shell: process.platform === "win32"
      }
    );

    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm install failed in ${cwd} (exit ${code})`));
    });
  });
}

async function main() {
  for (const rel of PROJECTS) {
    const cwd = path.join(ROOT, rel);
    const pkg = path.join(cwd, "package.json");

    if (!(await exists(pkg))) {
      console.log(`Skip (no package.json): ${rel}`);
      continue;
    }

    await runNpmInstall(cwd);
  }

  console.log("\nAll dependencies installed.");
}

main().catch((err) => {
  console.error("Install failed:", err);
  process.exit(1);
});
