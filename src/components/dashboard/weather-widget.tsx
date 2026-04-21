"use client";

import {
  Cloud, CloudDrizzle, CloudLightning, CloudRain, CloudSnow,
  CloudSun, MapPin, RefreshCw, Sun, Wind,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback, useEffect, useState } from "react";

// ─── Open-Meteo weather code → label + icon ───────────────────────────────────

type WeatherInfo = { label: string; Icon: React.ElementType };

function getWeatherInfo(code: number): WeatherInfo {
  if (code === 0)              return { label: "Clear sky",       Icon: Sun           };
  if (code <= 2)               return { label: "Partly cloudy",   Icon: CloudSun      };
  if (code === 3)              return { label: "Overcast",         Icon: Cloud         };
  if (code <= 48)              return { label: "Foggy",            Icon: Cloud         };
  if (code <= 55)              return { label: "Drizzle",          Icon: CloudDrizzle  };
  if (code <= 65)              return { label: "Rain",             Icon: CloudRain     };
  if (code <= 77)              return { label: "Snow",             Icon: CloudSnow     };
  if (code <= 82)              return { label: "Rain showers",     Icon: CloudRain     };
  if (code <= 86)              return { label: "Snow showers",     Icon: CloudSnow     };
  return                              { label: "Thunderstorm",     Icon: CloudLightning};
}

// ─── Types ────────────────────────────────────────────────────────────────────

type WeatherData = {
  temperature: number;   // °F
  weatherCode: number;
  windSpeed: number;     // mph
};

type State =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "loading"; lat: number; lon: number }
  | { status: "ready"; weather: WeatherData; city: string | null }
  | { status: "error"; message: string };

// ─── Component ────────────────────────────────────────────────────────────────

export function WeatherWidget() {
  const [state, setState] = useState<State>({ status: "idle" });

  const fetchWeather = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: "error", message: "Geolocation is not supported by your browser." });
      return;
    }

    setState({ status: "locating" });

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords;
        setState({ status: "loading", lat, lon });

        try {
          const [weatherRes, geoRes] = await Promise.allSettled([
            fetch(
              `https://api.open-meteo.com/v1/forecast` +
              `?latitude=${lat}&longitude=${lon}` +
              `&current=temperature_2m,weather_code,wind_speed_10m` +
              `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`,
            ),
            fetch(
              `https://nominatim.openstreetmap.org/reverse` +
              `?lat=${lat}&lon=${lon}&format=json&zoom=10`,
              { headers: { Accept: "application/json" } },
            ),
          ]);

          if (weatherRes.status !== "fulfilled" || !weatherRes.value.ok) {
            throw new Error("Weather fetch failed");
          }

          const weatherJson = await weatherRes.value.json();
          const current = weatherJson.current as {
            temperature_2m: number;
            weather_code: number;
            wind_speed_10m: number;
          };

          let city: string | null = null;
          if (geoRes.status === "fulfilled" && geoRes.value.ok) {
            const geoJson = await geoRes.value.json();
            const addr = geoJson?.address ?? {};
            city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? null;
            const stateAbbr = addr.state_code ?? null;
            if (city && stateAbbr) city = `${city}, ${stateAbbr}`;
          }

          setState({
            status: "ready",
            weather: {
              temperature: Math.round(current.temperature_2m),
              weatherCode: current.weather_code,
              windSpeed:   Math.round(current.wind_speed_10m),
            },
            city,
          });
        } catch {
          setState({ status: "error", message: "Could not load weather data." });
        }
      },
      () => {
        setState({
          status: "error",
          message: "Location access denied. Enable location permission to see local weather.",
        });
      },
      { timeout: 10_000 },
    );
  }, []);

  // Auto-fetch on mount
  useEffect(() => { fetchWeather(); }, [fetchWeather]);

  // ── Loading states ──────────────────────────────────────────────────────────

  if (state.status === "idle" || state.status === "locating" || state.status === "loading") {
    return (
      <div className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="mb-3 flex items-center gap-1.5">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-1.5">
          <Skeleton className="h-3 w-3 rounded" />
          <Skeleton className="h-3 w-24" />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <span className="h-3 w-3 animate-spin rounded-full border border-muted-foreground/40 border-t-transparent inline-block" />
          {state.status === "locating" ? "Getting your location…" : "Loading weather…"}
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground/80">Local Weather</h3>
          <button
            onClick={fetchWeather}
            title="Retry"
            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  // ── Ready ───────────────────────────────────────────────────────────────────

  const { weather, city } = state;
  const { label, Icon } = getWeatherInfo(weather.weatherCode);

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground/80">Local Weather</h3>
        <button
          onClick={fetchWeather}
          title="Refresh"
          className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {city && (
        <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          {city}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Icon className="h-12 w-12 shrink-0 text-primary/60" />
        <div>
          <p className="text-4xl font-bold tracking-tight">{weather.temperature}°F</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Wind className="h-3.5 w-3.5" />
        Wind {weather.windSpeed} mph
      </div>
    </div>
  );
}
