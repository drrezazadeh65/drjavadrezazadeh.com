"""Source-only migration contract for an independently hosted JREI AI service.

Pure metadata; importing this module cannot enable a domain, worker, tool or
website endpoint. It deliberately does not decide owner approval or DNS state.
"""
from __future__ import annotations

import re
from urllib.parse import urlsplit

SCHEMA = "jr.jrei.portability-topology.v1"
CURRENT_WEBSITE = "https://drjavadrezazadeh.com"
DNS_LABEL = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")


def canonical_https_origin(raw: str) -> str:
    """Validate a future public AI domain; never authorize its use."""
    if not isinstance(raw, str) or len(raw) > 253 or raw != raw.strip():
        raise ValueError("JREI_AI_DOMAIN_FORMAT_INVALID")
    try:
        url = urlsplit(raw)
        port = url.port
    except ValueError as exc:
        raise ValueError("JREI_AI_DOMAIN_FORMAT_INVALID") from exc
    if (url.scheme != "https" or not url.netloc or url.username is not None
            or url.password is not None or url.path not in ("", "/")
            or url.query or url.fragment or port not in (None, 443)):
        raise ValueError("JREI_AI_DOMAIN_MUST_BE_HTTPS_ORIGIN")
    host = url.hostname
    if (not host or not host.isascii() or len(host) > 253
            or "." not in host or host.startswith(".")
            or host.endswith(".") or host.lower() == "localhost"
            or any(not DNS_LABEL.fullmatch(label)
                   for label in host.lower().split("."))):
        raise ValueError("JREI_AI_DOMAIN_HOST_INVALID")
    return "https://" + host.lower()


def source_portability_snapshot(candidate_origin: str | None = None) -> dict:
    """Read-only migration facts; domain selection never changes live routing.

    candidate_origin may be specified only from locally owned service
    configuration, never from a web request or an untrusted model response.
    """
    target = None
    status = "NO_FUTURE_DOMAIN_CONFIGURED"
    if candidate_origin:
        try:
            target = canonical_https_origin(candidate_origin)
            status = ("CURRENT_WEBSITE_NOT_AN_INDEPENDENT_AI_DOMAIN"
                      if target == CURRENT_WEBSITE
                      else "CANDIDATE_ONLY_NOT_DEPLOYED")
        except ValueError:
            status = "INVALID_CANDIDATE_REJECTED"

    return {
        "schema": SCHEMA,
        "stage": "SOURCE_CONTRACT_ONLY",
        "current_website_origin": CURRENT_WEBSITE,
        "future_ai_origin": target,
        "future_domain_status": status,
        "independent_ai_runtime_deployed": False,
        "dns_or_tls_verified": False,
        "windows_nodes_migrated": False,
        "worker_api_origin": "PINNED_TO_EXISTING_WEBSITE_IN_WINDOWS_SOURCE",
        "site_dependencies": {
            "owner_authentication": "EXISTING_PHP_MFA_GATEWAY",
            "commerce_journal_and_seo": "EXISTING_BERTINA_SITE",
            "business_database": "EXISTING_MOTHER_DB_NO_COPY",
            "site_to_worker_queue": "EXISTING_SIGNED_ED25519_OUTBOUND",
            "private_python_bridge": "EXISTING_HMAC_ADAPTER_OPT_IN",
        },
        "independently_relocatable_components": [
            "platform/jrei-python",
            "platform/jrei-v5/windows-worker",
            "private_owner_approved_model_artifacts",
            "explicitly_exported_owner_private_memory_with_provenance",
        ],
        "external_cutover_required": [
            "OWNER_PURCHASES_AND_CONTROLS_AI_DOMAIN",
            "SEPARATELY_PROVISION_HOST_TLS_AND_PRIVATE_STATE",
            "VERIFY_EXACT_SOURCE_SHA_AND_RESTORE_REHEARSAL",
            "PROVISION_PRIVATE_ORIGIN_AND_SERVICE_AUTHENTICATION",
            "VERIFY_SIGNED_WORKER_ROUTING_AND_REPLAY_PROTECTION",
            "VERIFY_DNS_TLS_HEALTH_AND_SITE_FALLBACK",
            "OWNER_ACCEPTS_FINAL_CUTOVER",
        ],
        "public_ai_routes_enabled": False,
        "site_deploy_triggered": False,
    }
