// HTTP/HTML only. jsdom parses inert HTML; no browser, scripts or subresources run.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const origin = process.env.SEO_APP_ORIGIN || "http://127.0.0.1:3235";
const fixture = process.env.SEO_FIXTURE_ORIGIN || "http://127.0.0.1:4235";
for (const value of [origin, fixture])
  assert.equal(new URL(value).hostname, "127.0.0.1", "Only loopback fixtures are allowed");
const matrix = [];
const evidence = process.env.SEO_EVIDENCE_DIR;
if (evidence) await mkdir(evidence, { recursive: true });
const uas = ["curl/8.0", "Mozilla/5.0", "Googlebot", "Twitterbot", "facebookexternalhit"];
const titles = {
  en: "Fixture Seoul walk 1",
  ko: "서울 산책 테스트 1",
  ja: "ソウル散歩テスト 1",
  "zh-Hans": "首尔漫步测试 1",
  "zh-Hant": "首爾漫步測試 1",
};
const descriptions = {
  en: "Explore quiet Seoul streets with a local fixture buddy.",
  ko: "테스트 버디와 서울의 조용한 골목을 둘러봅니다.",
};
const control = async (mode, clearRequests = false) => {
  const response = await fetch(`${fixture}/__control`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode, clearRequests }),
  });
  assert.equal(response.status, 200);
};
async function request(path, status, headers = {}) {
  const response = await fetch(`${origin}${path}`, {
    redirect: "manual",
    headers,
    signal: AbortSignal.timeout(60000),
  });
  const html = await response.text();
  assert.equal(response.status, status, `${path} (${headers["user-agent"] || "default"})`);
  matrix.push({
    path,
    status: response.status,
    ua: headers["user-agent"] || "default",
    session: Boolean(headers.cookie),
  });
  if (
    evidence &&
    !headers.cookie &&
    (!headers["user-agent"] || headers["user-agent"] === "Mozilla/5.0")
  ) {
    const pathname = new URL(path, origin).pathname;
    if (
      [
        "/en/activities/1",
        "/ko/activities/1",
        "/en/explore",
        "/en/activities/999999",
        "/en/activities/500",
        "/robots.txt",
        "/sitemap.xml",
        "/en/login",
        "/en/activities/1/book",
      ].includes(pathname)
    ) {
      const name = `${String(matrix.length).padStart(3, "0")}-${pathname.replaceAll("/", "_")}`;
      await writeFile(join(evidence, `${name}.html`), html);
      await writeFile(
        join(evidence, `${name}.json`),
        JSON.stringify(
          { path, status: response.status, headers: Object.fromEntries(response.headers) },
          null,
          2,
        ),
      );
    }
  }
  return { response, html };
}
function document(html) {
  const doc = new JSDOM(html).window.document;
  // Text in Flight scripts cannot satisfy initial document-body assertions.
  doc.querySelectorAll("script,style,template").forEach((node) => node.remove());
  return doc;
}
function metadata(doc, path, title, description) {
  assert.equal(doc.querySelectorAll('link[rel="canonical"]').length, 1);
  const canonical = `https://hanbuddy.kr${path}`;
  assert.equal(doc.querySelector('link[rel="canonical"]').href, canonical);
  assert.equal(doc.title, `${title} | HanBuddy`);
  for (const [selector, value] of [
    ['meta[name="description"]', description],
    ['meta[property="og:title"]', `${title} | HanBuddy`],
    ['meta[property="og:description"]', description],
    ['meta[property="og:url"]', canonical],
    ['meta[name="twitter:title"]', `${title} | HanBuddy`],
    ['meta[name="twitter:description"]', description],
  ])
    if (value !== undefined)
      assert.equal(doc.head.querySelector(selector)?.content, value, selector);
  assert.ok(!doc.querySelector('meta[name="robots"]')?.content.includes("noindex"));
}
try {
  await control("normal", true);
  for (const [locale, title] of Object.entries(titles)) {
    const { html, response } = await request(
      `/${locale}/activities/1?utm_source=fixture&unused=duplicate`,
      200,
    );
    const doc = document(html);
    assert.equal(doc.documentElement.lang, locale);
    assert.ok(doc.querySelector("main article")?.textContent.includes(title));
    if (descriptions[locale])
      assert.ok(doc.querySelector("main article")?.textContent.includes(descriptions[locale]));
    metadata(doc, `/${locale}/activities/1`, title, descriptions[locale]);
    assert.match(response.headers.get("link") || "", /hreflang="x-default"/);
    assert.ok(!html.includes("PRIVATE_FIXTURE_SENTINEL"));
    assert.ok(!html.includes("hanbuddy_access_token"));
  }
  for (const locale of ["en", "ko"]) {
    const home = await request(`/${locale}`, 200);
    assert.equal(
      document(home.html).querySelector('link[rel="canonical"]').href,
      `https://hanbuddy.kr/${locale}`,
    );
    const { html } = await request(`/${locale}/explore?utm_source=fixture`, 200);
    const doc = document(html);
    assert.ok(doc.body.textContent.includes(titles[locale]));
    assert.ok(doc.querySelector(`a[href="/${locale}/activities/1"]`));
    metadata(
      doc,
      `/${locale}/explore`,
      locale === "en" ? "Explore experiences" : "액티비티 탐색",
      locale === "en"
        ? "Discover Korea with a local buddy by your side."
        : "현지 버디와 함께할 한국의 특별한 경험을 찾아보세요.",
    );
  }
  for (const ua of uas) {
    for (const [id, status] of [
      [1, 200],
      [2, 200],
      [999999, 404],
      [4, 404],
      [500, 500],
      [501, 500],
      [502, 500],
    ]) {
      const { html } = await request(`/en/activities/${id}`, status, { "user-agent": ua });
      const doc = document(html);
      if (status === 404)
        assert.match(doc.querySelector('meta[name="robots"]')?.content || "", /noindex/);
      if (status === 500) {
        assert.match(doc.querySelector('meta[name="robots"]')?.content || "", /noindex/);
        assert.ok(!doc.querySelector('link[rel="canonical"]'));
      }
      if (id === 2) assert.ok(doc.body.textContent.includes("Fixture Seoul walk 2"));
    }
  }
  await request("/en/activities/503", 500);
  for (const path of ["/en/activities/not-an-id", "/en/activities/0"]) await request(path, 404);
  const anonymous = await request("/en/explore", 200);
  const cookie = "hanbuddy_access_token=SYNTHETIC_SESSION_SENTINEL; hanbuddy_user_type=TOURIST";
  for (const path of ["/en/explore", "/en/activities/1"]) {
    for (const session of [cookie, "", cookie, ""]) {
      const { html, response } = await request(path, 200, { cookie: session });
      assert.match(response.headers.get("cache-control") || "", /private|no-store/);
      assert.ok(!html.includes("SYNTHETIC_SESSION_SENTINEL"));
      assert.ok(!html.includes("PRIVATE_FIXTURE_SENTINEL"));
      const doc = document(html);
      assert.ok(doc.body.textContent.includes(titles.en));
      assert.equal(Boolean(doc.querySelector('header a[href="/en/login"]')), !session);
      assert.equal(
        Boolean(doc.querySelector('header a[href="/en/applications"]')),
        Boolean(session),
      );
    }
  }
  assert.ok(document(anonymous.html).querySelector('a[href="/en/activities/1"]'));
  for (const path of ["/en/login", "/ko/login", "/admin/login"]) {
    const { response } = await request(path, 200);
    assert.match(response.headers.get("x-robots-tag") || "", /noindex/);
  }
  for (const path of [
    "/en/activities/1/book?scheduleId=101",
    "/en/my-page",
    "/en/applications",
    "/en/chat",
    "/ko/dashboard",
    "/ko/my-activities/create",
    "/en/onboarding",
    "/ko/buddy/onboarding",
    "/ko/buddy/resubmission",
    "/admin/users",
  ]) {
    const { response } = await request(path, 307);
    assert.match(response.headers.get("x-robots-tag") || "", /noindex/);
    if (path.includes("/book?"))
      assert.ok(
        new URL(response.headers.get("location"), origin).searchParams
          .get("next")
          .includes("scheduleId=101"),
      );
  }
  const privateRedirect = await request("/en/my-page", 307, { cookie });
  assert.match(privateRedirect.response.headers.get("x-robots-tag") || "", /noindex/);
  assert.match(privateRedirect.response.headers.get("location"), /\/en\/my-page\/profile$/);
  const privatePage = await request("/en/my-page/profile", 200, { cookie });
  assert.match(privatePage.response.headers.get("x-robots-tag") || "", /noindex/);
  const localeRedirect = await request("/en/explore?utm_source=fixture", 307, {
    cookie: "NEXT_LOCALE=ko",
  });
  assert.match(
    localeRedirect.response.headers.get("location"),
    /\/ko\/explore\?utm_source=fixture$/,
  );
  assert.match(localeRedirect.response.headers.get("x-robots-tag") || "", /noindex/);
  const robots = await request("/robots.txt", 200);
  assert.match(robots.html, /User-Agent: \*/i);
  assert.match(robots.html, /Allow: \//i);
  assert.ok(!/Disallow|GPTBot|Google-Extended|OAI-SearchBot/i.test(robots.html));
  assert.match(robots.html, /Sitemap: https:\/\/hanbuddy.kr\/sitemap.xml/);
  const sitemap = await request("/sitemap.xml", 200);
  const urls = [...sitemap.html.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.equal(urls.length, 21);
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) {
    const path = new URL(url).pathname;
    assert.ok(!/login|book|payments|admin|my-page|\?/.test(url));
    const page = await request(path, 200);
    assert.ok(!page.response.headers.get("x-robots-tag"));
    const doc = document(page.html);
    assert.equal(doc.querySelector('link[rel="canonical"]').href, url);
    assert.ok(!doc.querySelector('meta[name="robots"]')?.content.includes("noindex"));
  }
  assert.ok(!urls.some((url) => /\/activities\/[34]$/.test(url)));
  for (const mode of ["list-outage", "list-malformed", "detail-outage", "detail-redirect"]) {
    await control(mode);
    await request("/sitemap.xml", 500);
    const path = mode.startsWith("list-") ? "/en/explore" : "/en/activities/1";
    const broken = await request(path, 500);
    assert.match(
      document(broken.html).querySelector('meta[name="robots"]')?.content || "",
      /noindex/,
    );
    await control("normal");
    await request(path, 200);
    await request("/sitemap.xml", 200);
  }
  const requests = await (await fetch(`${fixture}/__requests`)).json();
  const publicReads = requests.filter(({ path }) => /^\/activities(?:\/\d+)?$/.test(path));
  assert.ok(publicReads.length > 0);
  assert.ok(
    publicReads.every(({ hasCookie, hasAuthorization }) => !hasCookie && !hasAuthorization),
  );
  assert.ok(publicReads.some(({ language, currency }) => language === "EN" && currency === "USD"));
  assert.ok(
    publicReads.every(({ language }) =>
      ["EN", "KO", "JA", "ZH_HANS", "ZH_HANT"].includes(language),
    ),
  );
  console.log(
    JSON.stringify(
      { result: "PASS", count: matrix.length, publicReads: publicReads.length, matrix },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(JSON.stringify({ result: "FAIL", completed: matrix.length, matrix }, null, 2));
  throw error;
} finally {
  await control("normal");
}
