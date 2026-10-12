import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod/v4";

import { getThreadsToken } from "../threads/token-store";
import { searchThreadsPosts } from "../threads/keyword-search";

export function createThreadsMcpServer() {
  const server = new McpServer({
    name: "masgenterr-threads-research",
    version: "0.1.0", // Please update this version if the codebase changed
  });

  server.registerTool(
    "search_threads_posts",
    {
      title: "Search Threads Posts",
      description:
        "Search Threads posts by keyword using the official Meta Threads API.",

      inputSchema: z.object({
        keyword: z.string().trim().min(2).max(100),
        searchType: z.enum(["RECENT", "TOP"]).default("RECENT"),
        limit: z.number().int().min(1).max(10).default(5),
      }),
    },

    async ({ keyword, searchType, limit }) => {
      try {
        const stored = await getThreadsToken();
        const allowedUserId = process.env.THREADS_ALLOWED_USER_ID;

        if (!stored || !allowedUserId || stored.userId !== allowedUserId) {
          throw new Error("Authorized Threads token unavailable");
        }

        const result = await searchThreadsPosts(
          stored.accessToken,
          keyword,
          searchType,
          limit,
        );

        if (result.status !== "success") {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: `Threads search failed: ${result.status}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                keyword,
                searchType,
                resultCount: result.resultCount,
                posts: result.posts,
              }),
            },
          ],
        };
      } catch {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Threads search is currently unavailable.",
            },
          ],
        };
      }
    },
  );

  return server;
}
