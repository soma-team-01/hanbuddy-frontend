// Local synthetic API for raw HTTP verification and Hermes browser QA. No real data.
import { createServer } from "node:http";

const port = Number(process.env.SEO_FIXTURE_PORT || 4235);
let mode = "normal";
let requests = [];
const copy = {
  EN: ["Fixture Seoul walk", "Explore quiet Seoul streets with a local fixture buddy."],
  KO: ["서울 산책 테스트", "테스트 버디와 서울의 조용한 골목을 둘러봅니다."],
  JA: ["ソウル散歩テスト", "テストバディとソウルの静かな街を歩きます。"],
  ZH_HANS: ["首尔漫步测试", "与测试伙伴一起探索首尔安静的街道。"],
  ZH_HANT: ["首爾漫步測試", "與測試夥伴一起探索首爾安靜的街道。"],
};

function activity(id, language = "EN") {
  const [title, description] = copy[language] || copy.EN;
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(Date.now() + 7 * 86400000),
  );
  return {
    activityId: id,
    buddyId: 7,
    title: `${title} ${id}`,
    description,
    contentLanguage: language,
    totalDurationMinutes: 90,
    thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
    buddyName: "Fixture Buddy",
    buddyProfileImageUrl: null,
    meetingPointName: "Fixture Station",
    meetingPlaceId: "",
    price: 45000,
    currency: "KRW",
    discountPercent: null,
    discountEndDate: null,
    discountedPrice: null,
    averageRating: null,
    reviewCount: 0,
    isSoldOut: id === 2,
    hostIntroduction: "Synthetic public host introduction.",
    includedItems: ["Fixture local guide"],
    restrictionNotes: ["Fixture walking shoes"],
    images: [
      { imageUrl: "/images/activities/hanok-hero.jpg", imageOrder: 0 },
      { imageUrl: "/images/activities/gwangjang-market.jpg", imageOrder: 1 },
    ],
    schedules: [
      {
        activityScheduleId: 101,
        startAt: id === 2 ? "2020-01-01T10:00:00+09:00" : `${date}T10:00:00+09:00`,
        remainingCapacity: id === 2 ? 0 : 4,
        status: id === 2 ? "CLOSED" : "OPEN",
      },
    ],
    itineraries: [],
    // Deliberately outside the public DTO: must not enter document HTML/RSC.
    internalNote: "PRIVATE_FIXTURE_SENTINEL",
  };
}
const success = (result) => ({ isSuccess: true, code: "SUCCESS", message: "OK", result });
const failure = (code) => ({ isSuccess: false, code, message: "Synthetic fixture error" });

async function handleControl(req, send) {
  let body = "";
  for await (const chunk of req) body += chunk;
  const input = JSON.parse(body || "{}");
  const nextMode = input.mode || "normal";
  if (
    !["normal", "list-outage", "detail-outage", "list-malformed", "detail-redirect"].includes(
      nextMode,
    )
  ) {
    return send(400, failure("INVALID_MODE"));
  }
  mode = nextMode;
  if (input.clearRequests) requests = [];
  return send(200, { mode });
}

function handleList(url, send) {
  if (mode === "list-outage") return send(503, failure("UPSTREAM_UNAVAILABLE"));
  if (mode === "list-malformed") return send(200, success({ content: [] }));
  return send(
    200,
    success([1, 2, 3, 4, 5, 6].map((id) => activity(id, url.searchParams.get("language")))),
  );
}

async function handleDetail(id, language, res, send) {
  if (id === 500 || (id === 1 && mode === "detail-outage"))
    return send(503, failure("UPSTREAM_UNAVAILABLE"));
  if (id === 501) return send(200, success({ activityId: 501 }));
  if (id === 502 || (id === 1 && mode === "detail-redirect")) {
    res.writeHead(302, { location: "/activities/2" });
    return res.end();
  }
  if (id === 503) {
    await new Promise((resolve) => setTimeout(resolve, 11000));
    return send(503, failure("TIMEOUT"));
  }
  if (id === 4) return send(410, failure("ACTIVITY404"));
  if (id === 5) return send(410, null);
  if (id === 6) return send(410, []);
  if (![1, 2].includes(id)) return send(404, failure("ACTIVITY404"));
  return send(200, success(activity(id, language)));
}

function handleAuxiliary(url, send) {
  if (url.pathname.endsWith("/weather"))
    return send(
      200,
      success({
        available: false,
        unavailableReason: "WEATHER_SERVICE_DISABLED",
        provider: "KMA",
        timeZone: "Asia/Seoul",
        issuedAt: null,
        baseDate: "2030-01-01",
        forecasts: [],
      }),
    );
  if (url.pathname.endsWith("/reviews"))
    return send(
      200,
      success({
        averageRating: null,
        totalCount: 0,
        ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        reviews: [],
        page: 0,
        size: 6,
        hasNext: false,
      }),
    );
  if (url.pathname === "/buddies/7")
    return send(
      200,
      success({
        buddyId: 7,
        buddyName: "Fixture Buddy",
        buddyProfileImageUrl: null,
        averageRating: null,
        reviewCount: 0,
        activeActivityCount: 2,
      }),
    );
  if (url.pathname === "/users/me") return send(401, failure("AUTH401"));
  return send(404, failure("FIXTURE_ROUTE404"));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  const send = (status, body) => {
    res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(body));
  };
  if (url.pathname === "/__control" && req.method === "POST") return handleControl(req, send);
  if (url.pathname === "/__requests") return send(200, requests);
  if (url.pathname === "/health") return send(200, { mode });
  requests.push({
    path: url.pathname,
    language: url.searchParams.get("language"),
    currency: url.searchParams.get("displayCurrency"),
    hasCookie: Boolean(req.headers.cookie),
    hasAuthorization: Boolean(req.headers.authorization),
  });
  if (url.pathname === "/activities") return handleList(url, send);
  const detail = /^\/activities\/(\d+)$/.exec(url.pathname);
  if (detail) return handleDetail(Number(detail[1]), url.searchParams.get("language"), res, send);
  return handleAuxiliary(url, send);
});
server.listen(port, "127.0.0.1", () => console.log(`SEO fixture ready http://127.0.0.1:${port}`));
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
