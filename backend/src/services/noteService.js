import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { atomicWriteJson } from "./fsAtomic.js";
import { createNote, updateNote } from "../models/note.js";
import { extractRawRefs, resolveRefsToNoteIds } from "./linkService.js";
import { getStorageBasePath } from "./storagePath.js";

export class NoteService {
  constructor(groupService) {
    this.groups = groupService;
  }

  /**
   * Фолбэк: если groupService по какой-то причине не отдает путь к notes,
   * строим его сами из выбранного basePath.
   */
  _getGroupNotesDirFallback(groupId) {
    const base = getStorageBasePath();
    return path.join(base, "groups", String(groupId), "notes");
  }

  _getGroupNotesDir(groupId) {
    // ожидаемый путь: groups.getGroupNotesDir(groupId)
    const d = this.groups?.getGroupNotesDir?.(groupId);
    if (d && typeof d === "string") return d;

    // если groupService “не в курсе” про basePath
    return this._getGroupNotesDirFallback(groupId);
  }

  _notePath(groupId, noteId) {
    return path.join(this._getGroupNotesDir(groupId), `${noteId}.json`);
  }

  _normalizeTitle(title) {
    return String(title ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  async _ensureUniqueTitle(groupId, title, excludeId = null) {
    const normalized = this._normalizeTitle(title || "Без названия");
    const dir = this._getGroupNotesDir(groupId);

    let files = [];
    try {
      files = await fs.readdir(dir);
    } catch (e) {
      if (e.code === "ENOENT") return; // нет директории = нет заметок
      throw e;
    }

    files = files.filter((f) => f.endsWith(".json"));
    const limit = 20;

    const hits = await mapLimit(files, limit, async (f) => {
      const p = path.join(dir, f);
      try {
        const raw = await fs.readFile(p, "utf-8");
        const n = raw ? JSON.parse(raw) : null;
        if (!n?.id) return false;
        if (excludeId && String(n.id) === String(excludeId)) return false;

        const nt = this._normalizeTitle(n.title || "Без названия");
        return nt === normalized;
      } catch {
        return false; // битый файл пропускаем
      }
    });

    if (hits.some(Boolean)) {
      throw new Error("NOTE_TITLE_DUPLICATE");
    }
  }

  async list(groupId) {
    await this.groups.ensureGroupExists(groupId);
    const dir = this._getGroupNotesDir(groupId);

    let files = [];
    try {
      files = await fs.readdir(dir);
    } catch (e) {
      if (e.code === "ENOENT") return [];
      throw e;
    }

    files = files.filter((f) => f.endsWith(".json"));
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
        return null;
      }
    });

    const notes = partials.filter(Boolean);
    notes.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    return notes;
  }

  async _readAllNotes(groupId) {
    await this.groups.ensureGroupExists(groupId);
    const dir = this._getGroupNotesDir(groupId);

    let files = [];
    try {
      files = await fs.readdir(dir);
    } catch (e) {
      if (e.code === "ENOENT") return [];
      throw e;
    }

    files = files.filter((f) => f.endsWith(".json"));
    const limit = 20;

    const all = await mapLimit(files, limit, async (f) => {
      const p = path.join(dir, f);
      try {
        const raw = await fs.readFile(p, "utf-8");
        const n = raw ? JSON.parse(raw) : null;
        return n?.id ? n : null;
      } catch {
        return null;
      }
    });

    return all.filter(Boolean);
  }

  // Сырой get: возвращает заметку как в файле (без computed-полей)
  async _getRaw(groupId, noteId) {
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

  // computed links (не сохраняется)
  async getOutgoingLinks(groupId, note, notes = null) {
    const all = notes ?? (await this._readAllNotes(groupId));
    const rawRefs = extractRawRefs(note?.content || "");
    const targets = resolveRefsToNoteIds(rawRefs, all);

    return targets.filter((id) => String(id) !== String(note.id));
  }

  // Публичный get: возвращает заметку + outgoingLinks
  async get(groupId, noteId) {
    const n = await this._getRaw(groupId, noteId);
    const outgoingLinks = await this.getOutgoingLinks(groupId, n);
    return { ...n, outgoingLinks };
  }

  async create(groupId, { title, content, type, tags, metadata } = {}) {
    await this.groups.ensureGroupExists(groupId);

    const preparedTitle = (title ?? "").trim() || "Без названия";

    // проверка уникальности названия внутри группы
    await this._ensureUniqueTitle(groupId, preparedTitle);

    const id = crypto.randomUUID();

    const note = createNote({
      id,
      groupId,
      title: preparedTitle,
      content: content ?? "",
      type,
      tags,
      metadata,
    });

    // гарантируем, что директория под notes существует (на случай смены basePath/пустой папки)
    const notesDir = this._getGroupNotesDir(groupId);
    await fs.mkdir(notesDir, { recursive: true });

    const p = this._notePath(groupId, id);
    await atomicWriteJson(p, note);
    return note;
  }

  async patch(groupId, noteId, patch) {
    // сырой note, чтобы outgoingLinks не попали на диск
    const existing = await this._getRaw(groupId, noteId);

    // если меняют title, проверяем на уникальность
    if (patch && Object.prototype.hasOwnProperty.call(patch, "title")) {
      const newTitle = (patch.title ?? "").trim() || "Без названия";
      const oldTitle = (existing.title ?? "").trim() || "Без названия";

      if (this._normalizeTitle(newTitle) !== this._normalizeTitle(oldTitle)) {
        await this._ensureUniqueTitle(groupId, newTitle, noteId);
      }
    }

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

  async graph(groupId) {
    const notes = await this._readAllNotes(groupId);

    const nodes = notes.map((n) => ({
      id: String(n.id),
      title: n.title || "Без названия",
      updatedAt: n.updatedAt || null,
    }));

    const edgesMap = new Map();

    for (const n of notes) {
      const rawRefs = extractRawRefs(n.content || "");
      const targets = resolveRefsToNoteIds(rawRefs, notes);

      for (const to of targets) {
        const from = String(n.id);
        const tid = String(to);
        if (from === tid) continue;

        const key = `${from}>>${tid}`;
        if (!edgesMap.has(key)) {
          edgesMap.set(key, { from, to: tid, kind: "link" });
        }
      }
    }

    return { nodes, edges: [...edgesMap.values()] };
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
