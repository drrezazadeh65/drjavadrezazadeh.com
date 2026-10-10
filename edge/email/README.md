# Transactional email Worker

This Worker provides private service-binding RPC. Its public HTTP endpoint returns 404. It does not accept browser-initiated email requests.

## Deployment prerequisites

- Create a domain-restricted, sending-only Resend API key.
- In `edge/email`, install dependencies and store the key using `npx wrangler secret put RESEND_API_KEY`.
- Deploy using `npm run deploy`.
- In an authorized caller Worker, configure a service binding named `EMAIL_SERVICE` targeting `drjavadrezazadeh-email`.
- Invoke `env.EMAIL_SERVICE.sendTransactional({type,to,subject,text,idempotencyKey})` only after server-side business-event authorization.

Never commit the key or expose it in a public page. Registration and password-reset flows require expiring, single-use, securely stored verification tokens and rate limiting. Receipts must only follow server-verified payments. A successful email send is not proof that account verification or payment workflows exist.

Current state: source and deployment configuration prepared; Cloudflare deployment, secret installation, and business workflow integration remain unverified.
