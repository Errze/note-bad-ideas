import React, { useState, useEffect, useRef } from "react";
import "./styles/GraphPage.css";

function GraphPage({ notes, onClose }) {
  const canvasRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [graphType, setGraphType] = useState("force-directed");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [highlightedNode, setHighlightedNode] = useState(null);

  // Подготовка данных для графа
  const graphData = React.useMemo(() => {
    if (!notes || notes.length === 0) return { nodes: [], edges: [] };

    const nodes = notes.map((note, index) => {
      // Извлекаем связи из текста (ищет [[название заметки]])
      const links = [];
      if (note.content) {
        const linkMatches = note.content.match(/\[\[(.*?)\]\]/g) || [];
        linkMatches.forEach(match => {
          const noteName = match.slice(2, -2).trim();
          links.push(noteName);
        });
      }

      return {
        id: note.id || index,
        label: note.title || note.name || `Заметка ${index + 1}`,
        links,
        x: Math.random() * 800 + 100,
        y: Math.random() * 500 + 100,
        size: Math.max(30, Math.min(80, (note.content?.length || 0) / 50)),
        color: `hsl(${index * 137.5 % 360}, 70%, 60%)`
      };
    });

    // Создаем связи между узлами
    const edges = [];
    nodes.forEach(node => {
      node.links.forEach(linkName => {
        const targetNode = nodes.find(n => n.label === linkName);
        if (targetNode && targetNode.id !== node.id) {
          edges.push({
            id: `${node.id}-${targetNode.id}`,
            source: node.id,
            target: targetNode.id,
            label: "ссылка"
          });
        }
      });
    });

    return { nodes, edges };
  }, [notes]);

  // Рисование графа
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Применяем трансформации (зум и панорамирование)
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Рисуем связи
    graphData.edges.forEach(edge => {
      const source = graphData.nodes.find(n => n.id === edge.source);
      const target = graphData.nodes.find(n => n.id === edge.target);
      
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = "rgba(97, 218, 251, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Стрелка
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
    });

    // Рисуем узлы
    graphData.nodes.forEach(node => {
      // Рисуем круг узла
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
      
      // Подсветка выбранного узла
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
      
      // Обводка узла
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Текст внутри узла
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Обрезаем текст, если он слишком длинный
      let displayText = node.label;
      if (displayText.length > 15) {
        displayText = displayText.substring(0, 12) + "...";
      }
      
      ctx.fillText(displayText, node.x, node.y);
    });

    ctx.restore();
  }, [graphData, selectedNode, zoom, pan, highlightedNode]);

  // Обработчики событий мыши
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Проверяем, кликнули ли на узел
    const clickedNode = graphData.nodes.find(node => {
      const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      return distance <= node.size;
    });

    if (clickedNode) {
      setSelectedNode(clickedNode.id);
      setHighlightedNode(null);
    } else {
      // Начинаем панорамирование
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else {
      // Подсветка узла при наведении
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      const hoveredNode = graphData.nodes.find(node => {
        const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
        return distance <= node.size;
      });

      setHighlightedNode(hoveredNode ? hoveredNode.id : null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
    setZoom(newZoom);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCenterOnSelected = () => {
    if (selectedNode) {
      const node = graphData.nodes.find(n => n.id === selectedNode);
      if (node) {
        const canvas = canvasRef.current;
        setPan({
          x: canvas.width / 2 - node.x * zoom,
          y: canvas.height / 2 - node.y * zoom
        });
      }
    }
  };

  // Информация о выбранном узле
  const selectedNodeInfo = graphData.nodes.find(n => n.id === selectedNode);

  return (
    <div className="graph-page">
      <div className="graph-header">
        <button 
          className="graph-back-button" 
          onClick={onClose}
          title="Вернуться к заметкам"
          type="button"
        >
          ← Назад к заметкам
        </button>
        <h1 className="graph-title">Граф заметок</h1>
        <div className="graph-stats">
          <span className="graph-stat">Узлы: {graphData.nodes.length}</span>
          <span className="graph-stat">Связи: {graphData.edges.length}</span>
        </div>
      </div>

      <div className="graph-content">
        <div className="graph-controls">
          <div className="graph-control-group">
            <label className="graph-control-label">Тип графа:</label>
            <select 
              className="graph-select"
              value={graphType}
              onChange={(e) => setGraphType(e.target.value)}
            >
              <option value="force-directed">Силовое размещение</option>
              <option value="radial">Радиальный</option>
              <option value="tree">Древовидный</option>
            </select>
          </div>

          <div className="graph-control-group">
            <button 
              className="graph-control-button"
              onClick={handleResetView}
              title="Сбросить вид"
              type="button"
            >
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
              onWheel={handleWheel}
            />
          </div>

          <div className="graph-instructions">
            <p>🖱️ <strong>Управление:</strong></p>
            <p>• Клик по узлу - выбрать</p>
            <p>• Перетаскивание холста - панорамирование</p>
            <p>• Колесо мыши - масштабирование</p>
            <p>• Двойной клик - сброс вида</p>
          </div>
        </div>

        {selectedNodeInfo && (
          <div className="graph-node-info">
            <h3 className="node-info-title">Выбранная заметка: {selectedNodeInfo.label}</h3>
            <div className="node-info-details">
              <p><strong>ID:</strong> {selectedNodeInfo.id}</p>
              <p><strong>Связи:</strong> {selectedNodeInfo.links.length}</p>
              {selectedNodeInfo.links.length > 0 && (
                <div className="node-links">
                  <strong>Связанные заметки:</strong>
                  <ul>
                    {selectedNodeInfo.links.map((link, index) => (
                      <li key={index}>{link}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GraphPage;