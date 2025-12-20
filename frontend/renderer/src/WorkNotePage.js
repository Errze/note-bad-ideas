import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./styles/WorkNotePage.css";
import AIAssistant from "./AIThing";
import SettingsPage from "./SettingsPage";
import GraphPage from "./GraphPage";

import settings from "./pictures/settings.png";
import graph from "./pictures/graph.png";
import editing from "./pictures/editing.png";
import savesave from "./pictures/saving.png";
import update from "./pictures/update.png";
import done from "./pictures/done.png";
import newnote from "./pictures/new-note.png";
import ai from "./pictures/ai.png";

import notesApi from "./notesApi";

/* ---------------- mapping ---------------- */
function mapNoteToFile(note) {
  const id = String(note?.id ?? "");
  const title = String(note?.title ?? "Без названия");
  return {
    id,
    title,
    name: `${title}.md`,
    content: note?.content ?? "",
  };
}

/* ---------------- wikilinks ---------------- */
function normalizeTitleKey(s) {
  return String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function wikilinksToNoteLinks(markdown, files) {
  const byTitle = new Map();
  const byId = new Map();

  for (const f of files || []) {
    if (f?.id) byId.set(String(f.id), String(f.id));
    if (f?.title) byTitle.set(normalizeTitleKey(f.title), String(f.id));
  }

  const src = String(markdown ?? "");
  const parts = [];
  const fenceRe = /```[\s\S]*?```/g;
  let last = 0;
  let m;

  while ((m = fenceRe.exec(src)) !== null) {
    parts.push({ type: "text", value: src.slice(last, m.index) });
    parts.push({ type: "code", value: m[0] });
    last = m.index + m[0].length;
  }
  parts.push({ type: "text", value: src.slice(last) });

  const convertInText = (text) => {
    const inline = String(text ?? "").split(/(`[^`]*`)/g);

    return inline
      .map((seg) => {
        if (seg.startsWith("`") && seg.endsWith("`")) return seg;

        return seg.replace(/\[\[([^[\]]+?)\]\]/g, (whole, inside) => {
          const raw = String(inside || "").trim();
          if (!raw) return whole;

          const [left, right] = raw.split("|");
          const target = String(left || "").trim();
          const alias = String((right ?? left) || "").trim();
          if (!target) return whole;

          let id = byId.get(target);
          if (!id) id = byTitle.get(normalizeTitleKey(target));

          const safeAlias = alias.replace(/\[/g, "\\[").replace(/\]/g, "\\]");

          if (id) return `[${safeAlias}](note:${id})`;
          return `[${safeAlias}](note-title:${encodeURIComponent(target)})`;
        });
      })
      .join("");
  };

  return parts.map((p) => (p.type === "code" ? p.value : convertInText(p.value))).join("");
}

function normalizeWikiLinksForSave(markdown, files) {
  // по факту то же, что и wikilinksToNoteLinks (у тебя так и было)
  return wikilinksToNoteLinks(markdown, files);
}

/* ---------------- wikilink autocomplete helpers ---------------- */
function getWikiDraftAtCaret(text, caret) {
  const s = String(text ?? "");
  const pos = Math.max(0, Math.min(s.length, caret ?? s.length));

  const open = s.lastIndexOf("[[", pos);
  if (open === -1) return null;

  const closedBetween = s.indexOf("]]", open);
  if (closedBetween !== -1 && closedBetween < pos) return null;

  const rawInside = s.slice(open + 2, pos);
  if (rawInside.includes("[") || rawInside.includes("]")) return null;

  const [left, right] = rawInside.split("|");
  const targetPart = String(left ?? "").trim();
  const aliasPart = right == null ? "" : String(right).trim();

  return { start: open, caret: pos, rawInside, targetPart, aliasPart };
}

function scoreCandidate(titleNorm, queryNorm) {
  if (!queryNorm) return 999;
  if (titleNorm === queryNorm) return 0;
  if (titleNorm.startsWith(queryNorm)) return 1;
  return 999;
}

/* ---------------- Sidebar ---------------- */
function Sidebar({
  files,
  currentNoteId,
  onFileSelect,
  onNewNote,
  onDeleteNote,
  onReloadNotes,
  onSettingsClick,
  onGraphClick,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    noteId: null,
    noteName: "",
  });

  const filteredFiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, searchTerm]);

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      setContextMenu({ visible: false, x: 0, y: 0, noteId: null, noteName: "" });
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const openContextMenu = (e, noteId, noteName) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, noteId, noteName });
  };

  const handleContextMenuAction = (action) => {
    if (action === "delete" && contextMenu.noteId) {
      onDeleteNote(contextMenu.noteId, contextMenu.noteName);
    }
    setContextMenu({ visible: false, x: 0, y: 0, noteId: null, noteName: "" });
  };

  return (
    <aside
      className="sidebar"
      onContextMenu={(e) => {
        // sidebar: НЕТ системного меню и НЕТ нашего меню
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="search">
        <input
          type="text"
          placeholder="Поиск..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="note-section">
        <div className="note-head">
          <div className="notes-title">Заметки ({filteredFiles.length})</div>

          <div className="note-head-actions">
            <button
              className="icon-button"
              title="Обновить заметки"
              onClick={onReloadNotes}
              type="button"
            >
              <img src={update} alt="reload" className="icon-img" />
            </button>

            <button
              className="icon-button primary"
              title="Создать новую заметку"
              onClick={onNewNote}
              type="button"
            >
              <img src={newnote} alt="new-note" className="icon-img" />
            </button>
          </div>
        </div>

        <ul className="notes-list">
          {filteredFiles.map((file) => (
            <li
              key={file.id}
              className={String(currentNoteId) === String(file.id) ? "active" : ""}
              onClick={() => onFileSelect(file.id)}
              onContextMenu={(e) => openContextMenu(e, file.id, file.name)}
              title={file.name}
            >
              {file.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="button-container">
        <button
          className="settings-button"
          title="Настройки"
          onClick={() => onSettingsClick?.()}
          type="button"
        >
          <img src={settings} alt="settings" className="low-icon-img" />
        </button>

        <button
          className="graph-button"
          title="Граф"
          onClick={() => onGraphClick?.()}
          type="button"
        >
          <img src={graph} alt="graph" className="low-icon-img" />
        </button>
      </div>

      {contextMenu.visible && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div
            className="contex-menu-delete"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleContextMenuAction("delete");
            }}
          >
            Удалить "{contextMenu.noteName}"
          </div>
        </div>
      )}
    </aside>
  );
}

/* ---------------- GroupSelector ---------------- */
function GroupSelector({ groupId, groups, onGroupChange, onCreateGroup, onOpenManager }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const submit = async () => {
    const t = newTitle.trim();
    if (!t) return;
    await onCreateGroup(t);
    setNewTitle("");
    setIsCreating(false);
  };

  return (
    <div className="group-selector">
      <span>Группа:</span>

      <select
        value={groupId || ""}
        onChange={(e) => onGroupChange(e.target.value)}
        className="group-select"
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title}
          </option>
        ))}
      </select>

      <button
        className="icon-button primary"
        title="Создать группу"
        type="button"
        onClick={() => setIsCreating((v) => !v)}
      >
        <span style={{ fontWeight: 900, fontSize: 20, lineHeight: 1 }}>+</span>
      </button>

      <button className="icon-button" title="Управление группами" type="button" onClick={onOpenManager}>
        <span style={{ fontWeight: 900, fontSize: 18, lineHeight: 1 }}>⋯</span>
      </button>

      {isCreating && (
        <div className="group-popover">
          <input
            className="group-popover-input"
            placeholder="Название группы"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewTitle("");
              }
            }}
          />
          <button className="group-popover-btn" type="button" onClick={submit}>
            Создать
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- GroupManager ---------------- */
function GroupManager({ groups, currentGroup, onRename, onDelete, onClose }) {
  const [editId, setEditId] = useState(null);
  const [value, setValue] = useState("");

  return (
    <div className="group-manager-overlay" onClick={onClose}>
      <div className="group-manager" onClick={(e) => e.stopPropagation()}>
        <div className="group-manager-title">Группы</div>

        <div className="group-manager-list">
          {groups.map((g) => {
            const isCurrent = g.id === currentGroup;
            const isEditing = editId === g.id;

            return (
              <div key={g.id} className={`group-row ${isCurrent ? "current" : ""}`}>
                {isEditing ? (
                  <>
                    <input
                      className="group-row-input"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const t = value.trim();
                          if (t) onRename(g.id, t);
                          setEditId(null);
                        }
                        if (e.key === "Escape") setEditId(null);
                      }}
                    />
                    <button
                      className="group-row-btn"
                      type="button"
                      onClick={() => {
                        const t = value.trim();
                        if (t) onRename(g.id, t);
                        setEditId(null);
                      }}
                      title="Сохранить"
                    >
                      OK
                    </button>
                  </>
                ) : (
                  <>
                    <div className="group-row-name" title={g.title}>
                      {g.title}
                    </div>

                    <div className="group-row-actions">
                      <button
                        className="group-row-btn"
                        type="button"
                        title="Переименовать"
                        onClick={() => {
                          setEditId(g.id);
                          setValue(g.title);
                        }}
                      >
                        ✏️
                      </button>

                      <button
                        className="group-row-btn danger"
                        type="button"
                        title={isCurrent ? "Нельзя удалить текущую группу" : "Удалить"}
                        disabled={isCurrent}
                        onClick={() => onDelete(g.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="group-manager-footer">
          <button className="group-manager-close" onClick={onClose} type="button">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Confirm modals ---------------- */
function ConfirmDeleteGroupModal({ groupTitle, onCancel, onConfirm, loading }) {
  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-title">Удалить группу?</div>
        <div className="modal-text">
          Группа <b>{groupTitle}</b> будет удалена.
          <br />
          <span className="modal-warn">ВНИМАНИЕ: заметки в группе тоже будут удалены.</span>
        </div>

        <div className="modal-actions">
          <button className="modal-btn" type="button" onClick={onCancel} disabled={loading}>
            Отмена
          </button>
          <button className="modal-btn danger" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "Удаляем..." : "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteNoteModal({ noteName, onCancel, onConfirm, loading }) {
  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-title">Удалить заметку?</div>
        <div className="modal-text">Заметка <b>{noteName}</b> будет удалена. Без чудес восстановления.</div>

        <div className="modal-actions">
          <button className="modal-btn" type="button" onClick={onCancel} disabled={loading}>
            Отмена
          </button>
          <button className="modal-btn danger" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "Удаляем..." : "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- WorkNotePage ---------------- */
function WorkNotePage({ onBack, onOverlayChange }) {
  const [files, setFiles] = useState([]);
  const filesRef = useRef([]);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const [text, setText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [noteTitle, setNoteTitle] = useState("Новая заметка");
  const [titleError, setTitleError] = useState("");

  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState("");

  const currentGroupTitle = useMemo(() => {
    const g = (groups || []).find((x) => String(x.id) === String(currentGroup));
    return g?.title || "";
  }, [groups, currentGroup]);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [currentNoteId, setCurrentNoteId] = useState(null);

  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(false);

  const [confirmDeleteNote, setConfirmDeleteNote] = useState(null);
  const [deletingNote, setDeletingNote] = useState(false);

  const busy = saving || deletingGroup || deletingNote;

  // ===== overlay state sync (важное) =====
  const openGraph = useCallback(() => {
    setShowGraph(true);
    onOverlayChange?.({ graph: true });
  }, [onOverlayChange]);

  const closeGraph = useCallback(() => {
    setShowGraph(false);
    onOverlayChange?.({ graph: false });
  }, [onOverlayChange]);

  const openSettings = useCallback(() => {
    setShowSettings(true);
    onOverlayChange?.({ settings: true });
  }, [onOverlayChange]);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
    onOverlayChange?.({ settings: false });
  }, [onOverlayChange]);

  const openAI = useCallback(() => {
    setIsAIAssistantOpen(true);
    onOverlayChange?.({ ai: true });
  }, [onOverlayChange]);

  const closeAI = useCallback(() => {
    setIsAIAssistantOpen(false);
    onOverlayChange?.({ ai: false });
  }, [onOverlayChange]);

  // если WorkNotePage размонтируется, прибьем флаги оверлеев в App (чтобы не залипало)
  useEffect(() => {
    return () => {
      onOverlayChange?.({ graph: false, settings: false, ai: false });
    };
  }, [onOverlayChange]);

  const toastTimerRef = useRef(null);
  const showToast = useCallback(
    (msg) => {
      // когда открыт граф, ты сам просил "не мешать"
      if (showGraph) return;
      setSaveMessage(msg);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setSaveMessage(""), 1500);
    },
    [showGraph]
  );

  /* --- editor refs & autocomplete state --- */
  const textareaRef = useRef(null);

  const [wikiOpen, setWikiOpen] = useState(false);
  const [wikiItems, setWikiItems] = useState([]);
  const [wikiIndex, setWikiIndex] = useState(0);
  const wikiDraftRef = useRef(null);

  const recomputeWikiSuggestions = useCallback(() => {
    const el = textareaRef.current;
    if (!el) {
      setWikiOpen(false);
      setWikiItems([]);
      wikiDraftRef.current = null;
      return;
    }

    const caret = el.selectionStart ?? (text || "").length;
    const draft = getWikiDraftAtCaret(text, caret);

    if (!draft) {
      setWikiOpen(false);
      setWikiItems([]);
      wikiDraftRef.current = null;
      return;
    }

    const q = String(draft.targetPart ?? "").trim();
    if (!q) {
      setWikiOpen(false);
      setWikiItems([]);
      wikiDraftRef.current = draft;
      return;
    }

    const nq = normalizeTitleKey(q);
    const first = nq[0];
    const me = String(currentNoteId ?? "");
    const all = filesRef.current || [];

    const candidates = all
      .filter((f) => f && f.title && String(f.id) !== me)
      .map((f) => ({
        id: String(f.id),
        title: String(f.title),
        ntitle: normalizeTitleKey(f.title),
      }))
      .filter((c) => c.ntitle && c.ntitle[0] === first)
      .map((c) => ({ ...c, score: scoreCandidate(c.ntitle, nq) }))
      .filter((c) => c.score < 999)
      .sort((a, b) => a.score - b.score || a.title.length - b.title.length || a.title.localeCompare(b.title))
      .slice(0, 8);

    wikiDraftRef.current = draft;
    setWikiItems(candidates);
    setWikiIndex(0);
    setWikiOpen(candidates.length > 0);
  }, [text, currentNoteId]);

  const insertWikiCandidate = useCallback((cand) => {
    const draft = wikiDraftRef.current;
    if (!draft || !cand) return;

    const alias = draft.aliasPart?.trim();
    const label = alias ? alias : cand.title;

    const link = `[${label}](note:${cand.id})`;

    setText((prev) => {
      const s = String(prev ?? "");
      const start = draft.start;
      const end = draft.caret;
      if (start < 0 || end < 0 || start >= s.length || end > s.length || end < start) return s;
      return s.slice(0, start) + link + s.slice(end);
    });

    setWikiOpen(false);
    setWikiItems([]);
    setWikiIndex(0);

    window.setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      const newPos = (draft.start ?? 0) + link.length;
      el.focus();
      try {
        el.setSelectionRange(newPos, newPos);
      } catch {
        // ignore
      }
    }, 0);
  }, []);

  const handleEditorKeyDown = useCallback(
    (e) => {
      if (!wikiOpen || wikiItems.length === 0) return;

      if (e.repeat && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Tab")) {
        e.preventDefault();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setWikiIndex((i) => Math.min(wikiItems.length - 1, i + 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setWikiIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setWikiOpen(false);
        setWikiItems([]);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const cand = wikiItems[wikiIndex];
        if (cand) insertWikiCandidate(cand);
      }
    },
    [wikiOpen, wikiItems, wikiIndex, insertWikiCandidate]
  );

  /* --- navigation --- */
  const handleFileSelect = useCallback(
    async (noteIdSel, listArg, groupIdArg) => {
      const list = Array.isArray(listArg) ? listArg : filesRef.current;
      const groupId = groupIdArg || currentGroup;
      const wanted = String(noteIdSel ?? "");

      const selectedFile = list.find((f) => String(f.id) === wanted);
      if (!selectedFile) return;

      setNoteTitle(selectedFile.title);
      setTitleError("");
      setCurrentNoteId(String(selectedFile.id));

      try {
        const full = await notesApi.getNote(groupId, selectedFile.id);
        setText(full.content ?? "");
      } catch {
        setText(selectedFile.content ?? "");
      }
    },
    [currentGroup]
  );

  // --- anti-jump machinery ---
  const didInitialSelectRef = useRef(false);
  const pendingSelectRef = useRef(null); // { id, group }
  const pendingOpenRef = useRef(null); // { id, group }

  const loadNotesForGroup = useCallback(
    async (groupId) => {
      try {
        const notes = await notesApi.getAllNotes(groupId);
        const mapped = notes.map(mapNoteToFile);
        setFiles(mapped);

        if (mapped.length === 0) {
          didInitialSelectRef.current = true;
          setNoteTitle("Новая заметка");
          setTitleError("");
          setText("# Новая заметка\n\nНачните писать здесь...");
          setCurrentNoteId(null);
          return;
        }

        const pending = pendingOpenRef.current;
        if (pending && String(pending.group) === String(groupId)) {
          pendingSelectRef.current = { id: String(pending.id), group: String(groupId) };
          return;
        }

        const cur = String(currentNoteId ?? "");
        if (cur && mapped.some((f) => String(f.id) === cur)) {
          pendingSelectRef.current = { id: cur, group: String(groupId) };
          return;
        }

        if (!didInitialSelectRef.current) {
          didInitialSelectRef.current = true;
          pendingSelectRef.current = { id: String(mapped[0].id), group: String(groupId) };
        }
      } catch (e) {
        setFiles([]);
        showToast(`❌ Ошибка загрузки заметок: ${e.message}`);
      }
    },
    [currentNoteId, showToast]
  );

  useEffect(() => {
    const p = pendingSelectRef.current;
    if (!p) return;
    if (String(p.group) !== String(currentGroup)) return;

    const list = filesRef.current || [];
    const found = list.find((f) => String(f.id) === String(p.id));
    if (!found) return;

    pendingSelectRef.current = null;

    Promise.resolve().then(async () => {
      await handleFileSelect(found.id, list, currentGroup);
      const po = pendingOpenRef.current;
      if (po && String(po.id) === String(found.id) && String(po.group) === String(currentGroup)) {
        pendingOpenRef.current = null;
      }
    });
  }, [files, currentGroup, handleFileSelect]);

  const openNoteById = useCallback(
    async (noteId) => {
      if (!noteId || !currentGroup) return;

      const wanted = String(noteId);

      pendingOpenRef.current = { id: wanted, group: String(currentGroup) };
      setCurrentNoteId(wanted);

      const currentFiles = filesRef.current;
      const existing = currentFiles.find((f) => String(f.id) === wanted);
      if (existing) {
        await handleFileSelect(existing.id, currentFiles, currentGroup);
        closeGraph(); // закрываем граф, если открыли заметку
        pendingOpenRef.current = null;
        return;
      }

      try {
        const notes = await notesApi.getAllNotes(currentGroup);
        const mapped = notes.map(mapNoteToFile);
        setFiles(mapped);

        const found = mapped.find((f) => String(f.id) === wanted);
        if (found) {
          pendingSelectRef.current = { id: wanted, group: String(currentGroup) };
          closeGraph();
          return;
        }
      } catch {
        // ignore
      }

      try {
        const full = await notesApi.getNote(currentGroup, wanted);
        const newFile = mapNoteToFile(full);

        setFiles((prev) => [newFile, ...prev.filter((x) => String(x.id) !== String(newFile.id))]);
        pendingSelectRef.current = { id: newFile.id, group: String(currentGroup) };

        closeGraph();
        return;
      } catch (e) {
        pendingOpenRef.current = null;
        showToast(`❌ Не удалось открыть ссылку: ${e.message}`);
      }
    },
    [currentGroup, handleFileSelect, showToast, closeGraph]
  );

  useEffect(() => {
    const handler = (e) => {
      const id = e?.detail?.id;
      if (!id) return;
      openNoteById(id);
    };

    window.addEventListener("open-note", handler);
    return () => window.removeEventListener("open-note", handler);
  }, [openNoteById]);

  const markdownComponents = useMemo(
    () => ({
      a: ({ href, children }) => {
        const h = String(href ?? "").trim();

        const stop = (e) => {
          e.preventDefault();
          e.stopPropagation();
        };

        const goById = async (id, e) => {
          stop(e);
          await openNoteById(String(id || "").trim());
        };

        const goByTitle = async (title, e) => {
          stop(e);
          const t = decodeURIComponent(String(title || "").trim());
          if (!t) return;

          const key = normalizeTitleKey(t);
          const found = (filesRef.current || []).find((f) => normalizeTitleKey(f.title) === key);

          if (found) {
            await openNoteById(found.id);
            return;
          }

          try {
            const notes = await notesApi.getAllNotes(currentGroup);
            const mapped = notes.map(mapNoteToFile);
            setFiles(mapped);

            const found2 = mapped.find((f) => normalizeTitleKey(f.title) === key);
            if (found2) {
              await openNoteById(found2.id);
              return;
            }

            showToast(`⚠️ Заметка "${t}" не найдена`);
          } catch (err) {
            showToast(`❌ Ошибка открытия ссылки: ${err.message}`);
          }
        };

        const openExternal = (url, e) => {
          stop(e);
          window.open(url);
        };

        if (h.startsWith("note:")) {
          const id = h.slice("note:".length).trim();
          return (
            <span
              role="link"
              tabIndex={0}
              className="md-note-link"
              onMouseDown={stop}
              onClick={(e) => goById(id, e)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? goById(id, e) : null)}
              title={`Открыть заметку #${id}`}
            >
              {children}
            </span>
          );
        }

        if (h.startsWith("note-title:")) {
          const title = h.slice("note-title:".length);
          return (
            <span
              role="link"
              tabIndex={0}
              className="md-note-link"
              onMouseDown={stop}
              onClick={(e) => goByTitle(title, e)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? goByTitle(title, e) : null)}
              title="Открыть по названию"
            >
              {children}
            </span>
          );
        }

        if (h.startsWith("http://") || h.startsWith("https://")) {
          return (
            <span
              role="link"
              tabIndex={0}
              className="md-ext-link"
              onMouseDown={stop}
              onClick={(e) => openExternal(h, e)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? openExternal(h, e) : null)}
              title={h}
            >
              {children}
            </span>
          );
        }

        return (
          <span className="md-dead-link" title={h}>
            {children}
          </span>
        );
      },
    }),
    [openNoteById, currentGroup, showToast]
  );

  const renderedMarkdown = useMemo(() => wikilinksToNoteLinks(text, files), [text, files]);

  /* --- initial load --- */
  useEffect(() => {
    (async () => {
      try {
        const gs = await notesApi.getGroups();
        setGroups(gs);
        if (gs.length) setCurrentGroup(gs[0].id);
      } catch (e) {
        showToast(`❌ Ошибка загрузки групп: ${e.message}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentGroup) return;
    loadNotesForGroup(currentGroup);
  }, [currentGroup, loadNotesForGroup]);

  /* --- save/delete/create --- */
  const handleSaveNote = async () => {
    const t = noteTitle.trim();
    if (!t) {
      setTitleError("Заголовок не может быть пустым");
      showToast("❌ Заголовок не может быть пустым");
      return;
    }
    if (!currentGroup) {
      showToast("❌ Выберите группу");
      return;
    }

    setSaving(true);
    setSaveMessage("Сохраняем...");
    setTitleError("");

    try {
      const normalizedContent = normalizeWikiLinksForSave(String(text ?? ""), filesRef.current);
      const payload = { title: t, content: normalizedContent };

      const saved = currentNoteId
        ? await notesApi.updateNote(currentGroup, currentNoteId, payload)
        : await notesApi.createNote(currentGroup, payload);

      const newFile = mapNoteToFile(saved);
      setFiles((prev) => [newFile, ...prev.filter((f) => String(f.id) !== String(saved.id))]);
      setCurrentNoteId(String(saved.id));
      setText(normalizedContent);

      showToast("✅ Сохранено");
      setIsEditing(false);
    } catch (e) {
      if (e.message === "NOTE_TITLE_DUPLICATE") {
        setTitleError("Заметка с таким названием уже есть в этой группе");
        showToast("⚠️ Такое название уже занято");
        setSaving(false);
        return;
      }
      showToast(`❌ Ошибка: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = (noteId, noteName) => {
    setConfirmDeleteNote({ id: String(noteId), name: noteName });
  };

  const handleConfirmDeleteNote = async () => {
    if (!confirmDeleteNote) return;

    const { id } = confirmDeleteNote;
    setDeletingNote(true);

    try {
      await notesApi.deleteNote(currentGroup, id);
      setFiles((prev) => prev.filter((f) => String(f.id) !== String(id)));

      if (String(currentNoteId) === String(id)) {
        setNoteTitle("Новая заметка");
        setTitleError("");
        setText("# Новая заметка\n\nНачните писать здесь...");
        setCurrentNoteId(null);
      }

      showToast("✅ Заметка удалена");
    } catch (e) {
      showToast(`❌ Ошибка удаления: ${e.message}`);
    } finally {
      setDeletingNote(false);
      setConfirmDeleteNote(null);
    }
  };

  const handleNewNote = () => {
    const newTitle = `Новая заметка ${filesRef.current.length + 1}`;
    setNoteTitle(newTitle);
    setTitleError("");
    setText("# Новая заметка\n\nНачните писать здесь...");
    setCurrentNoteId(null);
    setIsEditing(true);
  };

  const handleReloadNotes = async () => {
    if (!currentGroup) return;
    await loadNotesForGroup(currentGroup);
    showToast("🔄 Обновлено");
  };

  const handleCreateGroup = async (title) => {
    try {
      const created = await notesApi.createGroup(title);
      setGroups((prev) => [created, ...prev]);
      setCurrentGroup(created.id);
      showToast("✅ Группа создана");
    } catch (e) {
      showToast(`❌ Не удалось создать группу: ${e.message}`);
    }
  };

  const handleRenameGroup = async (groupId, title) => {
    try {
      const updated = await notesApi.updateGroup(groupId, { title });
      setGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
      showToast("✅ Группа переименована");
    } catch (e) {
      showToast(`❌ Не удалось переименовать: ${e.message}`);
    }
  };

  const handleAskDeleteGroup = (groupId) => {
    const g = groups.find((x) => x.id === groupId);
    if (!g) return;

    if (currentGroup === groupId) {
      showToast("⚠️ Нельзя удалить текущую группу. Переключись на другую.");
      return;
    }

    setConfirmDeleteGroup({ id: g.id, title: g.title });
  };

  const handleConfirmDeleteGroup = async () => {
    if (!confirmDeleteGroup) return;

    const { id } = confirmDeleteGroup;
    setDeletingGroup(true);

    try {
      await notesApi.deleteGroup(id);
      setGroups((prev) => prev.filter((x) => x.id !== id));

      if (currentGroup === id) {
        const rest = groups.filter((x) => x.id !== id);
        setCurrentGroup(rest[0]?.id || "");
      }

      showToast("✅ Группа удалена");
    } catch (e) {
      showToast(`❌ Не удалось удалить: ${e.message}`);
    } finally {
      setDeletingGroup(false);
      setConfirmDeleteGroup(null);
    }
  };

  return (
    <div className="worknote-container">
      <Sidebar
        files={files}
        currentNoteId={currentNoteId}
        onFileSelect={handleFileSelect}
        onNewNote={handleNewNote}
        onDeleteNote={handleDeleteNote}
        onReloadNotes={handleReloadNotes}
        onSettingsClick={openSettings}
        onGraphClick={openGraph}
      />

      <div className="main-content">
        {/* header + editor/preview под графом/настройками не рендерим, но WorkNotePage не размонтируем */}
        <div className="header">
          <div className="header-row">
            <div className="header-left">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => {
                  setNoteTitle(e.target.value);
                  if (titleError) setTitleError("");
                }}
                className={`title-input ${titleError ? "input-error" : ""}`}
                placeholder="Название заметки"
              />
              {titleError && <div className="field-error">{titleError}</div>}
            </div>

            <div className="header-right">
              <button
                onClick={handleSaveNote}
                disabled={busy}
                className="icon-button primary"
                title="Сохранить"
                type="button"
              >
                <img src={savesave} alt="save" className="icon-img lg" />
              </button>

              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={busy}
                  className="icon-button"
                  title="Редактировать"
                  type="button"
                >
                  <img src={editing} alt="edit" className="icon-img lg" />
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={busy}
                  className="icon-button"
                  title="Готово"
                  type="button"
                >
                  <img src={done} alt="done" className="icon-img lg" />
                </button>
              )}
            </div>
          </div>

          <div className="header-row">
            <div className="header-left">
              <GroupSelector
                groupId={currentGroup}
                groups={groups}
                onGroupChange={setCurrentGroup}
                onCreateGroup={handleCreateGroup}
                onOpenManager={() => setIsGroupManagerOpen(true)}
              />
            </div>

            <div className="header-right">
              {saveMessage && <span className="save-message">{saveMessage}</span>}
              <button
                onClick={openAI}
                className="icon-button"
                title="ИИ помощник"
                type="button"
              >
                <img src={ai} alt="ai" className="icon-img lg" />
              </button>
            </div>
          </div>
        </div>

        {/* Редактор / превью */}
        {!showGraph && !showSettings ? (
          <>
            {isEditing ? (
              <div className="editor-container">
                <div className="sheet">
                  <div className="editor-inner" style={{ position: "relative" }}>
                    <textarea
                      ref={textareaRef}
                      className="markdown-editor"
                      value={text}
                      onChange={(e) => {
                        setText(e.target.value);
                        window.setTimeout(recomputeWikiSuggestions, 0);
                      }}
                      onKeyDown={handleEditorKeyDown}
                      onKeyUp={(e) => {
                        if (
                          wikiOpen &&
                          (e.key === "ArrowDown" ||
                            e.key === "ArrowUp" ||
                            e.key === "Enter" ||
                            e.key === "Tab" ||
                            e.key === "Escape")
                        ) {
                          return;
                        }
                        recomputeWikiSuggestions();
                      }}
                      onClick={() => recomputeWikiSuggestions()}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setWikiOpen(false);
                          setWikiItems([]);
                        }, 120);
                      }}
                      placeholder="Начните писать свою заметку в формате Markdown..."
                    />

                    {wikiOpen && wikiItems.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          left: 16,
                          top: 16,
                          zIndex: 50,
                          width: 320,
                          maxHeight: 260,
                          overflow: "auto",
                          borderRadius: 12,
                          border: "1px solid rgba(0,0,0,0.12)",
                          background: "white",
                          boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
                          padding: 8,
                        }}
                      >
                        <div style={{ fontSize: 12, opacity: 0.7, margin: "4px 8px 8px" }}>
                          Подсказки для <code>[[...]]</code> (Enter/Tab вставить, Esc закрыть)
                        </div>
                        {wikiItems.map((it, idx) => (
                          <button
                            key={it.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              insertWikiCandidate(it);
                            }}
                            onMouseEnter={() => setWikiIndex(idx)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              border: "none",
                              background: idx === wikiIndex ? "rgba(0,0,0,0.06)" : "transparent",
                              padding: "10px 10px",
                              borderRadius: 10,
                              cursor: "pointer",
                              fontSize: 14,
                            }}
                          >
                            {it.title}
                            <span style={{ opacity: 0.55, marginLeft: 8, fontSize: 12 }}>
                              #{it.id}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="editor-divider" />

                    <div className="markdown-preview">
                      <ReactMarkdown components={markdownComponents} urlTransform={(url) => url}>
                        {renderedMarkdown}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="preview-container">
                <div className="sheet">
                  <div className="preview-only">
                    <ReactMarkdown components={markdownComponents} urlTransform={(url) => url}>
                      {renderedMarkdown}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* ===== Overlays (Graph/Settings) ===== */}
        {showGraph && (
          <GraphPage
            notes={files}
            groupId={currentGroup}
            groupTitle={currentGroupTitle}
            getNote={notesApi.getNote}
            onOpenNote={openNoteById}
            onClose={closeGraph}
          />
        )}

        {showSettings && (
          <SettingsPage
            onBack={closeSettings}
          />
        )}

        {/* ===== AI assistant overlay ===== */}
        <AIAssistant isOpen={isAIAssistantOpen} onClose={closeAI} />

        {isGroupManagerOpen && (
          <GroupManager
            groups={groups}
            currentGroup={currentGroup}
            onRename={handleRenameGroup}
            onDelete={handleAskDeleteGroup}
            onClose={() => setIsGroupManagerOpen(false)}
          />
        )}

        {confirmDeleteGroup && (
          <ConfirmDeleteGroupModal
            groupTitle={confirmDeleteGroup.title}
            onCancel={() => setConfirmDeleteGroup(null)}
            onConfirm={handleConfirmDeleteGroup}
            loading={deletingGroup}
          />
        )}

        {confirmDeleteNote && (
          <ConfirmDeleteNoteModal
            noteName={confirmDeleteNote.name}
            onCancel={() => setConfirmDeleteNote(null)}
            onConfirm={handleConfirmDeleteNote}
            loading={deletingNote}
          />
        )}
      </div>
    </div>
  );
}

export default WorkNotePage;
