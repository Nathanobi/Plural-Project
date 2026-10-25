import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import {
  RATIOS,
  MAX_OUTPUT,
  loadImage,
  rotateToCanvas,
  drawCrop,
  canvasToBlob,
  fitBox,
} from "../../../lib/imageTools";
import "./ImageCropper.css";

const MIN_SIZE = 0.05;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Fractions (0..1) -> pixels du canvas pivoté.
function toCrop(box, canvas) {
  const W = canvas.width;
  const H = canvas.height;
  const x = Math.round(box.x * W);
  const y = Math.round(box.y * H);
  return {
    x,
    y,
    width: Math.max(1, Math.min(W - x, Math.round(box.w * W))),
    height: Math.max(1, Math.min(H - y, Math.round(box.h * H))),
  };
}

// Recadreur plein écran : "Avant" (image + zone) et "Après" (aperçu en direct).
// `initial` = ancien objet recadrage (restauré seulement si la taille source correspond).
export default function ImageCropper({ src, initial, onApply, onCancel }) {
  const [img, setImg] = useState(null);
  const [error, setError] = useState("");
  const [rotation, setRotation] = useState(initial?.rotation ?? 0);
  const [ratioKey, setRatioKey] = useState(initial?.ratio ?? "1:1");
  const [box, setBox] = useState(null);
  const [rotatedUrl, setRotatedUrl] = useState("");

  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const boxRef = useRef(null);
  const previewRef = useRef(null);
  const dragRef = useRef(null);
  const restoredRef = useRef(false);

  const ratio = RATIOS.find((r) => r.key === ratioKey)?.value ?? null;
  const ready = Boolean(rotatedUrl && box);

  useEffect(() => {
    let cancelled = false;
    loadImage(src)
      .then((loaded) => {
        if (!cancelled) setImg(loaded);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  // (Re)calcule le canvas pivoté et la zone de départ.
  useEffect(() => {
    if (!img) return undefined;
    let cancelled = false;
    let url = "";
    const canvas = rotateToCanvas(img, rotation);
    canvas.toBlob((blob) => {
      if (cancelled || !blob) return;
      canvasRef.current = canvas;
      url = URL.createObjectURL(blob);
      const W = canvas.width;
      const H = canvas.height;
      const c = initial?.crop;
      const matches =
        !restoredRef.current &&
        c &&
        initial.rotation === rotation &&
        initial.source?.width === img.naturalWidth &&
        initial.source?.height === img.naturalHeight;
      restoredRef.current = true;
      setBox(
        matches
          ? { x: c.x / W, y: c.y / H, w: c.width / W, h: c.height / H }
          : fitBox(ratio, W, H)
      );
      setRotatedUrl(url);
    }, "image/png");
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, rotation]);

  // Position de la zone via variables CSS (pas de style inline JSX).
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || !box) return;
    el.style.setProperty("--box-x", `${box.x * 100}%`);
    el.style.setProperty("--box-y", `${box.y * 100}%`);
    el.style.setProperty("--box-w", `${box.w * 100}%`);
    el.style.setProperty("--box-h", `${box.h * 100}%`);
  }, [box, rotatedUrl]);

  // Aperçu "Après" en direct.
  useEffect(() => {
    const canvas = canvasRef.current;
    const preview = previewRef.current;
    if (!canvas || !preview || !box) return;
    const out = drawCrop(canvas, toCrop(box, canvas), 240);
    preview.width = out.width;
    preview.height = out.height;
    preview.getContext("2d").drawImage(out, 0, 0);
  }, [box, rotatedUrl]);

  function changeRatio(key) {
    setRatioKey(key);
    const value = RATIOS.find((r) => r.key === key)?.value ?? null;
    const canvas = canvasRef.current;
    if (canvas) setBox(fitBox(value, canvas.width, canvas.height));
  }

  function startDrag(e, mode) {
    if (!box) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = stageRef.current.getBoundingClientRect();
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      box: { ...box },
      rw: rect.width,
      rh: rect.height,
    };
  }

  function onMove(e) {
    const d = dragRef.current;
    const canvas = canvasRef.current;
    if (!d || !canvas) return;
    const dx = (e.clientX - d.startX) / d.rw;
    const dy = (e.clientY - d.startY) / d.rh;
    const { x, y, w, h } = d.box;
    if (d.mode === "move") {
      setBox({ x: clamp(x + dx, 0, 1 - w), y: clamp(y + dy, 0, 1 - h), w, h });
      return;
    }
    if (ratio) {
      const k = canvas.width / (ratio * canvas.height); // h = w * k
      const maxW = Math.min(1 - x, (1 - y) / k);
      const nw = clamp(w + dx, MIN_SIZE, maxW);
      setBox({ x, y, w: nw, h: nw * k });
    } else {
      setBox({ x, y, w: clamp(w + dx, MIN_SIZE, 1 - x), h: clamp(h + dy, MIN_SIZE, 1 - y) });
    }
  }

  function endDrag() {
    dragRef.current = null;
  }

  async function apply() {
    const canvas = canvasRef.current;
    if (!canvas || !box) return;
    const crop = toCrop(box, canvas);
    const out = drawCrop(canvas, crop, MAX_OUTPUT);
    const blob = await canvasToBlob(out);
    if (!blob) {
      setError("Le recadrage a échoué.");
      return;
    }
    onApply({
      blob,
      previewUrl: URL.createObjectURL(blob),
      recadrage: {
        version: 1,
        ratio: ratioKey,
        rotation,
        crop,
        source: { width: img.naturalWidth, height: img.naturalHeight },
        output: { width: out.width, height: out.height },
      },
    });
  }

  return (
    <div className="image-cropper" role="dialog" aria-modal="true" aria-label="Recadrer l'image">
      <div className="image-cropper__dialog">
        <h2 className="image-cropper__title">Recadrer l'image</h2>

        {error && <p className="image-cropper__error">{error}</p>}

        <div className="image-cropper__controls">
          {RATIOS.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`image-cropper__chip${r.key === ratioKey ? " is-on" : ""}`}
              onClick={() => changeRatio(r.key)}
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            className="image-cropper__chip"
            onClick={() => setRotation((r) => (r + 90) % 360)}
          >
            <RotateCw size={14} strokeWidth={1.75} /> Pivoter
          </button>
        </div>

        {!ready && !error && <p className="image-cropper__hint">Chargement…</p>}

        {ready && (
          <div className="image-cropper__panes">
            <div className="image-cropper__pane">
              <span className="image-cropper__label">Avant</span>
              <div
                className="image-cropper__stage"
                ref={stageRef}
                onPointerMove={onMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <img className="image-cropper__img" src={rotatedUrl} alt="" draggable={false} />
                <div
                  className="image-cropper__box"
                  ref={boxRef}
                  onPointerDown={(e) => startDrag(e, "move")}
                >
                  <div
                    className="image-cropper__handle"
                    onPointerDown={(e) => startDrag(e, "resize")}
                  />
                </div>
              </div>
            </div>
            <div className="image-cropper__pane">
              <span className="image-cropper__label">Après</span>
              <canvas className="image-cropper__preview" ref={previewRef} />
            </div>
          </div>
        )}

        <div className="image-cropper__actions">
          <button type="button" className="ps-button-secondary" onClick={onCancel}>
            Annuler
          </button>
          <button type="button" className="ps-button-primary" onClick={apply} disabled={!ready}>
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}