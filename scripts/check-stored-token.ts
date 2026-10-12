import { getThreadsToken } from "../src/threads/token-store";
import { searchThreadsByKeyword } from "../src/threads/keyword-search";

const allowedUserId = process.env.THREADS_ALLOWED_USER_ID;

if (!allowedUserId) {
  throw new Error("THREADS_ALLOWED_USER_ID is missing");
}

// 1. Retrieve and decrypt stored token
const stored = await getThreadsToken();

if (!stored) {
  throw new Error("No stored Threads token found");
}

// 2. Validate account identity
if (stored.userId !== allowedUserId) {
  throw new Error("Stored token belongs to another account");
}

// 3. Test keyword search with stored token
const search = await searchThreadsByKeyword(stored.accessToken, "website", 5);

const result = {
  tokenRetrieved: true,
  accountMatched: true,
  expiresInDays: Math.floor((stored.expiresAt - Date.now()) / 86400000),
  keywordSearch: {
    status: search.status,
    httpStatus: search.httpStatus,
    resultCount: search.resultCount,
    errorCode: search.errorCode,
  },
};

console.log(result);

if (search.status !== "success") {
  process.exitCode = 1;
}
