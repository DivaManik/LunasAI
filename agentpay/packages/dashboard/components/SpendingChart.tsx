"use client";

import { useEffect, useRef } from "react";

export function SpendingChart({ data }: { data: { date: string; amount: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 800;
    const cssH = 220;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.scale(dpr, dpr);

    const W = cssW;
    const H = cssH;
    const max = Math.max(...data.map((d) => d.amount), 1);
    const pad = { top: 20, right: 12, bottom: 32, left: 56 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const gap = chartW / data.length;
    const barW = gap * 0.5;

    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.strokeStyle = "#1e1c2e";
      ctx.lineWidth = 1;
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();

      const val = Math.round(max - (max / 4) * i);
      ctx.fillStyle = "#7a7060";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(val.toLocaleString("id-ID"), pad.left - 8, y + 4);
    }

    data.forEach((d, i) => {
      const x = pad.left + gap * i + gap / 2 - barW / 2;
      const barH = (d.amount / max) * chartH;
      const y = pad.top + chartH - barH;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, "#f59e0b");
      grad.addColorStop(1, "rgba(217,119,6,0.2)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, barW, Math.max(barH, 1), 4);
      } else {
        ctx.rect(x, y, barW, Math.max(barH, 1));
      }
      ctx.fill();

      ctx.fillStyle = "#7a7060";
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(d.date, x + barW / 2, H - pad.bottom + 16);
    });
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: 220, display: "block" }}
      aria-hidden="true"
    />
  );
}
