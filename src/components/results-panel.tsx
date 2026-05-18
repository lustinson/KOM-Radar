import type { CapabilityStatus, KomAnalysisResponse } from "@/lib/types/domain";

interface ResultsPanelProps {
  analysis: KomAnalysisResponse | null;
  loading: boolean;
}

const capabilityLabel: Record<CapabilityStatus, string> = {
  capable: "Capable",
  stretch: "Stretch",
  unlikely: "Unlikely",
  unknown: "Unknown",
};

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatPowerDelta(powerDeltaWatts: number | null) {
  if (powerDeltaWatts === null) {
    return "Not available";
  }

  return `${powerDeltaWatts > 0 ? "+" : ""}${powerDeltaWatts} W`;
}

function formatCapabilityClass(status: CapabilityStatus) {
  return `badge badge-${status}`;
}

function getStravaSegmentUrl(segmentId: number) {
  return `https://www.strava.com/segments/${segmentId}`;
}

export function ResultsPanel({ analysis, loading }: ResultsPanelProps) {
  if (loading) {
    return (
      <section className="panel stack-lg">
        <div className="section-heading">
          <p className="eyebrow">Analysis</p>
          <h2>Crunching nearby segments</h2>
          <p>Fetching Strava segments, recent power streams, and current weather.</p>
        </div>
      </section>
    );
  }

  if (!analysis) {
    return (
      <section className="panel stack-lg">
        <div className="section-heading">
          <p className="eyebrow">Results</p>
          <h2>Ready when you are</h2>
          <p>Share your location, rider weight, and bike weight to rank nearby KOM targets by how achievable they look today.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="stack-lg">
      <div className="panel stack-md">
        <div className="section-heading">
          <p className="eyebrow">Analysis</p>
          <h2>Nearby KOM outlook</h2>
          <p>
            Evaluated {analysis.segmentsAnalyzed} segments from {analysis.activitiesWithPower} ride streams over the last {analysis.lookbackDays} days.
          </p>
        </div>
        <div className="summary-grid">
          <article className="summary-card">
            <span className="summary-label">Segments scored</span>
            <strong>{analysis.segmentsAnalyzed}</strong>
          </article>
          <article className="summary-card">
            <span className="summary-label">Activities scanned</span>
            <strong>{analysis.activitiesConsidered}</strong>
          </article>
          <article className="summary-card">
            <span className="summary-label">Power streams used</span>
            <strong>{analysis.activitiesWithPower}</strong>
          </article>
          <article className="summary-card">
            <span className="summary-label">Location</span>
            <strong>
              {analysis.location.lat.toFixed(4)}, {analysis.location.lon.toFixed(4)}
            </strong>
          </article>
        </div>
        {analysis.notes.length > 0 ? (
          <div className="callout">
            <strong>Notes</strong>
            <ul>
              {analysis.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="results-grid">
        {analysis.results.map((result) => (
          <article key={result.segmentId} className="panel stack-md">
            <div className="row-between result-card-header">
              <div>
                <p className="eyebrow">{result.segmentName}</p>
                <h3>{result.requiredPowerWatts} W required</h3>
              </div>
              <span className={formatCapabilityClass(result.capabilityStatus)}>{capabilityLabel[result.capabilityStatus]}</span>
            </div>
            <div className="result-card-actions">
              <a
                className="strava-text-link"
                href={getStravaSegmentUrl(result.segmentId)}
                target="_blank"
                rel="noreferrer"
              >
                View on Strava
              </a>
            </div>
            <div className="metric-grid">
              <div>
                <span className="metric-label">KOM time</span>
                <strong>{formatDuration(result.komTimeSeconds)}</strong>
              </div>
              <div>
                <span className="metric-label">Your best power</span>
                <strong>{result.riderPowerAtDurationWatts ? `${result.riderPowerAtDurationWatts} W` : "Unknown"}</strong>
              </div>
              <div>
                <span className="metric-label">Power delta</span>
                <strong>{formatPowerDelta(result.powerDeltaWatts)}</strong>
              </div>
              <div>
                <span className="metric-label">Required speed</span>
                <strong>{result.requiredSpeedKph} kph</strong>
              </div>
              <div>
                <span className="metric-label">Distance</span>
                <strong>{(result.distanceMeters / 1000).toFixed(2)} km</strong>
              </div>
              <div>
                <span className="metric-label">Avg grade</span>
                <strong>{result.averageGradePercent}%</strong>
              </div>
            </div>
            <div className="callout subtle">
              <strong>Weather</strong>
              <p>
                {result.weatherSummary ?? "No live weather summary"}
                {result.temperatureC !== null ? ` · ${result.temperatureC.toFixed(1)}°C` : ""}
                {` · Wind ${result.windSpeedMps.toFixed(1)} m/s`}
                {result.windDirectionDeg !== null ? ` @ ${result.windDirectionDeg}°` : ""}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
