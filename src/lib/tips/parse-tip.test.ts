import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseTip, TipParseError } from "./parse-tip";
import { compareTips, formatTipDate, type TipMeta } from "./tip";

const FIXTURE = readFileSync(
  path.join(process.cwd(), "src/lib/tips/fixtures/kbo-ticket-booking-fixture.en.md"),
  "utf8",
);

function article(frontmatter: string, body = "## Heading\n\nText.") {
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

const VALID = [
  'title: "Buying KBO Tickets"',
  'description: "How to book."',
  'publishedAt: "2026-11-04"',
].join("\n");

describe("parseTip", () => {
  it("reads every contract field and keeps the Markdown body", () => {
    const tip = parseTip("kbo-ticket-booking-fixture", FIXTURE);

    expect(tip).toMatchObject({
      slug: "kbo-ticket-booking-fixture",
      title: "Buying KBO Tickets: A Short Walkthrough",
      description:
        "How foreign visitors can book a KBO baseball ticket online and what to bring on game day.",
      publishedAt: "2026-11-04",
      updatedAt: "2026-11-06",
      relatedActivityIds: [2, 6],
    });
    expect(tip.body.startsWith("## Before you book")).toBe(true);
    expect(tip.body).toMatch(/\| Seat area\s+\| Good for\s+\|/);
  });

  it("defaults updatedAt to publishedAt and the related activities to none, and reads CRLF files", () => {
    const tip = parseTip("minimal", article(VALID).replace(/\n/g, "\r\n"));

    expect(tip.updatedAt).toBe("2026-11-04");
    expect(tip.relatedActivityIds).toEqual([]);
    expect(tip.body).toBe("## Heading\r\n\r\nText.");
  });

  it("accepts single-quoted, escaped and plain strings and an empty id list", () => {
    const tip = parseTip(
      "quoting",
      article(
        [
          "title: 'It''s a \"quoted\" title'",
          'description: "Line with \\"escapes\\" and a colon: ok"',
          "publishedAt: 2026-11-04",
          "relatedActivityIds: []",
        ].join("\n"),
      ),
    );

    expect(tip.title).toBe('It\'s a "quoted" title');
    expect(tip.description).toBe('Line with "escapes" and a colon: ok');
    expect(tip.relatedActivityIds).toEqual([]);
  });

  it.each([
    ["no frontmatter", "slug", "## Only a body\n", /missing frontmatter/],
    ["missing title", "slug", article('description: "d"\npublishedAt: "2026-11-04"'), /title/],
    [
      "missing description",
      "slug",
      article('title: "t"\npublishedAt: "2026-11-04"'),
      /missing required field: description/,
    ],
    ["missing publishedAt", "slug", article('title: "t"\ndescription: "d"'), /publishedAt/],
    [
      "empty title",
      "slug",
      article('title: ""\ndescription: "d"\npublishedAt: "2026-11-04"'),
      /empty/,
    ],
    ["unknown key", "slug", article(`${VALID}\ntags: [a]`), /unknown frontmatter key: tags/],
    ["duplicate key", "slug", article(`${VALID}\ntitle: "again"`), /duplicate/],
    [
      "impossible date",
      "slug",
      article('title: "t"\ndescription: "d"\npublishedAt: "2026-02-30"'),
      /real date/,
    ],
    [
      "date in another format",
      "slug",
      article('title: "t"\ndescription: "d"\npublishedAt: "11/04/2026"'),
      /YYYY-MM-DD/,
    ],
    [
      "updatedAt before publishedAt",
      "slug",
      article(`${VALID}\nupdatedAt: "2026-11-03"`),
      /earlier/,
    ],
    ["non-list activity ids", "slug", article(`${VALID}\nrelatedActivityIds: 2`), /list/],
    ["bad activity id", "slug", article(`${VALID}\nrelatedActivityIds: [2, x]`), /invalid id/],
    ["duplicate activity id", "slug", article(`${VALID}\nrelatedActivityIds: [2, 2]`), /duplicate/],
    [
      "unquoted colon in title",
      "slug",
      article('title: How to: buy\ndescription: "d"\npublishedAt: "2026-11-04"'),
      /double quotes/,
    ],
    [
      "unclosed quote",
      "slug",
      article('title: "oops\ndescription: "d"\npublishedAt: "2026-11-04"'),
      /quote/,
    ],
    ["empty body", "slug", article(VALID, ""), /body is empty/],
    ["slug with uppercase", "Bad_Slug", article(VALID), /kebab-case/],
  ])("fails loudly: %s", (_, slug, source, message) => {
    const attempt = () => parseTip(slug, source);

    expect(attempt).toThrow(TipParseError);
    expect(attempt).toThrow(message);
  });
});

describe("compareTips", () => {
  const tip = (slug: string, publishedAt: string, updatedAt = publishedAt): TipMeta => ({
    slug,
    title: slug,
    description: slug,
    publishedAt,
    updatedAt,
    relatedActivityIds: [],
  });

  it("sorts newest published first, then most recently updated, then by slug", () => {
    const sorted = [
      tip("b-old", "2026-10-01"),
      tip("c-same-day-updated", "2026-11-04", "2026-11-09"),
      tip("a-same-day", "2026-11-04"),
      tip("a-newest", "2026-11-20"),
    ].sort(compareTips);

    expect(sorted.map(({ slug }) => slug)).toEqual([
      "a-newest",
      "c-same-day-updated",
      "a-same-day",
      "b-old",
    ]);
  });
});

describe("formatTipDate", () => {
  it("formats a calendar date the same way in every time zone", () => {
    expect(formatTipDate("2026-11-04")).toBe("November 4, 2026");
    expect(formatTipDate("2026-01-01")).toBe("January 1, 2026");
  });
});
