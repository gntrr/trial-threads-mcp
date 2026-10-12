import { saveThreadsToken } from "./token-store";

export async function exchangeAndStoreLongLivedToken(
  shortLivedToken: string,
  appSecret: string,
  userId: string,
) {
  const url = new URL("https://graph.threads.net/access_token");

  url.searchParams.set("grant_type", "th_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", shortLivedToken);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { code?: number };
  };

  if (
    !response.ok ||
    !data.access_token ||
    !Number.isFinite(data.expires_in) ||
    !data.expires_in ||
    data.expires_in <= 0
  ) {
    return {
      status: "api_error",
      httpStatus: response.status,
      expiresInSeconds: null,
      errorCode: data.error?.code ?? null,
      tokenStored: false,
    };
  }

  await saveThreadsToken({
    userId,
    accessToken: data.access_token,
    expiresInSeconds: data.expires_in,
  });

  return {
    status: "success",
    httpStatus: response.status,
    expiresInSeconds: data.expires_in,
    errorCode: null,
    tokenStored: true,
  };
}
