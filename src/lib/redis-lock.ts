import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function withRedisLock<T>(
  key: string,
  task: () => Promise<T>,
): Promise<{ acquired: true; result: T } | { acquired: false }> {
  const lockId = crypto.randomUUID();

  const acquired = await redis.set(key, lockId, {
    nx: true,
    ex: 300,
  });

  if (acquired !== "OK") {
    return { acquired: false };
  }

  try {
    const result = await task();

    return {
      acquired: true,
      result,
    };
  } finally {
    try {
      await redis.eval(
        `if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end`,
        [key],
        [lockId],
      );
    } catch {
      console.error("Redis lock cleanup failed");
    }
  }
}
