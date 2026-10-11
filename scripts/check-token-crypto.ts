import {
    encryptToken,
    decryptToken,
} from "../src/lib/token-crypto";

const dummyToken = "dummy_threads_access_token_123";

const encrypted = encryptToken(dummyToken);
const decrypted = decryptToken(encrypted);

console.log({
    encryptionSuccessful: encrypted !== dummyToken,
    decryptionSuccessful: decrypted === dummyToken,
});