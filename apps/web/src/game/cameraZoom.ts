/** Presentation-only zoom. Never change the calibrated projection or authoritative cells. */
export const CAMERA_ZOOM = { min: 0.8, max: 1.8, step: 0.1 } as const;
export const clampCameraZoom = (value: number) =>
  Number.isFinite(value) ? Math.min(CAMERA_ZOOM.max, Math.max(CAMERA_ZOOM.min, value)) : 1;
