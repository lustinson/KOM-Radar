import "server-only";

import type {
  StravaActivityStream,
  StravaActivitySummary,
  StravaExploreResponse,
  StravaRequestContext,
  StravaSegmentDetail,
} from "@/lib/types/strava";

const STRAVA_API_BASE_URL = "https://www.strava.com/api/v3";

async function stravaFetch<T>(context: StravaRequestContext, path: string): Promise<T> {
  const response = await fetch(`${STRAVA_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${context.accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Strava request failed (${response.status}) for ${path}`);
  }

  return (await response.json()) as T;
}

function buildExplorePath(bounds: [number, number, number, number]) {
  const params = new URLSearchParams({
    bounds: bounds.join(","),
    activity_type: "riding",
  });

  return `/segments/explore?${params.toString()}`;
}

export async function getNearbySegments(context: StravaRequestContext, lat: number, lon: number, radiusDegrees = 0.2) {
  const quadrants: Array<[number, number, number, number]> = [
    [lat - radiusDegrees, lon - radiusDegrees, lat, lon],
    [lat - radiusDegrees, lon, lat, lon + radiusDegrees],
    [lat, lon - radiusDegrees, lat + radiusDegrees, lon],
    [lat, lon, lat + radiusDegrees, lon + radiusDegrees],
  ];

  const responses = await Promise.all(
    quadrants.map((bounds) => stravaFetch<StravaExploreResponse>(context, buildExplorePath(bounds))),
  );

  const segments = Array.from(
    new Map(responses.flatMap((response) => response.segments).map((segment) => [segment.id, segment])).values(),
  );

  return { segments } satisfies StravaExploreResponse;
}

export async function getSegmentById(context: StravaRequestContext, segmentId: number) {
  return stravaFetch<StravaSegmentDetail>(context, `/segments/${segmentId}`);
}

export interface GetRecentActivitiesOptions {
  beforeEpochSeconds: number;
  afterEpochSeconds: number;
  perPage?: number;
}

export async function getRecentActivities(context: StravaRequestContext, options: GetRecentActivitiesOptions) {
  const params = new URLSearchParams({
    before: String(Math.floor(options.beforeEpochSeconds)),
    after: String(Math.floor(options.afterEpochSeconds)),
    per_page: String(options.perPage ?? 100),
  });

  return stravaFetch<StravaActivitySummary[]>(context, `/athlete/activities?${params.toString()}`);
}

export async function getActivityStream(context: StravaRequestContext, activityId: number) {
  const params = new URLSearchParams({
    keys: "watts,time",
  });

  return stravaFetch<StravaActivityStream>(context, `/activities/${activityId}/streams?${params.toString()}`);
}
