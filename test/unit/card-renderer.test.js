/**
 * Card renderer tests
 * Tests canvas utility helpers (pure geometry/text functions — no Discord/DB).
 */

import assert from 'assert';

describe('canvas utilities', function () {
  let canvasUtils;

  before(async function () {
    canvasUtils = await import('../../src/utils/canvas.js');
  });

  describe('createDarkCard', function () {
    it('should return a canvas and context with the correct dimensions', function () {
      const { canvas, ctx } = canvasUtils.createDarkCard(600, 300);
      assert.strictEqual(canvas.width, 600);
      assert.strictEqual(canvas.height, 300);
      assert(ctx, 'Context should exist');
    });

    it('should not throw for different sizes', function () {
      assert.doesNotThrow(() => canvasUtils.createDarkCard(100, 100));
      assert.doesNotThrow(() => canvasUtils.createDarkCard(1200, 600));
    });
  });

  describe('toPngBuffer', function () {
    it('should return a Buffer from a canvas', function () {
      const { canvas } = canvasUtils.createDarkCard(200, 100);
      const buf = canvasUtils.toPngBuffer(canvas);
      assert(Buffer.isBuffer(buf), 'toPngBuffer should return a Buffer');
      assert(buf.length > 100, 'PNG buffer should not be empty');
    });

    it('PNG buffer should start with PNG magic bytes', function () {
      const { canvas } = canvasUtils.createDarkCard(50, 50);
      const buf = canvasUtils.toPngBuffer(canvas);
      // PNG signature: 0x89 0x50 0x4E 0x47
      assert.strictEqual(buf[0], 0x89);
      assert.strictEqual(buf[1], 0x50); // 'P'
      assert.strictEqual(buf[2], 0x4E); // 'N'
      assert.strictEqual(buf[3], 0x47); // 'G'
    });
  });

  describe('drawProgressBar', function () {
    it('should not throw when progress is 0', function () {
      const { canvas, ctx } = canvasUtils.createDarkCard(400, 100);
      assert.doesNotThrow(() => canvasUtils.drawProgressBar(ctx, 10, 10, 200, 20, 0));
    });

    it('should not throw when progress is 1', function () {
      const { canvas, ctx } = canvasUtils.createDarkCard(400, 100);
      assert.doesNotThrow(() => canvasUtils.drawProgressBar(ctx, 10, 10, 200, 20, 1));
    });

    it('should clamp progress beyond 0-1 range', function () {
      const { canvas, ctx } = canvasUtils.createDarkCard(400, 100);
      assert.doesNotThrow(() => canvasUtils.drawProgressBar(ctx, 10, 10, 200, 20, -0.5));
      assert.doesNotThrow(() => canvasUtils.drawProgressBar(ctx, 10, 10, 200, 20, 1.5));
    });
  });

  describe('drawWrappedText', function () {
    it('should return the y position after the last line', function () {
      const { canvas, ctx } = canvasUtils.createDarkCard(400, 200);
      ctx.font = '16px sans-serif';
      const y = canvasUtils.drawWrappedText(ctx, 'Hello world', 10, 20, 300, 24);
      assert(y >= 20, 'Returned y should be at or after starting y');
    });

    it('should handle empty text without throwing', function () {
      const { canvas, ctx } = canvasUtils.createDarkCard(400, 100);
      ctx.font = '16px sans-serif';
      assert.doesNotThrow(() => canvasUtils.drawWrappedText(ctx, '', 10, 20, 200, 20));
    });
  });
});
