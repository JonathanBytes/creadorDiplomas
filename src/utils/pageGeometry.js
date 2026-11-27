export function normalizeRotation(angle) {
  const value = Number(angle);
  if (!Number.isFinite(value)) return 0;
  return ((Math.round(value / 90) * 90) % 360 + 360) % 360;
}

/**
 * Maps the displayed (rotated) page onto PDF user space.
 *
 * Display coordinates use a top-left origin (x right, y down) in PDF points.
 * PDF user space uses a bottom-left origin (x right, y up).
 *
 * `right` and `down` are unit vectors expressed in PDF user space, and
 * `width`/`height` are the displayed page dimensions after rotation.
 */
export function createPageFrame(cropBox, rotationAngle = 0) {
  const { x, y, width, height } = cropBox;
  const rotation = normalizeRotation(rotationAngle);

  switch (rotation) {
    case 90:
      return {
        origin: { x, y },
        right: { x: 0, y: 1 },
        down: { x: 1, y: 0 },
        width: height,
        height: width,
        rotation,
      };
    case 180:
      return {
        origin: { x: x + width, y },
        right: { x: -1, y: 0 },
        down: { x: 0, y: 1 },
        width,
        height,
        rotation,
      };
    case 270:
      return {
        origin: { x: x + width, y: y + height },
        right: { x: 0, y: -1 },
        down: { x: -1, y: 0 },
        width: height,
        height: width,
        rotation,
      };
    default:
      return {
        origin: { x, y: y + height },
        right: { x: 1, y: 0 },
        down: { x: 0, y: -1 },
        width,
        height,
        rotation: 0,
      };
  }
}

export function toPdfPoint(frame, displayX, displayY) {
  return {
    x: frame.origin.x + frame.right.x * displayX + frame.down.x * displayY,
    y: frame.origin.y + frame.right.y * displayX + frame.down.y * displayY,
  };
}
