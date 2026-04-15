# Payment Provider Modules Design

**Date:** 2026-04-12

## Goal

Make YooKassa and Platega explicitly switchable modules so a deployment can omit their secrets entirely when a provider is disabled.

## Approved Design

- Add explicit env flags: `YOOKASSA_ENABLED` and `PLATEGA_ENABLED`.
- Default both flags to `false`.
- When a provider flag is `false`, its secrets are not required by env validation.
- When a provider flag is `true`, its existing production secret validation remains mandatory.
- Checkout shows only enabled payment providers.
- If all providers are disabled, checkout stays visible but shows that payments are unavailable.
- Payment creation rejects requests for disabled providers even if the client bypasses the UI.
- Admin provider status keeps showing all providers.
- Disabled providers remain in the admin status block with summary `Выключен`.
- Webhook routes for disabled providers return `404`.

## Architecture

- Keep provider labels and provider-selection helpers in a small shared payments helper module.
- Keep env-backed enablement checks in server code.
- Pass enabled providers from the server page to the client checkout component instead of reading env in the client.
- Keep payment-service enforcement server-side so UI state is never the only protection.

## Testing

- Env validation tests for disabled providers without secrets and enabled providers with required secrets.
- Service tests for rejecting disabled providers.
- UI tests for checkout hiding disabled providers and showing the no-payments fallback.
- Provider status tests for the new `disabled` state.
- Webhook route tests for `404` when the provider module is disabled.
