import { searchThreadsByKeyword } from "./threads/keyword-search";
import { exchangeLongLivedToken } from "./threads/token";
import { timingSafeEqual } from "node:crypto";
import { verifyThreadsAccount } from "./threads/verify-account";

const redirectUri = process.env.THREADS_REDIRECT_URI;
const appId = process.env.THREADS_APP_ID;

function isAdminAuthorized(req: Request): boolean {
    const expectedPassword =
        process.env.THREADS_OAUTH_ADMIN_PASSWORD;

    if (!expectedPassword) return false;

    const authorization = req.headers.get("authorization");

    if (!authorization?.startsWith("Basic ")) {
        return false;
    }

    const decoded = Buffer.from(
        authorization.slice(6),
        "base64"
    ).toString("utf8");

    if (!decoded.startsWith("admin:")) {
        return false;
    }

    const password = Buffer.from(decoded.slice(6));
    const expected = Buffer.from(expectedPassword);

    return (
        password.length === expected.length &&
        timingSafeEqual(password, expected)
    );
}

const server = Bun.serve({
    hostname: "127.0.0.1",
    port: Number(process.env.PORT ?? 3000),

    async fetch(req) {
        const url = new URL(req.url);

        if(url.pathname === "/health" && req.method === "GET") {
            return Response.json({
                status: "good",
                service: "trial-threads-mcp",
            });
        }

        // Step 1: Start OAuth
        if (
            url.pathname === "/auth/threads/login" &&
            req.method === "GET"
        ) {
            if (!process.env.THREADS_OAUTH_ADMIN_PASSWORD) {
                return new Response("Admin authentication not configured", {
                    status: 503,
                });
            }

            if (!isAdminAuthorized(req)) {
                return new Response("Unauthorized", {
                    status: 401,
                    headers: {
                        "WWW-Authenticate": 'Basic realm="Threads MCP Admin"',
                        "Cache-Control": "no-store",
                    },
                });
            }

            if (!appId || !redirectUri) {
                return new Response("OAuth configuration is missing", {
                    status: 500,
                });
            }

            const state = crypto.randomUUID();

            const authorizeUrl = new URL("https://www.threads.net/oauth/authorize");
            
            authorizeUrl.searchParams.set("client_id", appId);
            authorizeUrl.searchParams.set("redirect_uri", redirectUri);
            authorizeUrl.searchParams.set("scope", "threads_keyword_search,threads_manage_insights,threads_basic");
            authorizeUrl.searchParams.set("response_type", "code");
            authorizeUrl.searchParams.set("state", state);

            return new Response(null, {
                status: 302,
                headers: {
                    Location: authorizeUrl.toString(),
                    "Cache-Control": "no-store",
                    "Set-Cookie": [
                        `threads_oauth_state=${state}`,
                        "HttpOnly",
                        "Secure",
                        "SameSite=Lax",
                        "Path=/auth/threads",
                        "Max-Age=600",
                    ].join("; "),
                },
            });
        }

        //Step 2: Receive OAuth callback
        if (url.pathname === "/auth/threads/callback") {
            const state = url.searchParams.get("state");

            const savedState = req.headers
                .get("cookie")
                ?.split("; ")
                .map((part) => part.trim())
                .find((part) => part.startsWith("threads_oauth_state="))
                ?.split("=")[1];

            if (!state || !savedState || state !== savedState) {
                return Response.json(
                    { error: "Invalid OAuth state" },
                    { status: 403 }
                );
            }

            const code = url.searchParams.get("code");
            const appId = process.env.THREADS_APP_ID;
            const appSecret = process.env.THREADS_APP_SECRET;
            const redirectUri = process.env.THREADS_REDIRECT_URI;

            const headers = {
                "Cache-Control": "no-store",
                "Referrer-Policy": "no-referrer",
                "Set-Cookie": 
                    "threads_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/auth/threads; Max-Age=0",
            };

            if (!code) {
                return Response.json(
                    { status: "authorization_failed" },
                    { status: 400, headers }
                );
            }

            if (!appId || !appSecret || !redirectUri) {
                return Response.json(
                    { error: "OAuth configuration is missing" },
                    { status: 500, headers }
                );
            }

            try {
                const response = await fetch("https://graph.threads.net/oauth/access_token",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: new URLSearchParams({
                            client_id: appId,
                            client_secret: appSecret,
                            grant_type: "authorization_code",
                            redirect_uri: redirectUri,
                            code,
                        }),
                    }
                );

                const result = (await response.json()) as {
                    access_token?: string;
                    user_id?: number;
                    error?: { code?: number };
                };

                if (response.ok && result.access_token) {
                    if (!process.env.THREADS_ALLOWED_USER_ID) {
                        return Response.json(
                            { status: "account_verification_not_configured" },
                            { status: 503, headers }
                        );
                    }

                    let isAllowedAccount: boolean;

                    try {
                        isAllowedAccount = await verifyThreadsAccount(
                            result.access_token
                        );
                    } catch {
                        return Response.json(
                            { status: "account_verification_failed" },
                            { status: 502, headers }
                        );
                    }

                    if (!isAllowedAccount) {
                        return Response.json(
                            { status: "account_not_allowed" },
                            { status: 403, headers }
                        );
                    }
                }

                let grantedScopes: string[] | null = null;
                let tokenValid: boolean | null = null;
                let debugStatus = "not_checked";

                if (response.ok && result.access_token) {
                    try {
                        const debugUrl = new URL(
                            "https://graph.threads.net/debug_token"
                        );

                        debugUrl.searchParams.set(
                            "input_token",
                            result.access_token
                        );

                        const debugResponse = await fetch(debugUrl, {
                            headers: {
                                Authorization: `Bearer ${result.access_token}`,
                            },
                        });

                        if (debugResponse.ok) {
                            const debugResult = (await debugResponse.json()) as {
                                data?: {
                                    is_valid?: boolean;
                                    scopes?: string[];
                                };
                            };

                            grantedScopes = debugResult.data?.scopes ?? null;
                            tokenValid = debugResult.data?.is_valid ?? null;
                            debugStatus = grantedScopes
                                ? "success"
                                : "scopes_unavailable";
                        } else {
                            debugStatus = `http_${debugResponse.status}`;
                        }
                    } catch {
                        debugStatus = "request_failed";
                    }
                }

                let keywordSearchCheck = {
                    status: "not_tested",
                    httpStatus: null as number | null,
                    resultCount: null as number | null,
                    errorCode: null as number | null,
                };

                if (
                    result.access_token &&
                    grantedScopes?.includes("threads_keyword_search")
                ) {
                    keywordSearchCheck = await searchThreadsByKeyword(
                        result.access_token,
                        "website"
                    );
                }

                let longLivedCheck = {
                    status: "not_tested",
                    httpStatus: null as number | null,
                    expiresInSeconds: null as number | null,
                    errorCode: null as number | null,
                };

                if (response.ok && result.access_token) {
                    try {
                        longLivedCheck = await exchangeLongLivedToken(
                        result.access_token,
                        appSecret
                        );
                    } catch {
                        longLivedCheck.status = "request_failed";
                    }
                }

                return Response.json(
                    {
                        status: 
                            response.ok && result.access_token
                                ? "token_exchange_success"
                                : "token_exchange_failed",

                        metaHttpStatus: response.status,
                        metaErrorCode: result.error?.code ?? null,
                        tokenReceived: Boolean(result.access_token),
                        tokenStored: false,

                        permissionCheck: {
                            status: debugStatus,
                            tokenValid,
                            grantedScopes,
                            keywordSearchGranted:
                                grantedScopes?.includes("threads_keyword_search") ?? null,
                        },

                        keywordSearchCheck,
                        longLivedCheck,
                    },
                    {
                        status: response.ok && result.access_token ? 200 : 502,
                        headers,
                    }
                );
            } catch {
                return Response.json(
                    { status: "token_exchange_error" },
                    { status: 502, headers }
                );
            }
        }

        return new Response("Not Found", { status: 404 });
    },
});

console.log(`Server is running at ${server.url}`);