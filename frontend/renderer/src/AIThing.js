import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import "./styles/AIThing.css";

const API_BASE = "http://localhost:3001";

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) throw new Error(data?.error || data?.detail || `HTTP ${res.status}`);
  return data;
}

const AIAssistant = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Привет. Я твой ассистент. Могу помочь тебе в работе с текстом. Если тебе нужен анализ текста, то напиши об этом и вставь свой текст. Могу помочь с продолжением текста с помощью наводящих вопросов. Напиши свой текст, а я постараюсь тебе помочь!", sender: "ai" },
  ]);

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [panelWidth, setPanelWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const chatContainerRef = useRef(null);

  const pushMessage = useCallback((text, sender) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), text: String(text ?? ""), sender },
    ]);
  }, []);

  // автопрокрутка
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const minWidth = 350;
      const maxWidth = 800;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, window.innerWidth - e.clientX));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing]);

  const closeAssistant = useCallback(() => {
    setPanelWidth(450);
    onClose?.();
  }, [onClose]);

  // ESC закрывает
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {        
        setPanelWidth(450);
        closeAssistant();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeAssistant]);

  // блокируем скролл страницы только когда панель открыта
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "auto";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const chatPayloadMessages = useMemo(() => {
    const last = messages.slice(-20);

    const system = {
      role: "system",
      content:
        "Ты ассистент для текстового редактора. Помогай писать, анализировать (определить стиль, написать плюсы и минусы), продолжать, предлагать улучшения. Пиши структурировано и по делу.",
    };

    const mapped = last.map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text,
    }));

    return [system, ...mapped];
  }, [messages]);

  const handleQuickAction = useCallback(
    async (action) => {
      if (isLoading) return;

      pushMessage(action, "user");
      setIsLoading(true);

      try {
        const text = inputText.trim();
        if (!text) {
          pushMessage("Вставь текст в поле ввода снизу. Кнопки не умеют читать мысли.", "ai");
          return;
        }

        if (action === "Анализ текста") {
          const data = await postJSON(`${API_BASE}/api/ai/analyze`, { text });
          pushMessage(data.analysis || "(пустой ответ)", "ai");
        }  else if (action === "Наводящие вопросы") {
          const data = await postJSON(`${API_BASE}/api/ai/questions`, { text });
          pushMessage(data.questions || "(пустой ответ)", "ai");
        } else {
          pushMessage(`Неизвестное действие: ${action}`, "ai");
        }
      } catch (e) {
        pushMessage(`Ошибка AI: ${String(e.message || e)}`, "ai");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, inputText, pushMessage]
  );

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const text = inputText.trim();
    pushMessage(text, "user");
    setInputText("");
    setIsLoading(true);

    try {
      const data = await postJSON(`${API_BASE}/api/ai/chat`, {
        messages: chatPayloadMessages.concat([{ role: "user", content: text }]),
        temperature: 0.7,
        max_tokens: 400,
      });

      pushMessage(data.reply || "(пустой ответ)", "ai");
    } catch (e) {
      pushMessage(`Ошибка AI: ${String(e.message || e)}`, "ai");
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, pushMessage, chatPayloadMessages]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {isOpen && (
        <div className="ai-assistant-overlay"
          onClick={() => {
            setPanelWidth(450);
            closeAssistant();
          }}  
        />
      )}

      <div className={`ai-assistant-panel ${isOpen ? "open" : ""} ${isResizing ? "resizing" : ""}`}
      style={{ width: `${panelWidth}px` }}>
        <div 
          className="ai-resizer" 
          onMouseDown={startResizing}
          title="Потяните для изменения ширины"
        />        
        <div className="ai-assistant-header">
          <h2>AI-ассистент</h2>
          <button className="ai-assistant-close" onClick={closeAssistant} title="Закрыть" type="button">
            ×
          </button>
        </div>

        <div className="ai-assistant-content">
          <h3>Творческий помощник</h3>
          <p>
            <strong>Диалог</strong>
          </p>

          <div className="ai-chat-container" ref={chatContainerRef}>
            {messages.map((m) => (
              <div key={m.id} className={`ai-message ${m.sender}-message`}>
                {m.text}
              </div>
            ))}

            {isLoading && (
              <div className="ai-message ai-message">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>


          <div className="ai-input-area">
            <textarea
              className="ai-message-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Введите сообщение или вставьте текст..."
              disabled={isLoading}
              rows={3}
            />
            <button
              className="ai-send-btn"
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              type="button"
            >
              {isLoading ? "Отправка..." : "Отправить"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIAssistant;
