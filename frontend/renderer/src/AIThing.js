import React, { useState, useEffect, useRef } from 'react';
import './AIThing.css';

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: 'Привет, чем могу помочь?', sender: 'ai' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);

  // Автопрокрутка при новых сообщениях
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);


  const closeAssistant = () => {
    setIsOpen(false);
    document.body.style.overflow = 'auto'; // Возвращаем прокрутку
  };

  const handleQuickAction = (action) => {
    // Добавляем сообщение пользователя
    const userMessage = {
      id: messages.length + 1,
      text: action,
      sender: 'user'
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Имитация ответа AI
    setIsLoading(true);
    
    setTimeout(() => {
      let aiResponse = '';
      
      if (action === 'Анализ текста') {
        aiResponse = 'Для анализа текста вставьте его в поле ввода, и я помогу с:\n- Определением темы\n- Анализом тональности\n- Проверкой грамматики\n- Извлечением ключевых слов';
      } else if (action === 'Как можно продолжить текст') {
        aiResponse = 'Чтобы продолжить текст, предоставьте его начало. Я могу предложить:\n- Несколько вариантов продолжения\n- Развитие сюжета\n- Альтернативные концовки\n- Стилистические улучшения';
      } else {
        aiResponse = `Вы выбрали действие: "${action}". Это интересная задача! Как я могу помочь более конкретно?`;
      }
      
      const aiMessage = {
        id: messages.length + 2,
        text: aiResponse,
        sender: 'ai'
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || isLoading) return;
    
    // Добавляем сообщение пользователя
    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    // Имитация ответа AI (в реальном приложении здесь будет API запрос)
    setTimeout(() => {
      const aiResponses = [
        "Я понял ваш запрос. Могу предложить несколько вариантов решения.",
        "Интересный вопрос! Давайте разберем его подробнее.",
        "На основе вашего запроса я подготовил следующие рекомендации...",
        "Позвольте мне проанализировать эту информацию и предоставить ответ.",
        "Хороший вопрос! Вот что я могу предложить:",
        "Я рассмотрел ваш запрос. Вот мои предложения:"
      ];
      
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      
      const aiMessage = {
        id: messages.length + 2,
        text: randomResponse,
        sender: 'ai'
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Закрытие по клику вне панели
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeAssistant();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <>
      {/* Оверлей */}
      {isOpen && (
        <div 
          className="ai-assistant-overlay"
          onClick={closeAssistant}
        />
      )}

      {/* Панель AI-ассистента */}
      <div className={`ai-assistant-panel ${isOpen ? 'open' : ''}`}>
        {/* Заголовок */}
        <div className="ai-assistant-header">
          <h2>Страница AI-ассистента</h2>
          <button 
            className="ai-assistant-close"
            onClick={closeAssistant}
            title="Закрыть"
          >
            ×
          </button>
        </div>

        {/* Контент */}
        <div className="ai-assistant-content">
          <h3>Творческий помощник</h3>
          <p><strong>Диалог!</strong></p>
          
          {/* Чат */}
          <div 
            className="ai-chat-container"
            ref={chatContainerRef}
          >
            {messages.map(message => (
              <div 
                key={message.id}
                className={`ai-message ${message.sender}-message`}
              >
                {message.text}
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

          {/* Быстрые действия */}
          <div className="ai-quick-actions">
            <button 
              className="ai-action-btn"
              onClick={() => handleQuickAction('Анализ текста')}
              disabled={isLoading}
            >
              Анализ текста
            </button>
            <button 
              className="ai-action-btn"
              onClick={() => handleQuickAction('Как можно продолжить текст')}
              disabled={isLoading}
            >
              Как можно продолжить текст?
            </button>
          </div>

          {/* Поле ввода */}
          <div className="ai-input-area">
            <textarea
              className="ai-message-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Введите сообщение..."
              disabled={isLoading}
              rows="3"
            />
            <button 
              className="ai-send-btn"
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? 'Отправка...' : 'Отправить...'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIAssistant;