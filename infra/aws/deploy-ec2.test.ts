import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const originalRecords = [
  { Name: "hanbuddy.kr.", Type: "A", TTL: 300, ResourceRecords: [{ Value: "216.198.79.1" }] },
  {
    Name: "www.hanbuddy.kr.",
    Type: "CNAME",
    TTL: 300,
    ResourceRecords: [{ Value: "old.vercel-dns.com." }],
  },
];

// Every external command is intercepted: no AWS credentials, network or Docker are used.
const awsMock = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const file = name => path.join(process.env.MOCK_DIRECTORY, name);
const log = JSON.parse(fs.readFileSync(file('calls.json'), 'utf8'));
log.push(args); fs.writeFileSync(file('calls.json'), JSON.stringify(log));
const value = flag => args[args.indexOf(flag) + 1];
const operation = args.slice(0, 2).join(' ');
let result;
switch(operation) {
  case 'ec2 describe-instances': result = value('--query').includes('State.Name') ? 'running' : '15.164.130.186'; break;
  case 'ec2 wait': break;
  case 'ssm describe-instance-information': result = 'Online'; break;
  case 'ssm send-command': {
    const command = JSON.parse(value('--parameters')).commands[0];
    fs.writeFileSync(file('remote.sh'), Buffer.from(command.split("'")[3], 'base64'));
    result = 'test-command'; break;
  }
  case 'ssm get-command-invocation': {
    const status = process.env.MOCK_SCENARIO === 'ssm-failed' ? 'Failed' : 'Success';
    result = args.includes('--query') ? status : { Status: status, StandardOutputContent: '', StandardErrorContent: '' }; break;
  }
  case 'route53 list-resource-record-sets': {
    let records = JSON.parse(fs.readFileSync(file('records.json'), 'utf8'));
    const reads = log.filter(call => call[0] === 'route53' && call[1] === 'list-resource-record-sets').length;
    if (process.env.MOCK_SCENARIO === 'dns-edited' && reads > 1) records[0].TTL = 600;
    result = { ResourceRecordSets: records }; break;
  }
  case 'route53 change-resource-record-sets': {
    const batch = JSON.parse(value('--change-batch'));
    let records = JSON.parse(fs.readFileSync(file('records.json'), 'utf8'));
    for (const change of batch.Changes) {
      const next = change.ResourceRecordSet;
      records = records.filter(record => record.Name !== next.Name || record.Type !== next.Type);
      if (change.Action !== 'DELETE') records.push(next);
    }
    fs.writeFileSync(file('records.json'), JSON.stringify(records));
    result = '/change/test'; break;
  }
  case 'route53 wait': break;
  default: console.error('Unexpected AWS operation', args); process.exit(99);
}
if (result !== undefined) console.log(typeof result === 'string' ? result : JSON.stringify(result));
`;

const curlMock = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$MOCK_DIRECTORY/curl.log"
if [[ "$MOCK_SCENARIO" == "https-failed" ]]; then exit 60; fi
if [[ "$*" == *"https://www.hanbuddy.kr/"* ]]; then
  if [[ "$MOCK_SCENARIO" == "bad-redirect" ]]; then printf '200 '; else printf '308 https://hanbuddy.kr/api/health?cutover=1'; fi
else
  printf '200 '
fi
`;

function deploy(
  scenario = "success",
  redirect = "www.hanbuddy.kr",
  analytics = { GA_ENABLED: "false", GA_MEASUREMENT_ID: "" },
) {
  const directory = mkdtempSync(join(tmpdir(), "hanbuddy-deploy-test-"));
  try {
    writeFileSync(join(directory, "aws"), awsMock, { mode: 0o755 });
    writeFileSync(join(directory, "curl"), curlMock, { mode: 0o755 });
    writeFileSync(join(directory, "sleep"), "#!/usr/bin/env bash\nexit 0\n", { mode: 0o755 });
    writeFileSync(join(directory, "calls.json"), "[]");
    writeFileSync(join(directory, "curl.log"), "");
    writeFileSync(join(directory, "records.json"), JSON.stringify(originalRecords));
    const result = spawnSync("bash", ["infra/aws/deploy-ec2.sh"], {
      encoding: "utf8",
      timeout: 15000,
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        MOCK_DIRECTORY: directory,
        MOCK_SCENARIO: scenario,
        AWS_REGION: "ap-northeast-2",
        EC2_INSTANCE_ID: "i-test",
        ECR_REPOSITORY: "hanbuddy-frontend",
        IMAGE_URI: "example.test/hanbuddy-frontend:production-sha-test",
        FRONTEND_DOMAIN: redirect ? "hanbuddy.kr" : "staging.hanbuddy.kr",
        FRONTEND_REDIRECT_DOMAIN: redirect,
        ROUTE53_HOSTED_ZONE_ID: "ZTEST",
        EC2_RUNTIME_ENVIRONMENT_JSON: JSON.stringify({
          HANBUDDY_API_BASE_URL: "https://api.example.test",
          REVIEW_LOGIN_ENABLED: "false",
          GOOGLE_CLIENT_ID: "test",
          GOOGLE_REDIRECT_URI: "https://hanbuddy.kr/auth/google/callback",
          ...analytics,
        }),
      },
    });
    const remote = readFileSync(join(directory, "remote.sh"), "utf8");
    execFileSync("bash", ["-n", join(directory, "remote.sh")]);
    return {
      ...result,
      remote,
      calls: JSON.parse(readFileSync(join(directory, "calls.json"), "utf8")) as string[][],
      records: JSON.parse(readFileSync(join(directory, "records.json"), "utf8")),
      curl: readFileSync(join(directory, "curl.log"), "utf8"),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("EC2 deployment cutover (mock commands)", () => {
  it("prepares the app and Caddy before atomic DNS cutover, then checks both HTTPS hosts", () => {
    const result = deploy();
    expect(result.status, result.stderr).toBe(0);
    const commands = result.calls.map((call) => call.slice(0, 2).join(" "));
    expect(commands.indexOf("route53 change-resource-record-sets")).toBeGreaterThan(
      commands.lastIndexOf("ssm get-command-invocation"),
    );
    expect(
      commands.filter((command) => command === "route53 change-resource-record-sets"),
    ).toHaveLength(1);
    expect(result.remote).toContain("redir https://${frontend_domain}{uri} 308");
    expect(result.remote.indexOf('if [[ "${healthy}" != "true" ]]')).toBeLessThan(
      result.remote.indexOf("caddy validate"),
    );
    expect(result.curl).toContain("--resolve hanbuddy.kr:443:15.164.130.186");
    expect(result.curl).toContain("--resolve www.hanbuddy.kr:443:15.164.130.186");
    expect(result.curl).not.toContain("--insecure");
  });
  it("does not change DNS when remote preparation fails", () => {
    const result = deploy("ssm-failed");
    expect(result.status).toBe(1);
    expect(result.records).toEqual(originalRecords);
    expect(result.calls.some((call) => call[1] === "change-resource-record-sets")).toBe(false);
  });
  it.each(["https-failed", "bad-redirect"])("restores original DNS after %s", (scenario) => {
    const result = deploy(scenario);
    expect(result.status).toBe(1);
    expect(result.records).toEqual(originalRecords);
    expect(result.calls.filter((call) => call[1] === "change-resource-record-sets")).toHaveLength(
      2,
    );
  });
  it("does not overwrite DNS edited during app preparation", () => {
    const result = deploy("dns-edited");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("DNS changed while the app was being prepared");
    expect(result.calls.some((call) => call[1] === "change-resource-record-sets")).toBe(false);
  });
  it("leaves production apex and www unchanged in staging", () => {
    const result = deploy("success", "");
    expect(result.status, result.stderr).toBe(0);
    expect(result.records).toEqual(expect.arrayContaining(originalRecords));
    expect(result.curl).not.toContain("www.hanbuddy.kr");
    expect(result.remote).toContain("ga_enabled=\"$(printf '%s' 'ZmFsc2U=' | base64 --decode)\"");
    expect(result.remote).toContain("ga_measurement_id=\"$(printf '%s' '' | base64 --decode)\"");
    expect(result.remote).toContain('-e "GA_ENABLED=${ga_enabled}"');
    expect(result.remote).toContain('-e "GA_MEASUREMENT_ID=${ga_measurement_id}"');
  });

  it("encodes GA values without exposing shell syntax or changing docker argument boundaries", () => {
    const gaEnabled = "false\n$(touch /tmp/ga-enabled-injection)";
    const measurementId = "G-TEST'\" $(touch /tmp/ga-id-injection)";
    const result = deploy("success", "", {
      GA_ENABLED: gaEnabled,
      GA_MEASUREMENT_ID: measurementId,
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.remote).not.toContain(gaEnabled);
    expect(result.remote).not.toContain(measurementId);
    expect(result.remote).toContain(
      `ga_enabled="$(printf '%s' '${Buffer.from(gaEnabled).toString("base64")}' | base64 --decode)"`,
    );
    expect(result.remote).toContain(
      `ga_measurement_id="$(printf '%s' '${Buffer.from(measurementId).toString("base64")}' | base64 --decode)"`,
    );
    expect(result.remote).toContain('-e "GA_ENABLED=${ga_enabled}"');
    expect(result.remote).toContain('-e "GA_MEASUREMENT_ID=${ga_measurement_id}"');
  });
});
