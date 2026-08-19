const EARTH_RADIUS_METERS = 6_371_008.8;

export function interpolateArcPosition(
  source: [number, number],
  target: [number, number],
  progress: number,
  height: number,
): [number, number, number] {
  const ratio = Math.max(0, Math.min(1, progress));
  const toVector = ([longitude, latitude]: [number, number]) => {
    const lon = longitude * Math.PI / 180;
    const lat = latitude * Math.PI / 180;
    return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
  };
  const start = toVector(source);
  const end = toVector(target);
  const dot = Math.max(-1, Math.min(1, start[0] * end[0] + start[1] * end[1] + start[2] * end[2]));
  const angle = Math.acos(dot);
  if (angle < 1e-6) return [source[0], source[1], 0];

  let longitude: number;
  let latitude: number;
  if (Math.abs(Math.PI - angle) < 1e-3) {
    longitude = source[0] + (target[0] - source[0]) * ratio;
    latitude = source[1] + (target[1] - source[1]) * ratio;
  } else {
    const denominator = Math.sin(angle);
    const first = Math.sin((1 - ratio) * angle) / denominator;
    const second = Math.sin(ratio * angle) / denominator;
    const x = start[0] * first + end[0] * second;
    const y = start[1] * first + end[1] * second;
    const z = start[2] * first + end[2] * second;
    longitude = Math.atan2(y, x) * 180 / Math.PI;
    latitude = Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI;
  }

  const altitude = Math.sqrt(ratio * (1 - ratio)) * angle * EARTH_RADIUS_METERS * height;
  return [longitude, latitude, altitude];
}
