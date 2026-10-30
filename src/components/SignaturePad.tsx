import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
}

/** Pointer-driven signature canvas; emits a PNG data URL after each stroke. */
export function SignaturePad({ value, onChange, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Size the backing store to the element (and DPR), redrawing the saved image.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#3a3a3a';
      paint(valueRef.current);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    fit();
    return () => ro.disconnect();
  }, []);

  // Repaint when cleared or loaded from outside.
  useEffect(() => {
    if (!drawing.current) paint(value);
  }, [value]);

  function paint(src: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, width, height);
    if (!src) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, width, height);
    img.src = src;
  }

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <canvas
      ref={canvasRef}
      className={`sig-pad${disabled ? ' is-disabled' : ''}`}
      aria-label="Signature area"
      role="img"
      onPointerDown={(e) => {
        if (disabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = true;
        last.current = pos(e);
        const ctx = e.currentTarget.getContext('2d')!;
        ctx.beginPath();
        ctx.arc(last.current.x, last.current.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = '#3a3a3a';
        ctx.fill();
      }}
      onPointerMove={(e) => {
        if (!drawing.current || !last.current) return;
        const ctx = e.currentTarget.getContext('2d')!;
        const p = pos(e);
        ctx.beginPath();
        ctx.moveTo(last.current.x, last.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last.current = p;
      }}
      onPointerUp={(e) => {
        if (!drawing.current) return;
        drawing.current = false;
        last.current = null;
        onChange(e.currentTarget.toDataURL('image/png'));
      }}
      onPointerCancel={() => {
        drawing.current = false;
        last.current = null;
      }}
    />
  );
}
