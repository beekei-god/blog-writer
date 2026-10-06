import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll } from "vitest";

// 서버 모듈은 불러올 때 데이터 폴더를 정하므로, 어떤 모듈보다 먼저 지정한다.
// 테스트 파일마다 빈 임시 폴더를 쓰고 끝나면 지운다 (실제 data/는 건드리지 않는다).
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-writer-test-"));
process.env.BLOG_WRITER_DATA_DIR = dir;
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
