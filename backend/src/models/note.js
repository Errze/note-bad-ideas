/**
 * @typedef {Object} Note
 * @property {string} id - Уникальный идентификатор заметки
 * @property {string} title - Заголовок заметки
 * @property {string} content - Содержимое заметки (markdown/rich text)
 * @property {string} type - Тип содержимого (markdown/rich)
 * @property {string[]} tags - Массив тегов для категоризации
 * @property {NoteMetadata} metadata - Дополнительные метаданные
 * @property {string} createdAt - Дата создания в ISO формате
 * @property {string} updatedAt - Дата последнего обновления в ISO формате
 */

/**
 * @typedef {Object} NoteMetadata
 * @property {boolean} isPinned - Закреплена ли заметка
 * @property {boolean} isArchived - В архиве ли заметка
 * @property {string} color - Цвет заметки (#HEX)
 * @property {number} wordCount - Количество слов
 * @property {number} readingTime - Время чтения в минутах
 * @property {string[]} linkedNotes - Связанные заметки
 * @property {string} groupId - ID группы (дублирование для удобства)
 */

/**
 * Создает новый объект заметки с валидацией
 * @param {Object} data - Данные для создания заметки
 * @param {string} [data.id] - Пользовательский ID
 * @param {string} data.title - Заголовок заметки
 * @param {string} data.content - Содержимое заметки
 * @param {string} data.groupId - ID группы
 * @param {string} [data.type="markdown"] - Тип содержимого
 * @param {string[]} [data.tags=[]] - Теги
 * @param {Partial<NoteMetadata>} [data.metadata={}] - Метаданные
 * @returns {Note} Валидированный объект заметки
 * @throws {Error} Если данные невалидны
 */
export function createNote(data) {
    // Валидация обязательных полей
    if (!data.title || data.title.trim().length === 0) {
        throw new Error('Note title is required');
    }
    if (!data.groupId) {
        throw new Error('Group ID is required');
    }
    
    const now = new Date().toISOString();
    const content = data.content || '';
    
    // Расчет метаданных
    const wordCount = calculateWordCount(content);
    const readingTime = calculateReadingTime(wordCount);
    
    return {
        id: data.id, // Будет установлен в сервисе
        title: data.title.trim(),
        content: content,
        type: data.type || 'markdown',
        tags: Array.isArray(data.tags) ? data.tags.map(tag => tag.trim()).filter(tag => tag) : [],
        metadata: {
            ...data.metadata,
            isPinned: Boolean(data.metadata?.isPinned),
            isArchived: Boolean(data.metadata?.isArchived),
            color: data.metadata?.color || '#3b82f6',
            linkedNotes: Array.isArray(data.metadata?.linkedNotes) ? data.metadata.linkedNotes : [],
            groupId: data.groupId,
            wordCount,
            readingTime,
        },
        createdAt: now,
        updatedAt: now
    };
}

/**
 * Обновляет существующую заметку
 * @param {Note} existingNote - Существующая заметка
 * @param {Object} updates - Обновления
 * @returns {Note} Обновленная заметка
 */
export function updateNote(existingNote, updates) {
    const now = new Date().toISOString();
    const content = updates.content !== undefined ? updates.content : existingNote.content;
    const wordCount = calculateWordCount(content);
    const readingTime = calculateReadingTime(wordCount);
    
    return {
        ...existingNote,
        title: updates.title !== undefined ? updates.title.trim() : existingNote.title,
        content: content,
        type: updates.type || existingNote.type,
        tags: Array.isArray(updates.tags) ? updates.tags.map(tag => tag.trim()).filter(tag => tag) : existingNote.tags,
        metadata: {
            ...existingNote.metadata,
            ...updates.metadata,
            wordCount,
            readingTime
        },
        updatedAt: now
    };
}

/**
 * Валидирует объект заметки
 * @param {any} note - Объект для валидации
 * @returns {boolean} Валидна ли заметка
 */
export function validateNote(note) {
    if (!note || typeof note !== 'object') return false;
    if (!note.id || typeof note.id !== 'string') return false;
    if (!note.title || typeof note.title !== 'string') return false;
    if (typeof note.content !== 'string') return false;
    if (!Array.isArray(note.tags)) return false;
    if (!note.createdAt || !note.updatedAt) return false;
    
    return true;
}

/**
 * Рассчитывает количество слов в тексте
 * @param {string} content - Текст
 * @returns {number} Количество слов
 */
export function calculateWordCount(content) {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Рассчитывает время чтения в минутах
 * @param {number} wordCount - Количество слов
 * @returns {number} Время чтения в минутах
 */
export function calculateReadingTime(wordCount) {
    const wordsPerMinute = 200;
    return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Проверяет, можно ли привязать заметки друг к другу
 * @param {Note} note1 - Первая заметка
 * @param {Note} note2 - Вторая заметка
 * @returns {boolean} Можно ли создать связь
 */
export function canLinkNotes(note1, note2) {
    return note1.id !== note2.id && note1.metadata.groupId === note2.metadata.groupId;
}

export default {
    createNote,
    updateNote,
    validateNote,
    calculateWordCount,
    calculateReadingTime,
    canLinkNotes
};