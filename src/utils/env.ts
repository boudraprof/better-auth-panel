import { env } from "#/env";

const parseOrigins = (origins: string): Array<string> => {
  return origins
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
}

// The panel's own origin is always trusted (it must be able to call its own
// auth endpoints and CORS is same-origin in that case). Derived from
// BETTER_AUTH_BASE_URL so the deployed origin never needs repeating in the
// allow-lists.
const baseOrigin = (() => {
  try {
    return new URL(
      env.BETTER_AUTH_BASE_URL || "http://localhost:8080",
    ).origin
  } catch {
    return "http://localhost:8080"
  }
})()

const mergeOrigins = (configured: Array<string>): Array<string> =>
  Array.from(new Set([...configured, baseOrigin]))

export const trustedOrigins = mergeOrigins(
  parseOrigins(
    env.BETTER_AUTH_TRUSTED_ORIGINS ||
      "http://localhost:3000,http://localhost:8081,http://localhost:5173,https://is.demoteam.ch",
  ),
)
export const allowedOrigins = mergeOrigins(
  parseOrigins(
    env.ALLOWED_ORIGINS ||
      "http://localhost:3000,http://localhost:8081,http://localhost:5173,https://is.demoteam.ch",
  ),
)
