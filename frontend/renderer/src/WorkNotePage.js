import React, { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import './WorkNotePage.css';
import settings from './settings.png';
import graph from './graph.png';
import editing from './editing.png';
import savesave from './saving.png';
import update from './update.png';
import done from './done.png';
import newnote from './new-note.png'

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
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, noteId: null, noteName: '' });
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

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

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Закрываем контекстное меню при клике вне его
  useEffect(() => {
    const handleClick = () => {
      setContextMenu({ visible: false, x: 0, y: 0, noteId: null, noteName: '' });
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleSettingsClick = () => {
    alert('Абонент временно недоступен, пожалуйста, перезвоните позднее \nThe number is not available at the moment, please, try again later');
  };

  return (
    <div className="sidebar">
      <div className="search">
        <input
          type="text"
          placeholder="Поиск..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={{ padding: '8px', alignitems: 'center'}}
        />
      </div> 

      <div className="note-section">
        <div className="note-head">
          <div className="notes-title">
            Заметки ({filteredFiles.length})
          </div>
          <button className="new-note-button-container" 
          title="Создать новую заметку"
          onClick={onNewNote}>
          <img src={newnote} alt="new-note" className="new-note-icon" />
          </button>
        </div> 

        <ul className="notes-list">
          {filteredFiles.map(file => (
            <li 
              key={file.id}
              onClick={() => onFileSelect(file.path)}
              onContextMenu={(e) => handleContextMenu(e, file.id, file.name)}
              style={{
                backgroundColor: currentFile === file.path}}
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

      <div className="button-container">
        <button className="settings-button" 
        title="Настройки"
        onClick={handleSettingsClick}>
          <img src={settings} alt="settings" className="settings-icon" />
        </button>
        <button className="graph-button" 
        title="Граф"
        onClick={handleSettingsClick}>
        <img src={graph} alt="graph" className="graph-icon" />
        </button>
      </div>

      {contextMenu.visible && (
        <div className="context-menu"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          <div className="contex-menu-delete"
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
    <div className="group-selector">
      <label>Группа:</label>
      <select 
        value={groupId} 
        onChange={(e) => onGroupChange(e.target.value)}
        className="group-select"
      >
        {groups.map(group => (
          <option key={group} value={group}>
            {group}
          </option>
        ))}
      </select>
      <button 
        onClick={onReloadNotes}
        className="reload-button"
        title="Обновить список заметок">
        <img src={update} alt="update" className="update-icon" />
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
    <div className="worknote-container">
      <div>
        <Sidebar 
          files={files} 
          onFileSelect={handleFileSelect}
          onNewNote={handleNewNote}
          onDeleteNote={handleDeleteNote}
          currentFile={currentFile}
        />
      </div>

      <div className="main-content">
        <div className="header">
          <div className="header-left">
            <h2>  
              <input
                type="text"
                value={noteTitle}
                onChange={handleTitleChange}
                className="title-input"
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

          <div className="header-right">
            {saveMessage && (
              <span className="save-message" style={{ 
                color: saveMessage.includes('✅') ? '#4CAF50' : 
                       saveMessage.includes('❌') ? '#f44336' : '#FF9800'}}>
                {saveMessage}
              </span>
            )}
            
            <button 
              onClick={handleSaveNote} 
              disabled={saving || deleting}
              className="save-button"
              title="Сохранить заметку"
              style={{
                backgroundColor: saving ? '#6c757d' : '#61dafb',
                cursor: (saving || deleting) ? 'not-allowed' : 'pointer'
              }}>
              <img src={savesave} alt="saving" className="saving-icon" />
            </button>

            {!isEditing ? (
              <button 
                onClick={handleEnterEditMode}
                disabled={deleting}
                className="edit-button"
                title="Редактировать заметку"
                style={{
                  cursor: deleting ? 'not-allowed' : 'pointer'}}>
                <img src={editing} alt="editing" className="editing-icon" />
              </button>
            ) : (
              <button 
                onClick={handleExitEditMode}
                disabled={saving || deleting}
                className="done-button"
                title="Готово"
                style={{
                  cursor: (saving || deleting) ? 'not-allowed' : 'pointer'}}>
                <img src={done} alt="done" className="done-icon" />
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="editor-container">
            <textarea
              className="markdown-editor"
              value={text}
              onChange={handleTextChange}
              placeholder="Начните писать свою заметку в формате Markdown..."
            />
            <div className="editor-divider"></div>
            <div className="markdown-preview">
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="preview-container">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkNotePage;