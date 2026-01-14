import { useState, useEffect } from 'react';
import type { TripDestination } from '../types/trip';
import { getWeatherForecast, getCurrentWeather, getWeatherIconUrl, type WeatherForecast, type WeatherData } from '../services/weatherService';

interface WeatherWidgetProps {
  destinations: TripDestination[];
  startDate: string;
  endDate: string;
}

export const WeatherWidget = ({ destinations, startDate, endDate }: WeatherWidgetProps) => {
  const [weatherData, setWeatherData] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<TripDestination | null>(null);

  // Get first destination with coordinates as default
  useEffect(() => {
    const firstWithCoords = destinations.find(d => d.lat && d.lng);
    if (firstWithCoords) {
      setSelectedLocation(firstWithCoords);
    }
  }, [destinations]);

  // Fetch weather when location or dates change
  useEffect(() => {
    const fetchWeather = async () => {
      if (!selectedLocation || !selectedLocation.lat || !selectedLocation.lng) {
        setWeatherData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const forecast = await getWeatherForecast(
          selectedLocation.lat!,
          selectedLocation.lng!,
          startDate,
          endDate,
          selectedLocation.name
        );
        setWeatherData(forecast);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load weather');
        setWeatherData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [selectedLocation, startDate, endDate]);

  if (!selectedLocation || (!selectedLocation.lat || !selectedLocation.lng)) {
    return (
      <div className="weather-widget">
        <div className="weather-widget-header">
          <h3>🌤️ Weather Forecast</h3>
        </div>
        <div className="weather-empty">
          <p>No location selected. Add destinations with coordinates to see weather forecasts.</p>
        </div>
      </div>
    );
  }

  const destinationsWithCoords = destinations.filter(d => d.lat && d.lng);

  return (
    <div className="weather-widget">
      <div className="weather-widget-header">
        <h3>🌤️ Weather Forecast</h3>
        {destinationsWithCoords.length > 1 && (
          <select
            value={selectedLocation.id}
            onChange={(e) => {
              const dest = destinations.find(d => d.id === e.target.value);
              if (dest) setSelectedLocation(dest);
            }}
            className="weather-location-select"
          >
            {destinationsWithCoords.map(dest => (
              <option key={dest.id} value={dest.id}>
                {dest.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <div className="weather-loading">
          <div className="loading-spinner" />
          <p>Loading weather data...</p>
        </div>
      )}

      {error && (
        <div className="weather-error">
          <p>⚠️ {error}</p>
          {error.includes('API key') && (
            <p className="weather-error-hint">
              Add your OpenWeatherMap API key to <code>VITE_OPENWEATHER_API_KEY</code> in your .env file.
              Get a free key at <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer">openweathermap.org</a>
            </p>
          )}
        </div>
      )}

      {weatherData && !loading && (
        <div className="weather-forecast">
          <div className="weather-location">
            <h4>{weatherData.location}</h4>
            <p className="weather-coords">
              {weatherData.lat.toFixed(4)}, {weatherData.lon.toFixed(4)}
            </p>
          </div>

          <div className="weather-forecast-list">
            {weatherData.forecast.map((day, index) => (
              <WeatherDayCard key={index} weather={day} />
            ))}
          </div>
        </div>
      )}

      {!weatherData && !loading && !error && (
        <div className="weather-empty">
          <p>No weather data available for this location.</p>
        </div>
      )}
    </div>
  );
};

interface WeatherDayCardProps {
  weather: WeatherData;
}

const WeatherDayCard = ({ weather }: WeatherDayCardProps) => {
  const date = new Date(weather.date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="weather-day-card">
      <div className="weather-day-header">
        <div>
          <div className="weather-day-name">{dayName}</div>
          <div className="weather-day-date">{dayDate}</div>
        </div>
        <img
          src={getWeatherIconUrl(weather.condition.icon)}
          alt={weather.condition.description}
          className="weather-icon"
        />
      </div>

      <div className="weather-day-main">
        <div className="weather-temp">
          {weather.temperature}°C
        </div>
        <div className="weather-condition">
          {weather.condition.description}
        </div>
      </div>

      <div className="weather-day-details">
        <div className="weather-detail">
          <span className="weather-detail-label">Feels like</span>
          <span className="weather-detail-value">{weather.feelsLike}°C</span>
        </div>
        <div className="weather-detail">
          <span className="weather-detail-label">Humidity</span>
          <span className="weather-detail-value">{weather.humidity}%</span>
        </div>
        <div className="weather-detail">
          <span className="weather-detail-label">Wind</span>
          <span className="weather-detail-value">{weather.windSpeed.toFixed(1)} m/s</span>
        </div>
        {weather.visibility && (
          <div className="weather-detail">
            <span className="weather-detail-label">Visibility</span>
            <span className="weather-detail-value">{weather.visibility.toFixed(1)} km</span>
          </div>
        )}
      </div>
    </div>
  );
};
