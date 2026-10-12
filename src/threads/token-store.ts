import { Redis } from "@upstash/redis";
import {
    encryptToken,
    decryptToken,
} from "../lib/token-crypto";

const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
});

const DEFAULT_TOKEN_KEY = "threads-mcp:auth:primary";

interface StoredToken {
    userId: string;
    encryptedToken: string;
    expiresAt: number;
    updatedAt: number;
}

interface SaveTokenInput {
    userId: string;
    accessToken: string;
    expiresInSeconds: number;
}

export async function saveThreadsToken(
    input: SaveTokenInput,
    key = DEFAULT_TOKEN_KEY
): Promise<void> {
    if (
        !input.userId ||
        !input.accessToken ||
        !Number.isFinite(input.expiresInSeconds) ||
        input.expiresInSeconds < 1
    ) {
        throw new Error("Invalid token data");
    }

    const ttl = Math.floor(input.expiresInSeconds);
    const now = Date.now();

    const data: StoredToken = {
        userId: input.userId,
        encryptedToken: encryptToken(input.accessToken),
        expiresAt: now + ttl * 1000,
        updatedAt: now,
    };

    await redis.set(key, data, {
        ex: ttl,
    });
}

export async function getThreadsToken(
    key = DEFAULT_TOKEN_KEY
) {
    const stored = await redis.get<StoredToken>(key);

    if (!stored) {
        return null;
    }

    if (Date.now() >= stored.expiresAt) {
        return null;
    }

    return {
        userId: stored.userId,
        accessToken: decryptToken(stored.encryptedToken),
        expiresAt: stored.expiresAt,
        updatedAt: stored.updatedAt,
    };
}
