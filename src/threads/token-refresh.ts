import { getThreadsToken, saveThreadsToken } from "./token-store";

const DAY_MS = 24 * 60 * 60 * 1000;

interface TokenTiming {
  updatedAt: number;
  expiresAt: number;
}

export async function refreshStoredThreadsToken() {
  const allowedUserId = process.env.THREADS_ALLOWED_USER_ID;

  if (!allowedUserId) {
    throw new Error("Allowed Threads User ID is missing");
  }

  const stored = await getThreadsToken();

  if (!stored) {
    return { status: "no_token" };
  }

  if (stored.userId !== allowedUserId) {
    throw new Error("Stored token account mismatch");
  }

  const now = Date.now();

  const needsRefresh = shouldRefreshThreadsToken(
    {
      updatedAt: stored.updatedAt,
      expiresAt: stored.expiresAt,
    },
    now,
  );

  if (!needsRefresh) {
    return {
      status: "not_due",
      expiresInDays: Math.floor((stored.expiresAt - now) / 86400000),
    };
  }

  const url = new URL("https://graph.threads.net/refresh_access_token");

  url.searchParams.set("grant_type", "th_refresh_token");
  url.searchParams.set("access_token", stored.accessToken);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { code?: number };
  };

  const expiresIn =
    typeof data.expires_in === "number" ? Math.floor(data.expires_in) : 0;

  if (
    !response.ok ||
    !data.access_token ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0
  ) {
    throw new Error(`Threads token refresh failed: HTTP ${response.status}`);
  }

  await saveThreadsToken({
    userId: stored.userId,
    accessToken: data.access_token,
    expiresInSeconds: expiresIn,
  });

  return {
    status: "refreshed",
    expiresInDays: Math.floor(expiresIn / 86400),
  };
}

export function shouldRefreshThreadsToken(
  token: TokenTiming,
  now = Date.now(),
): boolean {
  const tokenAge = now - token.updatedAt;
  const remainingTime = token.expiresAt - now;

  return (
    tokenAge >= DAY_MS && remainingTime > 0 && remainingTime <= 14 * DAY_MS
  );
}
