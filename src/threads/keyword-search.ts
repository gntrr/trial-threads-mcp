export interface ThreadsPost {
  id: string;
  text?: string;
  username?: string;
  permalink?: string;
  timestamp?: string;
}

export type SearchType = "RECENT" | "TOP";

export async function searchThreadsPosts(
  accessToken: string,
  keyword: string,
  searchType: SearchType = "RECENT",
  limit = 5,
) {
  if (!keyword.trim()) {
    throw new Error("Keyword cannot be empty");
  }

  const url = new URL("https://graph.threads.net/v1.0/keyword_search");

  url.searchParams.set("q", keyword.trim());
  url.searchParams.set("search_type", searchType);
  url.searchParams.set("fields", "id,text,username,permalink,timestamp");
  url.searchParams.set(
    "limit",
    String(Math.max(1, Math.min(10, Math.floor(limit)))),
  );

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const result = (await response.json()) as {
      data?: ThreadsPost[];
      error?: { code?: number };
    };

    const posts = response.ok && Array.isArray(result.data) ? result.data : [];

    return {
      status: response.ok ? "success" : "api_error",
      httpStatus: response.status,
      resultCount: response.ok ? posts.length : null,
      posts,
      errorCode: result.error?.code ?? null,
    };
  } catch {
    return {
      status: "network_error",
      httpStatus: null,
      resultCount: null,
      posts: [] as ThreadsPost[],
      errorCode: null,
    };
  }
}

export async function searchThreadsByKeyword(
  accessToken: string,
  keyword: string,
  limit = 5,
) {
  const result = await searchThreadsPosts(
    accessToken,
    keyword,
    "RECENT",
    limit,
  );

  return {
    status: result.status,
    httpStatus: result.httpStatus,
    resultCount: result.resultCount,
    errorCode: result.errorCode,
  };
}
