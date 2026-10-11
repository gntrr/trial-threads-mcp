const redirectUri = process.env.THREADS_REDIRECT_URI;
const appId = process.env.THREADS_APP_ID;

const server = Bun.serve({
    hostname: "127.0.0.1",
    port: Number(process.env.PORT ?? 3000),

    fetch(req) {
        const url = new URL(req.url);

        if(url.pathname === "/health" && req.method === "GET") {
            return Response.json({
                status: "good",
                service: "trial-threads-mcp",
            });
        }

        // Step 1: Start OAuth
        if (url.pathname === "/auth/threads/login") {
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

            return Response.json(
                {
                    status: code ? "code_received" : "authorization_failed",
                    codeReceived: Boolean(code),
                    oauth: "token_exchange_not_implemented",
                },
                {
                    headers: {
                        "Cache-Control": "no-store",
                        "Referrer-Policy": "no-referrer",
                        "Set-Cookie": 
                            "threads_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/auth/threads; Max-Age=0",
                    },
                }
            );
        }

        return new Response("Not Found", { status: 404 });
    },
});

console.log(`Server is running at ${server.url}`);