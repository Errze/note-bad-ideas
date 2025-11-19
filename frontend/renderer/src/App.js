import { useEffect, useState } from "react";
import logo from './button.jpg';
import './App.css';
import WorkNotePage from "./WorkNotePage";

function App() {
  const [message, setMessage] = useState(null);
  const [page, setPage] = useState('main'); // состояние текущей страницы

  useEffect(() => {
    fetch("http://localhost:3001/api/hello")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => {
        console.error("❌ Ошибка подключения:", err);
        setMessage("❌ Нет связи с backend");
      });
  }, []);

  if (page === 'workNote') {
    return <WorkNotePage onBack={() => setPage('main')} />; // Возврат на главную страницу
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Добро пожаловать, Lenin_riba! Что хотите сделать?
          <h1>Electron + React + Node.js</h1>
          <p>{message}</p>
        </p>
        <div className="button-row">
          <button className="left-button" onClick={() => setPage('workNote')}>Создать</button>
          <button className="right-button">Открыть</button>
        </div>
        <a
          className="App-link"
          href="https://en.wikipedia.org/wiki/Jenson_Button"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn More
        </a>
      </header>
    </div>
  );
}

export default App;
