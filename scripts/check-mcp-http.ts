import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

const apiKey = process.env.MCP_API_KEY;

if (!apiKey) {
  throw new Error("MCP_API_KEY is missing");
}

const client = new Client({
  name: "masgenterr-test-client",
  version: "1.0.0",
});

const transport = new StreamableHTTPClientTransport(
  new URL("http://localhost:3000/mcp"),
  {
    fetch: (url, init) => {
      const headers = new Headers(init?.headers);

      headers.set("Authorization", `Bearer ${apiKey}`);

      return fetch(url, {
        ...init,
        headers,
      });
    },
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

  const textBlock = result.content.find(
    (item) => item.type === "text"
  );

  const payload =
    textBlock?.type === "text" && !result.isError
      ? JSON.parse(textBlock.text)
      : null;

  console.log({
    connected: true,
    tools: tools.tools.map((tool) => tool.name),
    toolCallSuccess: !result.isError,
    resultCount: payload?.resultCount ?? null,
  });

  if (result.isError) {
    console.error(
      "MCP Tool Error:",
      textBlock?.type === "text"
        ? textBlock.text
        : "Unknown error"
    );

    process.exitCode = 1;
  }
} finally {
  await client.close();
}
