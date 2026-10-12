import { refreshStoredThreadsToken } from "../src/threads/token-refresh";

const result = await refreshStoredThreadsToken();

console.log(result);
