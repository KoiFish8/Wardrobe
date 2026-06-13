/** Temperature unit handling. Internals are always °C; display converts. */
export type TempUnit = 'F' | 'C';

export function toUnit(celsius: number, unit: TempUnit): number {
  return unit === 'F' ? Math.round((celsius * 9) / 5 + 32) : Math.round(celsius);
}

/** e.g. 22 → "72°F" (default US unit) or "22°C". */
export function formatTemp(celsius: number, unit: TempUnit): string {
  return `${toUnit(celsius, unit)}°${unit}`;
}

/** e.g. (8, 17) → "46–63°F". */
export function formatTempRange(minC: number, maxC: number, unit: TempUnit): string {
  return `${toUnit(minC, unit)}–${toUnit(maxC, unit)}°${unit}`;
}
