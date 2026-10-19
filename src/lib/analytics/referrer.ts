// Hosts that only send visitors back to us mid-flow (own site, Google login, PayPal).
// Reporting them would replace the real entry source with a login or payment step.
const INTERNAL_HOSTS = ["hanbuddy.kr", "accounts.google.com", "paypal.com"];

const matches = (hostname: string, host: string) =>
  hostname === host || hostname.endsWith(`.${host}`);

/** Entry source as an origin only; never forward the referring path, query or fragment. */
export function readReferrer(referrer: string, currentOrigin?: string): string {
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "";
  if (url.origin === currentOrigin) return "";
  if (INTERNAL_HOSTS.some((host) => matches(url.hostname, host))) return "";
  return `${url.origin}/`;
}
