import React, { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import './WorkNotePage.css';

const API_BASE = 'http://localhost:3001';

const notesApi = {
  async saveNote(groupId, noteData) {
    const cleanGroupId = groupId.trim();
    
    const url = noteData.id 
      ? `${API_BASE}/api/groups/${cleanGroupId}/notes/${noteData.id}`
      : `${API_BASE}/api/groups/${cleanGroupId}/notes`;

    const method = noteData.id ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noteData)
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Fetch error:', error);
      throw new Error(`Ошибка сохранения: ${error.message}`);
    }
  },

  async getNote(groupId, noteId) {
    try {
      const response = await fetch(`${API_BASE}/api/groups/${groupId}/notes/${noteId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Get note error:', error);
      throw error;
    }
  },

  async getAllNotes(groupId) {
    try {
      const response = await fetch(`${API_BASE}/api/groups/${groupId}/notes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Get all notes error:', error);
      return [];
    }
  },

  async deleteNote(groupId, noteId) {
    try {
      const response = await fetch(`${API_BASE}/api/groups/${groupId}/notes/${noteId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Delete note error:', error);
      throw error;
    }
  },

  async getGroups() {
    try {
      // Пробуем получить группы из localStorage
      const groups = localStorage.getItem('availableGroups');
      return groups ? JSON.parse(groups) : ['test-group-1763402154936'];
    } catch (error) {
      console.error('Error getting groups:', error);
      return ['test-group-1763402154936'];
    }
  },

  async saveGroups(groups) {
    try {
      localStorage.setItem('availableGroups', JSON.stringify(groups));
      return groups;
    } catch (error) {
      console.error('Error saving groups:', error);
      throw error;
    }
  },

  async createGroup(groupName) {
    try {
      console.log('Sending request to create group:', groupName);
      
      const response = await fetch(`${API_BASE}/api/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupName })
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Group creation result:', result);
      
      // Сохраняем группу в localStorage
      const existingGroups = await this.getGroups();
      console.log('Existing groups:', existingGroups);
      
      if (!existingGroups.includes(groupName)) {
        const newGroups = [...existingGroups, groupName];
        await this.saveGroups(newGroups);
        console.log('Groups saved to localStorage:', newGroups);
      }
      
      return result;
    } catch (error) {
      console.error('Create group error:', error);
      throw error;
    }
  }
};

// Функция для загрузки существующих заметок
const loadExistingNotes = async (groupId) => {
  try {
    const notes = await notesApi.getAllNotes(groupId);
    return notes.map(note => ({
      name: `${note.title}.md`,
      path: `/${note.id}`,
      id: note.id,
      title: note.title,
      content: note.content
    }));
  } catch (error) {
    console.error('Error loading existing notes:', error);
    return [];
  }
};

// Компонент бокового меню
function Sidebar({ files, onFileSelect, onNewNote, onDeleteNote, currentFile }) {
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, noteId: null, noteName: '' });
  
  const handleContextMenu = (e, noteId, noteName) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      noteId,
      noteName
    });
  };

  const handleContextMenuAction = (action) => {
    if (action === 'delete' && contextMenu.noteId) {
      onDeleteNote(contextMenu.noteId, contextMenu.noteName);
    }
    setContextMenu({ visible: false, x: 0, y: 0, noteId: null, noteName: '' });
  };

  // Закрываем контекстное меню при клике вне его
  useEffect(() => {
    const handleClick = () => {
      setContextMenu({ visible: false, x: 0, y: 0, noteId: null, noteName: '' });
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="sidebar">
      {/* Кнопка создания заметки вверху */}
      <div style={{ marginBottom: '25px' }}>
        <button 
          onClick={onNewNote}
          style={{
            padding: '12px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            width: '100%',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          + Создать заметку
        </button>
      </div>
      
      {/* Список заметок */}
      <div>
        <div style={{ 
          color: 'rgb(134, 176, 179)', 
          fontSize: '12px', 
          marginBottom: '12px',
          padding: '0 5px',
          fontWeight: 'bold'
        }}>
          Заметки ({files.length})
        </div>
        <ul style={{ margin: 0, padding: 0 }}>
          {files.map(file => (
            <li 
              key={file.id}
              onClick={() => onFileSelect(file.path)}
              onContextMenu={(e) => handleContextMenu(e, file.id, file.name)}
              style={{
                backgroundColor: currentFile === file.path ? 'rgba(255,255,255,0.2)' : 'transparent',
                padding: '10px 12px',
                marginBottom: '6px',
                cursor: 'pointer',
                borderRadius: '6px',
                transition: 'background-color 0.2s',
                listStyle: 'none',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
              onMouseEnter={(e) => {
                if (currentFile !== file.path) {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentFile !== file.path) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              {file.name}
            </li>
          ))}
        </ul>
      </div>

      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 1000,
            minWidth: '150px'
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: '1px solid #eee',
              color: '#ff6b6b'
            }}
            onClick={() => handleContextMenuAction('delete')}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Удалить "{contextMenu.noteName}"
          </div>
        </div>
      )}
    </div>
  );
}

function GroupSelector({ groupId, groups, onGroupChange, onReloadNotes }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '20px' }}>
      <label style={{ color: 'white', fontSize: '14px' }}>Группа:</label>
      <select 
        value={groupId} 
        onChange={(e) => onGroupChange(e.target.value)}
        style={{ 
          padding: '6px 10px', 
          borderRadius: '6px', 
          border: '1px solid #ccc',
          backgroundColor: 'white',
          minWidth: '120px'
        }}
      >
        {groups.map(group => (
          <option key={group} value={group}>
            {group}
          </option>
        ))}
      </select>
      <button 
        onClick={onReloadNotes}
        style={{
          padding: '6px 10px',
          backgroundColor: '#FF9800',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
        title="Обновить список заметок"
      >
        🔄
      </button>
    </div>
  );
}

function WorkNotePage() {
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState('');
  const [text, setText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [noteTitle, setNoteTitle] = useState('Новая заметка');
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [currentNoteId, setCurrentNoteId] = useState(null);

  // Загрузка групп при монтировании
  useEffect(() => {
    loadGroups();
  }, []);

  // Загрузка заметок при изменении группы
  useEffect(() => {
    if (currentGroup) {
      loadNotesForGroup();
    }
  }, [currentGroup]);

  const loadGroups = async () => {
    try {
      const availableGroups = await notesApi.getGroups();
      setGroups(availableGroups);
      if (availableGroups.length > 0 && !currentGroup) {
        setCurrentGroup(availableGroups[0]);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadNotesForGroup = async () => {
    try {
      const existingNotes = await loadExistingNotes(currentGroup);
      setFiles(existingNotes);
      
      if (existingNotes.length > 0 && !currentFile) {
        handleFileSelect(existingNotes[0].path);
      } else if (existingNotes.length === 0) {
        setCurrentFile('');
        setNoteTitle('Новая заметка');
        setText('# Новая заметка\n\nНачните писать здесь...');
        setCurrentNoteId(null);
      }
    } catch (error) {
      console.error('Error loading notes for group:', error);
    }
  };

  const handleFileSelect = async (path) => {
    const selectedFile = files.find(f => f.path === path);
    if (selectedFile) {
      setCurrentFile(path);
      setNoteTitle(selectedFile.title);
      setCurrentNoteId(selectedFile.id);
      
      try {
        const fullNote = await notesApi.getNote(currentGroup, selectedFile.id);
        setText(fullNote.content || '');
      } catch (error) {
        console.error('Error loading note content:', error);
        setText(selectedFile.content || '');
      }
      
      setSaveMessage('');
    }
  };

  const handleEnterEditMode = () => {
    setIsEditing(true);
  };

  const handleExitEditMode = () => {
    setIsEditing(false);
  };

  const handleTitleChange = (e) => {
    setNoteTitle(e.target.value);
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) {
      setSaveMessage('❌ Заголовок не может быть пустым');
      return;
    }

    if (!currentGroup) {
      setSaveMessage('❌ Выберите группу для сохранения');
      return;
    }

    setSaving(true);
    setSaveMessage('Сохраняем...');

    try {
      const noteData = {
        title: noteTitle,
        content: text,
        tags: ['saved-from-frontend'],
        contentJson: {},
        metadata: {
          wordCount: text.split(/\s+/).length,
          characterCount: text.length,
          aiAnalysis: {},
          connections: []
        }
      };

      if (currentNoteId) {
        noteData.id = currentNoteId;
      }

      const savedNote = await notesApi.saveNote(currentGroup, noteData);
      
      const updatedFiles = files.filter(file => file.id !== savedNote.id);
      const newFile = {
        name: `${savedNote.title}.md`,
        path: `/${savedNote.id}`,
        id: savedNote.id,
        title: savedNote.title,
        content: savedNote.content
      };
      
      setFiles([newFile, ...updatedFiles]);
      setCurrentNoteId(savedNote.id);
      setCurrentFile(newFile.path);

      setSaveMessage('✅ Заметка успешно сохранена!');
      
      setTimeout(() => {
        setIsEditing(false);
      }, 2000);

    } catch (error) {
      setSaveMessage(`❌ Ошибка: ${error.message}`);
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId, noteName) => {
    if (!window.confirm(`Вы уверены, что хотите удалить заметку "${noteName}"?`)) {
      return;
    }

    setDeleting(true);

    try {
      await notesApi.deleteNote(currentGroup, noteId);
      
      const updatedFiles = files.filter(file => file.id !== noteId);
      setFiles(updatedFiles);
      
      if (currentNoteId === noteId) {
        setCurrentFile('');
        setNoteTitle('Новая заметка');
        setText('# Новая заметка\n\nНачните писать здесь...');
        setCurrentNoteId(null);
      }
      
      setSaveMessage('✅ Заметка успешно удалена!');
      
    } catch (error) {
      setSaveMessage(`❌ Ошибка удаления: ${error.message}`);
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleNewNote = () => {
    const newNoteTitle = `Новая заметка ${files.length + 1}`;
    
    setCurrentFile('');
    setNoteTitle(newNoteTitle);
    setText('# Новая заметка\n\nНачните писать здесь...');
    setCurrentNoteId(null);
    setSaveMessage('');
    setIsEditing(true);
  };

  const handleReloadNotes = () => {
    loadNotesForGroup();
    setSaveMessage('🔄 Список заметок обновлен');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'row' }}>
      
      <div>
        <Sidebar 
          files={files} 
          onFileSelect={handleFileSelect}
          onNewNote={handleNewNote}
          onDeleteNote={handleDeleteNote}
          currentFile={currentFile}
        />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          padding: '10px', 
          borderBottom: '1px solid #ccc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#595789'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h2 style={{ margin: 0, color: 'white' }}>  
              <input
                type="text"
                value={noteTitle}
                onChange={handleTitleChange}
                style={{ 
                  fontSize: '1.5em', 
                  width: '300px', 
                  boxSizing: 'border-box',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  backgroundColor: 'white'
                }}
                placeholder="Название заметки"
              />
            </h2>
            
            <GroupSelector
              groupId={currentGroup}
              groups={groups}
              onGroupChange={setCurrentGroup}
              onReloadNotes={handleReloadNotes}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {saveMessage && (
              <span style={{ 
                color: saveMessage.includes('✅') ? '#4CAF50' : 
                       saveMessage.includes('❌') ? '#f44336' : '#FF9800',
                fontWeight: 'bold',
                marginRight: '10px',
                fontSize: '14px'
              }}>
                {saveMessage}
              </span>
            )}
            
            <button 
              onClick={handleSaveNote} 
              disabled={saving || deleting}
              style={{
                padding: '10px 18px',
                backgroundColor: saving ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (saving || deleting) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              {saving ? '💾 Сохранение...' : '💾 Сохранить'}
            </button>

            {!isEditing ? (
              <button 
                onClick={handleEnterEditMode}
                disabled={deleting}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                Редактировать
              </button>
            ) : (
              <button 
                onClick={handleExitEditMode}
                disabled={saving || deleting}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (saving || deleting) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                Готово
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 80px)' }}>
            <textarea
              style={{ 
                width: '50%', 
                height: '100%', 
                resize: 'none', 
                padding: '15px', 
                boxSizing: 'border-box', 
                border: 'none', 
                outline: 'none',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '1.6',
                backgroundColor: '#f8f9fa'
              }}
              value={text}
              onChange={handleTextChange}
              placeholder="Начните писать свою заметку в формате Markdown..."
            />
            <div className="divider"></div>
            <div style={{ 
              width: '50%', 
              height: '100%', 
              overflowY: 'auto', 
              padding: '15px', 
              boxSizing: 'border-box', 
              backgroundColor: '#fff', 
              wordBreak: 'break-word'
            }}>
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '20px',
            wordBreak: 'break-word',
            backgroundColor: '#fff'
          }}>
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkNotePage;