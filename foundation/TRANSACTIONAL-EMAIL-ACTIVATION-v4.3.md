# Transactional Email Activation — Bertina

## Production decision
Transactional and account email is delivered through the website domain mail infrastructure on Bertina. No external transactional-email runtime is part of the production architecture.

## Required mailboxes
At minimum, provision and monitor:
- `info@drjavadrezazadeh.com` for general/customer correspondence.
- `accounts@drjavadrezazadeh.com` for account verification and recovery, if the hosting plan permits it.

## Activation gates
Email remains fail-closed until all of the following are verified:
1. Domain mailbox exists on Bertina.
2. Outbound delivery from the Bertina host succeeds to at least one external mailbox.
3. Reply handling reaches a monitored inbox.
4. SPF/DKIM/DMARC records are compatible with Bertina mail service.
5. Verification and recovery links use the owned HTTPS domain.
6. No credentials or mailbox passwords are committed to Git or browser code.

The PHP API exposes email readiness as false until local mail is explicitly enabled in the private Bertina runtime configuration.
