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

        if (
            url.pathname === "/auth/threads/callback" && req.method === "GET"
        ) {
            return Response.json(
                {
                    status: "callback_ready",
                    service: "trial-threads-mcp",
                    oauth: "not_implemented",
                },
                {
                    headers: {
                        "Cache-Control": "no-store",
                        "Referrer-Policy": "no-referrer",
                    },
                }
            );
        }

        return new Response("Not Found", { status: 404 });
    },
});

console.log(`Server is running at ${server.url}`);