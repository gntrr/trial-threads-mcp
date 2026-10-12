import { timingSafeEqual } from "node:crypto";
import { verifyAuth0Token } from "./auth0";

import {
  createMcpHandler,
  hostHeaderValidationResponse,
  originValidationResponse,
} from "@modelcontextprotocol/server";

import { createThreadsMcpServer } from "./server";

const mcpHandler = createMcpHandler(createThreadsMcpServer, {
  responseMode: "json",
});

const allowedHosts = ["localhost", "127.0.0.1", "trial-threads-mcp.vercel.app"];

function isAuthorized(req: Request): boolean {
  const expectedKey = process.env.MCP_API_KEY;

  if (!expectedKey) return false;

  const authorization = req.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  const providedKey = authorization.slice(7);

  const provided = Buffer.from(providedKey);
  const expected = Buffer.from(expectedKey);

  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

export async function handleMcpRequest(req: Request): Promise<Response> {
  const rejected =
    hostHeaderValidationResponse(req, allowedHosts) ??
    originValidationResponse(req, allowedHosts);

  if (rejected) return rejected;

  // Method 1: Existing MCP API Key
  if (isAuthorized(req)) {
    return mcpHandler.fetch(req);
  }

  // Method 2: Auth0 OAuth JWT
  const auth0Result = await verifyAuth0Token(req);

  if (auth0Result.authorized) {
    return mcpHandler.fetch(req);
  }

  // Reject unauthorized requests
  const forbidden =
    auth0Result.reason === "insufficient_scope" ||
    auth0Result.reason === "account_not_allowed";

  const resource = process.env.AUTH0_AUDIENCE;

  const metadataUrl = resource
    ? new URL("/.well-known/oauth-protected-resource", resource).toString()
    : null;

  return Response.json(
    {
      error: forbidden ? "Forbidden" : "Unauthorized",
    },
    {
      status: forbidden ? 403 : 401,
      headers: {
        "Cache-Control": "no-store",
        ...(!forbidden && metadataUrl
          ? {
              "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl}", scope="search:threads"`,
            }
          : {}),
      },
    },
  );
}
