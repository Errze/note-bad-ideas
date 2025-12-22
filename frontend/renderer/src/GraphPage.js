import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./styles/GraphPage.css";

function normalizeTitleKey(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function splitByFencedCode(markdown) {
  const s = String(markdown ?? "");
  const parts = [];
  const fenceRe = /```[\s\S]*?```/g;
  let last = 0;
  let m;

  while ((m = fenceRe.exec(s)) !== null) {
    parts.push({ type: "text", value: s.slice(last, m.index) });
    parts.push({ type: "code", value: m[0] });
    last = m.index + m[0].length;
  }
  parts.push({ type: "text", value: s.slice(last) });
  return parts;
}

function stripInlineCode(text) {
  const segs = String(text ?? "").split(/(`[^`]*`)/g);
  return segs
    .map((seg) => {
      if (seg.startsWith("`") && seg.endsWith("`")) return "";
      return seg;
    })
    .join("");
}

function parseLinksFromContent(content) {
  const out = [];
  const parts = splitByFencedCode(content);

  for (const p of parts) {
    if (p.type === "code") continue;

    const text = stripInlineCode(p.value);

    const wikiRe = /\[\[([^[\]]+?)\]\]/g;
    let mw;
    while ((mw = wikiRe.exec(text)) !== null) {
      const raw = String(mw[1] ?? "").trim();
      if (!raw) continue;
      const [left] = raw.split("|");
      const targetTitle = String(left ?? "").trim();
      if (!targetTitle) continue;
      out.push({ kind: "title", title: targetTitle });
    }

    const mdLinkRe = /\[[^\]]*?\]\(([^)]+)\)/g;
    let ml;
    while ((ml = mdLinkRe.exec(text)) !== null) {
      const hrefRaw = String(ml[1] ?? "").trim();
      if (!hrefRaw) continue;

      const href = hrefRaw.replace(/^["']|["']$/g, "");

      if (href.startsWith("note:")) {
        const id = href.slice("note:".length).trim();
        if (id) out.push({ kind: "id", id });
        continue;
      }

      if (href.startsWith("note-title:")) {
        const enc = href.slice("note-title:".length).trim();
        if (!enc) continue;
        let title = "";
        try {
          title = decodeURIComponent(enc);
        } catch {
          title = enc;
        }
        title = String(title ?? "").trim();
        if (title) out.push({ kind: "title", title });
        continue;
      }
    }
  }

  return out;
}

function getCanvasCssSize(canvas) {
  const rect = canvas?.getBoundingClientRect?.();
  const w = Math.max(1, Math.round(rect?.width || 1200));
  const h = Math.max(1, Math.round(rect?.height || 600));
  return { w, h };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function pickRoots(nodes, edges) {
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  const outdeg = new Map(nodes.map((n) => [n.id, 0]));

  for (const e of edges) {
    indeg.set(e.target, (indeg.get(e.target) || 0) + 1);
    outdeg.set(e.source, (outdeg.get(e.source) || 0) + 1);
  }

  let roots = nodes.filter((n) => (indeg.get(n.id) || 0) === 0).map((n) => n.id);

  if (roots.length === 0 && nodes.length) {
    const best = [...nodes].sort((a, b) => (outdeg.get(b.id) || 0) - (outdeg.get(a.id) || 0))[0];
    roots = best ? [best.id] : [];
  }

  return { roots, indeg, outdeg };
}

function buildAdjacency(nodes, edges) {
  const children = new Map(nodes.map((n) => [n.id, []]));
  const parents = new Map(nodes.map((n) => [n.id, []]));

  for (const e of edges) {
    if (!children.has(e.source)) children.set(e.source, []);
    if (!parents.has(e.target)) parents.set(e.target, []);
    children.get(e.source).push(e.target);
    parents.get(e.target).push(e.source);
  }

  return { children, parents };
}

function layoutTree(nodes, edges, w, h) {
  const margin = 90;
  const top = 120;
  const levelGap = 110;

  const { roots } = pickRoots(nodes, edges);
  const { children } = buildAdjacency(nodes, edges);

  const visited = new Set();

  function subtreeSize(u) {
    if (visited.has(u)) return 1; 
    visited.add(u);

    const kids = children.get(u) || [];
    if (kids.length === 0) return 1;

    let sum = 0;
    for (const v of kids) sum += subtreeSize(v);
    return Math.max(1, sum);
  }

  visited.clear();
  const size = new Map(nodes.map((n) => [n.id, 1]));
  for (const r of roots) {
    const s = subtreeSize(r);
    size.set(r, s);
  }

  const pos = new Map();
  const seen = new Set();
  let cursor = 0;

  function dfs(u, depth) {
    if (seen.has(u)) return;
    seen.add(u);

    const kids = children.get(u) || [];
    if (kids.length === 0) {
      pos.set(u, { x: cursor, y: depth });
      cursor += 1;
      return;
    }

    const start = cursor;
    for (const v of kids) dfs(v, depth + 1);
    const end = cursor - 1;

    const mid = (start + end) / 2;
    pos.set(u, { x: mid, y: depth });
  }

  for (const r of roots) {
    dfs(r, 0);
    cursor += 1; 
  }

  for (const n of nodes) {
    if (!pos.has(n.id)) {
      pos.set(n.id, { x: cursor, y: 0 });
      cursor += 1;
    }
  }

  const xs = [...pos.values()].map((p) => p.x);
  const ys = [...pos.values()].map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY);

  const usableW = Math.max(1, w - margin * 2);
  const usableH = Math.max(1, h - top - margin);

  const out = new Map();
  for (const [id, p] of pos.entries()) {
    const nx = (p.x - minX) / spanX;
    const ny = spanY === 0 ? 0 : p.y / spanY;

    out.set(id, {
      x: margin + nx * usableW,
      y: top + ny * Math.min(usableH, levelGap * (maxY + 1)),
    });
  }

  return out;
}

function GraphPage({ notes, groupId, groupTitle, getNote, onClose, onOpenNote }) {
  const canvasRef = useRef(null);
  const dprRef = useRef(1);

  const [selectedNode, setSelectedNode] = useState(null);
  const [graphType] = useState("tree");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [highlightedNode, setHighlightedNode] = useState(null);
  const [canvasTick, setCanvasTick] = useState(0);

  const [fullNotes, setFullNotes] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const input = Array.isArray(notes) ? notes : [];
      if (!groupId || !getNote || input.length === 0) {
        setFullNotes(input);
        return;
      }

      const needFetch = input.filter((n) => String(n?.content ?? "").length < 5);

      if (needFetch.length === 0) {
        setFullNotes(input);
        return;
      }

      const loaded = await Promise.all(
        input.map(async (n) => {
          const id = String(n?.id ?? "");
          const c = String(n?.content ?? "");
          if (!id) return n;
          if (c.length >= 5) return n;

          try {
            const full = await getNote(groupId, id);
            return {
              ...n,
              id: String(full?.id ?? id),
              title: String(full?.title ?? n?.title ?? n?.name ?? ""),
              content: String(full?.content ?? ""),
            };
          } catch {
            return n;
          }
        })
      );

      if (alive) setFullNotes(loaded);
    })();

    return () => {
      alive = false;
    };
  }, [notes, groupId, getNote]);

  const graphData = useMemo(() => {
    const input = Array.isArray(fullNotes) ? fullNotes : [];
    if (input.length === 0) {
      return {
        nodes: [],
        edges: [],
        diag: {
          notes: 0,
          rawLinks: 0,
          noteId: 0,
          titleLinks: 0,
          unresolved: 0,
          edges: 0,
          notesWithContent: 0,
        },
      };
    }

    const nodes = input.map((note, index) => {
      const id = String(note?.id ?? index);
      const title = String(note?.title ?? note?.name ?? `Заметка ${index + 1}`);
      const content = String(note?.content ?? "");
      return {
        id,
        label: title,
        title,
        content,
        size: Math.max(26, Math.min(60, Math.round((content.length || 0) / 60) + 26)),
        color: `hsl(${(index * 137.5) % 360}, 70%, 60%)`,
      };
    });

    const byId = new Map();
    const byTitle = new Map();
    for (const n of nodes) {
      byId.set(String(n.id), String(n.id));
      byTitle.set(normalizeTitleKey(n.title), String(n.id));
    }

    let rawLinks = 0;
    let noteId = 0;
    let titleLinks = 0;
    let unresolved = 0;

    const edges = [];
    const seen = new Set();

    for (const n of nodes) {
      const links = parseLinksFromContent(n.content);
      rawLinks += links.length;

      for (const lk of links) {
        let targetId = null;

        if (lk.kind === "id") {
          noteId += 1;
          targetId = byId.get(String(lk.id)) ? String(lk.id) : null;
          if (!targetId) unresolved += 1;
        } else {
          titleLinks += 1;
          const key = normalizeTitleKey(lk.title);
          targetId = byTitle.get(key) || null;
          if (!targetId) {
            unresolved += 1;
            continue;
          }
        }

        if (!targetId) continue;
        if (String(targetId) === String(n.id)) continue;

        const eid = `${n.id}=>${targetId}`;
        if (seen.has(eid)) continue;
        seen.add(eid);

        edges.push({
          id: eid,
          source: String(n.id),
          target: String(targetId),
          label: "ссылка",
        });
      }
    }

    const notesWithContent = nodes.filter((n) => String(n.content || "").length >= 5).length;

    return {
      nodes,
      edges,
      diag: {
        notes: nodes.length,
        rawLinks,
        noteId,
        titleLinks,
        unresolved,
        edges: edges.length,
        notesWithContent,
      },
    };
  }, [fullNotes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;

      const cssW = Math.max(1, Math.round(rect.width));
      const cssH = Math.max(1, Math.round(rect.height));

      const pxW = Math.round(cssW * dpr);
      const pxH = Math.round(cssH * dpr);

      let changed = false;
      if (canvas.width !== pxW) {
        canvas.width = pxW;
        changed = true;
      }
      if (canvas.height !== pxH) {
        canvas.height = pxH;
        changed = true;
      }

      if (changed) setCanvasTick((t) => t + 1);
    };

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      ro.disconnect();
    };
  }, []);

  const [positions, setPositions] = useState(() => new Map());
  
  const onOpenNoteRef = useRef(onOpenNote);

  useEffect(() => {
    onOpenNoteRef.current = onOpenNote;
  }, [onOpenNote]);


  useEffect(() => {
    const canvas = canvasRef.current;
    const { w, h } = getCanvasCssSize(canvas);

    setPositions((prev) => {
      const next = new Map(prev);
      for (const n of graphData.nodes) {
        if (!next.has(n.id)) {
          next.set(n.id, {
            x: Math.random() * (w - 200) + 100,
            y: Math.random() * (h - 200) + 120,
          });
        }
      }
      for (const id of next.keys()) {
        if (!graphData.nodes.some((n) => n.id === id)) next.delete(id);
      }
      return next;
    });
  }, [graphData.nodes]);

  const applyLayout = useCallback(() => {
    const canvas = canvasRef.current;
    const { w, h } = getCanvasCssSize(canvas);

    const nodes = graphData.nodes;
    if (!nodes.length) return;

    const nextPos = layoutTree(nodes, graphData.edges, w, h);

    if (nextPos) setPositions(nextPos);
  }, [graphData.nodes, graphData.edges]);

  useEffect(() => {
    applyLayout();
  }, [graphData.nodes.length, graphData.edges.length, canvasTick]);

  const nodeById = useMemo(() => {
    const m = new Map();
    for (const n of graphData.nodes) {
      const p = positions.get(n.id);
      m.set(n.id, { ...n, x: p?.x ?? 0, y: p?.y ?? 0 });
    }
    return m;
  }, [graphData.nodes, positions]);

  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = dprRef.current || 1;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    for (const edge of graphData.edges) {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!source || !target) continue;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = "rgba(97, 218, 251, 0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      const angle = Math.atan2(target.y - source.y, target.x - source.x);
      const arrowLength = 10;

      ctx.beginPath();
      ctx.moveTo(target.x, target.y);
      ctx.lineTo(
        target.x - arrowLength * Math.cos(angle - Math.PI / 6),
        target.y - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(target.x, target.y);
      ctx.lineTo(
        target.x - arrowLength * Math.cos(angle + Math.PI / 6),
        target.y - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.strokeStyle = "#61dafb";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    for (const node of graphData.nodes) {
      const withPos = nodeById.get(node.id);
      if (!withPos) continue;

      ctx.beginPath();
      ctx.arc(withPos.x, withPos.y, node.size, 0, Math.PI * 2);

      if (selectedNode === node.id) {
        ctx.fillStyle = "#ff9800";
        ctx.shadowColor = "#ff9800";
        ctx.shadowBlur = 15;
      } else if (highlightedNode === node.id) {
        ctx.fillStyle = "#4caf50";
        ctx.shadowColor = "#4caf50";
        ctx.shadowBlur = 15;
      } else {
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 10;
      }

      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(withPos.x, withPos.y, node.size, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      let displayText = node.label;
      if (displayText.length > 15) displayText = displayText.slice(0, 12) + "...";
      ctx.fillText(displayText, withPos.x, withPos.y);
    }

    ctx.restore();
  }, [graphData, selectedNode, zoom, pan, highlightedNode, canvasTick, nodeById]);

  const pickNodeAt = useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();

      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      const x = (mx - pan.x) / zoom;
      const y = (my - pan.y) / zoom;

      const extra = 12 / zoom;

      let best = null;
      let bestDist = Infinity;

      for (const node of graphData.nodes) {
        const p = positions.get(node.id);
        if (!p) continue;

        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const hitR = node.size + extra;
        if (dist <= hitR && dist < bestDist) {
          best = { ...node, x: p.x, y: p.y };
          bestDist = dist;
        }
      }

      return best;
    },
    [graphData.nodes, positions, pan.x, pan.y, zoom]
  );

  const handleMouseDown = (e) => {
    if (e.button === 2) return;

    const clicked = pickNodeAt(e.clientX, e.clientY);

    if (clicked) {
      setSelectedNode(clicked.id);
      setHighlightedNode(null);
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setSelectedNode(null);
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;

    if (isDragging) {
      if (canvas) canvas.style.cursor = "grabbing";
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }

    const hovered = pickNodeAt(e.clientX, e.clientY);
    setHighlightedNode(hovered ? hovered.id : null);

    if (canvas) canvas.style.cursor = hovered ? "pointer" : "grab";
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = highlightedNode ? "pointer" : "grab";
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.1, Math.min(3, z * delta)));
  }, []);

  const handleDblClick = useCallback(
    (e) => {
      const clicked = pickNodeAt(e.clientX, e.clientY);
      if (!clicked) return;

      setSelectedNode(clicked.id);
      setHighlightedNode(null);

      requestAnimationFrame(() => {
        const fn = onOpenNoteRef.current;
        if (fn) fn(String(clicked.id));
      });
    },
    [pickNodeAt]
  );

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("dblclick", handleDblClick);
    canvas.addEventListener("contextmenu", handleContextMenu);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("dblclick", handleDblClick);
      canvas.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [handleWheel, handleDblClick, handleContextMenu]);

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCenterOnSelected = () => {
    if (!selectedNode) return;
    const node = nodeById.get(selectedNode);
    if (!node) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    setPan({
      x: rect.width / 2 - node.x * zoom,
      y: rect.height / 2 - node.y * zoom,
    });
  };

  const selectedNodeInfo = selectedNode ? nodeById.get(selectedNode) : null;

  return (
    <div className="graph-page" onContextMenu={(e) => e.preventDefault()}>
      <div className="graph-header">
        <button className="graph-back-button" onClick={onClose} title="Вернуться к заметкам" type="button">
          ← Назад к заметкам
        </button>

        <div className="graph-header-center">
          <h1 className="graph-title">Граф заметок</h1>

          <div className="graph-group-chip" title={groupTitle || groupId}>
            <span className="graph-group-chip-label">группа</span>
            <span className="graph-group-chip-name">{groupTitle || groupId}</span>
          </div>
        </div>

        <div className="graph-stats">
          <span className="graph-stat">Узлы: {graphData.nodes.length}</span>
          <span className="graph-stat">Связи: {graphData.edges.length}</span>
        </div>
      </div>

      <div className="graph-content">
        <div className="graph-controls">
          <div className="graph-control-group">
            <button className="graph-control-button" onClick={handleResetView} title="Сбросить вид" type="button">
              🔄 Сбросить вид
            </button>
            <button
              className="graph-control-button"
              onClick={handleCenterOnSelected}
              disabled={!selectedNode}
              title="Центрировать на выбранном узле"
              type="button"
            >
              ⭐ Центрировать
            </button>
          </div>

          <div className="graph-control-group">
            <span className="graph-zoom">Масштаб: {Math.round(zoom * 100)}%</span>
          </div>
        </div>

        <div className="graph-main-area">
          <div className="graph-canvas-container">
            <canvas
              ref={canvasRef}
              className="graph-canvas"
              width={1200}
              height={600}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          <div className="graph-instructions">
            <p>
              🖱️ <strong>Управление:</strong>
            </p>
            <p>• Клик по узлу: выбрать</p>
            <p>• Двойной клик по узлу: открыть заметку</p>
            <p>• Перетаскивание пустоты: панорамирование</p>
            <p>• Колесо: масштаб</p>
          </div>
        </div>

        {selectedNodeInfo && (
          <div className="graph-node-info">
            <h3 className="node-info-title">Выбранная заметка: {selectedNodeInfo.label}</h3>
            <div className="node-info-details">
              <p>
                <strong>ID:</strong> {selectedNodeInfo.id}
              </p>
              <p>
                <strong>Длина:</strong> {selectedNodeInfo.content.length} символов
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GraphPage;