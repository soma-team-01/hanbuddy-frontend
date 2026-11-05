import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseTip } from "@/lib/tips/parse-tip";
import { compareTips, isTipSlug, TIPS_LOCALE, type Tip } from "@/lib/tips/tip";

const TIPS_DIRECTORY = path.join(process.cwd(), "content", "tips");
const TIP_FILE_SUFFIX = `.${TIPS_LOCALE}.md`;

/**
 * content/tips/<slug>.en.md 를 모두 읽어 발행일 최신순으로 돌려준다. 폴더가 비어 있거나 없으면 빈 목록이다.
 * 계약을 어긴 파일이 하나라도 있으면 조용히 건너뛰지 않고 오류로 낸다(빌드·테스트에서 바로 드러나게).
 */
export async function listTips(directory: string = TIPS_DIRECTORY): Promise<Tip[]> {
  let names: string[];
  try {
    names = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const tips = await Promise.all(
    names
      .filter((name) => name.endsWith(TIP_FILE_SUFFIX))
      .map(async (name) =>
        parseTip(
          name.slice(0, -TIP_FILE_SUFFIX.length),
          await readFile(path.join(directory, name), "utf8"),
        ),
      ),
  );
  return tips.sort(compareTips);
}

export async function getTip(
  slug: string,
  directory: string = TIPS_DIRECTORY,
): Promise<Tip | null> {
  // 경로를 만들기 전에 슬러그부터 검증한다(요청 파라미터가 그대로 들어온다).
  if (!isTipSlug(slug)) return null;
  try {
    return parseTip(
      slug,
      await readFile(path.join(directory, `${slug}${TIP_FILE_SUFFIX}`), "utf8"),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/**
 * 활동 상세에 붙일 관련 정보 글. relatedActivityIds에 그 활동이 든 글을 최신순으로 최대 limit개 돌려준다.
 * 예약 페이지가 글 파일 하나 때문에 깨지면 안 되므로, 글을 읽다 실패하면 빈 목록으로 넘긴다(검증은 빌드·테스트가 한다).
 */
export async function listRelatedTips(
  activityId: number,
  limit = 3,
  directory: string = TIPS_DIRECTORY,
): Promise<Tip[]> {
  try {
    const tips = await listTips(directory);
    return tips.filter((tip) => tip.relatedActivityIds.includes(activityId)).slice(0, limit);
  } catch {
    return [];
  }
}
