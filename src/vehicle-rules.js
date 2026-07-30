export function vehicleWithinRange(type, distanceKm) {
  return type.mode === 'road' || (Number.isFinite(type.range) && distanceKm <= type.range);
}

export function vehicleRangeLabel(type) {
  return type.mode === 'road' ? 'Menzil sınırı yok' : `Menzil ${type.range} km`;
}

export function vehicleTripMinutes(type, route) {
  if (type.mode === 'air') {
    const cruiseMinutes = route.distanceKm / Math.max(1, Number(type.speed) || 1) * 60;
    return cruiseMinutes + (Number(type.airOverheadMinutes) || 30);
  }
  return route.durationMinutes * 35 / type.speed;
}
