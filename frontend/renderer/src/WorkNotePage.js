import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./WorkNotePage.css";
import AIAssistant from "./AIThing";

import settings from "./settings.png";
import graph from "./graph.png";
import editing from "./editing.png";
import savesave from "./saving.png";
import update from "./update.png";
import done from "./done.png";
import newnote from "./new-note.png";
import ai from "./ai.png";

const API_BASE = "http://localhost:3001";

// ---------- helper: нормальные ошибки ----------
async function request(url, options) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null; // сервер мог вернуть HTML/текст, не падаем
  }

  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

// ---------- API ----------
const notesApi = {
  // groups
  getGroups: () => request(`${API_BASE}/api/groups`),
  createGroup: (title) =>
    request(`${API_BASE}/api/groups`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  updateGroup: (groupId, patch) =>
    request(`${API_BASE}/api/groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteGroup: (groupId) =>
    request(`${API_BASE}/api/groups/${groupId}`, {
      method: "DELETE",
    }),

  // notes
  getAllNotes: (groupId) => request(`${API_BASE}/api/groups/${groupId}/notes`),
  getNote: (groupId, noteId) =>
    request(`${API_BASE}/api/groups/${groupId}/notes/${noteId}`),

  createNote: (groupId, noteData) =>
    request(`${API_BASE}/api/groups/${groupId}/notes`, {
      method: "POST",
      body: JSON.stringify(noteData),
    }),

  updateNote: (groupId, noteId, patch) =>
    request(`${API_BASE}/api/groups/${groupId}/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteNote: (groupId, noteId) =>
    request(`${API_BASE}/api/groups/${groupId}/notes/${noteId}`, {
      method: "DELETE",
    }),
};

// ---------- mapping ----------
function mapNoteToFile(note) {
  return {
    name: `${note.title}.md`,
    path: `/${note.id}`,
    id: note.id,
    title: note.title,
    content: note.content ?? "",
  };
}

// ---------- Sidebar ----------
function Sidebar({
  files,
  currentFile,
  onFileSelect,
  onNewNote,
  onDeleteNote,
  onReloadNotes,
  onNotImplemented,
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
    const handleClick = () =>
      setContextMenu({ visible: false, x: 0, y: 0, noteId: null, noteName: "" });
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const openContextMenu = (e, noteId, noteName) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, noteId, noteName });
  };

  const handleContextMenuAction = (action) => {
    if (action === "delete" && contextMenu.noteId) {
      onDeleteNote(contextMenu.noteId, contextMenu.noteName);
    }
    setContextMenu({ visible: false, x: 0, y: 0, noteId: null, noteName: "" });
  };

  return (
    <aside className="sidebar">
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
              className={currentFile === file.path ? "active" : ""}
              onClick={() => onFileSelect(file.path)}
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
          onClick={() => onNotImplemented?.()}
          type="button"
        >
          <img src={settings} alt="settings" className="icon-img" />
        </button>

        <button
          className="graph-button"
          title="Граф"
          onClick={() => onNotImplemented?.()}
          type="button"
        >
          <img src={graph} alt="graph" className="icon-img" />
        </button>
      </div>

      {contextMenu.visible && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className="contex-menu-delete" onClick={() => handleContextMenuAction("delete")}>
            Удалить "{contextMenu.noteName}"
          </div>
        </div>
      )}
    </aside>
  );
}

// ---------- GroupSelector ----------
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

// ---------- GroupManager ----------
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

// ---------- Confirm modals ----------
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
        <div className="modal-text">
          Заметка <b>{noteName}</b> будет удалена. Без чудес восстановления.
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

// ---------- WorkNotePage ----------
function WorkNotePage() {
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState("");
  const [text, setText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [noteTitle, setNoteTitle] = useState("Новая заметка");

  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [currentNoteId, setCurrentNoteId] = useState(null);

  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);

  // confirm states
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(null); // {id,title} | null
  const [deletingGroup, setDeletingGroup] = useState(false);

  const [confirmDeleteNote, setConfirmDeleteNote] = useState(null); // {id,name} | null
  const [deletingNote, setDeletingNote] = useState(false);

  const busy = saving || deletingGroup || deletingNote;

  // --- toast (НЕ alert, не блокирует ввод) ---
  const showToast = (msg) => {
    setSaveMessage(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setSaveMessage(""), 1500);
  };

  // ---- load groups on mount ----
  useEffect(() => {
    (async () => {
      try {
        const gs = await notesApi.getGroups();
        setGroups(gs);
        if (gs.length) setCurrentGroup(gs[0].id);
      } catch (e) {
        console.error(e);
        showToast(`❌ Ошибка загрузки групп: ${e.message}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- load notes when group changes ----
  useEffect(() => {
    if (!currentGroup) return;
    loadNotesForGroup(currentGroup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroup]);

  const loadNotesForGroup = async (groupId) => {
    try {
      const notes = await notesApi.getAllNotes(groupId);
      const mapped = notes.map(mapNoteToFile);
      setFiles(mapped);

      if (mapped.length > 0) {
        await handleFileSelect(mapped[0].path, mapped, groupId);
      } else {
        setCurrentFile("");
        setNoteTitle("Новая заметка");
        setText("# Новая заметка\n\nНачните писать здесь...");
        setCurrentNoteId(null);
      }
    } catch (e) {
      console.error(e);
      setFiles([]);
      showToast(`❌ Ошибка загрузки заметок: ${e.message}`);
    }
  };

  const handleFileSelect = async (path, list = files, groupId = currentGroup) => {
    const selectedFile = list.find((f) => f.path === path);
    if (!selectedFile) return;

    setCurrentFile(path);
    setNoteTitle(selectedFile.title);
    setCurrentNoteId(selectedFile.id);

    try {
      const full = await notesApi.getNote(groupId, selectedFile.id);
      setText(full.content ?? "");
    } catch (e) {
      console.error(e);
      setText(selectedFile.content ?? "");
    }
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) return showToast("❌ Заголовок не может быть пустым");
    if (!currentGroup) return showToast("❌ Выберите группу");

    setSaving(true);
    setSaveMessage("Сохраняем...");

    try {
      const payload = { title: noteTitle, content: text };

      const saved = currentNoteId
        ? await notesApi.updateNote(currentGroup, currentNoteId, payload)
        : await notesApi.createNote(currentGroup, payload);

      const newFile = mapNoteToFile(saved);
      setFiles((prev) => [newFile, ...prev.filter((f) => f.id !== saved.id)]);
      setCurrentNoteId(saved.id);
      setCurrentFile(newFile.path);

      showToast("✅ Сохранено");
      setTimeout(() => setIsEditing(false), 350);
    } catch (e) {
      console.error(e);
      showToast(`❌ Ошибка: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ------- delete note: open modal -------
  const handleDeleteNote = (noteId, noteName) => {
    setConfirmDeleteNote({ id: noteId, name: noteName });
  };

  // ------- delete note: confirm -------
  const handleConfirmDeleteNote = async () => {
    if (!confirmDeleteNote) return;

    const { id } = confirmDeleteNote;
    setDeletingNote(true);

    try {
      await notesApi.deleteNote(currentGroup, id);
      setFiles((prev) => prev.filter((f) => f.id !== id));

      if (currentNoteId === id) {
        setCurrentFile("");
        setNoteTitle("Новая заметка");
        setText("# Новая заметка\n\nНачните писать здесь...");
        setCurrentNoteId(null);
      }

      showToast("✅ Заметка удалена");
    } catch (e) {
      console.error(e);
      showToast(`❌ Ошибка удаления: ${e.message}`);
    } finally {
      setDeletingNote(false);
      setConfirmDeleteNote(null);
    }
  };

  const handleNewNote = () => {
    const newTitle = `Новая заметка ${files.length + 1}`;
    setCurrentFile("");
    setNoteTitle(newTitle);
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
      console.error(e);
      showToast(`❌ Не удалось создать группу: ${e.message}`);
    }
  };

  const handleRenameGroup = async (groupId, title) => {
    try {
      const updated = await notesApi.updateGroup(groupId, { title });
      setGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
      showToast("✅ Группа переименована");
    } catch (e) {
      console.error(e);
      showToast(`❌ Не удалось переименовать: ${e.message}`);
    }
  };

  // ------- delete group: ask (open modal) -------
  const handleAskDeleteGroup = (groupId) => {
    const g = groups.find((x) => x.id === groupId);
    if (!g) return;

    if (currentGroup === groupId) {
      showToast("⚠️ Нельзя удалить текущую группу. Переключись на другую.");
      return;
    }

    setConfirmDeleteGroup({ id: g.id, title: g.title });
  };

  // ------- delete group: confirm -------
  const handleConfirmDeleteGroup = async () => {
    if (!confirmDeleteGroup) return;

    const { id } = confirmDeleteGroup;
    setDeletingGroup(true);

    try {
      await notesApi.deleteGroup(id);
      setGroups((prev) => prev.filter((x) => x.id !== id));

      // если вдруг удалили текущую (мы запретили, но на всякий случай)
      if (currentGroup === id) {
        const rest = groups.filter((x) => x.id !== id);
        setCurrentGroup(rest[0]?.id || "");
      }

      showToast("✅ Группа удалена");
    } catch (e) {
      console.error(e);
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
        currentFile={currentFile}
        onFileSelect={handleFileSelect}
        onNewNote={handleNewNote}
        onDeleteNote={handleDeleteNote}
        onReloadNotes={handleReloadNotes}
        onNotImplemented={() => showToast("⚠️ Функция пока не реализована")}
      />

      <div className="main-content">
        <div className="header">
          {/* row 1: title + save/edit */}
          <div className="header-row">
            <div className="header-left">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="title-input"
                placeholder="Название заметки"
              />
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

          {/* row 2: groups + ai + status */}
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
                onClick={() => setIsAIAssistantOpen(true)}
                className="icon-button"
                title="ИИ помощник"
                type="button"
              >
                <img src={ai} alt="ai" className="icon-img lg" />
              </button>
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="editor-container">
            <div className="sheet">
              <div className="editor-inner">
                <textarea
                  className="markdown-editor"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Начните писать свою заметку в формате Markdown..."
                />
                <div className="editor-divider" />
                <div className="markdown-preview">
                  <ReactMarkdown>{text}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="preview-container">
            <div className="sheet">
              <div className="preview-only">
                <ReactMarkdown>{text}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>

      <AIAssistant isOpen={isAIAssistantOpen} onClose={() => setIsAIAssistantOpen(false)} />

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
  );
}

export default WorkNotePage;
