import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  STRAVA_CLIENT_ID: z.string().min(1),
  STRAVA_CLIENT_SECRET: z.string().min(1),
  STRAVA_REDIRECT_URI: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  OPENWEATHER_API_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("KOM Radar"),
});

let cachedEnv: z.infer<typeof serverEnvSchema> | null = null;

export function getServerEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = serverEnvSchema.parse(process.env);
  return cachedEnv;
}
