const CAMPAIGN_FIELDS = {
  utm_source: "campaign_source",
  utm_medium: "campaign_medium",
  utm_campaign: "campaign_name",
  utm_id: "campaign_id",
  utm_content: "campaign_content",
  utm_term: "campaign_term",
} as const;

type CampaignField = (typeof CAMPAIGN_FIELDS)[keyof typeof CAMPAIGN_FIELDS];
export type Campaign = Record<CampaignField, string | undefined>;

/** Explicit campaign labels only; never forward a raw URL, arbitrary query or referrer. */
export function readCampaign(search: string): Campaign {
  const query = new URLSearchParams(search);
  return Object.fromEntries(
    Object.entries(CAMPAIGN_FIELDS).map(([utm, field]) => {
      const values = query.getAll(utm);
      const value = values[0];
      // Keep campaign punctuation and emoji intact. Reject only empty/oversized values,
      // control characters and ambiguous duplicate keys.
      const valid =
        values.length === 1 &&
        value.trim().length > 0 &&
        value.length <= 100 &&
        !/\p{Cc}/u.test(value);
      return [field, valid ? value : undefined];
    }),
  ) as Campaign;
}
