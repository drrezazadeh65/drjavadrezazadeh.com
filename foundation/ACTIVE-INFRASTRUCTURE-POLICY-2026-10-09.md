# Active Infrastructure Policy — Bertina-only revision

## Authoritative owner decision
From the Bertina migration onward, **Bertina is the sole production infrastructure provider for the website**. GitHub remains source control and CI only. No retired edge runtime, DNS/CDN provider, hosted Worker runtime, or external transactional-email runtime may be treated as active production infrastructure.

## Active boundaries
| Function | Active platform |
| --- | --- |
| Source control / CI | GitHub |
| Public hosting | Bertina Linux hosting |
| DNS / authoritative nameservers | Bertina |
| TLS certificate | Certificate installed on Bertina |
| Dynamic API | Same-origin PHP under `/api/` on Bertina |
| Database | Bertina MySQL |
| Transactional/account email | Bertina domain mail |
| Canonical public origin | `https://drjavadrezazadeh.com` |
| Payment gateway | Approved external payment gateway called only by the Bertina backend |
| Purchased student support | Eitaa, entitlement-controlled |

## Release rules
1. No browser code may call a retired provider-specific host.
2. All account, commerce, donation and intake operations are fail-closed until Bertina PHP/MySQL/mail configuration is live and independently verified.
3. Secrets remain outside Git and outside public JavaScript.
4. Preserve the bilingual `/fa/` and `/en/` URL architecture and frozen SEO standard.
5. No SMS or phone authentication; account verification and recovery are email-only.
6. Do not restore a retired provider because of stale documentation, historical CI, or old source files.
7. Production readiness requires live Bertina-origin evidence, not merely a GitHub commit.
