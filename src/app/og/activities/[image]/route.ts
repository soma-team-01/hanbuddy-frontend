import sharp from "sharp";
import { getPublicActivity, PublicActivityError } from "@/lib/server/public-activities";
import { ACTIVITY_SHARE_IMAGE_SIZE, DEFAULT_SHARE_IMAGE } from "@/lib/seo/metadata";

// 활동 공유 미리보기(og:image)를 사이트 도메인에서 1200×630 JPEG로 내보낸다.
// 원본은 백엔드가 준 활동 썸네일(S3)이고, 그 외 주소는 받지 않는다.
// 주소에 확장자(.jpg)가 있어 언어 리다이렉트 미들웨어를 거치지 않는다.

const ACTIVITY_IMAGE_ORIGIN =
  "https://hanbuddy-bucket-526958954481-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com";
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

function isActivityImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === ACTIVITY_IMAGE_ORIGIN && url.pathname.startsWith("/activities/");
  } catch {
    return false;
  }
}

/** 썸네일을 못 만들면 사이트 대표 이미지로 보낸다. 공유 미리보기가 빈칸이 되지 않게 한다. */
function fallback() {
  return Response.redirect(DEFAULT_SHARE_IMAGE.url, 302);
}

export async function GET(_request: Request, { params }: { params: Promise<{ image: string }> }) {
  const { image } = await params;
  const id = /^([1-9]\d{0,15})\.jpg$/.exec(image)?.[1];
  if (!id) return new Response(null, { status: 404 });

  let thumbnailUrl: string;
  try {
    thumbnailUrl = (await getPublicActivity(id, "en")).thumbnailImageUrl;
  } catch (error) {
    if (error instanceof PublicActivityError && error.kind === "missing") {
      return new Response(null, { status: 404 });
    }
    return fallback();
  }
  if (!isActivityImageUrl(thumbnailUrl)) return fallback();

  try {
    const source = await fetch(thumbnailUrl, { signal: AbortSignal.timeout(5_000) });
    const length = Number(source.headers.get("content-length") ?? 0);
    if (!source.ok || length > MAX_SOURCE_BYTES) return fallback();
    const buffer = Buffer.from(await source.arrayBuffer());
    if (buffer.byteLength > MAX_SOURCE_BYTES) return fallback();

    const jpeg = await sharp(buffer)
      .rotate()
      .resize({ ...ACTIVITY_SHARE_IMAGE_SIZE, fit: "cover", position: "attention" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return fallback();
  }
}
