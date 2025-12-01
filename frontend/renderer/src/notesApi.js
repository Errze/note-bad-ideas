const API_BASE = "http://localhost:3001"; // твой backend

const notesApi = {
  async getGroups() {
    const res = await fetch(`${API_BASE}/api/groups`);
    if (!res.ok) throw new Error("Failed to load groups");
    return res.json();
  },

  async createGroup(name) {
    const res = await fetch(`${API_BASE}/api/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to create group");
    return res.json();
  },

  async getAllNotes(groupId) {
    const res = await fetch(`${API_BASE}/api/groups/${groupId}/notes`);
    if (!res.ok) throw new Error("Failed to load notes");
    return res.json();
  },

  async getNote(groupId, noteId) {
    const res = await fetch(
      `${API_BASE}/api/groups/${groupId}/notes/${noteId}`
    );
    if (!res.ok) throw new Error("Failed to load note");
    return res.json();
  },

  async createNote(groupId, note) {
    const res = await fetch(`${API_BASE}/api/groups/${groupId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error("Failed to create note");
    return res.json();
  },

  async updateNote(groupId, noteId, updates) {
    const res = await fetch(
      `${API_BASE}/api/groups/${groupId}/notes/${noteId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }
    );
    if (!res.ok) throw new Error("Failed to update note");
    return res.json();
  },

  async deleteNote(groupId, noteId) {
    const res = await fetch(
      `${API_BASE}/api/groups/${groupId}/notes/${noteId}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error("Failed to delete note");
    return res.json();
  },
};

export default notesApi;
