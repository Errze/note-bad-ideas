import React, { useCallback, useEffect, useRef, useState } from "react";
import "./styles/SettingsPage.css";

const API_BASE = "http://localhost:3001";
const LS_KEY = "appSettings.v1";

function safeJsonParse(str) {
  try {
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg =
      data && typeof data === "object" && data.error ? data.error : `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function SettingsPage({ onBack }) {
  const [storagePath, setStoragePath] = useState("");
  const [autoSave, setAutoSave] = useState(true);
  const [saveInterval, setSaveInterval] = useState(5);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const timerRef = useRef(null);
  const showMessage = useCallback((msg, ms = 2500) => {
    setMessage(String(msg || ""));
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (ms > 0) {
      timerRef.current = window.setTimeout(() => setMessage(""), ms);
    }
  }, []);

  // ====== ПКМ: гасим системное и наше меню на странице настроек ======
  useEffect(() => {
    const onCtxCapture = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("contextmenu", onCtxCapture, true);
    return () => window.removeEventListener("contextmenu", onCtxCapture, true);
  }, []);

  // ====== load settings: API -> localStorage -> defaults ======
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchJson(`${API_BASE}/api/settings`, { method: "GET" });

      const next = {
        storagePath: String(data?.storagePath ?? ""),
        autoSave: data?.autoSave !== undefined ? !!data.autoSave : true,
        saveInterval: Number.isFinite(Number(data?.saveInterval)) ? Number(data.saveInterval) : 5,
      };

      setStoragePath(next.storagePath);
      setAutoSave(next.autoSave);
      setSaveInterval(next.saveInterval);

      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch (e) {
      const cached = safeJsonParse(localStorage.getItem(LS_KEY));
      if (cached && typeof cached === "object") {
        setStoragePath(String(cached.storagePath ?? ""));
        setAutoSave(cached.autoSave !== undefined ? !!cached.autoSave : true);
        setSaveInterval(
          Number.isFinite(Number(cached.saveInterval)) ? Number(cached.saveInterval) : 5
        );
        showMessage("⚠️ Сервер не отдал настройки, использую локальные", 2200);
      } else {
        setStoragePath("");
        setAutoSave(true);
        setSaveInterval(5);
        showMessage("⚠️ Настройки по умолчанию (сервер недоступен)", 2200);
      }
    } finally {
      setIsLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChooseDirectory = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const data = await fetchJson(`${API_BASE}/api/choose-directory`, { method: "POST" });
      if (data?.path) {
        setStoragePath(String(data.path));
        showMessage("✅ Директория выбрана успешно", 2500);

        // обновим локально, чтобы не терялось даже без API /api/settings
        const cached = safeJsonParse(localStorage.getItem(LS_KEY)) || {};
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({
            storagePath: String(data.path),
            autoSave: cached.autoSave !== undefined ? !!cached.autoSave : autoSave,
            saveInterval: Number.isFinite(Number(cached.saveInterval)) ? Number(cached.saveInterval) : saveInterval,
          })
        );
      } else {
        showMessage("⚠️ Сервер не вернул путь", 2500);
      }
    } catch (e) {
      showMessage(`✗ Ошибка выбора директории: ${e.message}`, 3000);
    } finally {
      setIsLoading(false);
    }
  }, [autoSave, saveInterval, showMessage]);

  const handleSaveSettings = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    const settings = {
      storagePath: String(storagePath ?? ""),
      autoSave: !!autoSave,
      saveInterval: Math.min(30, Math.max(1, Number(saveInterval) || 5)),
    };

    // всегда сохраняем локально
    localStorage.setItem(LS_KEY, JSON.stringify(settings));

    try {
      await fetchJson(`${API_BASE}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      showMessage("✅ Настройки сохранены (сервер + локально)", 2500);
    } catch (e) {
      // /api/settings у тебя 404, так что это ожидаемо
      showMessage("⚠️ Сохранено локально (сервер не поддерживает /api/settings)", 3000);
    } finally {
      setIsLoading(false);
    }
  }, [storagePath, autoSave, saveInterval, showMessage]);

  const handleResetToDefault = useCallback(() => {
    const defaults = { storagePath: "", autoSave: true, saveInterval: 5 };
    setStoragePath(defaults.storagePath);
    setAutoSave(defaults.autoSave);
    setSaveInterval(defaults.saveInterval);
    localStorage.setItem(LS_KEY, JSON.stringify(defaults));
    showMessage("🔄 Настройки сброшены к значениям по умолчанию", 2500);
  }, [showMessage]);

  const handleTestConnection = useCallback(async () => {
    setIsLoading(true);
    showMessage("Проверка подключения...", 0);

    try {
      await fetch(`${API_BASE}/api/test`);
      showMessage("✓ Подключение к серверу успешно", 2500);
    } catch {
      showMessage("✗ Не удалось подключиться к серверу", 2500);
    } finally {
      setIsLoading(false);
    }
  }, [showMessage]);

  return (
    <div
      className="settings-overlay"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="settings-container">
        <div className="settings-header">
          <button
            className="settings-back-button"
            onClick={onBack}
            title="Вернуться к заметкам"
            type="button"
            disabled={isLoading}
          >
            ← Назад
          </button>
          <h1 className="settings-title">Настройки</h1>
        </div>

        <div className="settings-content">
          {message && (
            <div
              className={`settings-message ${
                message.includes("✓") || message.includes("✅")
                  ? "success"
                  : message.includes("✗")
                  ? "error"
                  : ""
              }`}
            >
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
              <p className="settings-hint">Директория, где будут храниться все ваши заметки и группы</p>
            </div>

            <div className="settings-field">
              <label className="settings-label" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="settings-checkbox"
                  disabled={isLoading}
                />
                Автоматическое сохранение
              </label>
            </div>

            {autoSave && (
              <div className="settings-field">
                <label className="settings-label" style={{ flexDirection: "row", alignItems: "center" }}>
                  Интервал автосохранения (минуты):
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={saveInterval}
                    onChange={(e) => setSaveInterval(parseInt(e.target.value, 10))}
                    className="settings-slider"
                    disabled={isLoading}
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
    </div>
  );
}

export default SettingsPage;
