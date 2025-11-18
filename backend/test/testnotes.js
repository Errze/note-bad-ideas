import { Storage } from '../storage/index.js';

async function comprehensiveTest() {
    console.log('🧪 ЗАПУСК КОМПЛЕКСНОГО ТЕСТА...\n');
    
    const testGroupId = 'test-group-' + Date.now();
    let testNoteId = '';
    
    try {
        // 🟢 ТЕСТ 1: Получить заметки из пустой группы
        console.log('1. 📝 Получаем заметки из пустой группы...');
        const emptyNotes = await Storage.Notes.getNotes(testGroupId);
        console.log('   ✅ Успех: Получено заметок -', emptyNotes.length);
        console.log('   📊 Ожидалось: 0, Получено:', emptyNotes.length, emptyNotes.length === 0 ? '✅' : '❌');
        
        // 🟢 ТЕСТ 2: Создать первую заметку
        console.log('\n2. 📝 Создаем первую заметку...');
        const note1 = await Storage.Notes.createNote(testGroupId, {
            title: 'Первая тестовая заметка',
            content: 'Это содержимое **первой** тестовой заметки с markdown.',
            tags: ['тест', 'первая', 'важная'],
            type: 'markdown'
        });
        testNoteId = note1.id;
        console.log('   ✅ Заметка создана:');
        console.log('   📋 ID:', note1.id);
        console.log('   📋 Заголовок:', note1.title);
        console.log('   📋 Теги:', note1.tags);
        console.log('   📋 Word count:', note1.metadata.wordCount);
        console.log('   📋 Reading time:', note1.metadata.readingTime + ' мин');
        
        // 🟢 ТЕСТ 3: Создать вторую заметку
        console.log('\n3. 📝 Создаем вторую заметку...');
        const note2 = await Storage.Notes.createNote(testGroupId, {
            title: 'Вторая заметка',
            content: 'Содержимое второй заметки. Она должна быть более новой после обновления.',
            tags: ['тест', 'вторая'],
            type: 'markdown'
        });
        console.log('   ✅ Вторая заметка создана, ID:', note2.id);
        
        // 🟢 ТЕСТ 4: Получить все заметки (должны быть 2)
        console.log('\n4. 📚 Получаем все заметки группы...');
        const allNotes = await Storage.Notes.getNotes(testGroupId);
        console.log('   ✅ Получено заметок:', allNotes.length);
        console.log('   📊 Ожидалось: 2, Получено:', allNotes.length, allNotes.length === 2 ? '✅' : '❌');
        
        // Проверяем сортировку (сначала новые)
        if (allNotes.length >= 2) {
            const isSorted = new Date(allNotes[0].updatedAt) >= new Date(allNotes[1].updatedAt);
            console.log('   📊 Сортировка (сначала новые):', isSorted ? '✅' : '❌');
        }
        
        // 🟢 ТЕСТ 5: Получить конкретную заметку
        console.log('\n5. 🔍 Получаем конкретную заметку...');
        const foundNote = await Storage.Notes.getNote(testGroupId, testNoteId);
        console.log('   ✅ Заметка найдена:', foundNote ? '✅' : '❌');
        if (foundNote) {
            console.log('   📋 Заголовок:', foundNote.title);
            console.log('   📋 Совпадает ID:', foundNote.id === testNoteId ? '✅' : '❌');
        }
        
        // 🟢 ТЕСТ 6: Обновить заметку
        console.log('\n6. ✏️ Обновляем заметку...');
        const updatedNote = await Storage.Notes.updateNote(testGroupId, testNoteId, {
            title: 'ОБНОВЛЕННЫЙ заголовок',
            content: 'Обновленное содержимое заметки. Теперь с большим количеством текста для проверки подсчета слов и времени чтения.',
            tags: ['тест', 'обновленная', 'успех']
        });
        console.log('   ✅ Заметка обновлена:');
        console.log('   📋 Новый заголовок:', updatedNote.title);
        console.log('   📋 Новые теги:', updatedNote.tags);
        console.log('   📋 Новый word count:', updatedNote.metadata.wordCount);
        console.log('   📋 Заголовок изменился:', updatedNote.title !== note1.title ? '✅' : '❌');
        console.log('   📋 Дата обновления изменилась:', updatedNote.updatedAt !== note1.updatedAt ? '✅' : '❌');
        
        // 🟢 ТЕСТ 7: Проверить что обновленная заметка первая в списке
        console.log('\n7. 📊 Проверяем порядок после обновления...');
        const notesAfterUpdate = await Storage.Notes.getNotes(testGroupId);
        if (notesAfterUpdate.length > 0) {
            const isFirst = notesAfterUpdate[0].id === testNoteId;
            console.log('   📊 Обновленная заметка первая:', isFirst ? '✅' : '❌');
            console.log('   📊 Последнее обновление:', new Date(notesAfterUpdate[0].updatedAt).toLocaleTimeString());
        }
        
        // 🟢 ТЕСТ 8: Создать заметку с кастомным ID
        console.log('\n8. 🆔 Создаем заметку с кастомным ID...');
        const customIdNote = await Storage.Notes.createNote(testGroupId, {
            id: 'custom-test-note',
            title: 'Заметка с кастомным ID',
            content: 'Эта заметка имеет заданный вручную ID.',
            tags: ['кастомный-id']
        });
        console.log('   ✅ Заметка создана с кастомным ID:');
        console.log('   📋 ID:', customIdNote.id);
        console.log('   📋 Совпадает с заданным:', customIdNote.id === 'custom-test-note' ? '✅' : '❌');
        
        // 🟢 ТЕСТ 9: Попытка создать заметку с невалидным ID
        console.log('\n9. ⚠️ Пробуем создать заметку с невалидным ID...');
        try {
            await Storage.Notes.createNote(testGroupId, {
                id: 'invalid@id',
                title: 'Невалидная заметка',
                content: 'Эта заметка не должна создаться.'
            });
            console.log('   ❌ ОШИБКА: Заметка создалась, но не должна была!');
        } catch (error) {
            console.log('   ✅ Ожидаемая ошибка:', error.message);
        }
        
        // 🟢 ТЕСТ 10: Удаление заметки
        console.log('\n10. 🗑️ Удаляем тестовую заметку...');
        await Storage.Notes.deleteNote(testGroupId, testNoteId);
        console.log('   ✅ Заметка удалена');
        
        // 🟢 ТЕСТ 11: Проверить что заметка действительно удалена
        console.log('\n11. 🔍 Проверяем что заметка удалена...');
        const deletedNote = await Storage.Notes.getNote(testGroupId, testNoteId);
        console.log('   📊 Заметка найдена после удаления:', deletedNote ? '❌' : '✅');
        
        // 🟢 ТЕСТ 12: Попытка удалить несуществующую заметку
        console.log('\n12. ⚠️ Пробуем удалить несуществующую заметку...');
        try {
            await Storage.Notes.deleteNote(testGroupId, 'non-existent-note');
            console.log('   ❌ ОШИБКА: Удаление прошло, но не должно было!');
        } catch (error) {
            console.log('   ✅ Ожидаемая ошибка:', error.message);
        }
        
        // 🟢 ТЕСТ 13: Финальная проверка количества заметок
        console.log('\n13. 📊 Финальная проверка количества заметок...');
        const finalNotes = await Storage.Notes.getNotes(testGroupId);
        console.log('   📊 Оставлось заметок:', finalNotes.length);
        console.log('   📊 Ожидалось: 2 (одна удалена, одна кастомная осталась)');
        
        // 🟢 ИТОГИ
        console.log('\n🎉 ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ!');
        console.log('📈 Статистика:');
        console.log('   • Создано заметок: 3 (2 обычных + 1 кастомная)');
        console.log('   • Удалено заметок: 1');
        console.log('   • Осталось заметок:', finalNotes.length);
        console.log('   • Группа для тестов:', testGroupId);
        
    } catch (error) {
        console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message);
        console.error(error.stack);
    }
}

// Запускаем тест
comprehensiveTest();