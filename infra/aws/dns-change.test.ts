import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const apex = {
  Name: "hanbuddy.kr.",
  Type: "A",
  TTL: 300,
  ResourceRecords: [{ Value: "216.198.79.1" }],
};
const www = {
  Name: "www.hanbuddy.kr.",
  Type: "CNAME",
  TTL: 300,
  ResourceRecords: [{ Value: "old.vercel-dns.com." }],
};

function plan(records: object[], domain = "hanbuddy.kr", redirect = "www.hanbuddy.kr") {
  return JSON.parse(
    execFileSync(
      "jq",
      [
        "-e",
        "--arg",
        "domain",
        domain,
        "--arg",
        "redirect",
        redirect,
        "--arg",
        "ip",
        "15.164.130.186",
        "-f",
        "infra/aws/dns-change.jq",
      ],
      { input: JSON.stringify({ ResourceRecordSets: records }), encoding: "utf8" },
    ),
  );
}

describe("frontend DNS cutover plan", () => {
  it("changes apex and www atomically and restores original values and TTLs", () => {
    const unrelated = {
      Name: "hanbuddy.kr.",
      Type: "MX",
      TTL: 300,
      ResourceRecords: [{ Value: "10 mx.zoho.com." }],
    };
    const result = plan([apex, www, unrelated]);
    expect(result.apply.Changes).toEqual([
      {
        Action: "UPSERT",
        ResourceRecordSet: { ...apex, TTL: 60, ResourceRecords: [{ Value: "15.164.130.186" }] },
      },
      {
        Action: "UPSERT",
        ResourceRecordSet: { ...www, TTL: 60, ResourceRecords: [{ Value: "hanbuddy.kr." }] },
      },
    ]);
    expect(result.rollback.Changes).toEqual([
      { Action: "UPSERT", ResourceRecordSet: apex },
      { Action: "UPSERT", ResourceRecordSet: www },
    ]);
  });

  it("deletes newly created records on rollback", () => {
    const result = plan([]);
    expect(result.rollback.Changes).toEqual(
      result.apply.Changes.map((change: object) => ({ ...change, Action: "DELETE" })),
    );
  });

  it("keeps staging single-domain and unrelated production records intact", () => {
    const result = plan([apex, www], "staging.hanbuddy.kr", "");
    expect(result.apply.Changes).toHaveLength(1);
    expect(result.apply.Changes[0].ResourceRecordSet.Name).toBe("staging.hanbuddy.kr.");
  });

  it.each([
    [{ ...apex, Type: "AAAA" }],
    [{ ...apex, SetIdentifier: "weighted", Weight: 10 }],
    [{ ...www, Type: "A" }],
    [{ ...www, Type: "TXT" }],
  ])("rejects conflicting or non-simple records without destructive migration", (record) => {
    expect(() => plan([record])).toThrow();
  });
});
