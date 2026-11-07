export const MIN_MODULE_WIDTH = 320;
export const MIN_MODULE_HEIGHT = 180;
export const RESIZE_HANDLES = ['n', 'e', 's', 'w', 'nw', 'ne', 'se', 'sw'] as const;
export type ResizeHandle = typeof RESIZE_HANDLES[number];
export interface Frame { x: number; y: number; w: number; h: number }
export interface ResizeDelta { handle: ResizeHandle; dx: number; dy: number }

export function normalizeFrame(frame: Frame): Frame {
  return { ...frame, w: Math.max(MIN_MODULE_WIDTH, frame.w), h: Math.max(MIN_MODULE_HEIGHT, frame.h) };
}

export function resizeFrame(frame: Frame, delta: ResizeDelta): Frame {
  const { x, y, w, h } = normalizeFrame(frame);
  const west = delta.handle.includes('w'), north = delta.handle.includes('n');
  const horizontal = west || delta.handle.includes('e');
  const vertical = north || delta.handle.includes('s');
  const width = horizontal ? Math.max(MIN_MODULE_WIDTH, w + (west ? -delta.dx : delta.dx)) : w;
  const height = vertical ? Math.max(MIN_MODULE_HEIGHT, h + (north ? -delta.dy : delta.dy)) : h;
  const left = west ? Math.max(0, x + w - width) : x;
  const top = north ? Math.max(0, y + h - height) : y;
  return { x: left, y: top, w: west ? x + w - left : width, h: north ? y + h - top : height };
}
