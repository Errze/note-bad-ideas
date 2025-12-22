import { useEffect, useState, useCallback } from "react";
import logo from "./pictures/openbook.png";
import "./styles/App.css";
import WorkNotePage from "./WorkNotePage";

function App() {
  const [page, setPage] = useState("main");

  const [overlay, setOverlay] = useState({
    graph: false,
    settings: false,
    ai: false,
  });

  const setOverlayState = useCallback((patch) => {
    setOverlay((prev) => ({ ...prev, ...(patch || {}) }));
  }, []);


  useEffect(() => {
    function onContextMenu(e) {
      const target = e.target;
      if (!(target instanceof Element)) return;

      e.preventDefault();

      if (page !== "workNote") return;
      if (overlay.graph || overlay.settings || overlay.ai) return;
      if (target.closest(".sidebar")) return;

      const noteScopeEl =
        target.closest("textarea") ||
        target.closest("input") ||
        target.closest("[contenteditable='true']") ||
        target.closest(".markdown-editor") ||
        target.closest(".markdown-preview") ||
        target.closest(".preview-only") ||
        target.closest(".editor-container") ||
        target.closest(".preview-container");

      if (!noteScopeEl) return;

      const editableEl =
        target.closest("textarea") ||
        target.closest("input") ||
        target.closest("[contenteditable='true']") ||
        target.closest(".markdown-editor");

      const isEditable = !!editableEl;

      let hasSelection = false;

      const inputEl = target.closest("textarea, input");
      if (inputEl instanceof HTMLTextAreaElement || inputEl instanceof HTMLInputElement) {
        hasSelection = inputEl.selectionStart !== inputEl.selectionEnd;
      } else {
        hasSelection = (window.getSelection()?.toString().length || 0) > 0;
      }

      e.stopPropagation();

      window.api?.showContextMenu({
        hasSelection,
        isEditable, 
        selectScope: "note",
        page: "workNote",
      });
    }

    window.addEventListener("contextmenu", onContextMenu, true);
    return () => window.removeEventListener("contextmenu", onContextMenu, true);
  }, [page, overlay.graph, overlay.settings, overlay.ai]);

  useEffect(() => {
    const unsubscribe = window.api?.onSelectAllInNote?.(() => {
      const activeEditable =
        document.activeElement?.closest("textarea, input, [contenteditable='true']") ||
        document.querySelector(".markdown-editor");

      if (activeEditable instanceof HTMLTextAreaElement || activeEditable instanceof HTMLInputElement) {
        activeEditable.focus();
        activeEditable.select();
        return;
      }

      if (activeEditable && activeEditable.getAttribute?.("contenteditable") === "true") {
        const range = document.createRange();
        range.selectNodeContents(activeEditable);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }

      const preview =
        document.querySelector(".preview-only") ||
        document.querySelector(".markdown-preview");

      if (!preview) return;

      const range = document.createRange();
      range.selectNodeContents(preview);

      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onClickCapture = (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      const a = target.closest("a");
      if (!a) return;

      const href = (a.getAttribute("href") || "").trim();
      if (!href) return;

      if (href.startsWith("http://") || href.startsWith("https://")) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const isNote =
        href.startsWith("note:") ||
        href.startsWith("#note:") ||
        href.startsWith("#/note/");

      if (isNote) {
        let id = href;

        if (id.startsWith("#/note/")) id = id.slice("#/note/".length);
        else if (id.startsWith("#note:")) id = id.slice("#note:".length);
        else if (id.startsWith("note:")) id = id.slice("note:".length);

        id = id.trim();

        setPage("workNote");
        window.dispatchEvent(new CustomEvent("open-note", { detail: { id } }));
      }
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, []);

  if (page === "workNote") {
    return (
      <WorkNotePage
        onBack={() => setPage("main")}
        onOverlayChange={setOverlayState}
      />
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Добро пожаловать! Начните творить прямо сейчас!</p>

        <div className="button-row">
          <button className="button" onClick={() => setPage("workNote")} type="button">
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