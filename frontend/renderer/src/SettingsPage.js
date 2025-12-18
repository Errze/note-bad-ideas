import React, { useState, useEffect } from "react";
import "./styles/SettingsPage.css";

const API_BASE = "http://localhost:3001";

function SettingsPage({ onBack }) {
  const [storagePath, setStoragePath] = useState("");
  const [autoSave, setAutoSave] = useState(true);
  const [saveInterval, setSaveInterval] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Загружаем текущие настройки при монтировании
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings`);
      if (response.ok) {
        const data = await response.json();
        setStoragePath(data.storagePath || "");
        setAutoSave(data.autoSave !== undefined ? data.autoSave : true);
        setSaveInterval(data.saveInterval || 5);
      }
    } catch (error) {
      console.error("Ошибка загрузки настроек:", error);
      setMessage("Не удалось загрузить настройки");
    }
  };

  const handleChooseDirectory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/choose-directory`, {
        method: "POST",
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.path) {
          setStoragePath(data.path);
          setMessage("Директория выбрана успешно");
        }
      } else {
        const error = await response.json();
        setMessage(`Ошибка: ${error.error || "Неизвестная ошибка"}`);
      }
    } catch (error) {
      console.error("Ошибка выбора директории:", error);
      setMessage("Ошибка подключения к серверу");
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    setMessage("");
    
    try {
      const settings = {
        storagePath,
        autoSave,
        saveInterval,
      };

      const response = await fetch(`${API_BASE}/api/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage("Настройки успешно сохранены!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        const error = await response.json();
        setMessage(`Ошибка: ${error.error || "Не удалось сохранить настройки"}`);
      }
    } catch (error) {
      console.error("Ошибка сохранения настроек:", error);
      setMessage("Ошибка подключения к серверу");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToDefault = () => {
    setStoragePath("");
    setAutoSave(true);
    setSaveInterval(5);
    setMessage("Настройки сброшены к значениям по умолчанию");
  };

  const handleTestConnection = async () => {
    setMessage("Проверка подключения...");
    try {
      const response = await fetch(`${API_BASE}/api/test`);
      if (response.ok) {
        setMessage("✓ Подключение к серверу успешно");
      } else {
        setMessage("✗ Ошибка подключения к серверу");
      }
    } catch (error) {
      setMessage("✗ Не удалось подключиться к серверу");
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button 
          className="settings-back-button" 
          onClick={onBack}
          title="Вернуться к заметкам"
          type="button"
        >
          ← Назад
        </button>
        <h1 className="settings-title">Настройки</h1>
      </div>

      <div className="settings-content">
        {message && (
          <div className={`settings-message ${message.includes("✓") ? "success" : message.includes("✗") ? "error" : ""}`}>
            {message}
          </div>
        )}

        <div className="settings-section">
          <h2 className="settings-section-title">Хранилище</h2>
          
          <div className="settings-field">
            <label className="settings-label">Путь к директории заметок:</label>
            <div className="path-selector">
              <input
                type="text"
                value={storagePath}
                onChange={(e) => setStoragePath(e.target.value)}
                placeholder="Выберите или введите путь к директории"
                className="path-input"
                readOnly
              />
              <button
                onClick={handleChooseDirectory}
                className="path-select-button"
                disabled={isLoading}
                title="Выбрать папку для хранения заметок"
                type="button"
              >
                📁 Выбрать папку
              </button>
            </div>
            <p className="settings-hint">
              Директория, где будут храниться все ваши заметки и группы
            </p>
          </div>

          <div className="settings-field">
            <label className="settings-label">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="settings-checkbox"
              />
              Автоматическое сохранение
            </label>
          </div>

          {autoSave && (
            <div className="settings-field">
              <label className="settings-label">
                Интервал автосохранения (минуты):
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={saveInterval}
                  onChange={(e) => setSaveInterval(parseInt(e.target.value))}
                  className="settings-slider"
                />
                <span className="settings-interval-value">{saveInterval} мин</span>
              </label>
            </div>
          )}
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Система</h2>
          
          <div className="settings-field">
            <button
              onClick={handleTestConnection}
              className="settings-test-button"
              disabled={isLoading}
              title="Проверить соединение с сервером"
              type="button"
            >
              🔗 Проверить подключение к серверу
            </button>
          </div>

          <div className="settings-field">
            <button
              onClick={handleResetToDefault}
              className="settings-reset-button"
              disabled={isLoading}
              title="Восстановить настройки по умолчанию"
              type="button"
            >
              🔄 Сбросить настройки по умолчанию
            </button>
          </div>
        </div>

        <div className="settings-actions">
          <button
            onClick={handleSaveSettings}
            className="settings-save-button"
            disabled={isLoading}
            title="Сохранить все изменения настроек"
            type="button"
          >
            {isLoading ? "💾 Сохранение..." : "💾 Сохранить настройки"}
          </button>
          
          <button
            onClick={onBack}
            className="settings-cancel-button"
            disabled={isLoading}
            title="Вернуться без сохранения"
            type="button"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;