import { useEffect, useState } from "react";
import logo from './pictures/openbook.png';
import './styles/App.css';
import WorkNotePage from "./WorkNotePage";

function App() {
  const [page, setPage] = useState('main'); // состояние текущей страницы

  if (page === 'workNote') {
    return <WorkNotePage onBack={() => setPage('main')} />; // Возврат на главную страницу
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Добро пожаловать! Начните творить прямо сейчас!
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