import React, { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import './WorkNotePage.css';

// Компонент бокового меню
function Sidebar({ files, onFileSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="sidebar">
      <div className="search">
        <input
          type="text"
          placeholder="Поиск..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={{ marginBottom: '20px', padding: '8px', boxSizing: 'border-box'}}
      />
      </div>
      <ul>
        {files.map(file => (
          <li key={file.path} onClick={() => onFileSelect(file.path)}>
            {file.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WorkNotePage() {
  const [files] = useState([
    { name: 'Note1.md', path: '/note1.md' },
    { name: 'Note2.md', path: '/note2.md' },
  ]);
  const [currentFile, setCurrentFile] = useState('/note1.md');
  const [text, setText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [noteTitle, setNoteTitle] = useState('Заметка'); // название заметки

  useEffect(() => {
    // Здесь могла бы быть логика загрузки содержимого файла по currentFile
    if (currentFile === '/note1.md') {
      setText('# Заголовок заметки\n\nЭто содержимое заметки.');
    } else if (currentFile === '/note2.md') {
      setText('Это вторая заметка.');
    }
  }, [currentFile]);

  const handleFileSelect = (path) => {
    setCurrentFile(path);
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'row' }}>
      
      {/* always visible sidebar */}
      <div>
        <Sidebar files={files} onFileSelect={handleFileSelect} />
      </div>

      {/* Основная часть */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Заголовок + название заметки */}
        <div style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
          <h2 style={{ margin: 0 }}>  
            {/* интерфейс для редактирования названия */}
            <input
              type="text"
              value={noteTitle}
              onChange={handleTitleChange}
              style={{ fontSize: '1.5em', width: '100%', boxSizing: 'border-box' }}
            />
          </h2>
          {/* Кнопки переключения режима */}
          {!isEditing ? (
            <button onClick={handleEnterEditMode} style={{ marginTop: '10px' }}>Редактировать</button>
          ) : (
            <button onClick={handleExitEditMode} style={{ marginTop: '10px' }}>Готово</button>
          )}
        </div>

        {/* Контент */}
        {isEditing ? (
          // Режим редактирования
          <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 80px)' }}>
            {/* Текст редактора */}
            <textarea
              style={{ width: '50%', height: '100%', resize: 'none', padding: '10px', boxSizing: 'border-box', border: 'none', outline: 'none' }}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="divider"></div>
            {/* Предпросмотр */}
            <div style={{ width: '50%', height: '100%', overflowY: 'auto', padding: '0 10px', boxSizing: 'border-box', backgroundColor: '#fff', wordBreak: 'break-word'}}>
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          </div>
        ) : (
          // Только просмотр
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' , wordBreak: 'break-word'}}>
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}


export default WorkNotePage;