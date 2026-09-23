import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';

/*
 * ImageAdjust — reusable client-side image adjustment modal.
 *
 * Ported from the KMS Posts cropper (backend/kms/static/admin.js), rebuilt as a
 * React component for the main CMS. Three modes, exactly like Posts:
 *   • Crop         — FREE-FORM box (any proportion, per Anthony 2026-08-04);
 *                    only the area outside the box is cut, nothing is distorted.
 *   • Auto Stretch — the whole image is scaled to fill `targetRatio` (may distort).
 *   • Use Original — uploaded unchanged. Transparency is preserved (the raw file
 *                    is passed straight through — no JPEG flatten).
 *
 * Everything runs on a <canvas>; the chosen result is what gets uploaded. The
 * caller receives a Blob (crop/stretch) or the untouched File (original) via
 * onConfirm(blobOrFile, filename).
 *
 * SVGs are not canvas-friendly (tainting / no intrinsic size) — the wrapper
 * skips the modal for them and uploads raw, so this component only ever sees
 * raster images.
 */

const MAX_OUT = 2000;          // cap the longest output edge
const STAGE_W = 560, STAGE_H = 400;

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

// Formats that can carry alpha — cropped/stretched output stays PNG so
// transparency survives; everything else is encoded as JPEG for size.
function hasAlpha(file) {
  const t = (file && file.type) || '';
  return t === 'image/png' || t === 'image/gif' || t === 'image/webp';
}

export default function ImageAdjust({ file, targetRatio = 3 / 2, defaultMode = 'crop', onConfirm, onCancel }) {
  const [mode, setMode] = useState(defaultMode);
  const [img, setImg] = useState(null);          // loaded HTMLImageElement
  const [disp, setDisp] = useState({ scale: 1, w: 0, h: 0 });
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shown, setShown] = useState(false);      // drives enter transition

  const urlRef = useRef(null);
  const previewRef = useRef(null);
  const dragRef = useRef(null);

  // ── load the picked file ────────────────────────────────────────────────
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    const im = new Image();
    im.onload = () => {
      const s = Math.min(STAGE_W / im.naturalWidth, STAGE_H / im.naturalHeight, 1);
      const d = { scale: s, w: Math.round(im.naturalWidth * s), h: Math.round(im.naturalHeight * s) };
      setImg(im);
      setDisp(d);
      // initial crop = centred, ~80% of the display
      const cw = d.w * 0.8, ch = d.h * 0.8;
      setCrop({ x: (d.w - cw) / 2, y: (d.h - ch) / 2, w: cw, h: ch });
    };
    im.onerror = () => setError('Could not read that image.');
    im.src = url;
    return () => { URL.revokeObjectURL(url); urlRef.current = null; };
  }, [file]);

  // play the enter transition on next frame
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r); }, []);

  // Escape closes
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // ── free-form corner resize (no ratio lock) ─────────────────────────────
  const resizeCorner = (c, h, dx, dy) => {
    const minS = 40;
    const right = c.x + c.w, bottom = c.y + c.h;
    const ax = (h === 'nw' || h === 'sw') ? right : c.x;    // anchored (opposite) x
    const ay = (h === 'nw' || h === 'ne') ? bottom : c.y;   // anchored y
    let mx = ((h === 'ne' || h === 'se') ? right : c.x) + dx;
    let my = ((h === 'sw' || h === 'se') ? bottom : c.y) + dy;
    mx = clamp(mx, 0, disp.w);
    my = clamp(my, 0, disp.h);
    const w = Math.max(minS, Math.abs(mx - ax));
    const hh = Math.max(minS, Math.abs(my - ay));
    return {
      x: (mx >= ax) ? ax : ax - w,
      y: (my >= ay) ? ay : ay - hh,
      w, h: hh,
    };
  };

  const onPointerDown = (e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode: handle ? 'resize' : 'move', handle,
      sx: e.clientX, sy: e.clientY, start: { ...crop },
    };
    const move = (ev) => {
      const d = dragRef.current; if (!d) return;
      const dx = ev.clientX - d.sx, dy = ev.clientY - d.sy;
      if (d.mode === 'move') {
        setCrop({
          x: clamp(d.start.x + dx, 0, disp.w - d.start.w),
          y: clamp(d.start.y + dy, 0, disp.h - d.start.h),
          w: d.start.w, h: d.start.h,
        });
      } else {
        setCrop(resizeCorner(d.start, d.handle, dx, dy));
      }
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ── live preview (small canvas, redrawn on any change) ───────────────────
  const drawPreview = useCallback(() => {
    const cv = previewRef.current;
    if (!cv || !img) return;
    let ratio;
    if (mode === 'crop') ratio = crop.w / crop.h || targetRatio;
    else ratio = targetRatio;
    const PW = 220;
    cv.width = PW; cv.height = Math.round(PW / ratio);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    const s = disp.scale;
    if (mode === 'crop') {
      const sx = crop.x / s, sy = crop.y / s, sw = crop.w / s, sh = crop.h / s;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    } else if (mode === 'stretch') {
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, cv.width, cv.height);
    } else {
      // original — contain (letterbox), transparent bg shows the fit
      const r = Math.min(cv.width / img.naturalWidth, cv.height / img.naturalHeight);
      const w = img.naturalWidth * r, h = img.naturalHeight * r;
      ctx.drawImage(img, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
    }
  }, [img, mode, crop, disp.scale, targetRatio]);

  useLayoutEffect(() => { drawPreview(); }, [drawPreview]);

  // ── confirm → produce the upload payload ────────────────────────────────
  const confirm = () => {
    if (!img) return;
    // Use Original = pass the untouched file straight through (keeps transparency,
    // animation, and exact bytes — no re-encode).
    if (mode === 'original') { onConfirm?.(file, file.name); return; }

    setBusy(true);
    const canvas = document.createElement('canvas');
    const nw = img.naturalWidth, nh = img.naturalHeight;
    let ctx;
    if (mode === 'crop') {
      const s = disp.scale;
      const sw = crop.w / s, sh = crop.h / s, sx = crop.x / s, sy = crop.y / s;
      let ow = Math.round(sw), oh = Math.round(sh);
      const longest = Math.max(ow, oh);
      if (longest > MAX_OUT) { const k = MAX_OUT / longest; ow = Math.round(ow * k); oh = Math.round(oh * k); }
      canvas.width = ow; canvas.height = oh;
      ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, ow, oh);
    } else { // stretch → fill targetRatio
      let ow = Math.min(nw, MAX_OUT), oh = Math.round(ow / targetRatio);
      if (oh > MAX_OUT) { oh = MAX_OUT; ow = Math.round(oh * targetRatio); }
      canvas.width = ow; canvas.height = oh;
      ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, nw, nh, 0, 0, ow, oh);
    }
    const alpha = hasAlpha(file);
    const type = alpha ? 'image/png' : 'image/jpeg';
    const quality = alpha ? undefined : 0.92;
    const ext = alpha ? 'png' : 'jpg';
    canvas.toBlob((blob) => {
      setBusy(false);
      if (!blob) { setError('Could not process the image.'); return; }
      const base = (file.name || 'image').replace(/\.[^.]+$/, '');
      onConfirm?.(blob, `${base}-${mode}.${ext}`);
    }, type, quality);
  };

  const HANDLES = ['nw', 'ne', 'sw', 'se'];
  const handleCursor = { nw: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', se: 'nwse-resize' };
  const hint = mode === 'crop'
    ? 'Drag inside the box to move it, drag a corner to resize. Crop freely to any shape — only the area outside is cut.'
    : mode === 'stretch'
      ? 'The whole image is scaled to fill the slot. Watch the preview for distortion if the shape is far from the target.'
      : 'The image is uploaded unchanged — transparency is kept. It may letterbox inside a fixed slot.';

  return (
    <div className="fixed inset-0 z-[400] flex items-start justify-center" data-testid="image-adjust">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-200"
        style={{ opacity: shown ? 1 : 0 }}
        onClick={onCancel}
      />
      {/* dialog */}
      <div
        className="relative mt-[5vh] w-[min(880px,94vw)] max-h-[88vh] bg-white rounded-md shadow-2xl flex flex-col overflow-hidden"
        style={{
          transformOrigin: 'center',
          transform: shown ? 'scale(1)' : 'scale(0.96)',
          opacity: shown ? 1 : 0,
          transition: 'transform 200ms cubic-bezier(0.23,1,0.32,1), opacity 200ms ease-out',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h4 className="text-[15px] font-semibold text-slate-800">Adjust Image</h4>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-xl leading-none" data-testid="adjust-close">&times;</button>
        </div>

        {/* mode tabs */}
        <div className="flex gap-1.5 px-4 pt-3">
          {[['crop', 'Crop'], ['stretch', 'Auto Stretch'], ['original', 'Use Original']].map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-sm border transition-colors active:scale-[0.98] ${
                mode === m
                  ? 'bg-[#0D9488] border-[#0D9488] text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
              style={{ transition: 'background-color 150ms ease, transform 120ms ease-out' }}
              data-testid={`adjust-mode-${m}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* body */}
        <div className="flex gap-4 p-4 overflow-auto flex-col sm:flex-row">
          {/* stage */}
          <div
            className="flex-1 flex items-center justify-center rounded-sm border border-slate-200 bg-slate-100 overflow-hidden select-none"
            style={{ minHeight: 320 }}
          >
            {error ? (
              <p className="text-xs text-red-500 p-4">{error}</p>
            ) : !img ? (
              <p className="text-xs text-slate-400 p-4">Loading…</p>
            ) : mode === 'crop' ? (
              <div className="relative" style={{ width: disp.w, height: disp.h, touchAction: 'none' }}>
                <img src={urlRef.current} alt="" className="block w-full h-full pointer-events-none" draggable={false} />
                <div
                  className="absolute box-border border-2 border-white cursor-move"
                  style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h, boxShadow: '0 0 0 9999px rgba(0,0,0,.45)' }}
                  onPointerDown={(e) => onPointerDown(e, null)}
                >
                  {HANDLES.map((h) => (
                    <span
                      key={h}
                      onPointerDown={(e) => onPointerDown(e, h)}
                      className="absolute w-3.5 h-3.5 bg-white border border-[#0D9488] rounded-[2px]"
                      style={{
                        cursor: handleCursor[h],
                        left: h.includes('w') ? -7 : undefined,
                        right: h.includes('e') ? -7 : undefined,
                        top: h.includes('n') ? -7 : undefined,
                        bottom: h.includes('s') ? -7 : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  width: mode === 'stretch' ? Math.min(disp.w, disp.h * targetRatio) : disp.w,
                  height: mode === 'stretch' ? Math.min(disp.w / targetRatio, disp.h) : disp.h,
                  backgroundImage: `url("${urlRef.current}")`,
                  backgroundSize: mode === 'stretch' ? '100% 100%' : 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            )}
          </div>

          {/* side: preview + hint */}
          <div className="sm:flex-[0_0_240px]">
            <div className="text-xs text-slate-400 mb-1.5">
              Result preview{mode !== 'crop' ? ` (${targetRatio === 1 ? '1:1' : targetRatio.toFixed(2)})` : ''}
            </div>
            <canvas
              ref={previewRef}
              className="w-[220px] max-w-full rounded-sm border border-slate-200 bg-slate-100"
            />
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">{hint}</p>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-medium rounded-sm border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-[0.98]"
            style={{ transition: 'transform 120ms ease-out' }}
            data-testid="adjust-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || !img || !!error}
            className="px-3.5 py-2 text-xs font-medium rounded-sm bg-[#0D9488] text-white hover:bg-[#0b8177] disabled:opacity-50 active:scale-[0.98]"
            style={{ transition: 'transform 120ms ease-out, background-color 150ms ease' }}
            data-testid="adjust-confirm"
          >
            {busy ? 'Processing…' : 'Confirm & Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
