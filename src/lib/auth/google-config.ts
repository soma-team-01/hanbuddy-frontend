export class GoogleOAuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleOAuthConfigError";
  }
}

export function getGoogleClientId() {
  return getRequiredValue("GOOGLE_CLIENT_ID");
}

export function getGoogleRedirectUri() {
  const redirectUri = getRequiredValue("GOOGLE_REDIRECT_URI");

  if (redirectUri.includes(",")) {
    throw new GoogleOAuthConfigError("GOOGLE_REDIRECT_URI must contain exactly one URL");
  }

  try {
    const parsedRedirectUri = new URL(redirectUri);
    if (parsedRedirectUri.protocol !== "http:" && parsedRedirectUri.protocol !== "https:") {
      throw new GoogleOAuthConfigError("GOOGLE_REDIRECT_URI must use HTTP or HTTPS");
    }
  } catch (error) {
    if (error instanceof GoogleOAuthConfigError) throw error;
    throw new GoogleOAuthConfigError("GOOGLE_REDIRECT_URI must be an absolute URL");
  }

  return redirectUri;
}

function getRequiredValue(name: "GOOGLE_CLIENT_ID" | "GOOGLE_REDIRECT_URI") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new GoogleOAuthConfigError(`Missing required environment variable: ${name}`);
  }
  return value;
}
