type LongLivedTokenResult = {
    status: "success" | "api_error";
    httpStatus: number;
    expiresInSeconds: number | null;
    errorCode: number | null;
};

export async function exchangeLongLivedToken(
    shortLivedToken: string,
    appSecret: string
): Promise<LongLivedTokenResult> {
    const url = new URL(
        "https://graph.threads.net/access_token"
    );

    url.searchParams.set("grant_type", "th_exchange_token");
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("access_token", shortLivedToken);

    const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
    });

    const data = (await response.json()) as {
        access_token?: string;
        token_type?: string;
        expires_in?: number;
        error?: {
        code?: number;
        };
    };

    const success = response.ok && Boolean(data.access_token);

    return {
        status: success ? "success" : "api_error",
        httpStatus: response.status,
        expiresInSeconds:
        success && typeof data.expires_in === "number"
            ? data.expires_in
            : null,
        errorCode: data.error?.code ?? null,
    };
}