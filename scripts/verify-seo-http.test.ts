import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { expect, it } from "vitest";

it("preserves the original CLI verification failure when fixture cleanup also fails", async () => {
  let controls = 0;
  const server = createServer((req, res) => {
    if (req.url === "/__control") {
      controls += 1;
      res.writeHead(controls === 1 ? 200 : 503);
      res.end("{}");
      return;
    }
    res.writeHead(404);
    res.end("Synthetic original verification failure");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture address");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    const child = spawn(process.execPath, ["scripts/verify-seo-http.mjs"], {
      env: { NODE_ENV: "test", SEO_APP_ORIGIN: origin, SEO_FIXTURE_ORIGIN: origin },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.stdout.resume();
    const [code] = await once(child, "close");
    expect(code).toBe(1);
    expect(controls).toBe(2);
    expect(stderr).toContain("/en/activities/1?utm_source=fixture&unused=duplicate");
    expect(stderr).toContain("Fixture cleanup failed");
    expect(stderr).toContain("503");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
