# Private recovery snapshot

Develop, review and run these tools only from the existing `/workspace/drjavadrezazadeh.com` checkout of `drrezazadeh65/drjavadrezazadeh.com`, branch `migration/bertina-linux6`. Historical copies under `work/` are recovery references; temporary encrypted archives, test fixtures and isolated restore evidence are not additional development sources. Keep all private backup material outside the repository and the public site.

**Validation status, 2026-10-12:** the final row-content-hashing tools passed the local checks documented below. This document does not certify a completed production snapshot, a restored production database or a verified independent production backup copy. Record those results only after the actual procedures succeed.

The backup workflow uploads one ephemeral public-key helper. It does not deploy the application, contact the helper, retrieve data, or mutate MySQL. A locally held RSA4096 recovery key signs every HTTPS action. Do not place that private key, the archive password, backup ZIP, decrypted files, or backup metadata in GitHub or workflow artifacts.

The request is valid for at most one hour, requires native apex HTTPS, and uses a fresh nonce for every signed action. Backup contents are retained outside `public_html` in `.codex-private-backup-{id}` with mode 0700. All archive entries use ZIP AES256; the generated password is wrapped with RSA-OAEP. The helper excludes its own exact filename from the site inventory, captures `api/config.local.php`, and verifies all files, directories and entry hashes before success. The aggregate SQL/archive staging bound is 2 GiB with a 64 MiB free-space reserve. Any unsupported or incomplete snapshot fails closed and removes pending SQL/archive files before success can be recorded.

The private configuration loader reads that exact file without changing it or guessing alternative settings. It requires an array and suppresses all include output. Only ASCII space, tab, CR and LF output is accepted, accommodating harmless PHP closing-tag whitespace. Any other output fails with `private_configuration_output_invalid`; a non-array fails with `private_configuration_type_invalid`; a loading exception fails with `private_configuration_load_failed`. Output bytes, configuration values and internal exception contents are never included in those error codes.

The database scope is the configured application schema. Every base table must be InnoDB. The snapshot uses a read-only repeatable-read transaction, records complete `SHOW GRANTS` output for the application account, all table/view/routine/trigger/event definitions, per-object parser context, view column metadata, row counts and a SHA-256 content digest for every table. Other schemas, server accounts/grants, server configuration and data referenced in other schemas are excluded. Those exclusions are recorded inside the encrypted manifest. Production SQL execution consists only of reads, connection/session settings and the read-only transaction.

Table digests use `ordered-hex-json-lines-v1`: every cell is represented by its exact hexadecimal byte sequence or JSON `null`, and each ordered row is framed as one JSON line. Empty values, NULL, binary NUL, numeric zero and repeated rows remain distinct. All columns, including generated and invisible columns, are verified; generated columns are excluded only from `INSERT` statements. Tables with a primary key use the complete declared key order. Other tables use full binary hexadecimal ordering with NULL first. The maximum sort value is measured, bounded to 4 MiB, and checked against the server's effective sort length; inadequate sorting fails instead of producing a misleading digest. Restored counts, column metadata, key order and content digests must all match. Equal row counts alone cannot certify recovery.

## Owner-local operation

Substitute absolute private paths. Create the request immediately before triggering the upload because the one-hour access window includes queueing and signed helper actions. Inspect the fresh live `sw.js` release stamp and supply that exact SHA as `LIVE_RELEASE_SHA`; a historical example is not proof of the current release. Finish create, retrieval, restore, independent copy/readback and certification while the request remains valid. An expired request is refused; do not extend its timestamps or bypass the gate.

```sh
python3 scripts/bertina-private-backup-client.py request \
  --public-key /private/recovery-public.pem \
  --source-release LIVE_RELEASE_SHA \
  --ttl 3600 --output /private/request.json
```

Copy only the public request JSON into `.bertina-backup-trigger` on `migration/bertina-linux6`. The workflow checks the latest branch HEAD again immediately before FTPS upload. The request's `sourceRelease` must equal the live stamped Service Worker release; a mismatch stops snapshot creation.

```sh
python3 scripts/bertina-private-backup-client.py run create \
  --request /private/request.json --key /private/recovery-private.pem \
  --timeout 660 --output /private/create-result.json
python3 scripts/bertina-private-backup-client.py run download \
  --request /private/request.json --key /private/recovery-private.pem \
  --directory /private/retrieved
```

Retrieval stores `bertina-private-backup-{id}.zip`, `envelope.json`, and `archive-password.txt`, all mode 0600. Failed retrieval removes files newly created by that operation. Do not reuse a directory that already contains these sidecars.

For the actual restore, obtain a local official MySQL or MariaDB image matching the source server's vendor and major.minor version. The restore tool never pulls an image. It creates a new disposable container with no external network, no host bind mounts, an anonymous database volume, disabled events, disabled local infile and disabled binary logs. It retains the original schema name and all original qualified references and DDL. It checks every decrypted entry and site file hash, the complete object inventory, exact definitions and creation contexts, view column metadata, all table row counts and all table content digests. Source `SYSTEM` event time zone context must match the recorded monthly samples for 2020–2030; select the corresponding container `TZ` explicitly when necessary. Placeholder locked definer principals may be created solely in that disposable instance to permit original view metadata to be evaluated; real server accounts and grants are not restored.

```sh
python3 scripts/bertina-private-backup-restore.py \
  --archive /private/retrieved/bertina-private-backup-ID.zip \
  --password-file /private/retrieved/archive-password.txt \
  --envelope /private/retrieved/envelope.json \
  --evidence-directory /private/restore-evidence \
  --mysql-image mysql:MAJOR.MINOR --system-tz UTC \
  --php /path/to/php --php-arg=-d --php-arg=extension=/path/to/zip.so
```

The restore tool emits a private `isolated-restore-receipt.json` only after successful verification and removal of the disposable container, volume and decrypted working files. The client requires exactly these nine receipt checks to be Boolean `true`: `databaseDefinitionsMatch`, `allRowCountsMatch`, `allRowContentHashesMatch`, `allFileHashesMatch`, `viewColumnMetadataMatch`, `eventSchedulerDisabled`, `networkDisabled`, `databaseRestoreIsolated`, and `systemTimeZoneCompatible`. Missing checks, numeric truth values and extra checks are rejected. A local fixture test never establishes production restore completion.

Upload the ciphertext ZIP to the owner's private Drive folder using the authorized Drive connector, then download that exact private Drive object to a separate local mode-0600 file. Check the folder owner and sharing status before upload; keep its identifiers and readback evidence private. Prepare certification only after that actual readback:

```sh
python3 scripts/bertina-private-backup-client.py certification \
  --request /private/request.json \
  --envelope /private/retrieved/envelope.json \
  --archive /private/retrieved/bertina-private-backup-ID.zip \
  --secondary-copy /private/drive-readback.zip \
  --restore-receipt /private/restore-evidence/isolated-restore-receipt.json \
  --output /private/certification.json
python3 scripts/bertina-private-backup-client.py run certify \
  --request /private/request.json --key /private/recovery-private.pem \
  --certification /private/certification.json --output /private/certify-result.json
python3 scripts/bertina-private-backup-client.py run retire \
  --request /private/request.json --key /private/recovery-private.pem \
  --output /private/retire-result.json
```

Certification checks the actual local ciphertext and separate readback hashes and binds them to the successful restore receipt. Separate local paths must refer to distinct files; aliases and hard links are refused. Equal local fixtures do not prove an independent storage provider: retrieve the actual uploaded owner-private object before certification. The raw proof bytes receive their own RSA-SHA256 signature as well as the signed canonical HTTPS request. The helper validates and stores that proof in private metadata and publishes the fixed `.codex-private-backup-current.json` pointer outside the webroot. Deployment gates accept only the pinned recovery key and matching retained ciphertext, live source release and signed proof, with a strict maximum age of 21,600 seconds measured from snapshot creation, not certification. Certification cannot reset that age; expired, replaced, mismatched or missing proof/ciphertext fails closed. Identical certification retry is safe. Retirement removes the ephemeral helper and pending files while retaining the complete private backup and recovery proof.

## Canonical source validation

The following SHA-256 values identify the validated tool contents on 2026-10-12. They identify source code, not a production backup archive. Revalidate after any change; do not treat this table as a substitute for a fresh source or live-release check.

| Canonical file | SHA-256 |
|---|---|
| `scripts/bertina-private-backup-template.php` | `e0ef1913892b64ad2312d60d3f75e0641a605582abae8f0762cd044a99aa9482` |
| `scripts/bertina-private-backup-client.py` | `d8cda7bfb95a0b52c344f6ee6a1ce5e79391170599d221b5e5ee1c77920faf4d` |
| `scripts/bertina-private-backup-restore.py` | `2885480c23996ca53c77756a4115dc949c94e3660b2435acb110d34bad7b8cfe` |
| `scripts/bertina-private-backup-extract.php` | `a61cc8600da13885663212ee9652e7cf1bb43fad80a58ce9ff83a8308f7c57d9` |

From the canonical checkout, using PHP with OpenSSL, PDO MySQL and ZIP AES256 support, and Python with `cryptography`:

```sh
php tests/private-backup-helper-test.php
PYTHONDONTWRITEBYTECODE=1 python3 tests/test_private_backup_client.py
PYTHONDONTWRITEBYTECODE=1 python3 tests/test_private_backup_row_content.py
php tests/bertina-private-backup-zip.php
```

The recorded canonical run passed 199 PHP helper assertions, 30 Python client tests, 13 Python row-content restorer tests and 17 real local encrypted-ZIP assertions. The helper/client/row-content suites use generated test keys, synthetic data and blocked or mocked external I/O; they do not read production credentials, contact the live host or run a production database restore. Configuration fixtures check array preservation, accepted ASCII whitespace, refusal of non-whitespace/Unicode whitespace/non-arrays, and suppression of output and exception contents. Other negative cases include a changed cell with unchanged row counts/schema, generated-cell corruption, NULL-to-empty replacement, missing content-verification attestation, corrupted independent readback, replay and invalid signatures, and private-file cleanup failures. The real ZIP probe verifies AES256 encoding/decoding, rejection of missing or wrong passwords, exact byte recovery and fixture cleanup. Actual full-site/database restore and provider readback remain separate operational evidence.
