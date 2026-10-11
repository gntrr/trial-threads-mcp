import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

if (!url || !token) {
    throw new Error("Redis environment variables are missing");
}

const redis = new Redis({ url, token });

const key = `threads-mcp:test:${crypto.randomUUID()}`;

try {
        // Test write
        await redis.set(key, "connected", { ex: 60 });

        // Test read
        const value = await redis.get<string>(key);

        console.log({
            redisConnected: value === "connected",
            readWrite: value === "connected",
        });
    } finally {
        // Cleanup
        await redis.del(key);
}