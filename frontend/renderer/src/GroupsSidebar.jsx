import { useState } from "react";

export function GroupsSidebar({ groups, activeGroupId, onSelect, onCreate }) {
  const [title, setTitle] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    await onCreate(t);
    setTitle("");
  };

  return (
    <aside style={{ width: 260, borderRight: "1px solid #ddd", padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Группы</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => onSelect(g.id)}
            style={{
              textAlign: "left",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: g.id === activeGroupId ? "#eee" : "white",
              cursor: "pointer",
            }}
          >
            {g.title}
          </button>
        ))}
      </div>

      <form onSubmit={submit} style={{ display: "flex", gap: 6 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Новая группа"
          style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <button type="submit" style={{ padding: "8px 10px", borderRadius: 8 }}>
          +
        </button>
      </form>
    </aside>
  );
}
