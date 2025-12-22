import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".electron-notes-app");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

// дефолт: как у тебя раньше, рядом с backend
const DEFAULT_STORAGE = path.resolve("storage");

function ensureDirSync(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readConfigSafe() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeConfigSafe(cfg) {
  ensureDirSync(CONFIG_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
}

export function getStorageBasePath() {
  const cfg = readConfigSafe();
  const p = cfg.storageBasePath && String(cfg.storageBasePath).trim();
  return p ? p : DEFAULT_STORAGE;
}

export function setStorageBasePath(newPath) {
  // Пустая строка = сброс к дефолту (удаляем настройку)
  const p = String(newPath ?? "").trim();
  if (!p) {
    const cfg = readConfigSafe();
    delete cfg.storageBasePath;
    writeConfigSafe(cfg);
    return DEFAULT_STORAGE;
  }

  const resolved = path.resolve(p);
  ensureDirSync(resolved);

  const cfg = readConfigSafe();
  cfg.storageBasePath = resolved;
  writeConfigSafe(cfg);

  return resolved;
}

