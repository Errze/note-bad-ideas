import React, { useEffect, useRef, useState, useCallback } from "react";
import "./AIThing.css";

const AIAssistant = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Привет, чем могу помочь?", sender: "ai" },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);

  // автопрокрутка
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const closeAssistant = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // ESC закрывает
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
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

  const handleQuickAction = (action) => {
    if (isLoading) return;

    const userMessage = { id: Date.now(), text: action, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    setTimeout(() => {
      let aiResponse = "";

      if (action === "Анализ текста") {
        aiResponse =
          "Для анализа текста вставьте его в поле ввода, и я помогу с:\n- Определением темы\n- Анализом тональности\n- Проверкой грамматики\n- Извлечением ключевых слов";
      } else if (action === "Как можно продолжить текст") {
        aiResponse =
          "Чтобы продолжить текст, предоставьте его начало. Я могу предложить:\n- Несколько вариантов продолжения\n- Развитие сюжета\n- Альтернативные концовки\n- Стилистические улучшения";
      } else {
        aiResponse = `Вы выбрали действие: "${action}". Как помочь конкретнее?`;
      }

      const aiMessage = { id: Date.now() + 1, text: aiResponse, sender: "ai" };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 900);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = { id: Date.now(), text: inputText, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    setTimeout(() => {
      const aiResponses = [
        "Я понял ваш запрос. Могу предложить несколько вариантов решения.",
        "Интересный вопрос. Давайте разберем его подробнее.",
        "На основе вашего запроса я подготовил следующие рекомендации...",
        "Секунду, анализирую и формулирую ответ.",
        "Вот что могу предложить:",
      ];
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];

      const aiMessage = { id: Date.now() + 1, text: randomResponse, sender: "ai" };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1200);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {isOpen && <div className="ai-assistant-overlay" onClick={closeAssistant} />}

      <div className={`ai-assistant-panel ${isOpen ? "open" : ""}`}>
        <div className="ai-assistant-header">
          <h2>AI-ассистент</h2>
          <button className="ai-assistant-close" onClick={closeAssistant} title="Закрыть" type="button">
            ×
          </button>
        </div>

        <div className="ai-assistant-content">
          <h3>Творческий помощник</h3>
          <p>
            <strong>Диалог!</strong>
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

          <div className="ai-quick-actions">
            <button className="ai-action-btn" onClick={() => handleQuickAction("Анализ текста")} disabled={isLoading} type="button">
              Анализ текста
            </button>
            <button
              className="ai-action-btn"
              onClick={() => handleQuickAction("Как можно продолжить текст")}
              disabled={isLoading}
              type="button"
            >
              Как можно продолжить текст?
            </button>
          </div>

          <div className="ai-input-area">
            <textarea
              className="ai-message-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Введите сообщение..."
              disabled={isLoading}
              rows={3}
            />
            <button className="ai-send-btn" onClick={handleSendMessage} disabled={!inputText.trim() || isLoading} type="button">
              {isLoading ? "Отправка..." : "Отправить"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIAssistant;
