/// <reference types="node" />

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
} from "@playwright/test/reporter";
import * as fs from "fs";
import * as path from "path";

/**
 * - onBegin: KHÔNG xóa allure-results/ — kết quả thô của mọi lần chạy được giữ lại
 *   và cộng dồn vĩnh viễn (không còn logic reset theo ngày, cũng không xóa mỗi lần chạy).
 *   Lịch sử/xu hướng (History/Trend) cũng được copy ngược từ allure-report/history vào
 *   allure-results/history trước khi generate report mới, để trend luôn đầy đủ
 *   (xem scripts/allure-watch.js, scripts/allure-serve.bat, scripts/allure-test.bat).
 * - onEnd: ghi .trigger để allure-watch.js generate report.
 *
 * resultsDir is passed explicitly via reporter options (2nd array element in
 * playwright.base.config.ts) as an absolute path, so this single shared
 * reporter always writes to the correct project's reports/allure-results/
 * regardless of process.cwd() (CLI, npm workspace scripts, VS Code Test
 * Explorer/UI mode all resolve cwd differently).
 */
class AllureTriggerReporter implements Reporter {
  private resultsDir: string;

  constructor(options: { resultsDir?: string } = {}) {
    this.resultsDir =
      options.resultsDir ??
      path.join(process.cwd(), "reports", "allure-results");
  }

  onBegin(_config: FullConfig, _suite: Suite) {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  onEnd(_result: FullResult) {
    fs.writeFileSync(
      path.join(this.resultsDir, ".trigger"),
      Date.now().toString(),
    );
  }
}

export default AllureTriggerReporter;
