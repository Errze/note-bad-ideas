export function extractRawRefs(content) {
  const text = String(content ?? "");
  const refs = [];

  // [[Title]] or [[Title|Alias]]
  const wikiRe = /\[\[([^[\]]+?)\]\]/g;
  let m;
  while ((m = wikiRe.exec(text)) !== null) {
    const inside = String(m[1] || "").trim();
    if (!inside) continue;
    const [left] = inside.split("|");
    const target = String(left || "").trim();
    if (target) refs.push({ kind: "title", value: target });
  }

  // [label](note:ID)
  const noteRe = /\[[^\]]*?\]\(\s*note:([a-zA-Z0-9_-]+)\s*\)/g;
  while ((m = noteRe.exec(text)) !== null) {
    const id = String(m[1] || "").trim();
    if (id) refs.push({ kind: "id", value: id });
  }

  return refs;
}

function normalizeTitle(s) {
  return String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

// rawRefs: [{kind:"title"|"id", value:string}]
export function resolveRefsToNoteIds(rawRefs, notes) {
  const idSet = new Set();

  const byId = new Map();
  const byTitle = new Map();

  for (const n of notes || []) {
    if (!n?.id) continue;
    byId.set(String(n.id), String(n.id));
    byTitle.set(normalizeTitle(n.title || "Без названия"), String(n.id));
  }

  for (const r of rawRefs || []) {
    if (!r?.value) continue;

    if (r.kind === "id") {
      const id = byId.get(String(r.value));
      if (id) idSet.add(id);
      continue;
    }

    if (r.kind === "title") {
      const id = byTitle.get(normalizeTitle(r.value));
      if (id) idSet.add(id);
    }
  }

  return [...idSet];
}
