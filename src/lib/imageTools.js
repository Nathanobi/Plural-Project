// Outils canvas pour le recadrage (aucune dépendance externe).

export const RATIOS = [
  { key: "free", label: "Libre", value: null },
  { key: "1:1", label: "1:1", value: 1 },
  { key: "4:3", label: "4:3", value: 4 / 3 },
  { key: "3:4", label: "3:4", value: 3 / 4 },
  { key: "16:9", label: "16:9", value: 16 / 9 },
];

// Côté maximal de l'image recadrée envoyée à imgbb.
export const MAX_OUTPUT = 1024;

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l'image."));
    img.src = src;
  });
}

// Renvoie un canvas contenant l'image pivotée (0 / 90 / 180 / 270).
export function rotateToCanvas(img, rotation) {
  const swap = rotation === 90 || rotation === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? img.naturalHeight : img.naturalWidth;
  canvas.height = swap ? img.naturalWidth : img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return canvas;
}

// Découpe `crop` (pixels du canvas source) vers un canvas de côté max `maxSide`.
export function drawCrop(source, crop, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(crop.width, crop.height));
  const w = Math.max(1, Math.round(crop.width * scale));
  const h = Math.max(1, Math.round(crop.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, w, h);
  return canvas;
}

export function canvasToBlob(canvas, type = "image/jpeg", quality = 0.9) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Plus grande zone centrée (en fractions 0..1) respectant le ratio, réduite de 10 %.
export function fitBox(ratio, W, H) {
  let w = 1;
  let h = 1;
  if (ratio) {
    if (W / H > ratio) w = (ratio * H) / W;
    else h = W / (ratio * H);
  }
  w *= 0.9;
  h *= 0.9;
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}