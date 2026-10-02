# GA4 and Meta Unified Consent Events Design

## Scope

Extend the existing optional GA4 browser analytics implementation for the current `/en` and `/ko` landing page and the existing explore, detail, signup, inquiry, and checkout flows. Preserve the current sanitized explicit `page_view`, `view_item`, `booking_cta_click`, and `begin_checkout` behavior. GA4 purchase remains backend-only and Meta Pixel must never emit Purchase.

## Consent and configuration

One explicit v3 browser choice governs GA4 analytics and Meta advertising. The JavaScript-readable host cookie is `__Host-hb_measurement_consent` with `granted.v3.<id>` or `denied.v3.<id>`, where the ID is 43-character canonical unpadded base64url from 32 random bytes. It is written with `Secure; Path=/; SameSite=Lax` and without `Domain`. The old `__Host-hb_ga_consent` and `__Host-hb_ga_decision` data is removed and never converted, so either old decision is answered as a fresh prompt and both providers remain off.

GA4 remains controlled by valid server-only `GA_ENABLED` and `GA_MEASUREMENT_ID`. Meta is controlled by valid server-only `META_PIXEL_ENABLED` and `META_PIXEL_ID`. The existing exact HTTPS origin policy applies to both providers and all analytics BFF calls. At least one valid provider makes the consent UI operational; an absent or invalid provider remains off. Consent acceptance still requires backend ACCEPT/RESTORE proof acknowledgement. Withdrawal immediately stops both providers, requests server revocation, and best-effort clears GA/Meta browser cookies and queued state.

The English and Korean dialog title, body, and choice labels are the task-supplied exact strings. No Meta noscript image is rendered.

## Browser providers and privacy

The existing controller remains the only sender. It starts configured transports only after verified v3 consent, dispatches one sanitized explicit page event per committed pathname, and stops every transport on decline, withdrawal, expiry, account invalidation, unsupported origin, or page suspension. GA keeps `send_page_view: false`. Meta maps only app `page_view`, successful `view_item`, successful `sign_up`, `inquiry_click`, and existing `begin_checkout` to PageView, ViewContent, CompleteRegistration, Contact, and InitiateCheckout.

Every app-supplied event parameter is built from fixed allowlists and query-free route templates. No form/contact text, profile identity, title, price, token, raw href, query, referrer, or live URL is supplied by HanBuddy as a custom analytics parameter. Under the approved `PRIVACY-META-URL-001` option B, the consented standard Meta Pixel may independently perform its normal collection of the current live page URL and referrer, including possible query components. Meta events remain disabled on login, OAuth callback, payment callback/success/failure, and routes outside the fixed landing/Explore/onboarding/applications/activity-detail/activity-booking allowlist. Query changes do not create an app page view. Google Enhanced Measurement browser-history page changes remain an external operator setting and are not changed or claimed here.

## Trigger inventory

- Explore list: `explore_activities` / `Explore activities`; successful rendered data emits one `view_item_list` per route visit and ordered list-content version. Actual card mouse/touch/keyboard click emits `select_item`; rendering and prefetch do not.
- Account creation: the successful non-resubmission Google signup response performs a three-second-bounded account restoration, then emits one `sign_up` with method `google` before navigation when restoration succeeds. OAuth start, callback, login, render, resubmission, and an existing account do not; stalled optional restoration cannot hold the completed signup indefinitely.
- Landing sections, in document order: `hero` (1), `recommended_experiences` (2), `booking_steps` (3), `guest_reviews` (4), `contact` (5). A section emits after one continuous second at at least 50% element visibility, or, for a section taller than the viewport, at least 50% viewport occupancy. Each section emits once per route visit.
- Landing CTAs: `hero_explore` in `hero` at position 1 and `booking_start` in `booking_steps` at position 3. Destination is the allowlisted `explore` or `login` category. Detail booking remains only `booking_cta_click`.
- Inquiry links: existing support email/social links in landing contact, global footer, and alternative-payment inquiry dialog emit only allowlisted channel, placement, and locale. They map to Meta Contact, never lead-generation events.

## Checkout consent and attribution

The existing same-origin preparation ticket carries the v3 granted proof. After a successful application/payment preparation and before the caller can begin provider confirmation, it performs exactly one authenticated `POST /api/applications/me/{applicationId}/analytics-consent` with `{}`, then one `PUT .../analytics-link` when a valid GA `clientId` is available. The link contains the optional valid `sessionId` (positive 1–19 decimal digits, no leading zero) and optional allowlisted `_fbp`/`_fbc`; Meta fields also require an exact canonical query-free fixed-route HTTPS `eventSourceUrl` with the configured origin. Each optional request is bounded to three seconds. Success pages do nothing. Analytics errors, including terminal 409/410, are swallowed once and never recreated or retried, so the prepared booking remains usable.

All BFF requests require JSON, exact configured Origin, and `X-Analytics-Request: 1`; protected calls also require bearer authentication. The BFF forwards only the selected v3 proof cookie, required auth, and validated projected fields.

## Verification

Strict vertical TDD covers old accept/deny reprompt, pre-consent silence, both provider lifecycles, missing configuration, cross-tab/account invalidation, route dedup/query stripping, every trigger/non-trigger boundary, provider command queues, exact BFF validation, and the existing GA funnel. Browser QA uses local provider stubs only and remains with Hermes.
