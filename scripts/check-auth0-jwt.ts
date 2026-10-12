import { verifyAuth0Token } from "../src/mcp/auth0";

const missingToken = await verifyAuth0Token(
  new Request("http://localhost:3000/mcp"),
);

const invalidToken = await verifyAuth0Token(
  new Request("http://localhost:3000/mcp", {
    headers: {
      Authorization: "Bearer invalid-test-token",
    },
  }),
);

console.log({
  missingToken,
  invalidToken,
});

if (missingToken.authorized || invalidToken.authorized) {
  process.exitCode = 1;
}
