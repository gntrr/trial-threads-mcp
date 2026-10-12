import { timingSafeEqual } from "node:crypto";

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

  if (!process.env.MCP_API_KEY) {
    return Response.json(
      { error: "MCP authentication not configured" },
      { status: 503 },
    );
  }

  if (!isAuthorized(req)) {
    return Response.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return mcpHandler.fetch(req);
}
