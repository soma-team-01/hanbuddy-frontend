import { randomBytes } from "node:crypto";

const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const DEFAULT_GOOGLE_SCOPE = "openid email profile";

interface BuildGoogleAuthorizationUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
}

export function buildGoogleAuthorizationUrl({
  clientId,
  redirectUri,
  state,
  scope = DEFAULT_GOOGLE_SCOPE,
}: BuildGoogleAuthorizationUrlParams) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    prompt: "select_account",
    include_granted_scopes: "true",
  });

  return `${GOOGLE_AUTHORIZATION_ENDPOINT}?${params.toString()}`;
}

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}
