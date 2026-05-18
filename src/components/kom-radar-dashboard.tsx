"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { ResultsPanel } from "@/components/results-panel";
import type { ClientSession } from "@/lib/types/auth";
import type { KomAnalysisResponse, RoadSurfaceKey } from "@/lib/types/domain";

const roadSurfaceOptions: Array<{ value: RoadSurfaceKey; label: string }> = [
  { value: "smooth", label: "Smooth / fast pavement" },
  { value: "average", label: "Average dry asphalt" },
  { value: "wet_average", label: "Wet road" },
  { value: "rough", label: "Rough pavement" },
  { value: "trail", label: "Trail / gravel" },
];

const defaultFormState = {
  riderWeightKg: 76,
  bikeWeightKg: 8,
  roadSurface: "average" as RoadSurfaceKey,
  lookbackDays: 90,
  segmentLimit: 8,
  maxActivities: 20,
};

export function KomRadarDashboard() {
  const [formState, setFormState] = useState(defaultFormState);
  const [analysis, setAnalysis] = useState<KomAnalysisResponse | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [session, setSession] = useState<ClientSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const authError = query.get("authError");

    if (authError) {
      setError("Strava sign-in did not complete. Please try again.");
      query.delete("authError");
      const nextQuery = query.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", nextUrl);
    }

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const payload = (await response.json()) as ClientSession;
        setSession(payload);
      } catch {
        setSession({ authenticated: false, athlete: null, expiresAt: null });
      } finally {
        setSessionLoading(false);
      }
    }

    void loadSession();
  }, []);

  const locationLabel = useMemo(() => {
    if (!coordinates) {
      return "Location not shared yet";
    }

    return `${coordinates.lat.toFixed(4)}, ${coordinates.lon.toFixed(4)}`;
  }, [coordinates]);

  function updateNumberField(field: keyof typeof defaultFormState, value: number) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function requestLocation() {
    setError(null);

    if (!("geolocation" in navigator)) {
      setError("This browser does not support geolocation.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (geoError) => {
        setError(geoError.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.authenticated) {
      setError("Connect your Strava account before running the KOM analysis.");
      return;
    }

    if (!coordinates) {
      setError("Share your browser location before running the KOM analysis.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/kom-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat: coordinates.lat,
          lon: coordinates.lon,
          ...formState,
        }),
      });

      const payload = (await response.json()) as KomAnalysisResponse | { message?: string };

      if (!response.ok) {
        throw new Error("message" in payload && payload.message ? payload.message : "Analysis failed.");
      }

      setAnalysis(payload as KomAnalysisResponse);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setError(null);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      setSession({ authenticated: false, athlete: null, expiresAt: null });
      setAnalysis(null);
    } catch {
      setError("Unable to sign out right now.");
    }
  }

  const athleteDisplayName = session?.athlete
    ? [session.athlete.firstname, session.athlete.lastname].filter(Boolean).join(" ") || session.athlete.username || "Connected athlete"
    : null;

  const isAuthenticated = session?.authenticated === true;

  return (
    <main className="page-shell">
      <div style={{ position: "absolute", top: "2rem", left: "2rem" }}>
        <Image
          src="/KOM-Radar-basic-logo.png"
          alt="KOM Radar Logo"
          width={200}
          height={200}
          priority
        />
      </div>
      <section className="hero panel stack-lg" style={{ marginBottom: "2rem" }}>
        <div className="section-heading">
          <h1>KOM Radar</h1>
          <p>
            Use browser geolocation to score nearby Strava segments, estimate the watts needed for the KOM today, and compare that target against your recent best power curve.
          </p>
        </div>
      </section>

      <div className="layout-grid">
        <section className="panel stack-lg">
          <div className="section-heading">
            <p className="eyebrow">Inputs</p>
            <h2>Rider profile</h2>
            <p>Use your current setup and recent rides to estimate which nearby segments are worth targeting.</p>
          </div>

          <div className="callout stack-sm">
            <div className="row-between">
              <div>
                <strong>Strava account</strong>
                <p>
                  {sessionLoading
                    ? "Checking your Strava session…"
                    : isAuthenticated
                      ? `Connected as ${athleteDisplayName}`
                      : "Connect your Strava account to analyze your nearby KOM opportunities."}
                </p>
              </div>
              {isAuthenticated ? (
                <button type="button" className="button secondary" onClick={handleLogout}>
                  Disconnect
                </button>
              ) : (
                <a className="strava-connect-link" href="/api/auth/strava/login?redirectTo=/" aria-label="Connect with Strava">
                  <Image
                    src="/strava-connect-button.svg"
                    alt="Connect with Strava"
                    width={277}
                    height={56}
                    priority
                  />
                </a>
              )}
            </div>
          </div>

          <div className="location-row">
            <div>
              <span className="metric-label">Browser location</span>
              <strong>{locationLabel}</strong>
            </div>
            <button type="button" className="button secondary" onClick={requestLocation}>
              {coordinates ? "Refresh location" : "Use my location"}
            </button>
          </div>

          <form className="stack-md" onSubmit={handleSubmit}>
            <div className="field-grid">
              <label className="field">
                <span>Rider weight (kg)</span>
                <input
                  type="number"
                  min="30"
                  max="250"
                  step="0.1"
                  value={formState.riderWeightKg}
                  onChange={(event) => updateNumberField("riderWeightKg", event.currentTarget.valueAsNumber)}
                />
              </label>
              <label className="field">
                <span>Bike weight (kg)</span>
                <input
                  type="number"
                  min="5"
                  max="50"
                  step="0.1"
                  value={formState.bikeWeightKg}
                  onChange={(event) => updateNumberField("bikeWeightKg", event.currentTarget.valueAsNumber)}
                />
              </label>
              <label className="field">
                <span>Road surface</span>
                <select
                  value={formState.roadSurface}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      roadSurface: event.currentTarget.value as RoadSurfaceKey,
                    }))
                  }
                >
                  {roadSurfaceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Lookback window (days)</span>
                <input
                  type="number"
                  min="7"
                  max="365"
                  step="1"
                  value={formState.lookbackDays}
                  onChange={(event) => updateNumberField("lookbackDays", event.currentTarget.valueAsNumber)}
                />
              </label>
              <label className="field">
                <span>Nearby segments</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  value={formState.segmentLimit}
                  onChange={(event) => updateNumberField("segmentLimit", event.currentTarget.valueAsNumber)}
                />
              </label>
              <label className="field">
                <span>Max rides to scan</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={formState.maxActivities}
                  onChange={(event) => updateNumberField("maxActivities", event.currentTarget.valueAsNumber)}
                />
              </label>
            </div>

            {error ? <p className="error-text">{error}</p> : null}

            <button type="submit" className="button primary" disabled={loading || sessionLoading || !isAuthenticated}>
              {loading ? "Running analysis…" : "Analyze nearby KOMs"}
            </button>
          </form>
        </section>

        <ResultsPanel analysis={analysis} loading={loading} />
      </div>

      <footer className="brand-footer">
        <a href="https://www.strava.com" target="_blank" rel="noreferrer" aria-label="Powered by Strava">
          <Image
            src="/pwrdBy-strava-button.svg"
            alt="Powered by Strava"
            width={220}
            height={22}
          />
        </a>
      </footer>
    </main>
  );
}
