import { useEffect, useState, useCallback } from "react";
import logo from "./pictures/openbook.png";
import "./styles/App.css";
import WorkNotePage from "./WorkNotePage";

function App() {
  const [page, setPage] = useState("main");

  // какие оверлеи сейчас открыты поверх WorkNotePage
  const [overlay, setOverlay] = useState({
    graph: false,
    settings: false,
    ai: false,
  });

  // WorkNotePage будет вызывать это, когда открывает/закрывает оверлеи
  const setOverlayState = useCallback((patch) => {
    setOverlay((prev) => ({ ...prev, ...(patch || {}) }));
  }, []);

  // ---- контекст-меню: ТОЛЬКО на WorkNotePage, НЕ в sidebar, НЕ при оверлеях,
  //      работает и в edit, и в preview (но paste/cut только там, где можно) ----
  useEffect(() => {
    function onContextMenu(e) {
      const target = e.target;
      if (!(target instanceof Element)) return;

      // 0) Всегда гасим дефолтное меню браузера
      e.preventDefault();

      // 1) Меню разрешено ТОЛЬКО на WorkNote
      if (page !== "workNote") return;

      // 2) Если открыт любой оверлей -> меню НЕ показываем
      if (overlay.graph || overlay.settings || overlay.ai) return;

      // 3) Sidebar всегда без ПКМ
      if (target.closest(".sidebar")) return;

      // 4) Разрешаем меню только в зоне заметки: editor + preview
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

      // 5) Определяем, можно ли редактировать (cut/paste)
      const editableEl =
        target.closest("textarea") ||
        target.closest("input") ||
        target.closest("[contenteditable='true']") ||
        target.closest(".markdown-editor");

      const isEditable = !!editableEl;

      // 6) Есть ли выделение текста
      let hasSelection = false;

      // если ПКМ по input/textarea, используем их выделение
      const inputEl = target.closest("textarea, input");
      if (inputEl instanceof HTMLTextAreaElement || inputEl instanceof HTMLInputElement) {
        hasSelection = inputEl.selectionStart !== inputEl.selectionEnd;
      } else {
        hasSelection = (window.getSelection()?.toString().length || 0) > 0;
      }

      // 7) Зовём IPC меню
      e.stopPropagation();

      window.api?.showContextMenu({
        hasSelection,
        isEditable, // важно: в preview будет false, но меню всё равно покажется (copy + select all)
        selectScope: "note",
        page: "workNote",
      });
    }

    // capture = чтобы перехватывать раньше, чем что-либо ещё
    window.addEventListener("contextmenu", onContextMenu, true);
    return () => window.removeEventListener("contextmenu", onContextMenu, true);
  }, [page, overlay.graph, overlay.settings, overlay.ai]);

  // ---- select all ----
  useEffect(() => {
    const unsubscribe = window.api?.onSelectAllInNote?.(() => {
      // 1) если фокус в textarea/input/contenteditable -> select там
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

      // 2) иначе выделяем превью заметки
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

  // ---- блокируем навигацию по ссылкам внутри приложения ----
  useEffect(() => {
    const onClickCapture = (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      const a = target.closest("a");
      if (!a) return;

      const href = (a.getAttribute("href") || "").trim();
      if (!href) return;

      // внешние ссылки не блокируем
      if (href.startsWith("http://") || href.startsWith("https://")) {
        return;
      }

      // внутренние ссылки блокируем, чтобы Electron не перезагружал renderer
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
