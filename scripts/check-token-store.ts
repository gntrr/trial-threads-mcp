import { Redis } from "@upstash/redis";
import {
    saveThreadsToken,
    getThreadsToken,
} from "../src/threads/token-store";

const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
});

const key = `threads-mcp:test:store:${crypto.randomUUID()}`;
const dummyToken = "dummy_threads_long_lived_token";

try {
    await saveThreadsToken(
        {
            userId: "test-user",
            accessToken: dummyToken,
            expiresInSeconds: 60,
        },
        key
    );

    const raw = await redis.get<{
        encryptedToken: string;
    }>(key);

    const loaded = await getThreadsToken(key);
    const ttl = await redis.ttl(key);

    const result = {
        tokenStored: raw !== null,
        tokenEncrypted: Boolean(
        raw?.encryptedToken &&
        raw.encryptedToken !== dummyToken
        ),
        tokenRetrieved: loaded?.accessToken === dummyToken,
        userIdMatched: loaded?.userId === "test-user",
        ttlConfigured: ttl > 0 && ttl <= 60,
    };

    console.log(result);

    if (Object.values(result).some((value) => !value)) {
        process.exitCode = 1;
    }
} finally {
    await redis.del(key);
}