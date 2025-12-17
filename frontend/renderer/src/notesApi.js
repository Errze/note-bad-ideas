const API_BASE = "http://localhost:3001";

const notesApi = {
  getGroups() {
    return request(`${API_BASE}/api/groups`);
  },

  createGroup(title) {
    return request(`${API_BASE}/api/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  },

  updateGroup: (groupId, patch) =>
  request(`${API_BASE}/api/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }),

  deleteGroup: (groupId) =>
    request(`${API_BASE}/api/groups/${groupId}`, {
      method: "DELETE",
  }),
  

  getAllNotes(groupId) {
    return request(`${API_BASE}/api/groups/${groupId}/notes`);
  },

  getNote(groupId, noteId) {
    return request(`${API_BASE}/api/groups/${groupId}/notes/${noteId}`);
  },

  createNote(groupId, note) {
    return request(`${API_BASE}/api/groups/${groupId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note),
    });
  },

  updateNote(groupId, noteId, updates) {
    return request(`${API_BASE}/api/groups/${groupId}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  },

  deleteNote(groupId, noteId) {
    return request(`${API_BASE}/api/groups/${groupId}/notes/${noteId}`, {
      method: "DELETE",
    });
  },
};

async function request(url, options) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export default notesApi;

