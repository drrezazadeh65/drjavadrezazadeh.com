"""Provider-neutral JREI language-engine routing and independence contract.

This module selects among independently configured local model families for
isolated experiments. It makes NO HTTP request and cannot switch a running
worker. Model selection must stay owner-controlled, rights-cleared,
source-pinned, bilingual reviewed and accompanied by verifiable heldout data.

Non-neural skills and cited retrieval remain available independently of any
generative model. Replacing Qwen is a deployable future milestone, not an
assertion that a native foundation model was trained.
"""
from __future__ import annotations

from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, model_validator
from jrei_core.contracts import Digest, Identifier, StrictContract, Unit


class LocalLanguageEngine(StrictContract):
    engine_id: Identifier
    family: Identifier
    model_version: Identifier
    model_sha256: Digest
    runtime_sha256: Digest
    endpoint: str = Field(min_length=30, max_length=100)
    origin: Literal["EXTERNAL_OPEN_WEIGHTS", "JREI_TRAINED_WEIGHTS"]
    rights_cleared: bool = False
    owner_approved_for_sandbox: bool = False
    bilingual_independent_evidence_sha256: Digest | None = None
    independently_reviewed_fa: bool = False
    independently_reviewed_en: bool = False
    supported_languages: list[Literal["fa", "en"]] = Field(
        min_length=1, max_length=2
    )
    measured_critical_regression: bool = False
    operating_cost: Unit = 0.5
    expected_quality: Unit = 0.5

    @model_validator(mode="after")
    def enforce_loopback_and_identity(self) -> "LocalLanguageEngine":
        p = urlsplit(self.endpoint)
        if (p.scheme != "http" or p.hostname != "127.0.0.1" or
            p.path != "/v1/chat/completions" or not p.port or
            p.username or p.password or p.query or p.fragment or
            p.netloc != f"127.0.0.1:{p.port}" or
            not (1024 <= p.port <= 65535)):
            raise ValueError("MODEL_ROUTE_MUST_BE_STRICT_LOOPBACK")
        if len(set(self.supported_languages)) != len(self.supported_languages):
            raise ValueError("DUPLICATE_SUPPORTED_LANGUAGE")
        return self


class ModelPortfolioRequest(StrictContract):
    schema_version: Literal["jr.jrei.model-portfolio.v1"] = (
        "jr.jrei.model-portfolio.v1"
    )
    policy_sha256: Digest
    task_language: Literal["fa", "en"]
    purpose: Literal[
        "SANDBOX_LANGUAGE_RESEARCH", "OWNER_PRIVATE_DRAFT", "PUBLIC_CHAT"
    ] = "SANDBOX_LANGUAGE_RESEARCH"
    owner_emergency_stop: bool = True
    engines: list[LocalLanguageEngine] = Field(max_length=16)

    @model_validator(mode="after")
    def no_duplicate_engines(self) -> "ModelPortfolioRequest":
        ids = [e.engine_id for e in self.engines]
        if len(ids) != len(set(ids)):
            raise ValueError("DUPLICATE_MODEL_ENGINE")
        return self


class ModelPortfolioResult(StrictContract):
    schema_version: Literal["jr.jrei.model-portfolio-result.v1"] = (
        "jr.jrei.model-portfolio-result.v1"
    )
    recommended_engine_id: str | None
    eligible_sandbox_engine_ids: list[str]
    original_model_weights_required: Literal[False] = False
    tool_only_tasks_can_operate_without_llm: Literal[True] = True
    tested_native_jrei_model_exists: bool = False
    reason_codes: list[str]
    chosen_runtime_started: Literal[False] = False
    production_switch_executed: Literal[False] = False
    language_independence_proven: Literal[False] = False


def plan_model_portfolio(payload: ModelPortfolioRequest) -> ModelPortfolioResult:
    if payload.owner_emergency_stop:
        return ModelPortfolioResult(
            recommended_engine_id=None, eligible_sandbox_engine_ids=[],
            reason_codes=["OWNER_EMERGENCY_STOP"],
        )
    eligible = [
        e for e in payload.engines
        if e.rights_cleared and e.owner_approved_for_sandbox
        and payload.task_language in e.supported_languages
        and not e.measured_critical_regression
    ]
    # Experimental routing may compare diverse engines without declaring a
    # provider superior; provider output is not independent evaluation data.
    eligible.sort(key=lambda e:(
        -(e.expected_quality - 0.25 * e.operating_cost), e.engine_id
    ))
    # The public path is deliberately held until BOTH languages and their
    # independent source fixture receipts have been reviewed elsewhere.
    reviewable = [
        e for e in eligible
        if e.bilingual_independent_evidence_sha256
        and e.independently_reviewed_fa and e.independently_reviewed_en
        and set(e.supported_languages) == {"fa", "en"}
    ]
    if payload.purpose == "PUBLIC_CHAT":
        selected = None
        reasons = ["PUBLIC_CHAT_REQUIRES_SEPARATE_SIGNED_RELEASE",
                   "MODEL_PORTFOLIO_CANNOT_AUTHORIZE_PUBLIC_ROUTE"]
    elif payload.purpose == "OWNER_PRIVATE_DRAFT":
        selected = reviewable[0].engine_id if reviewable else None
        reasons = ["OWNER_PRIVATE_RUNTIME_NOT_ACTIVATED",
                   "INDEPENDENT_BILINGUAL_REVIEW_REQUIRED"]
    else:
        selected = eligible[0].engine_id if eligible else None
        reasons = ["ISOLATED_EXPERIMENT_PROPOSAL_ONLY"]
    return ModelPortfolioResult(
        recommended_engine_id=selected,
        eligible_sandbox_engine_ids=[e.engine_id for e in eligible],
        tested_native_jrei_model_exists=any(
            e.origin == "JREI_TRAINED_WEIGHTS"
            and e.bilingual_independent_evidence_sha256
            and e.independently_reviewed_fa
            and e.independently_reviewed_en
            for e in eligible
        ),
        reason_codes=reasons,
    )
