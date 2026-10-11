export async function searchThreadsByKeyword(
    accessToken: string,
    keyword: string,
    limit = 5
) {
    try {
        const url = new URL(
            "https://graph.threads.net/v1.0/keyword_search"
        );

        url.searchParams.set("q", keyword);
        url.searchParams.set("search_type", "RECENT");
        url.searchParams.set(
            "fields",
            "id,text,username,permalink,timestamp"
        );
        url.searchParams.set("limit", String(limit));

        const response = await fetch(url, {
            headers: 
            {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const result = (await response.json()) as {
            data?: Array<{ id: string }>;
            error?: { code?: number };
        };

        return {
            status: response.ok ? "success" : "api_error",
            httpStatus: response.status,
            resultCount: Array.isArray(result.data)
                ? result.data.length
                : null,
            errorCode: result.error?.code ?? null,
        };
    } catch {
        return {
            status: "network_error",
            httpStatus: null,
            resultCount: null,
            errorCode: null,
        };
    }
}