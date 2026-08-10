/**
 * 보내기 전 이미지의 실제 크기를 읽는다.
 * 이 값을 함께 보내면 받는 쪽에서 사진이 로드되기 전에도 자리를 잡아 화면이 튀지 않는다.
 * 읽지 못하면 크기 없이 보낸다 — 없어도 전송 자체에는 지장이 없다.
 */
export async function readImageSize(
  file: File,
): Promise<{ imageWidth?: number; imageHeight?: number }> {
  if (typeof createImageBitmap !== "function") return {};

  try {
    const bitmap = await createImageBitmap(file);
    const size = { imageWidth: bitmap.width, imageHeight: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return {};
  }
}
