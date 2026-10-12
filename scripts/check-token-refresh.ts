import { shouldRefreshThreadsToken } from "../src/threads/token-refresh";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

const result = {
  freshToken: shouldRefreshThreadsToken(
    {
      updatedAt: now - DAY,
      expiresAt: now + 59 * DAY,
    },
    now,
  ),

  expiringToken: shouldRefreshThreadsToken(
    {
      updatedAt: now - 46 * DAY,
      expiresAt: now + 14 * DAY,
    },
    now,
  ),

  expiredToken: shouldRefreshThreadsToken(
    {
      updatedAt: now - 61 * DAY,
      expiresAt: now - DAY,
    },
    now,
  ),
};

console.log(result);
