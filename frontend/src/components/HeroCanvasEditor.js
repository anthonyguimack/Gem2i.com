import React, { useState, useRef, useCallback } from 'react';

const CANVAS_W = 700;
const CANVAS_H = 300;

const LAYER_COLORS = {
  title: { bg: '#c9a84c', text: '#000' },
  subtitle: { bg: '#0D9488', text: '#fff' },
  description: { bg: '#3b82f6', text: '#fff' },
  button: { bg: '#8b5cf6', text: '#fff' },
  media: { bg: '#ec4899', text: '#fff' },
};

const LAYER_LABELS = {
  title: 'Title',
  subtitle: 'Subtitle',
  description: 'Description',
  button: 'Button',
  media: 'Video / Photo',
};

export default function HeroCanvasEditor({ coords, onChange, backgroundImage }) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const layers = [
    { id: 'title', x: coords.title_x, y: coords.title_y },
    { id: 'subtitle', x: coords.subtitle_x, y: coords.subtitle_y },
    { id: 'description', x: coords.description_x, y: coords.description_y },
    { id: 'button', x: coords.button_x, y: coords.button_y },
    { id: 'media', x: coords.media_x, y: coords.media_y },
  ];

  const getCanvasCoords = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: Math.round(Math.max(0, Math.min(CANVAS_W, (e.clientX - rect.left) * scaleX))),
      y: Math.round(Math.max(0, Math.min(CANVAS_H, (e.clientY - rect.top) * scaleY))),
    };
  }, []);

  const handleMouseDown = (layerId, e) => {
    e.preventDefault();
    const pos = getCanvasCoords(e);
    const layer = layers.find(l => l.id === layerId);
    setDragging(layerId);
    setOffset({ x: pos.x - layer.x, y: pos.y - layer.y });
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const pos = getCanvasCoords(e);
    const newX = Math.max(0, Math.min(CANVAS_W, pos.x - offset.x));
    const newY = Math.max(0, Math.min(CANVAS_H, pos.y - offset.y));
    onChange(dragging, newX, newY);
  }, [dragging, offset, getCanvasCoords, onChange]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleTouchStart = (layerId, e) => {
    const touch = e.touches[0];
    const pos = getCanvasCoords(touch);
    const layer = layers.find(l => l.id === layerId);
    setDragging(layerId);
    setOffset({ x: pos.x - layer.x, y: pos.y - layer.y });
  };

  const handleTouchMove = useCallback((e) => {
    if (!dragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getCanvasCoords(touch);
    const newX = Math.max(0, Math.min(CANVAS_W, pos.x - offset.x));
    const newY = Math.max(0, Math.min(CANVAS_H, pos.y - offset.y));
    onChange(dragging, newX, newY);
  }, [dragging, offset, getCanvasCoords, onChange]);

  // Build background style
  const bgStyle = {};
  if (backgroundImage) {
    bgStyle.backgroundImage = `url(${backgroundImage})`;
    bgStyle.backgroundSize = 'cover';
    bgStyle.backgroundPosition = 'center';
  }

  return (
    <div data-testid="hero-canvas-editor">
      <div
        ref={canvasRef}
        className="relative w-full border-2 border-slate-200 rounded-sm select-none overflow-hidden"
        style={{
          aspectRatio: `${CANVAS_W}/${CANVAS_H}`,
          cursor: dragging ? 'grabbing' : 'default',
          backgroundColor: backgroundImage ? undefined : '#0f172a',
          ...bgStyle,
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Dark overlay on top of background for readability */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />

        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={`v${i}`} className="absolute top-0 bottom-0 border-l border-white/10" style={{ left: `${(i / 7) * 100}%` }} />
          ))}
          {[1, 2].map(i => (
            <div key={`h${i}`} className="absolute left-0 right-0 border-t border-white/10" style={{ top: `${(i / 3) * 100}%` }} />
          ))}
        </div>

        {/* Draggable layers */}
        {layers.map(layer => {
          const color = LAYER_COLORS[layer.id];
          const pctX = (layer.x / CANVAS_W) * 100;
          const pctY = (layer.y / CANVAS_H) * 100;
          return (
            <div
              key={layer.id}
              className="absolute flex items-center gap-1.5 px-2.5 py-1.5 rounded shadow-lg transition-shadow"
              style={{
                left: `${pctX}%`,
                top: `${pctY}%`,
                backgroundColor: color.bg,
                color: color.text,
                cursor: dragging === layer.id ? 'grabbing' : 'grab',
                zIndex: dragging === layer.id ? 50 : 10,
                transform: 'translate(-50%, -50%)',
                boxShadow: dragging === layer.id ? '0 0 0 2px #fff, 0 4px 12px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.3)',
              }}
              onMouseDown={(e) => handleMouseDown(layer.id, e)}
              onTouchStart={(e) => handleTouchStart(layer.id, e)}
              data-testid={`canvas-layer-${layer.id}`}
            >
              <span className="text-[11px] font-bold whitespace-nowrap">{LAYER_LABELS[layer.id]}</span>
              <span className="text-[9px] opacity-70 whitespace-nowrap">({layer.x}, {layer.y})</span>
            </div>
          );
        })}

        {/* Canvas size label */}
        <div className="absolute bottom-1 right-2 text-[9px] text-white/50 z-20">{CANVAS_W} x {CANVAS_H}</div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {Object.entries(LAYER_LABELS).map(([id, label]) => (
          <div key={id} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: LAYER_COLORS[id].bg }} />
            {label}: <span className="font-mono text-slate-400">{layers.find(l => l.id === id)?.x || 0}, {layers.find(l => l.id === id)?.y || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
