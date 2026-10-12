import { createRemoteJWKSet, jwtVerify } from "jose";

type AuthResult =
  | { authorized: true; subject: string }
  | {
      authorized: false;
      reason:
        | "not_configured"
        | "missing_token"
        | "invalid_token"
        | "insufficient_scope"
        | "account_not_allowed";
    };

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export async function verifyAuth0Token(request: Request): Promise<AuthResult> {
  const issuer = process.env.AUTH0_ISSUER;
  const audience = process.env.AUTH0_AUDIENCE;

  if (!issuer || !audience) {
    return { authorized: false, reason: "not_configured" };
  }

  const authorization = request.headers.get("authorization");

  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? "");
  const token = match?.[1];

  if (!token) {
    return { authorized: false, reason: "missing_token" };
  }

  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(".well-known/jwks.json", issuer));
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience,
      algorithms: ["RS256"],
    });

    const scopes =
      typeof payload.scope === "string" ? payload.scope.split(/\s+/) : [];

    if (!scopes.includes("search:threads")) {
      return {
        authorized: false,
        reason: "insufficient_scope",
      };
    }

    const allowedSub = process.env.AUTH0_ALLOWED_SUB;

    if (!allowedSub || payload.sub !== allowedSub) {
      return {
        authorized: false,
        reason: "account_not_allowed",
      };
    }

    return {
      authorized: true,
      subject: payload.sub,
    };
  } catch {
    return {
      authorized: false,
      reason: "invalid_token",
    };
  }
}
