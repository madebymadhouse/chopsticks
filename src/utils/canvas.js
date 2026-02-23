// src/utils/canvas.js
// Shared canvas helpers for card/image commands.

import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';

/**
 * Fetch a Discord avatar as a canvas image, with a colored circle fallback.
 */
export async function fetchAvatar(avatarUrl, size = 64) {
  try {
    const img = await loadImage(avatarUrl + (avatarUrl.includes('?') ? '&' : '?') + `size=${size}`);
    return img;
  } catch {
    return null;
  }
}

/**
 * Draw a rounded rectangle path.
 */
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw a circular clip and paste an image (or a fallback colored circle).
 */
export function drawCircleImage(ctx, img, x, y, diameter, fallbackColor = '#5865F2') {
  const r = diameter / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    ctx.drawImage(img, x, y, diameter, diameter);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Word-wrap text and draw it. Returns the y offset after the last line.
 */
export function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  let line = '';
  let curY = y;
  for (const word of words) {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      curY += lineHeight;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) { ctx.fillText(line, x, curY); curY += lineHeight; }
  return curY;
}

/**
 * Draw a horizontal progress bar.
 */
export function drawProgressBar(ctx, x, y, w, h, progress, { bg = '#2B2D31', fill = '#5865F2', radius = h / 2 } = {}) {
  // Background
  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = bg;
  ctx.fill();
  // Fill
  const fw = Math.max(radius * 2, w * Math.min(1, Math.max(0, progress)));
  roundRect(ctx, x, y, fw, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

/**
 * Build a standard dark card canvas and return { canvas, ctx }.
 */
export function createDarkCard(width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  // Dark background
  roundRect(ctx, 0, 0, width, height, 20);
  ctx.fillStyle = '#1E1F22';
  ctx.fill();
  return { canvas, ctx };
}

/**
 * Generate card PNG buffer from canvas.
 */
export function toPngBuffer(canvas) {
  return canvas.toBuffer('image/png');
}
