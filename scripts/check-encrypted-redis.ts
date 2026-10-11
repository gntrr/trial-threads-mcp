import { Redis } from "@upstash/redis";
import {
    encryptToken,
    decryptToken,
} from "../src/lib/token-crypto";

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

if (!url || !token) {
    throw new Error("Redis environment variables are missing");
}

const redis = new Redis({ url, token });

const testKey = `threads-mcp:test:encrypted:${crypto.randomUUID()}`;
const dummyToken = "dummy_threads_access_token_123";

try {
    // 1. Encrypt token
    const encrypted = encryptToken(dummyToken);

    // 2. Save encrypted token to Redis
    await redis.set(testKey, encrypted, { ex: 60 });

    // 3. Retrieve encrypted token
    const stored = await redis.get<string>(testKey);

    // 4. Decrypt token
    const decrypted = stored ? decryptToken(stored) : null;

    const result = {
        encryptionSuccessful: encrypted !== dummyToken,
        redisWriteSuccessful: stored === encrypted,
        tokenStoredEncrypted: stored !== dummyToken,
        decryptionSuccessful: decrypted === dummyToken,
    };

    console.log(result);

    if (Object.values(result).some((value) => !value)) {
        process.exitCode = 1;
    }
} finally {
    // 5. Remove test data
    await redis.del(testKey);
}