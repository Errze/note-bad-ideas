/**
 * @typedef {Object} Note
 * @property {string} id - Уникальный идентификатор заметки
 * @property {string} groupId - ID группы, к которой относится заметка
 * @property {string} title - Заголовок заметки
 * @property {string} content - Содержимое заметки (markdown/rich text)
 * @property {string} type - Тип содержимого (markdown/rich)
 * @property {NoteMetadata} metadata - Дополнительные метаданные
 * @property {string} createdAt - Дата создания в ISO формате
 * @property {string} updatedAt - Дата последнего обновления в ISO формате
 * @property {string[]} [outgoingLinks] - Вычисляемые ссылки на другие заметки (не сохраняется)
 */

/**
 * @typedef {Object} NoteMetadata
 * @property {boolean} isPinned - Закреплена ли заметка
 * @property {boolean} isArchived - В архиве ли заметка
 * @property {string} color - Цвет заметки (#HEX)
 * @property {number} wordCount - Количество слов
 * @property {number} readingTime - Время чтения в минутах
 * @property {string[]} [linkedNotes] - (устар.) Связи извлекаются из content
 */

/**
 * Создает новый объект заметки
 * @param {Object} data
 * @param {string} [data.id]
 * @param {string} data.title
 * @param {string} data.content
 * @param {string} data.groupId
 * @param {string} [data.type="markdown"]
 * @param {Partial<NoteMetadata>} [data.metadata]
 * @returns {Note}
 */
export function createNote(data) {
  if (!data?.title || String(data.title).trim().length === 0) {
    throw new Error("Note title is required");
  }
  if (!data?.groupId || String(data.groupId).trim().length === 0) {
    throw new Error("Group ID is required");
  }

  const now = new Date().toISOString();
  const content = String(data.content ?? "");

  const wordCount = calculateWordCount(content);
  const readingTime = calculateReadingTime(wordCount);

  const metaIn = data.metadata || {};

  return {
    id: data.id,
    groupId: String(data.groupId),
    title: String(data.title).trim(),
    content,
    type: data.type ? String(data.type) : "markdown",
    metadata: {
      linkedNotes: Array.isArray(metaIn.linkedNotes) ? metaIn.linkedNotes : [],
      isPinned: Boolean(metaIn.isPinned),
      isArchived: Boolean(metaIn.isArchived),
      color:
        typeof metaIn.color === "string" && metaIn.color.trim()
          ? metaIn.color.trim()
          : "#3b82f6",
      wordCount,
      readingTime,
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Обновляет существующую заметку
 * @param {Note} existingNote
 * @param {Object} updates
 * @returns {Note}
 */
export function updateNote(existingNote, updates) {
  if (!existingNote || typeof existingNote !== "object") {
    throw new Error("Existing note is required");
  }

  const now = new Date().toISOString();

  const title =
    updates?.title !== undefined
      ? String(updates.title ?? "").trim()
      : String(existingNote.title ?? "").trim();

  const content =
    updates?.content !== undefined
      ? String(updates.content ?? "")
      : String(existingNote.content ?? "");

  const type =
    updates?.type !== undefined
      ? String(updates.type ?? "")
      : String(existingNote.type ?? "markdown");

  const wordCount = calculateWordCount(content);
  const readingTime = calculateReadingTime(wordCount);

  // страховка от computed-полей
  // eslint-disable-next-line no-unused-vars
  const { outgoingLinks, ...safeExisting } = existingNote;

  return {
    ...safeExisting,
    groupId: String(safeExisting.groupId),
    title: title || "Без названия",
    content,
    type: type || "markdown",
    metadata: {
      ...(safeExisting.metadata || {}),
      ...(updates?.metadata || {}),
      wordCount,
      readingTime,
      linkedNotes: Array.isArray((updates?.metadata || {}).linkedNotes)
        ? updates.metadata.linkedNotes
        : Array.isArray((safeExisting.metadata || {}).linkedNotes)
          ? safeExisting.metadata.linkedNotes
          : [],
    },
    updatedAt: now,
  };
}

/**
 * Валидирует объект заметки
 * @param {any} note
 * @returns {boolean}
 */
export function validateNote(note) {
  if (!note || typeof note !== "object") return false;

  if (!note.id || typeof note.id !== "string") return false;
  if (!note.groupId || typeof note.groupId !== "string") return false;

  if (!note.title || typeof note.title !== "string") return false;
  if (typeof note.content !== "string") return false;
  if (typeof note.type !== "string") return false;

  if (!note.metadata || typeof note.metadata !== "object") return false;

  if (!note.createdAt || typeof note.createdAt !== "string") return false;
  if (!note.updatedAt || typeof note.updatedAt !== "string") return false;

  return true;
}

/**
 * Количество слов
 */
export function calculateWordCount(content) {
  const s = String(content ?? "").trim();
  if (!s) return 0;
  return s.split(/\s+/).filter(Boolean).length;
}

/**
 * Время чтения
 */
export function calculateReadingTime(wordCount) {
  const wordsPerMinute = 200;
  const wc = Number.isFinite(wordCount) ? wordCount : 0;
  return Math.ceil(wc / wordsPerMinute);
}

/**
 * Проверка возможности связи
 */
export function canLinkNotes(note1, note2) {
  return (
    note1?.id &&
    note2?.id &&
    String(note1.id) !== String(note2.id) &&
    String(note1.groupId) === String(note2.groupId)
  );
}

export default {
  createNote,
  updateNote,
  validateNote,
  calculateWordCount,
  calculateReadingTime,
  canLinkNotes,
};
