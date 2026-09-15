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

These flags are necessary but insufficient. The backend consent interface has not been published. `AnalyticsProvider` therefore has no production `ConsentLinkPort` binding. It neither displays a consent prompt nor loads a Google tag until both operational policy and that binding are present. Do not replace the missing binding with successful no-op requests or point it at an invented endpoint.

Only after the concurrency protocol below is implemented and tested, a verified client binding constructs `createConsentLinkPort(request)` and supplies it to the provider. Its request function must resolve only after authoritative backend acknowledgement and reject failures. The current adapter is tested with synthetic requests; it does not create any HTTP route. No payment request or authentication cookie contract changes are included.

## Consent contract required from the backend

The proposed port operations are internal frontend interfaces, not existing endpoints:

- `grant({ consentId, policyVersion, expiresAt })`: register an opaque consent epoch. `expiresAt` is milliseconds since the Unix epoch; the server must validate the approved policy and bound it independently.
- `link({ consentId, policyVersion, clientId, sessionId })`: associate Google-generated numeric client/session identifiers with that epoch. No account ID, payment key, provider order, form answer or contact information is included.
- `revoke(consentId)`: idempotently make that epoch terminal. Late grant/link requests cannot resurrect it. Pending outbox rows must become ineligible.

The BFF must bind a server-verifiable same-origin consent handle, enforce request-origin/CSRF and ownership rules, preserve anonymous-to-login continuity, and attach eligible linking context to creation/continuation server-side. Neither the cookie details nor backend paths are assumed here. Publish and test the concrete contract before binding the port. The scheduler must check policy, current consent, revocation and expiry again immediately before sending purchase; browser state alone cannot protect pending rows.

The frontend stops immediately on rejection, expiry, observed storage changes, or departure from a permitted route. Pagehide, provider cleanup and departure suspend sending and pending callbacks without deleting identity cookies. Explicit withdrawal, expiry and invalidation reset the configured GA cookies, including after reload before tag loading. The consent expiry timer remains armed during suspension while the document runs; restoration and the backend must enforce expiry when the document was frozen or closed. Denial is stored and server revocation is retried on navigation, page restoration, online recovery and a new acceptance attempt. A failed revocation blocks a new grant. If denial cannot be written, the adapter attempts to remove the old grant. If all storage mutations and server communication fail, a reload cannot be made durably safe by browser memory; backend terminal revocation/expiry remains essential. Do not claim immediate cancellation of an already-sent request.

Consent storage is `hanbuddy.gaConsent.v1`, with a versioned record and an explicitly configured expiry. Legacy landing consent is not read. Choice expiry does not specify backend data-deletion retention. Denied records remain available for revocation retries; removal/deletion policy still needs approval before activation. There is no client purchase-dedup storage.

## Cross-tab activation requirement

Local storage has no atomic compare-and-set across tabs. The controller checks shared consent before sending, reuses an existing valid shared acceptance, retires its old epoch before adoption, and rechecks shared state after awaited revocation. It does not write its stale epoch over an observed replacement. Withdrawal revokes both the local and currently observed shared epochs. Failed withdrawal keeps at most two local revocation handles and blocks further adoption/acceptance until they are acknowledged; there is no growing identifier ledger. Delayed operations keep their captured epoch and cannot activate a canceled controller.

These measures do **not** constitute a distributed consent protocol. Simultaneous storage reads/writes, unseen epochs, tab closure and offline revocation cannot be made authoritative by this frontend. The current three-operation port is a proposal, **insufficient by itself for activation**. The concrete counterpart must add server-controlled browser-scope revision/ownership and distinguish fresh user acceptance from restoration:

1. A fresh grant compares the expected authoritative scope revision atomically, installs one current epoch and retires older epochs. A competing grant with that revision fails. Restoration only asserts an existing active epoch; it cannot create or revive one. Do not retry a failed grant under a new revision without a fresh user decision.
2. Per-epoch revoke is terminal even if it arrives before grant/link. Explicit withdrawal must additionally advance the browser-scope revision and invalidate all current/older epochs atomically, including ones this tab never observed. This requires a scope-withdrawal operation beyond the current ID-only revoke. Supersession cleanup must not revoke a newer scope decision.
3. Grant, link, withdrawal, expiry eligibility and outbox eligibility use the same authoritative scope/epoch state. A row is eligible only for the current, granted, unexpired epoch. The scheduler rechecks before delivery. No late response or stale tab can make an older epoch eligible.
4. The published contract must cover anonymous-to-login scope continuity, CSRF, acknowledgement, conflict handling and approved tombstone/deletion retention. Adapt the frontend port to that verified protocol before supplying any production binding.

Synthetic tests exercise terminal per-epoch revocation and local races. They do not prove server scope atomics or successful offline remote withdrawal. Collection remains disabled until this integration is implemented and verified.

## Google command and session lifecycle

The transport uses the documented `Arguments` command envelope from [Google's data-layer integration](https://developers.google.com/tag-platform/tag-manager/datalayer). Tests check the envelope and synthetic callbacks; they do not execute Google's tag.

The [gtag API reference](https://developers.google.com/tag-platform/gtagjs/reference) supports `get` for `client_id` and `session_id` and permits an undefined result when a field is unset. [Google's session documentation](https://support.google.com/analytics/answer/9191807?hl=en) associates ID generation with session start. Neither reference guarantees that a session ID is initialized before the first event with `send_page_view: false`.

The current conservative ordering remains grant → tag config/load → validated identifier lookup → backend link → first explicit page view. An unset or timed-out ID fails closed; no ID or synthetic bootstrap event is manufactured. **The actual first-visit/session initialization and anonymous-login-reload continuity are unverified activation gates.** A successful fake `get` callback or retained synthetic cookie is not evidence of real Google behavior. Any required ordering change must be validated under separately authorized runtime verification before enabling collection.

## Event boundaries

| Event               | Trigger                                                                                                             | Exclusions                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `page_view`         | Committed allowed route after consent and linking initialization                                                    | Prefetch, unknown/sensitive routes, query-only changes, automatic tag page views                                           |
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
