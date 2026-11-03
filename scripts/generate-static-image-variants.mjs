// public/images의 사진마다 너비별 webp를 만든다(이미 있으면 건너뜀).
// 너비·폴더는 src/lib/images/static-image-loader.ts와 같아야 한다.
// 사용: node scripts/generate-static-image-variants.mjs
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const DIRS = ["images/landing", "images/buddy"];
const WIDTHS = [640, 828, 1200];

for (const dir of DIRS) {
  const root = join("public", dir);
  for (const file of readdirSync(root).filter((f) => /\.(webp|jpe?g|png)$/i.test(f))) {
    for (const width of WIDTHS) {
      const outDir = join(root, `w${width}`);
      const out = join(outDir, file.replace(/\.[^.]+$/, ".webp"));
      if (existsSync(out)) continue;
      mkdirSync(outDir, { recursive: true });
      await sharp(join(root, file))
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(out);
      console.log(out);
    }
  }
}
