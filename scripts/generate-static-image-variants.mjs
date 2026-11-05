// public/images의 사진마다 너비별 webp를 만든다. 원본보다 새 파일이 이미 있으면 건너뛴다(원본을 같은 이름으로 바꾸면 다시 만든다).
// 너비·폴더는 src/lib/images/static-image-loader.ts와 같아야 한다.
// 사용: node scripts/generate-static-image-variants.mjs
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const DIRS = ["images/landing", "images/buddy"];
const WIDTHS = [256, 640, 828, 1200];

for (const dir of DIRS) {
  const root = join("public", dir);
  for (const file of readdirSync(root).filter((f) => /\.(webp|jpe?g|png)$/i.test(f))) {
    for (const width of WIDTHS) {
      const outDir = join(root, `w${width}`);
      const out = join(outDir, file.replace(/\.[^.]+$/, ".webp"));
      const source = join(root, file);
      if (existsSync(out) && statSync(out).mtimeMs >= statSync(source).mtimeMs) continue;
      mkdirSync(outDir, { recursive: true });
      await sharp(join(root, file))
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(out);
      console.log(out);
    }
  }
}
