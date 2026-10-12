import { withRedisLock } from "../src/lib/redis-lock";

const key = `threads-mcp:test:lock:${crypto.randomUUID()}`;

let signalStarted!: () => void;
let releaseTask!: () => void;

const started = new Promise<void>((resolve) => {
  signalStarted = resolve;
});

const gate = new Promise<void>((resolve) => {
  releaseTask = resolve;
});

const first = withRedisLock(key, async () => {
  signalStarted();
  await gate;
  return "completed";
});

await started;

const second = await withRedisLock(key, async () => "unexpected");

releaseTask();

const firstResult = await first;

console.log({
  firstAcquired: firstResult.acquired,
  duplicateBlocked: !second.acquired,
});
