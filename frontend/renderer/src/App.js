import { useEffect, useState } from "react";
import logo from "./pictures/openbook.png";
import "./styles/App.css";
import WorkNotePage from "./WorkNotePage";

function App() {
  const [page, setPage] = useState("main");

  useEffect(() => {
    function onContextMenu(e) {
      const target = e.target;
      if (!(target instanceof Element)) return;

      if (target.closest(".sidebar")) {
        e.preventDefault(); 
        return;            
      }

      e.preventDefault();
      e.stopPropagation();

      const noteEl =
        target.closest("textarea") ||
        target.closest("input") ||
        target.closest("[contenteditable='true']") ||
        target.closest(".note-content");

      let hasSelection = false;
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
        hasSelection = target.selectionStart !== target.selectionEnd;
      } else {
        hasSelection = (window.getSelection()?.toString().length || 0) > 0;
      }

      window.api?.showContextMenu({
        hasSelection,
        isEditable: !!noteEl,
        selectScope: noteEl ? "note" : "global",
      });
    }

    window.addEventListener("contextmenu", onContextMenu);
    return () => window.removeEventListener("contextmenu", onContextMenu);
  }, []);

  useEffect(() => {
    const unsubscribe = window.api?.onSelectAllInNote?.(() => {
      const note =
        document.activeElement?.closest("textarea, input, [contenteditable='true']") ||
        document.querySelector(".note-content");

      if (!note) return;

      if (note instanceof HTMLTextAreaElement || note instanceof HTMLInputElement) {
        note.focus();
        note.select();
      } else {
        const range = document.createRange();
        range.selectNodeContents(note);

        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  if (page === "workNote") {
    return <WorkNotePage onBack={() => setPage("main")} />;
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Добро пожаловать! Начните творить прямо сейчас!</p>
        <div className="button-row">
          <button className="button" onClick={() => setPage("workNote")}>
            Начать работу
          </button>
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
