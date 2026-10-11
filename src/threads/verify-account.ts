export async function verifyThreadsAccount(
    accessToken: string
): Promise<boolean> {
    const allowedUserId = process.env.THREADS_ALLOWED_USER_ID;

    if (!allowedUserId) {
        throw new Error("Allowed Threads User ID is not configured");
    }

    const response = await fetch(
        "https://graph.threads.net/v1.0/me?fields=id,username",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
        }
    );

    if (!response.ok) {
        throw new Error(
            `Threads profile verification failed: ${response.status}`
        );
    }

    const profile = (await response.json()) as {
        id?: string;
        username?: string;
    };

    return (
        typeof profile.id === "string" &&
        profile.id === allowedUserId
    );
}