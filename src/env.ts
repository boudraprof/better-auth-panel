import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// Isomorphic runtime source: on the server we read `process.env` (populated by
// `dotenv/config` in `vite.config.ts` / `app-server.mjs`), on the client we
// read Vite's `import.meta.env`. We pass a *copy* in both cases so that the
// library's `emptyStringAsUndefined` option can safely delete keys without
// mutating the frozen `import.meta.env` object or the real `process.env`.
const runtimeEnv =
  typeof window === "undefined"
    ? { ...process.env }
    : { ...import.meta.env };

export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z
      .string()
      .url()
      .optional()
      .describe("PostgreSQL connection URL"),
    DB_DRIVER: z
      .enum(["sqlite", "pg"])
      .default("pg")
      .describe("Database driver: sqlite or pg"),
    SQLITE_DB_PATH: z
      .string()
      .optional()
      .default("./src/db/sqlite/admin-panel.db")
      .describe("Path to SQLite database file"),

    // Turso (optional remote SQLite)
    TURSO_DATABASE_URL: z
      .string()
      .url()
      .optional()
      .describe("Turso cloud database URL"),
    TURSO_AUTH_TOKEN: z
      .string()
      .optional()
      .describe("Turso authentication token"),

    // Better Auth
    BETTER_AUTH_SECRET: z
      .string()
      .min(1, "BETTER_AUTH_SECRET is required")
      .describe("Secret for signing session cookies"),
    BETTER_AUTH_BASE_URL: z
      .string()
      .url()
      .default("http://localhost:8000")
      .describe("Public base URL for auth endpoints"),
    BETTER_AUTH_BASE_PATH: z
      .string()
      .default("api/v1/auth")
      .describe("Base path for auth endpoints"),
    // Optional override used when building invitation/reset links. Falls back to
    // APP_URL when unset.
    BETTER_AUTH_URL: z
      .string()
      .url()
      .optional()
      .describe("Optional explicit auth URL for link building"),
    BETTER_AUTH_TRUSTED_ORIGINS: z
      .string()
      .optional()
      .describe("Comma-separated list of trusted origins"),
    ALLOWED_ORIGINS: z
      .string()
      .optional()
      .describe("Comma-separated list of allowed CORS origins"),
    APP_URL: z
      .string()
      .url()
      .default("http://localhost:8000")
      .describe("Absolute URL used for SSR and links"),

    // Better Auth Infrastructure
    BETTER_AUTH_API_KEY: z
      .string()
      .optional()
      .describe("API key for Better Auth dash/sentinel plugins"),

    // Security / proxy
    TRUSTED_PROXIES: z
      .string()
      .optional()
      .default("")
      .describe("Comma-separated list of trusted proxy IPs/CIDRs"),

    // Demo mode (server-side)
    DEMO_MODE: z
      .enum(["true", "false"])
      .optional()
      .default("true")
      .describe("Enable demo mode (mutating actions blocked)"),

    // E2E test accounts (optional)
    E2E_ADMIN_EMAIL: z
      .string()
      .email()
      .optional()
      .describe("Admin account for Playwright tests"),
    E2E_ADMIN_PASSWORD: z
      .string()
      .optional()
      .describe("Admin password for Playwright tests"),
  },
  client: {
    VITE_APP_NAME: z
      .string()
      .optional()
      .default("AP Admin Panel")
      .describe("App display name (client-side)"),
    VITE_DEMO_MODE: z
      .enum(["true", "false"])
      .optional()
      .default("true")
      .describe("Demo mode flag for client bundle"),
    VITE_BETTER_AUTH_BASE_URL: z
      .string()
      .url()
      .optional()
      .describe("Client-side auth base URL"),
    VITE_BETTER_AUTH_BASE_PATH: z
      .string()
      .optional()
      .default("api/v1/auth")
      .describe("Client-side auth base path"),
  },
  clientPrefix: "VITE_",
  runtimeEnv,
  emptyStringAsUndefined: true,
  skipValidation:
    typeof process !== "undefined" && !!process.env.SKIP_ENV_VALIDATION,
});

// ─── Derived CORS / auth trusted origins (server-only) ──────────────────────
// These derive from server-only env vars, so they are exposed as *lazy*
// functions and only evaluated when called on the server. They must NOT be
// evaluated at module load: `src/env.ts` is also imported by client code
// (e.g. `axios.ts`), and on the client the t3-env proxy throws when a
// server-only variable is accessed. Computing them lazily keeps this module
// safe to import anywhere.
const DEFAULT_ORIGINS =
  "http://localhost:3000,http://localhost:8081,http://localhost:5173";

const parseOrigins = (origins: string): string[] =>
  origins
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

const baseOrigin = (): string => {
  try {
    return new URL(env.BETTER_AUTH_BASE_URL || "http://localhost:8080").origin;
  } catch {
    return "http://localhost:8080";
  }
};

const mergeOrigins = (configured: string[]): string[] =>
  Array.from(new Set([...configured, baseOrigin()]));

export function getTrustedOrigins(): string[] {
  return mergeOrigins(
    parseOrigins(env.BETTER_AUTH_TRUSTED_ORIGINS || DEFAULT_ORIGINS),
  );
}

export function getAllowedOrigins(): string[] {
  return mergeOrigins(parseOrigins(env.ALLOWED_ORIGINS || DEFAULT_ORIGINS));
}
