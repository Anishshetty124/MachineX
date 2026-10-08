/**
 * Maps a normalized image point onto a circular rotor surface.
 * The image center becomes the rotor origin and the image radius maps to the
 * outer edge of the model. Z is kept slightly above the surface for markers.
 */
export function map2DTo3DSurface(boxX, boxY, discRadius = 2.0) {
  const normalizedX = Math.min(1, Math.max(0, Number(boxX) || 0))
  const normalizedY = Math.min(1, Math.max(0, Number(boxY) || 0))
  const offsetX = normalizedX - 0.5
  const offsetY = 0.5 - normalizedY
  const distance = Math.min(0.5, Math.hypot(offsetX, offsetY)) / 0.5
  const angle = Math.atan2(offsetY, offsetX)
  const radius = distance * discRadius

  return [
    radius * Math.cos(angle),
    radius * Math.sin(angle),
    0.18,
  ]
}