import { getThreadsToken } from "../src/threads/token-store";
import { searchThreadsPosts } from "../src/threads/keyword-search";

const stored = await getThreadsToken();
const allowedUserId = process.env.THREADS_ALLOWED_USER_ID;

if (!stored || !allowedUserId) {
  throw new Error("Token or account configuration missing");
}

if (stored.userId !== allowedUserId) {
  throw new Error("Stored token account mismatch");
}

const result = await searchThreadsPosts(
  stored.accessToken,
  "website",
  "RECENT",
  5,
);

console.log(JSON.stringify(result, null, 2));

if (result.status !== "success") {
  process.exitCode = 1;
}
