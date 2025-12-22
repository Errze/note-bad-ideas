const API_BASE = "http://localhost:3001";

async function request(url, options) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null; // сервер мог вернуть HTML/текст, не падаем
  }

  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

const notesApi = {
  // groups
  getGroups() {
    return request(`${API_BASE}/api/groups`);
  },

  createGroup(title) {
    return request(`${API_BASE}/api/groups`, {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  },

  updateGroup(groupId, patch) {
    return request(`${API_BASE}/api/groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  deleteGroup(groupId) {
    return request(`${API_BASE}/api/groups/${groupId}`, {
      method: "DELETE",
    });
  },

  // notes
  getAllNotes(groupId) {
    return request(`${API_BASE}/api/groups/${groupId}/notes`);
  },

  getNote(groupId, noteId) {
    return request(`${API_BASE}/api/groups/${groupId}/notes/${noteId}`);
  },

  createNote(groupId, note) {
    return request(`${API_BASE}/api/groups/${groupId}/notes`, {
      method: "POST",
      body: JSON.stringify(note),
    });
  },

  updateNote(groupId, noteId, updates) {
    return request(`${API_BASE}/api/groups/${groupId}/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  deleteNote(groupId, noteId) {
    return request(`${API_BASE}/api/groups/${groupId}/notes/${noteId}`, {
      method: "DELETE",
    });
  },

  getStoragePath() {
    return request(`${API_BASE}/api/settings/storage-path`);
  },

  setStoragePath(storageBasePath) {
    return request(`${API_BASE}/api/settings/storage-path`, {
      method: "POST",
      body: JSON.stringify({ storageBasePath }),
    });
  },
};

export default notesApi;
