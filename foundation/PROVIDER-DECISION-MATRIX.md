# PRODUCTION PROVIDER DECISION MATRIX — Bertina-only

**Decision:** production infrastructure is no longer provider-conditional.

## Approved production path
- GitHub: source control and CI only.
- Bertina: public hosting, DNS, PHP runtime, MySQL database and domain email.
- Public/API origin: `https://drjavadrezazadeh.com` with same-origin `/api/`.
- Payment: external Iranian gateway behind the Bertina server-side adapter.
- Private files and authenticated data: remain disabled until the corresponding Bertina storage/security controls are configured and verified.

## Prohibited production paths
Retired edge runtimes, retired DNS/CDN services, hosted Worker backends and third-party transactional-email runtimes are not approved production dependencies.

## Approval gates
A Bertina-backed feature is production-ready only after:
- configuration and credentials are stored outside Git;
- health checks pass on the live domain;
- MySQL persistence and backup/export are verified where relevant;
- email delivery is tested from the domain mailbox;
- payment callbacks are server-verified before public checkout is enabled;
- rollback and recovery evidence exists.

Provider-neutral domain logic may remain in `platform/`, but production adapters target Bertina.
