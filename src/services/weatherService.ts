/**
 * Weather service using OpenWeatherMap API
 * Free tier: 60 calls/minute, 1,000,000 calls/month
 * Requires API key from https://openweathermap.org/api
 */

const OPENWEATHER_API = 'https://api.openweathermap.org/data/2.5';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const CACHE_KEY_PREFIX = 'weather_';

export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface WeatherData {
  date: string; // ISO date string
  location: string;
  lat: number;
  lon: number;
  temperature: number; // Celsius
  feelsLike: number; // Celsius
  humidity: number; // percentage
  pressure: number; // hPa
  windSpeed: number; // m/s
  windDirection: number; // degrees
  condition: WeatherCondition;
  clouds: number; // percentage
  visibility?: number; // meters
}

export interface WeatherForecast {
  location: string;
  lat: number;
  lon: number;
  forecast: WeatherData[];
}

interface CachedWeather {
  data: WeatherForecast;
  timestamp: number;
}

/**
 * Get cache key for weather data
 */
const getCacheKey = (lat: number, lon: number, date: string): string => {
  return `${CACHE_KEY_PREFIX}${lat}_${lon}_${date}`;
};

/**
 * Get cached weather data
 */
const getCachedWeather = (lat: number, lon: number, date: string): WeatherForecast | null => {
  try {
    const cacheKey = getCacheKey(lat, lon, date);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const { data, timestamp }: CachedWeather = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp > CACHE_DURATION) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return data;
  } catch {
    return null;
  }
};

/**
 * Cache weather data
 */
const setCachedWeather = (lat: number, lon: number, date: string, data: WeatherForecast): void => {
  try {
    const cacheKey = getCacheKey(lat, lon, date);
    const cached: CachedWeather = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Get weather icon URL
 */
export const getWeatherIconUrl = (icon: string): string => {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
};

/**
 * Fetch current weather from OpenWeatherMap
 */
const fetchCurrentWeather = async (
  lat: number,
  lon: number,
  apiKey: string
): Promise<WeatherData> => {
  const response = await fetch(
    `${OPENWEATHER_API}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your OpenWeatherMap API key.');
    }
    throw new Error(`Failed to fetch weather: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    date: new Date().toISOString(),
    location: data.name || 'Unknown',
    lat: data.coord.lat,
    lon: data.coord.lon,
    temperature: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    windSpeed: data.wind?.speed || 0,
    windDirection: data.wind?.deg || 0,
    condition: data.weather[0],
    clouds: data.clouds?.all || 0,
    visibility: data.visibility ? data.visibility / 1000 : undefined, // Convert to km
  };
};

/**
 * Fetch weather forecast from OpenWeatherMap
 */
const fetchForecast = async (
  lat: number,
  lon: number,
  apiKey: string,
  days: number = 5
): Promise<WeatherData[]> => {
  const response = await fetch(
    `${OPENWEATHER_API}/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=${Math.min(days * 8, 40)}`
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your OpenWeatherMap API key.');
    }
    throw new Error(`Failed to fetch forecast: ${response.statusText}`);
  }

  const data = await response.json();

  // Group by date and take one forecast per day (midday forecast)
  const forecastsByDate = new Map<string, typeof data.list[0]>();
  
  data.list.forEach((item: typeof data.list[0]) => {
    const date = new Date(item.dt * 1000).toISOString().split('T')[0];
    const hour = new Date(item.dt * 1000).getHours();
    
    // Prefer midday forecasts (10-14 hours)
    if (!forecastsByDate.has(date) || (hour >= 10 && hour <= 14)) {
      forecastsByDate.set(date, item);
    }
  });

  return Array.from(forecastsByDate.values()).slice(0, days).map((item) => ({
    date: new Date(item.dt * 1000).toISOString(),
    location: data.city.name || 'Unknown',
    lat: data.city.coord.lat,
    lon: data.city.coord.lon,
    temperature: Math.round(item.main.temp),
    feelsLike: Math.round(item.main.feels_like),
    humidity: item.main.humidity,
    pressure: item.main.pressure,
    windSpeed: item.wind?.speed || 0,
    windDirection: item.wind?.deg || 0,
    condition: item.weather[0],
    clouds: item.clouds?.all || 0,
    visibility: item.visibility ? item.visibility / 1000 : undefined,
  }));
};

/**
 * Get weather forecast for a location and date range
 */
export const getWeatherForecast = async (
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
  locationName?: string
): Promise<WeatherForecast | null> => {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    console.warn('OpenWeatherMap API key not configured');
    return null;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Try cache first (use start date as cache key)
  const cacheKey = startDate;
  const cached = getCachedWeather(lat, lon, cacheKey);
  if (cached && cached.forecast.length >= days) {
    return cached;
  }

  try {
    const forecast = await fetchForecast(lat, lon, apiKey, days);
    
    const result: WeatherForecast = {
      location: locationName || 'Unknown',
      lat,
      lon,
      forecast,
    };

    setCachedWeather(lat, lon, cacheKey, result);
    return result;
  } catch (error) {
    console.error('Failed to fetch weather forecast:', error);
    throw error;
  }
};

/**
 * Get current weather for a location
 */
export const getCurrentWeather = async (
  lat: number,
  lon: number,
  locationName?: string
): Promise<WeatherData | null> => {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    console.warn('OpenWeatherMap API key not configured');
    return null;
  }

  const today = new Date().toISOString().split('T')[0];
  const cached = getCachedWeather(lat, lon, today);
  if (cached && cached.forecast.length > 0) {
    return cached.forecast[0];
  }

  try {
    const weather = await fetchCurrentWeather(lat, lon, apiKey);
    if (locationName) {
      weather.location = locationName;
    }
    return weather;
  } catch (error) {
    console.error('Failed to fetch current weather:', error);
    throw error;
  }
};
