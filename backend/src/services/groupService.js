import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { atomicWriteJson } from "./fsAtomic.js";
import { getStorageBasePath } from "./storagePath.js";

export class GroupService {
  /**
   * Если storageRoot не передан явно, берём его из настроек (getStorageBasePath()).
   * Важно: пути НЕ кэшируем, чтобы смена папки работала сразу.
   */
  constructor({ storageRoot = null } = {}) {
    this.explicitStorageRoot = storageRoot ? path.resolve(storageRoot) : null;
  }

  _root() {
    return this.explicitStorageRoot ?? getStorageBasePath();
  }

  _groupsFile() {
    return path.join(this._root(), "groups.json");
  }

  _groupsDir() {
    return path.join(this._root(), "groups");
  }

  async ensure() {
    const root = this._root();
    const groupsDir = this._groupsDir();
    const groupsFile = this._groupsFile();

    await fs.mkdir(root, { recursive: true });
    await fs.mkdir(groupsDir, { recursive: true });

    try {
      await fs.access(groupsFile);
    } catch {
      await fs.writeFile(groupsFile, JSON.stringify([], null, 2), "utf-8");
    }
  }

  async _read() {
    await this.ensure();
    const groupsFile = this._groupsFile();

    const raw = await fs.readFile(groupsFile, "utf-8");
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) throw new Error("BAD_GROUPS_FILE");
    return arr;
  }

  async _write(groups) {
    await this.ensure();
    const groupsFile = this._groupsFile();
    await atomicWriteJson(groupsFile, groups);
  }

  async list() {
    return await this._read();
  }

  async create(title) {
    const t = (title ?? "").trim();
    if (!t) throw new Error("INVALID_TITLE");

    const groups = await this._read();
    const exists = groups.some((g) => (g.title || "").toLowerCase() === t.toLowerCase());
    if (exists) throw new Error("GROUP_EXISTS");

    const id = crypto.randomUUID();
    const created = { id, title: t, createdAt: new Date().toISOString() };

    // создаём папку под заметки группы в текущем root
    await fs.mkdir(this.getGroupNotesDir(id), { recursive: true });

    groups.unshift(created);
    await this._write(groups);

    return created;
  }

  async rename(groupId, title) {
    const t = (title ?? "").trim();
    if (!t) throw new Error("INVALID_TITLE");

    const groups = await this._read();
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx === -1) throw new Error("GROUP_NOT_FOUND");

    const exists = groups.some(
      (g) => g.id !== groupId && (g.title || "").toLowerCase() === t.toLowerCase()
    );
    if (exists) throw new Error("GROUP_EXISTS");

    groups[idx] = { ...groups[idx], title: t };
    await this._write(groups);
    return groups[idx];
  }

  async delete(groupId, { cascade = true } = {}) {
    const groups = await this._read();
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx === -1) throw new Error("GROUP_NOT_FOUND");

    const groupPath = path.join(this._groupsDir(), groupId);

    if (!cascade) {
      // запретить удаление если есть заметки
      try {
        const notesDir = this.getGroupNotesDir(groupId);
        const files = await fs.readdir(notesDir);
        if (files.length > 0) throw new Error("GROUP_NOT_EMPTY");
      } catch (e) {
        if (e.code !== "ENOENT" && e.message !== "GROUP_NOT_EMPTY") throw e;
        if (e.message === "GROUP_NOT_EMPTY") throw e;
      }
    }

    await fs.rm(groupPath, { recursive: true, force: true });

    const removed = groups[idx];
    groups.splice(idx, 1);
    await this._write(groups);

    return { ok: true, removed };
  }

  async ensureGroupExists(groupId) {
    const groups = await this._read();
    const g = groups.find((x) => x.id === groupId);
    if (!g) throw new Error("GROUP_NOT_FOUND");

    await fs.mkdir(this.getGroupNotesDir(groupId), { recursive: true });
    return g;
  }

  getGroupNotesDir(groupId) {
    return path.join(this._groupsDir(), String(groupId), "notes");
  }
}

