import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const production = readFileSync(".github/workflows/deploy-production.yml", "utf8");
const staging = readFileSync(".github/workflows/deploy-staging.yml", "utf8");
const action = readFileSync(".github/actions/deploy-ec2/action.yml", "utf8");

describe("measurement runtime deployment wiring", () => {
  it.each([
    ["production", production],
    ["staging", staging],
  ])("passes both %s environment variables to the deploy action", (_environment, workflow) => {
    expect(workflow).toContain("ga-enabled: ${{ vars.GA_ENABLED }}");
    expect(workflow).toContain("ga-measurement-id: ${{ vars.GA_MEASUREMENT_ID }}");
    expect(workflow).toContain("meta-pixel-enabled: ${{ vars.META_PIXEL_ENABLED }}");
    expect(workflow).toContain("meta-pixel-id: ${{ vars.META_PIXEL_ID }}");
    expect(workflow).not.toContain("NEXT_PUBLIC_GA_");
    expect(workflow).not.toContain("GA_ORIGIN");
  });

  it("keeps both action inputs optional and maps them through env into runtime JSON", () => {
    expect(action).toContain(
      [
        "  ga-enabled:",
        "    description: Optional GA runtime enable flag",
        "    required: false",
        '    default: ""',
      ].join("\n"),
    );
    expect(action).toContain(
      [
        "  ga-measurement-id:",
        "    description: Optional GA runtime measurement ID",
        "    required: false",
        '    default: ""',
      ].join("\n"),
    );
    expect(action).toContain("GA_ENABLED: ${{ inputs.ga-enabled }}");
    expect(action).toContain("GA_MEASUREMENT_ID: ${{ inputs.ga-measurement-id }}");
    expect(action).toContain("META_PIXEL_ENABLED: ${{ inputs.meta-pixel-enabled }}");
    expect(action).toContain("META_PIXEL_ID: ${{ inputs.meta-pixel-id }}");
    expect(action).toContain('--arg ga_enabled "${GA_ENABLED}"');
    expect(action).toContain('--arg ga_measurement_id "${GA_MEASUREMENT_ID}"');
    expect(action).toContain('--arg meta_pixel_enabled "${META_PIXEL_ENABLED}"');
    expect(action).toContain('--arg meta_pixel_id "${META_PIXEL_ID}"');
    expect(action).toContain("GA_ENABLED: $ga_enabled");
    expect(action).toContain("GA_MEASUREMENT_ID: $ga_measurement_id");
    expect(action).toContain("META_PIXEL_ENABLED: $meta_pixel_enabled");
    expect(action).toContain("META_PIXEL_ID: $meta_pixel_id");
    expect(action).not.toContain('echo "${GA_ENABLED}"');
    expect(action).not.toContain('echo "${GA_MEASUREMENT_ID}"');
    expect(action).not.toContain('echo "${META_PIXEL_ENABLED}"');
    expect(action).not.toContain('echo "${META_PIXEL_ID}"');
  });
});
