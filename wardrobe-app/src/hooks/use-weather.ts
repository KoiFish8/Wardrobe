/**
 * Live local weather via Open-Meteo (no API key). Location is resolved in two
 * steps so it works everywhere:
 *   1. Device GPS (expo-location) — best, used on a real phone.
 *   2. Coarse IP geolocation — fallback when GPS is denied/unavailable
 *      (e.g. the web preview), so a real temperature still shows.
 * Resolves to null only if everything fails; callers then fall back to date.
 */
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

export interface Weather {
  temperature: number;
  label: string;
  /** Where the coordinates came from — surfaced subtly in the UI. */
  source: 'device' | 'approx';
}

const WEATHER_LABELS: [number, string][] = [
  [0, 'Clear'],
  [2, 'Partly cloudy'],
  [3, 'Overcast'],
  [48, 'Foggy'],
  [57, 'Drizzle'],
  [67, 'Rain'],
  [77, 'Snow'],
  [82, 'Showers'],
  [86, 'Snow'],
  [99, 'Stormy'],
];

function describe(code: number): string {
  for (const [max, label] of WEATHER_LABELS) if (code <= max) return label;
  return 'Clear';
}

/** Try the device GPS; returns null if permission is denied or it errors. */
async function deviceCoords(): Promise<{ lat: number; lon: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** Coarse city-level location from the caller's IP — no key, best-effort. */
async function ipCoords(): Promise<{ lat: number; lon: number } | null> {
  for (const url of ['https://ipapi.co/json/', 'https://ipwho.is/']) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const j = (await res.json()) as { latitude?: number; longitude?: number };
      if (typeof j.latitude === 'number' && typeof j.longitude === 'number') {
        return { lat: j.latitude, lon: j.longitude };
      }
    } catch {
      // try next provider
    }
  }
  return null;
}

async function fetchWeather(): Promise<Weather | null> {
  const device = await deviceCoords();
  const coords = device ?? (await ipCoords());
  if (!coords) return null;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat.toFixed(3)}` +
    `&longitude=${coords.lon.toFixed(3)}&current=temperature_2m,weather_code`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
  };
  if (json.current?.temperature_2m == null) return null;
  return {
    temperature: Math.round(json.current.temperature_2m),
    label: describe(json.current.weather_code ?? 0),
    source: device ? 'device' : 'approx',
  };
}

export function useWeather() {
  return useQuery({
    queryKey: ['weather'],
    queryFn: () => fetchWeather().catch(() => null),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
}
