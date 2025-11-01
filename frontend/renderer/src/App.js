import logo from './button.jpg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Добро пожаловать, Lenin_riba! Что хотите сделать?
        </p>
        <div className="button-row">
          <button className="left-button">Создать</button>
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
