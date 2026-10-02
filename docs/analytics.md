# Optional browser measurement

HanBuddy uses one optional browser choice for GA4 analytics and Meta advertising measurement. Both providers are off until the backend acknowledges a fresh v3 grant. GA4 purchase remains backend-only, and the browser never emits Meta Pixel `Purchase`.

## Runtime configuration

All provider configuration is server-only and is supplied to the running container, not baked into `NEXT_PUBLIC_*` variables.

| Variable             | Accepted value                                                        | Disabled state                                        |
| -------------------- | --------------------------------------------------------------------- | ----------------------------------------------------- |
| `GA4_ORIGIN`         | Exact HTTPS origin without a path, query, fragment, or trailing slash | Invalid origin disables collection and BFF operations |
| `GA_ENABLED`         | Literal `true`                                                        | Missing or any other value                            |
| `GA_MEASUREMENT_ID`  | `G-[A-Z0-9]+`                                                         | Missing or malformed ID                               |
| `META_PIXEL_ENABLED` | Literal `true`                                                        | Missing or any other value                            |
| `META_PIXEL_ID`      | 5–32 decimal digits, first digit nonzero                              | Missing or malformed ID                               |

At least one correctly configured provider makes the consent control available. A missing provider stays off without disabling the other provider. The browser origin must exactly match `GA4_ORIGIN`; unsupported local, preview, or staging origins fail closed unless that exact HTTPS origin is explicitly configured. Web Locks, BroadcastChannel, and accessible local choice storage are also required.

## Unified v3 consent

The frontend manages `__Host-hb_measurement_consent` as either `granted.v3.<id>` or `denied.v3.<id>`. The ID is exactly 32 random bytes encoded as 43 unpadded base64url characters. The cookie is JavaScript-readable and is written with `Secure; Path=/; SameSite=Lax`, without `Domain`.

The local choice-generation marker is stored under `__Host-hb_measurement_decision`; it is not backend proof and contains no account or provider identifier. The retired `__Host-hb_ga_consent` and `__Host-hb_ga_decision` values are deleted and ignored. Neither an old accept nor an old deny is converted, so both providers remain off until the user answers the v3 dialog.

`POST /api/analytics/purchase-consent-proof` forwards only `{action: "ACCEPT" | "RESTORE"}`. RESTORE verifies the current proof and never extends its backend expiry. `POST /api/analytics/purchase-withdrawal` sends the denied form of the same opaque ID and requires `withdrawalAcknowledged: true`. Withdrawal immediately stops new browser sends and best-effort clears GA/Meta cookies and queued browser state; it does not claim provider-side deletion.

All analytics BFF requests require JSON, the exact configured `Origin`, and `X-Analytics-Request: 1`. Analytics routes forward only the selected measurement cookie, required authentication, and explicitly projected fields. Provider script elements use `no-referrer`; there is no Meta noscript request. This script-fetch policy does not suppress metadata collected by a loaded provider library.

## Browser events

The app owns SPA page views. GA is configured with `send_page_view: false`, and the controller emits one explicit, sanitized `page_view` for each committed eligible pathname. App-supplied GA and Meta event fields use fixed query-free route templates, static titles, and an empty referrer. The app never copies raw URLs, queries, fragments, referrers, tokens, form/contact text, or profile data into custom event parameters.

After a fresh v3 grant, the standard Meta Pixel library is explicitly allowed to perform its normal browser-side collection of the current live page URL and referrer, including possible query components. This is a provider-collected exception, not permission for app code to add raw URL/referrer fields. HanBuddy does not emit Meta events on login, OAuth callback, payment success/failure/callback, or any route outside the fixed Meta page allowlist. Meta's allowlist is landing, Explore, onboarding, applications, activity detail, and activity booking; the existing safe-page controller keeps OAuth and payment callback routes ineligible for all app page events.

| App event           | Trigger                                                                                                           | GA4                 | Meta                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------- |
| `page_view`         | One committed eligible pathname after verified consent                                                            | `page_view`         | `PageView`             |
| `view_item`         | Successfully rendered activity detail, including direct entry                                                     | `view_item`         | `ViewContent`          |
| `booking_cta_click` | Actual activity-detail booking CTA activation                                                                     | `booking_cta_click` | —                      |
| `begin_checkout`    | Existing usable booking/payment-continuation trigger                                                              | `begin_checkout`    | `InitiateCheckout`     |
| `view_item_list`    | Successfully rendered nonempty Explore results, once per page/list version                                        | `view_item_list`    | —                      |
| `select_item`       | Actual Explore card mouse, touch, or keyboard activation                                                          | `select_item`       | —                      |
| `sign_up`           | Server-confirmed new Google account, once after bounded account restoration; never OAuth start/login/resubmission | `sign_up`           | `CompleteRegistration` |
| `section_view`      | Landing section meets the continuous one-second visibility rule                                                   | `section_view`      | —                      |
| `landing_cta_click` | Actual activation of an allowlisted landing CTA                                                                   | `landing_cta_click` | —                      |
| `inquiry_click`     | Actual activation of an allowlisted inquiry channel                                                               | `inquiry_click`     | `Contact`              |

Explore uses `explore_activities` / `Explore activities` and includes only ordered rendered opaque/numeric IDs and one-based indexes. It does not send titles, prices, or free text.

The current landing section inventory is:

1. `hero`
2. `recommended_experiences`
3. `booking_steps`
4. `guest_reviews`
5. `contact`

A normal section must be at least 50% visible for one continuous second. A section taller than the viewport must occupy at least 50% of the viewport for the same duration. Async section replacement, resize, rescroll, and rerender do not duplicate a section within the same page visit.

Landing CTA IDs are `hero_explore` in `hero` and `booking_start` in `booking_steps`; only `explore` and `login` destination categories are sent. Activity-detail booking stays exclusively `booking_cta_click`. Inquiry payloads contain only allowlisted channel, placement, and locale categories; they are never reported as lead generation.

## Checkout consent registration and attribution

Eligible application creation and payment continuation capture the granted v3 proof before preparation. After a successful preparation, and before the caller can continue to provider confirmation, the frontend performs this best-effort sequence once:

1. `POST /api/applications/me/{applicationId}/analytics-consent` with `{}`.
2. Read a valid GA `clientId` and optional `sessionId`.
3. `PUT /api/applications/me/{applicationId}/analytics-link` with the validated identifiers and optional Meta attribution.

Meta attribution is read only while v3 consent is live. `_fbp` and `_fbc` must match the documented allowlists. If either is present, `eventSourceUrl` is required and must be an ASCII absolute HTTPS URL of at most 512 bytes, exactly equal to the configured origin plus a canonical fixed analytics route-template path, with no user info, dot segments, query, or fragment. The source URL is taken from the same sanitized route template used for app event fields, never from the raw live URL. The required GA `clientId` is 1–20 digits, a dot, and 1–20 digits. The optional GA `sessionId` follows the backend contract exactly: a positive 1–19 digit decimal with no leading zero.

The BFF also requires the same-origin `X-Analytics-Context` produced by the successful authenticated preparation response. Account changes, withdrawal, or proof-generation changes drop delayed linkage. HTTP 409 and 410 are terminal and are not retried or converted into a new grant. Each optional consent/link request is bounded to three seconds; timeout or any other measurement failure is isolated so it does not turn a successful preparation into a booking failure. Success pages perform no linkage.

## Operational gates and validation limits

GA4 Enhanced Measurement automatic browser-history page changes must be disabled by a human in GA administration before activation. This repository cannot change or verify that setting. Meta/GA destination settings, backend deployment, retention, and live receipt are also separate operator checks.

Automated tests use task-local DOM/script stubs and synthetic callbacks. They do not contact GA or Meta, create real accounts, call payment providers, prove provider-side deletion, or prove live collection. Browser QA and real-provider verification are not established by command tests or a build.
