import { isTipSlug, type Tip } from "./tip";

// content/tips/<slug>.en.md 의 머리말(frontmatter)을 읽는다. 자동화 파이프라인과 맺은 계약은 아래 필드가 전부다.
// 의존성을 늘리지 않으려고 이 필드만 엄격하게 읽고, 모르는 키·잘못된 값은 조용히 넘기지 않고 오류로 낸다.
//
//   title: 문자열(필수)            description: 문자열(필수)
//   publishedAt: YYYY-MM-DD(필수)  updatedAt: YYYY-MM-DD(선택, publishedAt 이후)
//   relatedActivityIds: [2, 6](선택, 양의 정수)

export class TipParseError extends Error {
  constructor(slug: string, reason: string) {
    super(`content/tips/${slug}.en.md: ${reason}`);
    this.name = "TipParseError";
  }
}

const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;
const KEY_VALUE = /^([A-Za-z][A-Za-z0-9]*):[ \t]*(.*?)[ \t]*$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ALLOWED_KEYS = [
  "title",
  "description",
  "publishedAt",
  "updatedAt",
  "relatedActivityIds",
] as const;
// YAML에서 값 맨 앞에 오면 특별한 뜻이 되는 문자. 따옴표 없이 쓰면 의도와 다르게 읽히므로 막는다.
const PLAIN_SCALAR_FORBIDDEN_START = /^[[\]{}&*!|>%@`#,?-]/;

function parseString(slug: string, key: string, raw: string): string {
  let value: string;
  if (raw.startsWith('"')) {
    if (raw.length < 2 || !raw.endsWith('"'))
      throw new TipParseError(slug, `${key}: unclosed quote`);
    try {
      value = JSON.parse(raw) as string;
    } catch {
      throw new TipParseError(slug, `${key}: invalid double-quoted string`);
    }
  } else if (raw.startsWith("'")) {
    if (raw.length < 2 || !raw.endsWith("'"))
      throw new TipParseError(slug, `${key}: unclosed quote`);
    value = raw.slice(1, -1).replace(/''/g, "'");
  } else {
    if (PLAIN_SCALAR_FORBIDDEN_START.test(raw) || /: |\s#/.test(raw)) {
      throw new TipParseError(slug, `${key}: wrap this value in double quotes`);
    }
    value = raw;
  }
  value = value.trim();
  if (!value) throw new TipParseError(slug, `${key} must not be empty`);
  return value;
}

function parseDate(slug: string, key: string, raw: string): string {
  const value = parseString(slug, key, raw);
  const match = DATE.exec(value);
  const valid =
    match &&
    new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
      .toISOString()
      .slice(0, 10) === value;
  if (!valid) throw new TipParseError(slug, `${key} must be a real date in YYYY-MM-DD form`);
  return value;
}

function parseActivityIds(slug: string, raw: string): number[] {
  const inner = /^\[(.*)\]$/.exec(raw)?.[1];
  if (inner === undefined) {
    throw new TipParseError(slug, "relatedActivityIds must be a list like [2, 6]");
  }
  if (!inner.trim()) return [];
  const ids = inner.split(",").map((part) => {
    const text = part.trim();
    if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text))) {
      throw new TipParseError(slug, `relatedActivityIds has an invalid id: "${text}"`);
    }
    return Number(text);
  });
  if (new Set(ids).size !== ids.length) {
    throw new TipParseError(slug, "relatedActivityIds has duplicate ids");
  }
  return ids;
}

/** 파일 이름에서 얻은 슬러그와 파일 전체 문자열로 글 하나를 만든다. 계약을 어기면 TipParseError를 던진다. */
export function parseTip(slug: string, source: string): Tip {
  if (!isTipSlug(slug)) {
    throw new TipParseError(slug, "slug must be kebab-case (lowercase letters, digits, hyphens)");
  }
  const match = FRONTMATTER.exec(source.replace(/^﻿/, ""));
  if (!match) throw new TipParseError(slug, "missing frontmatter block delimited by ---");

  const fields = new Map<string, string>();
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const pair = KEY_VALUE.exec(line);
    if (!pair) throw new TipParseError(slug, `unsupported frontmatter line: "${line}"`);
    const [, key, value] = pair;
    if (!(ALLOWED_KEYS as readonly string[]).includes(key)) {
      throw new TipParseError(slug, `unknown frontmatter key: ${key}`);
    }
    if (fields.has(key)) throw new TipParseError(slug, `duplicate frontmatter key: ${key}`);
    if (!value) throw new TipParseError(slug, `${key} must not be empty`);
    fields.set(key, value);
  }

  for (const key of ["title", "description", "publishedAt"] as const) {
    if (!fields.has(key)) throw new TipParseError(slug, `missing required field: ${key}`);
  }
  const publishedAt = parseDate(slug, "publishedAt", fields.get("publishedAt")!);
  const updatedAt = fields.has("updatedAt")
    ? parseDate(slug, "updatedAt", fields.get("updatedAt")!)
    : publishedAt;
  if (updatedAt < publishedAt) {
    throw new TipParseError(slug, "updatedAt must not be earlier than publishedAt");
  }

  const body = (match[2] ?? "").trim();
  if (!body) throw new TipParseError(slug, "article body is empty");

  return {
    slug,
    title: parseString(slug, "title", fields.get("title")!),
    description: parseString(slug, "description", fields.get("description")!),
    publishedAt,
    updatedAt,
    relatedActivityIds: fields.has("relatedActivityIds")
      ? parseActivityIds(slug, fields.get("relatedActivityIds")!)
      : [],
    body,
  };
}
