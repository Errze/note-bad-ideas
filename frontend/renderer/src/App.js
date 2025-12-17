import { useEffect, useState } from "react";
import logo from './openbook.png';
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
          Добро пожаловать! Начните творить прямо сейчас!
          <h1>Electron + React + Node.js</h1>
          <p>{message}</p>
        </p>
        <div className="button-row">
          <button className="button" onClick={() => setPage('workNote')}>Начать работу</button>
        </div>
        <a
          className="App-link"
          href="https://github.com/Errze/note-bad-ideas"
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
