import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { PATHS } from "../config.js";
import { readJSON, writeJSONAtomic } from "../src/utils/fileUtils.js";
import { IndexStorage } from "./indexStorage.js";

export class GroupStorage {
  constructor() {
    this.index = new IndexStorage();
  }

  groupDir(groupId) {
    return path.join(PATHS.groups, groupId);
  }

  groupMetaPath(groupId) {
    return path.join(this.groupDir(groupId), "meta.json");
  }

  async list() {
    const idx = await this.index.load();
    return Object.entries(idx.groups).map(([id, g]) => ({ id, ...g }));
  }

  async create(title) {
    const id = `g_${crypto.randomUUID().slice(0, 8)}`;
    const dir = this.groupDir(id);

    const meta = { title, createdAt: new Date().toISOString() };

    await fs.mkdir(path.join(dir, "notes"), { recursive: true });
    await writeJSONAtomic(this.groupMetaPath(id), meta);

    await this.index.update((idx) => {
      idx.groups[id] = meta;
      return idx;
    });

    return { id, ...meta };
  }

  async rename(groupId, newTitle) {
    const metaPath = this.groupMetaPath(groupId);
    const meta = (await readJSON(metaPath));
    if (!meta) throw new Error(`Group ${groupId} not found`);

    meta.title = newTitle;

    await writeJSONAtomic(metaPath, meta);
    await this.index.update((idx) => {
      if (!idx.groups[groupId]) throw new Error(`Group ${groupId} not found`);
      idx.groups[groupId].title = newTitle;
      return idx;
    });

    return { id: groupId, ...meta };
  }

  async delete(groupId) {
    // удалить папку группы
    await fs.rm(this.groupDir(groupId), { recursive: true, force: true });

    // подчистить индекс (и заметки этой группы)
    await this.index.update((idx) => {
      delete idx.groups[groupId];
      for (const [noteId, noteMeta] of Object.entries(idx.notes)) {
        if (noteMeta.groupId === groupId) delete idx.notes[noteId];
      }
      return idx;
    });

    return groupId;
  }
}
