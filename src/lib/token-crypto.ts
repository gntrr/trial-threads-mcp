import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
} from "node:crypto";

function getEncryptionKey(): Buffer {
    const secret = process.env.TOKEN_ENCRYPTION_KEY;

    if (!secret) {
        throw new Error("TOKEN_ENCRYPTION_KEY is missing");
    }

    const key = Buffer.from(secret, "base64");

    if (key.length !== 32) {
        throw new Error("Encryption key must be 32 bytes");
    }

    return key;
}

export function encryptToken(token: string): string {
    const iv = randomBytes(12);

    const cipher = createCipheriv(
        "aes-256-gcm",
        getEncryptionKey(),
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(token, "utf8"),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
        iv.toString("base64url"),
        authTag.toString("base64url"),
        encrypted.toString("base64url"),
    ].join(".");
}

export function decryptToken(payload: string): string {
    const [ivBase64, tagBase64, encryptedBase64] =
        payload.split(".");

    if (!ivBase64 || !tagBase64 || !encryptedBase64) {
        throw new Error("Invalid encrypted token format");
    }

    const decipher = createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(),
        Buffer.from(ivBase64, "base64url")
    );

    decipher.setAuthTag(Buffer.from(tagBase64, "base64url"));

    const decrypted = Buffer.concat([
        decipher.update(
        Buffer.from(encryptedBase64, "base64url")
        ),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}