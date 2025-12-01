import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';
const GROUP_ID = 'test-group';

async function testNotes() {
    console.log('🧪 Testing notes API...\n');

    try {
        // 1. Создаем тестовые заметки
        console.log('1. Creating test notes...');
        
        const note1 = await fetch(`${API_BASE}/groups/${GROUP_ID}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: "Тестовая заметка 1",
                content: "Содержание первой тестовой заметки",
                tags: ["тест", "пример"]
            })
        });
        
        const note2 = await fetch(`${API_BASE}/groups/${GROUP_ID}/notes`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: "Тестовая заметка 2",
                content: "Вторая тестовая заметка с **markdown** форматированием",
                tags: ["тест", "markdown"]
            })
        });

        const note1Data = await note1.json();
        const note2Data = await note2.json();
        
        console.log('✅ Created notes:', note1Data.id, note2Data.id);

        // 2. Получаем все заметки
        console.log('\n2. Getting all notes...');
        const allNotes = await fetch(`${API_BASE}/groups/${GROUP_ID}/notes`);
        const notesData = await allNotes.json();
        
        console.log(`✅ Found ${notesData.length} notes:`);
        notesData.forEach(note => {
            console.log(`   - "${note.title}" (ID: ${note.id})`);
            console.log(`     Tags: ${note.tags?.join(', ') || 'none'}`);
            console.log(`     Updated: ${note.updatedAt}`);
            console.log(`     Words: ${note.metadata?.wordCount || 'N/A'}`);
        });

        // 3. Получаем одну заметку
        console.log('\n3. Getting single note...');
        const singleNote = await fetch(`${API_BASE}/groups/${GROUP_ID}/notes/${note1Data.id}`);
        const singleNoteData = await singleNote.json();
        console.log('✅ Single note:', singleNoteData.title);

        // 4. Проверяем структуру данных
        console.log('\n4. Checking data structure...');
        if (notesData.length > 0) {
            const sampleNote = notesData[0];
            console.log('✅ Note structure:');
            console.log('   - id:', typeof sampleNote.id);
            console.log('   - title:', typeof sampleNote.title); 
            console.log('   - content:', typeof sampleNote.content);
            console.log('   - tags:', Array.isArray(sampleNote.tags));
            console.log('   - createdAt:', typeof sampleNote.createdAt);
            console.log('   - updatedAt:', typeof sampleNote.updatedAt);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testNotes();