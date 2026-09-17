import type { MetadataRoute } from "next";
import { APP_ORIGIN } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Preserve unrestricted crawling; noindex documents must remain crawlable.
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${APP_ORIGIN}/sitemap.xml` };
}
