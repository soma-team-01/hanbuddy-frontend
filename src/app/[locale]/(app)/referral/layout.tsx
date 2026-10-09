import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata = privatePageMetadata;

export default function PrivateSegmentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
