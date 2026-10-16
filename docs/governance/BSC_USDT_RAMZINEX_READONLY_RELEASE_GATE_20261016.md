# BSC USDT / Ramzinex read-only reconciliation — private release gate

**State: disabled, isolated draft. Never paste tokens or secrets in issues, ChatGPT, Git, browser, test logs or screenshots.** This integration has no permission to buy, sell, trade or withdraw. It also has no authority to approve payments or grant services.

## Owner requirements (16 October 2026)
- USDT on BNB Smart Chain for both Persian- and English-language users, including Iranian residents, as a provisional cross-border method.
- Receive address and token contract are in `platform/manual-usdt-bsc.json`; owner must reconfirm the current wallet/network with Ramzinex before publication. Exchange deposit addresses and supported networks can change.
- User submits a transaction hash and/or private receipt for an actual order, service, donation or authorized invoice.
- The evidence is stored privately, linked to a verified account, queued for owner review and referred by a claim ID in manager SMTP notification; files are never email-attached or publicly linked.
- The owner must explicitly review transaction hash, BSC chain/network, the expected token contract, recipient address, amount, confirmations and valid order/invoice. No automatic entitlement or order `paid` state.
- JHELA journal fees remain disabled until an authorized invoicing policy and legitimate editorial/finance events are verified.

## Read-only Ramzinex enhancement
The owner supplied a **read-only API credential**. Because it appeared in a chat, rotate it before use; **do not reuse or store the supplied value in source or a screenshot**. The application reads only independently reissued host-side secrets. An API key and an access/bearer token may be distinct; verify authentication in the official Ramzinex panel rather than assuming one disclosed string provides both.

Private server configuration (not values):
- `JR_RAMZINEX_READONLY_ENABLED=false` initially; only enable after official endpoint/protocol, credential scope and security verification.
- `JR_RAMZINEX_RO_BEARER`: rotated server-only token.
- `JR_RAMZINEX_RO_API_KEY`: rotated server-only API key.
- `JR_MANUAL_USDT_ENABLED=false`, `JR_MANUAL_USDT_SCHEMA_APPROVED=false` remain OFF until staging acceptance.

The experimental adapter `api/ramzinex-readonly.php` makes only one fixed HTTPS read request to a deposit-history endpoint, as indicated by available API references. The exact endpoint and response shape remain **unverified against the live owner's account**. It never forwards user-provided URLs or credentials and never calls trading, withdrawal or key-management endpoints.

The admin-only, fresh-TOTP endpoint `/api/admin/operations/crypto/usdt/exchange-evidence?id=<claim_id>` searches returned deposit records for an exact hash and returns only a **candidate**, an unavailable status, or no candidate in a bounded recent sample. A match is *not* proof of correct network, token, destination, quantity, confirmations or settlement. Provider API unavailability fails closed and does not change the claim.

## Governance and QA
- Do not store full provider deposit histories in browser or database; do not expose balances or credentials to customer dashboards.
- No exchange lookup is accessible without owner membership, fresh MFA and rate limiting.
- Keep private receipt images outside `public_html`, not directly addressable.
- Require a restorable database backup, additive migration, owner invoice-price review, authenticated HTTP/SMTP integration tests, customer/admin mobile & desktop acceptance and independent security review before turning on payment claims.
- A separate exact-SHA CI workflow `.github/workflows/usdt-readonly-gate.yml` lints PHP and checks exact hash matching with **synthetic values**, no exchange credentials and no real funds.
- This read-only tool can support the manager's decision, not replace it. Even a perfect match never changes BitPay, commerce order payment or service fulfillment state.

## Mandatory next acceptance steps
1. Revoke/reissue the exposed read-only API credential inside Ramzinex and restrict permissions to account viewing/deposit history, preferably with IP allowlisting.
2. Validate Ramzinex's current documented private deposit endpoint, API key/token distinction, network and hash fields **without placing secrets in CI**.
3. Verify the designated BSC USDT receiving address and token contract in the active account; do not publish an expired exchange address.
4. Run integrated simulated claim, receipt upload, admin SMTP queue, fresh-MFA review and customer history for both languages. Check duplicate hash claims, concurrent approval and refund/reversal edge cases.
5. Explicitly approve one controlled production rollout with rollback and monitoring. No automatic service activation by any API or receipt.
