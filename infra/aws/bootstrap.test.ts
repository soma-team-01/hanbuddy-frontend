import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const template = readFileSync("infra/aws/bootstrap.yml", "utf8");

describe("frontend bootstrap deployment contract", () => {
  it("protects immutable image tags with only the two deployment aliases excluded", () => {
    expect(template).toContain("ImageTagMutability: IMMUTABLE_WITH_EXCLUSION");
    const exceptions = [
      ...template.matchAll(/ImageTagMutabilityExclusionFilterValue: "([^"]+)"/g),
    ].map((match) => match[1]);
    expect(exceptions).toEqual(["production-latest", "staging-latest"]);
  });

  it("scopes image inspection and pull permissions to the frontend ECR repository", () => {
    const policy = template.split("- Sid: PushAndManageFrontendRepository")[1].split("- Sid:")[0];
    expect(policy).toContain("ecr:DescribeImages");
    expect(policy).toContain("ecr:BatchGetImage");
    expect(policy).toContain("Resource: !GetAtt FrontendRepository.Arn");
  });

  it("includes www DNS cutover and change status permission", () => {
    expect(template).toContain("Default: hanbuddy.kr,www.hanbuddy.kr,staging.hanbuddy.kr");
    const policy = template.split("- Sid: ManageFrontendDnsRecords")[1].split("- Sid:")[0];
    expect(policy).toContain(
      "route53:ChangeResourceRecordSetsNormalizedRecordNames: !Ref FrontendRecordNames",
    );
    expect(policy).toContain("- CNAME");
    expect(template).toContain("Action: route53:GetChange");
  });

  it("wires production www without adding redirects to staging", () => {
    expect(readFileSync(".github/workflows/deploy-production.yml", "utf8")).toContain(
      "FRONTEND_REDIRECT_DOMAIN: www.hanbuddy.kr",
    );
    expect(readFileSync(".github/workflows/deploy-staging.yml", "utf8")).not.toContain(
      "FRONTEND_REDIRECT_DOMAIN",
    );
    expect(readFileSync(".github/actions/deploy-ec2/action.yml", "utf8")).toContain(
      "bash infra/aws/image-exists.sh",
    );
  });
});
