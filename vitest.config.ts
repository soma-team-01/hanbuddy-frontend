import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const exclude = [...configDefaults.exclude, ".worktrees/**", ".claude/**", ".serena/**"];

// 화면 없이 도는 .test.ts 중 DOM(window, document, localStorage 등)이 필요한 파일.
// 여기에 없는 .test.ts는 jsdom을 띄우지 않고 node 환경에서 실행한다.
const domTsTests = [
  "src/app/**/onboarding/onboarding-draft-storage.test.ts",
  "src/components/chat/use-chat-room-stream.test.ts",
  "src/lib/analytics/browser.test.ts",
  "src/lib/chat/download.test.ts",
  "src/lib/payments/paypal-redirect-context.test.ts",
  "src/lib/payments/toss.test.ts",
  "src/lib/policy-locale-navigation.test.ts",
  "src/lib/referral.test.ts",
];

export default defineConfig({
  plugins: [react()],
  test: {
    server: {
      deps: {
        inline: ["next-intl"],
      },
    },
    // jsdom 준비 비용이 파일마다 들기 때문에, 화면이 필요 없는 테스트는 node 환경으로 분리한다.
    projects: [
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["**/*.test.tsx", ...domTsTests],
          exclude,
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: [...exclude, ...domTsTests],
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
