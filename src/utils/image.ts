const MAX_EDGE = 1600;

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** Downscale a photo to keep attachments small enough for on-device storage. */
export async function compressImage(file: File): Promise<string> {
  const url = await readAsDataUrl(file);
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return url;
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    return url;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return url;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL('image/jpeg', 0.8);
  return out.length < url.length ? out : url;
}
