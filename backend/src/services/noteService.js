import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { atomicWriteJson } from "./fsAtomic.js";
import { createNote, updateNote } from "../models/note.js";


export class NoteService {
  constructor(groupService) {
    this.groups = groupService;
  }

  _notePath(groupId, noteId) {
    return path.join(this.groups.getGroupNotesDir(groupId), `${noteId}.json`);
  }

  async list(groupId) {
    await this.groups.ensureGroupExists(groupId);
    const dir = this.groups.getGroupNotesDir(groupId);

    let files = [];
    try {
      files = await fs.readdir(dir);
    } catch (e) {
      if (e.code === "ENOENT") return [];
      throw e;
    }

    files = files.filter((f) => f.endsWith(".json"));

    // лимит параллельных чтений: 10–30 обычно норм
    const limit = 20;

    const partials = await mapLimit(files, limit, async (f) => {
      const p = path.join(dir, f);
      try {
        const raw = await fs.readFile(p, "utf-8");
        const n = raw ? JSON.parse(raw) : null;
        if (!n?.id) return null;

        return {
          id: n.id,
          groupId: n.groupId,
          title: n.title,
          updatedAt: n.updatedAt,
        };
      } catch {
        return null; // битый файл или ошибка чтения: пропускаем
      }
    });

    const notes = partials.filter(Boolean);

    notes.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    return notes;
  }

  async get(groupId, noteId) {
    await this.groups.ensureGroupExists(groupId);
    const p = this._notePath(groupId, noteId);

    try {
      const raw = await fs.readFile(p, "utf-8");
      const n = raw ? JSON.parse(raw) : null;
      if (!n) throw new Error("NOTE_NOT_FOUND");
      return n;
    } catch (e) {
      if (e.code === "ENOENT") throw new Error("NOTE_NOT_FOUND");
      throw e;
    }
  }

  async create(groupId, { title, content, type, tags, metadata } = {}) {
    await this.groups.ensureGroupExists(groupId);

    const id = crypto.randomUUID();

    const note = createNote({
      id,
      groupId,
      title: (title ?? "").trim() || "Без названия",
      content: content ?? "",
      type,
      tags,
      metadata,
    });

    const p = this._notePath(groupId, id);
    await atomicWriteJson(p, note);
    return note;
  }


  async patch(groupId, noteId, patch) {
    const existing = await this.get(groupId, noteId);

    const updated = updateNote(existing, {
      title: patch?.title,
      content: patch?.content,
      type: patch?.type,
      tags: patch?.tags,
      metadata: patch?.metadata,
    });

    const p = this._notePath(groupId, noteId);
    await atomicWriteJson(p, updated);
    return updated;
  }


  async delete(groupId, noteId) {
    await this.groups.ensureGroupExists(groupId);
    const p = this._notePath(groupId, noteId);
    try {
      await fs.unlink(p);
    } catch (e) {
      if (e.code === "ENOENT") throw new Error("NOTE_NOT_FOUND");
      throw e;
    }
    return { ok: true };
  }
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await mapper(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
