
import { createNote, updateNote, calculateWordCount, calculateReadingTime } from '../src/models/note.js';

console.log('🧪 ТЕСТИРУЕМ МОДЕЛИ...\n');

// Тест создания заметки
try {
    console.log('1. 📝 Тест createNote...');
    const note = createNote({
        id: 'test-id',
        title: 'Тестовая заметка',
        content: 'Это тестовое содержимое',
        groupId: 'test-group',
        tags: ['тест', 'модель']
    });
    
    console.log('   ✅ Заметка создана:');
    console.log('   📋 ID:', note.id);
    console.log('   📋 Word count:', note.metadata.wordCount, '(ожидалось: 3)');
    console.log('   📋 Reading time:', note.metadata.readingTime, 'мин (ожидалось: 1)');
    console.log('   📋 Теги:', note.tags.length, '(ожидалось: 2)');
    
} catch (error) {
    console.error('   ❌ Ошибка:', error.message);
}

// Тест обновления заметки
try {
    console.log('\n2. ✏️ Тест updateNote...');
    const existingNote = {
        id: 'test-id',
        title: 'Старый заголовок',
        content: 'Старое содержимое',
        type: 'markdown',
        tags: ['старый'],
        metadata: {
            wordCount: 2,
            readingTime: 1,
            groupId: 'test-group'
        },
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
    };
    
    const updated = updateNote(existingNote, {
        title: 'Новый заголовок',
        content: 'Новое содержимое с большим количеством текста',
        tags: ['новый', 'обновленный']
    });
    
    console.log('   ✅ Заметка обновлена:');
    console.log('   📋 Заголовок изменен:', updated.title !== existingNote.title ? '✅' : '❌');
    console.log('   📋 Word count обновлен:', updated.metadata.wordCount, '(ожидалось: 7)');
    console.log('   📋 Дата создания сохранена:', updated.createdAt === existingNote.createdAt ? '✅' : '❌');
    console.log('   📋 Дата обновления изменена:', updated.updatedAt !== existingNote.updatedAt ? '✅' : '❌');
    
} catch (error) {
    console.error('   ❌ Ошибка:', error.message);
}

// Тест утилит
console.log('\n3. 🛠️ Тест утилит...');
const testText = 'Это тестовый текст с несколькими словами для проверки';
console.log('   📋 calculateWordCount:', calculateWordCount(testText), '(ожидалось: 8)');
console.log('   📋 calculateReadingTime:', calculateReadingTime(8), 'мин (ожидалось: 1)');