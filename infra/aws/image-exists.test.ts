import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function check(error?: string) {
  const directory = mkdtempSync(join(tmpdir(), "hanbuddy-ecr-test-"));
  try {
    writeFileSync(
      join(directory, "aws"),
      '#!/usr/bin/env bash\nif [[ -n "${MOCK_ERROR:-}" ]]; then echo "$MOCK_ERROR" >&2; exit 254; fi\necho "{}"\n',
      { mode: 0o755 },
    );
    return spawnSync("bash", ["infra/aws/image-exists.sh"], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        ECR_REPOSITORY: "hanbuddy-frontend",
        IMAGE_TAG: "production-sha-test",
        MOCK_ERROR: error ?? "",
      },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("ECR immutable image lookup", () => {
  it("reuses an existing image", () => expect(check().status).toBe(0));
  it("builds only for ImageNotFoundException", () =>
    expect(
      check("An error occurred (ImageNotFoundException) when calling the DescribeImages operation")
        .status,
    ).toBe(1));
  it.each(["AccessDeniedException", "RepositoryNotFoundException", "Connection timed out"])(
    "fails closed for %s",
    (error) => {
      const result = check(error);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain(error);
    },
  );
  it("passes shell syntax validation", () =>
    expect(() => execFileSync("bash", ["-n", "infra/aws/image-exists.sh"])).not.toThrow());
});
