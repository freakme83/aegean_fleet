export function vehicleWithinRange(type, distanceKm) {
  return type.mode === 'road' || (Number.isFinite(type.range) && distanceKm <= type.range);
}

export function vehicleRangeLabel(type) {
  return type.mode === 'road' ? 'Menzil sınırı yok' : `Menzil ${type.range} km`;
}
