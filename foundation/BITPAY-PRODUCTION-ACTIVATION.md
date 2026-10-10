# BitPay Production Activation — Bertina backend

Status: NOT CERTIFIED FOR PUBLIC PAYMENT until the controlled live-payment gate is completed.

## Required architecture
The browser never holds a gateway secret. Orders are created, stored and verified through the same-origin Bertina PHP API backed by Bertina MySQL.

## Activation gates
1. Trusted HTTPS must be valid on the public domain.
2. Bertina MySQL schema must be installed and tested.
3. Gateway API credential must exist only in `api/config.local.php` or equivalent private runtime configuration.
4. Confirm the provider amount unit before setting the multiplier.
5. Confirm server-side order creation and persistent state transitions.
6. Confirm callback identity, provider transaction ID, amount and factor/order linkage.
7. Confirm transactional email/fulfilment readiness before enabling checkout.
8. Run one controlled low-value live transaction, then reconcile the provider record with the MySQL order before enabling public checkout.

All commerce switches remain fail-closed by default.
