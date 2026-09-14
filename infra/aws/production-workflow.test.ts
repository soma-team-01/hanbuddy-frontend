import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ci = readFileSync(".github/workflows/ci.yml", "utf8");
const production = readFileSync(".github/workflows/deploy-production.yml", "utf8");
const caller = ci.split("\n  deploy-production:\n")[1]?.split(/\n {2}\S/)[0];

describe("production reusable workflow contract", () => {
  it("inherits secrets when CI calls the production workflow", () => {
    expect(caller).toContain("    uses: ./.github/workflows/deploy-production.yml\n");
    expect(caller).toContain("    secrets: inherit\n");
  });

  it("limits the caller to main pushes after successful CI", () => {
    expect(caller).toContain(
      "    if: github.event_name == 'push' && github.ref == 'refs/heads/main'\n",
    );
    expect(caller).toContain("    needs: build\n");
    expect(caller).toContain("      contents: read\n      id-token: write\n");
  });

  it("keeps environment-scoped secrets and production deployment guards in the callee", () => {
    expect(production).toContain("  workflow_call:\n  workflow_dispatch:\n");
    expect(production).toContain("    environment: production\n");
    expect(production).toContain("vars.PRODUCTION_DEPLOYMENT_ENABLED == 'true'");
    expect(production).toContain("github.repository == 'soma-team-01/hanbuddy-frontend'");
    expect(production).toContain("github.ref == 'refs/heads/main'");
    expect(production).toContain(
      "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: ${{ secrets.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY }}",
    );
  });
});
