import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // 테스트 파일마다 빈 임시 데이터 폴더를 쓴다 (실제 data/는 건드리지 않는다).
    setupFiles: ["tests/setup.ts"],
  },
});
