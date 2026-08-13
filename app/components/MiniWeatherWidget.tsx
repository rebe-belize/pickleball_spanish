"use client";

import { useEffect, useState } from "react";

type WeatherData = {
  temp: number;
  code: number;
  precipProb: number;
};

function getWeatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code >= 1 && code <= 3) return "🌤️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

export default function MiniWeatherWidget({
  eventTime,
  location
}: {
  eventTime: string;
  location: string | null;
}) {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const eventDate = new Date(eventTime);
    const now = new Date();
    const diffInHours = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Max. 72h (3 Tage) Vorlaufzeit
    if (diffInHours < 0 || diffInHours > 72) {
      setWeather(null);
      return;
    }

    async function fetchWeather() {
      try {
        // Extrahiere die Stadt für das Wetter:
        // Wenn "Court Name, Spanish Lookout" angegeben ist, wird "Spanish Lookout" genutzt.
        let cityForWeather = "Spanish Lookout";

        if (location && location.trim()) {
          const parts = location.split(/[,-]/);
          // Nimm den letzten Teil nach dem Komma/Bindestrich als Ort, falls vorhanden
          cityForWeather = parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
        }

        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityForWeather)}&count=1`
        );
        const geoData = await geoRes.json();

        // Fallback auf Spanish Lookout, falls die Eingabe nicht gefunden wurde
        let latitude = 17.21;
        let longitude = -88.94;

        if (geoData.results && geoData.results.length > 0) {
          latitude = geoData.results[0].latitude;
          longitude = geoData.results[0].longitude;
        }

        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation_probability,weathercode&timezone=auto`
        );
        const weatherData = await weatherRes.json();

        if (!weatherData.hourly) return;

        const targetISO = eventDate.toISOString().slice(0, 13);
        const hourIndex = weatherData.hourly.time.findIndex((t: string) => t.startsWith(targetISO));

        if (hourIndex !== -1) {
          setWeather({
            temp: Math.round(weatherData.hourly.temperature_2m[hourIndex]),
            code: weatherData.hourly.weathercode[hourIndex],
            precipProb: weatherData.hourly.precipitation_probability[hourIndex],
          });
        }
      } catch (err) {
        console.error("Wetter konnte nicht geladen werden:", err);
      }
    }

    fetchWeather();
  }, [eventTime, location]);

  if (!weather) return null;

  return (
    <div
      className="weather-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        fontSize: "0.9rem", // Gleiche Schriftgröße wie className="location"
        opacity: 0.95
      }}
      title={`Wettervorhersage (${weather.precipProb}% Regenwahrscheinlichkeit)`}
    >
      <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
        Forecast:
      </span>
      <span>{getWeatherIcon(weather.code)}</span>
      <span style={{ fontWeight: 600 }}>{weather.temp}°C</span>
      {weather.precipProb > 20 && (
        <span style={{ opacity: 0.8 }}>
          ☔ {weather.precipProb}%
        </span>
      )}
    </div>
  );
}