import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

import { createMcpHandler } from "@modelcontextprotocol/server";
import { createThreadsMcpServer } from "../src/mcp/server";

const handler = createMcpHandler(createThreadsMcpServer, {
  responseMode: "json",
});

const client = new Client({
  name: "masgenterr-test-client",
  version: "1.0.0",
});

const transport = new StreamableHTTPClientTransport(
  new URL("http://test.local/mcp"),
  {
    fetch: (url, init) => handler.fetch(new Request(url.toString(), init)),
  },
);

try {
  await client.connect(transport);

  const tools = await client.listTools();

  const result = await client.callTool({
    name: "search_threads_posts",
    arguments: {
      keyword: "website",
      searchType: "RECENT",
      limit: 5,
    },
  });

  const textBlock = result.content.find((item) => item.type === "text");

  const payload =
    textBlock?.type === "text" ? JSON.parse(textBlock.text) : null;

  console.log({
    tools: tools.tools.map((tool) => tool.name),
    searchSuccess: !result.isError,
    resultCount: payload?.resultCount ?? null,
  });
} finally {
  await client.close();
  await handler.close();
}
