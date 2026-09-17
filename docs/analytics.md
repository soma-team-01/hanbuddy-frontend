# Optional GA4 funnel analytics

The frontend emits `page_view`, `view_item`, `booking_cta_click` and `begin_checkout` only after fresh GA-only consent. It never emits `purchase`. Payment confirmation and purchase delivery belong to the backend's dedicated transactional outbox and independent scheduler.

## Collection is disabled until activation is verified

The locale layout reads explicit operational configuration with no defaults:

| Setting                            | Required value                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `GA_ENABLED`                       | `true`                                                                                     |
| `GA_DESTINATION_VERIFIED`          | `true`, after the owner verifies the existing stream and origin mapping                    |
| `GA_AUTOMATIC_COLLECTION_DISABLED` | `true`, after enhanced/history/form/outbound automatic collection is verified disabled     |
| `GA_MEASUREMENT_ID`                | Verified existing web-stream ID; the historical candidate is not an activation instruction |
| `GA_ORIGIN`                        | Exact approved HTTPS origin, without a trailing slash                                      |
| `GA_POLICY_VERSION`                | Approved version identifier for the fresh analytics purpose                                |
| `GA_CONSENT_MAX_AGE_SECONDS`       | Approved positive integer; no assumed duration                                             |
| `GA_COOKIE_MAX_AGE_SECONDS`        | Approved positive integer; no assumed duration                                             |

These flags are necessary but insufficient. No production configuration is enabled by this change. The cookie binding also requires an exact HTTPS origin, Web Locks and BroadcastChannel; unsupported browsers fail closed. The backend remains disabled until its permit/signing/retention gates are independently approved. Destination/origin, automatic collection, browser QA and real Google behavior are unverified.

## Current browser cookie contract

The approved choice applies to this browser, including anonymous detail/CTA and login continuity. It is not an account-wide ledger. The historical completed counterpart is backend commit `1174af4217f62ff2dbca09951c5305d1ea02f7d8`, documented in its `docs/analytics-purchase-outbox.md` and registered `shared-handoff-207.txt`. Registered attachment110, `contract-delta-209-15.md`, adds the terminal late-link behavior below; it is a supplied contract update, not evidence that the backend working implementation is committed or deployed. Earlier `/me/analytics-consent` and browser-ledger proposals are superseded.

The provider now uses `cookie-consent.ts`, `cookie-controller.ts` and `cookie-runtime.ts`. It does not read localStorage or migrate the legacy `hanbuddy.gaConsent.v1` record. The earlier `controller.ts`/`ConsentLinkPort` scaffold remains for historical tests/types, with no production caller.

- `POST /api/analytics/purchase-consent-proof` forwards `ACCEPT` or `RESTORE`. Only an explicit acceptance can issue a new proof; lost responses are never automatically retried as ACCEPT. RESTORE verifies an existing proof without extending its grant time/expiry.
- `__Host-hb_ga_consent` holds the backend signed proof. It is Secure, host-only, Path=/, SameSite=Lax, JavaScript-readable. The backend verifies authenticity; frontend parsing alone cannot grant. Max-Age is the remaining server expiry, bounded by explicit policy.
- A separate `__Host-hb_ga_decision` cookie contains only an accept/denied generation token. It is an origin-wide concurrency signal, not server consent evidence; it is never forwarded to the backend. Its finite lifetime uses the explicit consent-choice policy. No numerical production lifetime is supplied.
- `POST /api/analytics/purchase-withdrawal` forwards the same proof with the choice changed to denied. Completion requires `withdrawalAcknowledged:true`; a pending status remains visible through Cookie settings. A late proof is retained as denied and revoked, even if cookie persistence fails. Expiry ends eligibility but is not a remote deletion acknowledgement.
- Eligible application creation and payment continuation forward the selected proof before PG preparation. No identifiers are required for this capture. After a successful response, identifiers may be linked through `PUT /api/applications/me/{applicationId}/analytics-link`. The body contains only actual `clientId` and optional `sessionId`; it carries no user/payment ID, amount, currency or event timestamp.

For outbox states `HTTP_RECEIVED`, `POLICY_BLOCKED`, `EXPIRED`, `INVALID`, `UNKNOWN` or `CORRECTION_REQUIRED`, attachment110 specifies that late linkage returns **409 / ANALYTICS_LINK_CONFLICT**, even for an identical-value retry. This prevents restoring identifiers after cleanup. The BFF preserves the status/code with the fixed message `Analytics request unavailable`. The frontend leaves the successful booking result unchanged and does not automatically retry payment/linkage, issue another proof, or register consent retroactively. UNKNOWN is not success. Synthetic regressions cover this exact response; actual backend/browser integration remains unverified.

All analytics BFF operations require the approved original HTTPS Origin and `X-Analytics-Request: 1`. Only the selected proof cookie is sent to the backend, plus the existing bearer on protected routes. Other browser cookies and the client-only decision cookie are excluded. Withdrawal can use a validated `X-Analytics-Proof` denied-proof override to retire a late key; this header is projected into the selected backend cookie only.

Successful eligible create/continue responses include a same-origin `X-Analytics-Context` digest of the current access token. Late linkage must return that digest; the BFF compares it to the current login before forwarding. The digest is not sent to GA or the backend. Local auth-transition generations also cancel pending callbacks, with BroadcastChannel invalidation across tabs. Refresh/token changes conservatively drop linkage. Ownership and matching captured proof remain backend checks; an already-dispatched request cannot be recalled.

## Serialization and recovery

Web Locks serialize issuance, restore and revocation across cooperating same-origin tabs. Denial writes the shared decision immediately; every send/link checks the live proof and decision. BroadcastChannel stops other tabs and triggers reconciliation. Idempotent cookie writes do not cause restore-message loops. Restoration also occurs on navigation, pageshow, online and visibility return.

A withdrawal waits behind in-flight issuance. A late response cannot activate a denied generation; its signed key is retired. Failed revocation retains the key and blocks new issuance. A stale tab cannot overwrite a newer proof with its older failed withdrawal. Recovery handles a denied decision paired with a still-granted cookie. Passive restore does not revoke unchanged acceptance. Long expiries re-arm timer chunks rather than withdrawing at the JavaScript timer limit.

Pagehide/provider cleanup and departure from allowed routes stop sending and pending tag/identifier callbacks while preserving identity for valid consent. Withdrawal and expiry reset configured GA cookies. No storage/network mechanism can guarantee durable withdrawal if all cookie writes and server communication fail and the page closes; memory-only recovery is lost. Server revocation/expiry and pre-send checks remain essential. Started outbound delivery cannot be retracted.

## Retention and booking availability gates

GA175-RETENTION-01 is unresolved: cookie/denied marker lifetime, revocation/evidence, link/outbox and minimal dedup deletion. Proposed 72-hour, 30-day and 180-day values are not approved defaults. Backend consent expiry and browser cookie expiry do not establish storage deletion policy. No client purchase-dedup ledger is added.

Frontend identifier lookup/linkage is fire-and-forget and cannot delay or reject the booking result. Missing/invalid consent simply omits capture context. **Backend availability, confirmed by attachment110's comment269 response:** valid pre-PG consent-capture DB failure rolls back preparation before the new PG order call; payment continuation may still have an earlier PG order. A post-approval outbox INSERT failure rolling back internal confirmation is a separate, previously approved same-DB atomicity boundary (comment210). Async frontend linkage does not remove either database write or guarantee no booking impact/zero loss. This is an acknowledged contract limit, not an unanswered atomicity approval question. Backend code is not changed here.

## Google command and session lifecycle

The transport uses the documented `Arguments` command envelope from [Google's data-layer integration](https://developers.google.com/tag-platform/tag-manager/datalayer). Tests check the envelope and synthetic callbacks; they do not execute Google's tag.

The [gtag API reference](https://developers.google.com/tag-platform/gtagjs/reference) supports `get` for `client_id` and `session_id` and permits an undefined result when a field is unset. [Google's session documentation](https://support.google.com/analytics/answer/9191807?hl=en) associates ID generation with session start. Neither reference guarantees that a session ID is initialized before the first event with `send_page_view: false`.

Browser-event startup is signed-proof acknowledgement → tag config/load → explicit page view. Neither identifier lookup nor application-owned linkage gates page/detail/CTA events or authenticated usable checkout before application creation. The identifier reader requires a real numeric client ID and omits an unavailable/invalid optional session ID; it is not invoked during event startup. Application linkage validates actual Google identifiers separately; no ID, original timestamp or synthetic bootstrap event may be manufactured. **The actual first-visit/session initialization and anonymous-login-reload continuity are unverified activation gates.** A successful fake `get` callback or retained synthetic cookie is not evidence of real Google behavior. This ordering is covered by synthetic tests only and must be validated under separately authorized runtime verification before enabling collection.

## Event boundaries

| Event               | Trigger                                                                                                             | Exclusions                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `page_view`         | Committed allowed route after consent acknowledgement and tag initialization                                        | Prefetch, unknown/sensitive routes, query-only changes, automatic tag page views                                           |
| `view_item`         | Successfully displayed activity detail                                                                              | Loading/error, cached fetch without rendering, rerender duplication                                                        |
| `booking_cta_click` | Active reservation link on activity detail, including diversion to login                                            | Disabled/unselected/preview link; direct booking or continuation                                                           |
| `begin_checkout`    | Usable booking selection after a successful fresh tourist-profile check; usable owned payment continuation response | Loading/error, missing/full selection, unauthorized/redirect state, failed/expired/review-required continuation, rerenders |

Views and checkout are deduplicated by event and activity within a committed route visit; returning to a route or refreshing is a new visit. Each real CTA activation is counted. Initial/direct booking and continuation may legitimately have no measured CTA. Actions performed before consent are discarded, not queued. The currently displayed eligible page/detail/booking can be measured once after acceptance.

Only public numeric activity IDs are included in item data. Frontend events omit estimated prices and currencies. The backend owns the actual approved purchase amount/currency; it must not substitute a displayed estimate or convert PayPal USD to KRW for the event.

## Privacy and UI

Page fields use fixed route templates and static titles, with an empty referrer. No raw query, fragment, dynamic path segment, page title, form text, API error or profile data is forwarded. The Google script request uses `no-referrer`; config and every event carry safe page context. Advertising consent remains denied and Google Signals/ad personalization are disabled. No Meta tag is installed.

The provider renders a consent dialog and a footer Cookie settings control once operation is eligible. Closing/rejecting never grants. Withdrawal remains accessible through that control. The copy is a purpose-specific draft in English, Korean, Japanese, Simplified Chinese and Traditional Chinese, matching the application's current locales. It makes no legal, advertising or international-transfer claims. Content review remains part of activation readiness.

## Validation limits

Unit/integration tests use a fake tag sink or a synthetic DOM script-load event. They do not contact GA, create users, or perform payments. Command CI does not prove live stream settings, browser network behavior, backend linkage or purchase receipt.

Before activation, the supervising worker must verify the published backend contract, approved retention/deletion durations, destination/origin and automatic-collection settings, then exercise EN/KO at 390/768/1024/1440 for detail, CTA/login return, booking, continuation, consent and withdrawal. Browser QA is currently held by the user and has not run. No deployment or live collection is claimed.
