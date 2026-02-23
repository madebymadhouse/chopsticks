/**
 * Open-Meteo + Nominatim geocoding helpers.
 * Both APIs are free with no API key required.
 * Results are cached in Redis with a 15-minute TTL.
 */
import { request } from "undici";
import { botLogger } from "./modernLogger.js";

const CACHE_TTL = 900; // 15 minutes in seconds
const GEO_URL = "https://nominatim.openstreetmap.org/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// WMO weather interpretation codes → emoji + label
const WMO_CODES = {
  0: ["☀️", "Clear sky"],
  1: ["🌤️", "Mainly clear"],
  2: ["⛅", "Partly cloudy"],
  3: ["☁️", "Overcast"],
  45: ["🌫️", "Fog"],
  48: ["🌫️", "Icy fog"],
  51: ["🌦️", "Light drizzle"],
  53: ["🌦️", "Moderate drizzle"],
  55: ["🌧️", "Dense drizzle"],
  61: ["🌧️", "Slight rain"],
  63: ["🌧️", "Moderate rain"],
  65: ["🌧️", "Heavy rain"],
  71: ["❄️", "Slight snow"],
  73: ["❄️", "Moderate snow"],
  75: ["❄️", "Heavy snow"],
  80: ["🌦️", "Rain showers"],
  81: ["🌧️", "Moderate showers"],
  82: ["⛈️", "Violent showers"],
  85: ["🌨️", "Snow showers"],
  95: ["⛈️", "Thunderstorm"],
  96: ["⛈️", "Thunderstorm w/ hail"],
  99: ["⛈️", "Thunderstorm w/ heavy hail"],
};

async function fetchJson(url, headers = {}) {
  const { statusCode, body } = await request(url, {
    headers: { "User-Agent": "Chopsticks-Discord-Bot/1.0", ...headers }
  });
  if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
  return body.json();
}

async function geocode(location) {
  const url = `${GEO_URL}?q=${encodeURIComponent(location)}&format=json&limit=1`;
  const data = await fetchJson(url);
  if (!data?.length) return null;
  const { lat, lon, display_name } = data[0];
  return { lat: parseFloat(lat), lon: parseFloat(lon), display_name };
}

/**
 * Fetch current weather for a location string.
 * Uses Redis cache if available; falls back to live fetch.
 * @param {string} location
 * @param {import('redis').RedisClientType|null} redisClient
 * @returns {Promise<{display_name:string, current:{temp:number, feels_like:number, humidity:number, wind_kph:number, wmo:number}, daily:{high:number, low:number}}|null>}
 */
export async function getWeather(location, redisClient = null) {
  const cacheKey = `weather:${location.toLowerCase().trim()}`;

  if (redisClient) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}
  }

  let geo;
  try {
    geo = await geocode(location);
  } catch (err) {
    botLogger.warn({ err, location }, "[openmeteo] geocode failed");
    return null;
  }
  if (!geo) return null;

  const params = new URLSearchParams({
    latitude: geo.lat,
    longitude: geo.lon,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weathercode",
    daily: "temperature_2m_max,temperature_2m_min",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    timezone: "auto",
    forecast_days: "1"
  });

  let raw;
  try {
    raw = await fetchJson(`${WEATHER_URL}?${params}`);
  } catch (err) {
    botLogger.warn({ err, location }, "[openmeteo] weather fetch failed");
    return null;
  }

  const c = raw.current;
  const d = raw.daily;
  const result = {
    display_name: geo.display_name,
    current: {
      temp: Math.round(c.temperature_2m),
      feels_like: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      wind_kph: Math.round(c.wind_speed_10m),
      wmo: c.weathercode
    },
    daily: {
      high: Math.round(d.temperature_2m_max?.[0] ?? c.temperature_2m),
      low: Math.round(d.temperature_2m_min?.[0] ?? c.temperature_2m)
    }
  };

  if (redisClient) {
    try {
      await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(result));
    } catch {}
  }

  return result;
}

export function wmoLabel(code) {
  return WMO_CODES[code] ?? ["🌡️", "Unknown"];
}
