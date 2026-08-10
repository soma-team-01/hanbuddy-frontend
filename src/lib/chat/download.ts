/** 한 파일씩 내려받기를 시작하는 간격. 너무 촘촘하면 브라우저가 뒤쪽을 흘린다 */
const DOWNLOAD_INTERVAL_MS = 400;

function triggerDownload(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  // 실제 파일 이름과 attachment 여부는 서버가 Content-Disposition으로 정한다
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * 여러 장을 차례로 내려받는다.
 * 브라우저가 "파일 여러 개 다운로드" 허용을 한 번 물어볼 수 있다.
 */
export async function downloadFilesInSequence(
  urls: string[],
  wait: (ms: number) => Promise<void> = defaultWait,
): Promise<void> {
  for (const [index, url] of urls.entries()) {
    if (index > 0) await wait(DOWNLOAD_INTERVAL_MS);
    triggerDownload(url);
  }
}

function defaultWait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
