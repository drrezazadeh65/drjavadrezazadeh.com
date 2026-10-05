# Research-Ready Data Contract v1

## Core identifiers
- user_id: operational identity key; never used as the public research identifier.
- research_id: pseudonymous stable participant key.
- case_id: longitudinal case key.
- study_id: registered research study.
- instrument_id / instrument_version.
- item_id / item_version.
- response_id / session_id.
- scoring_version / interpretation_version / report_version.

## Quantitative response minimum
research_id, case_id, instrument_id, instrument_version, item_id, item_version, construct_id, respondent_role, response_value, response_label, collected_at, response_duration_ms, language, session_id, missing_reason, consent_version, source_type.

## Qualitative entry minimum
research_id, case_id, source_role, data_type, prompt_id, prompt_version, text_original, language, collected_at, assessment_stage, context_code, consent_version.

## Research export bundle
Each frozen export must include:
1. de-identified data file;
2. machine-readable data dictionary;
3. human-readable codebook;
4. instrument/scoring version manifest;
5. missing-value definitions;
6. provenance manifest;
7. inclusion/exclusion specification;
8. dataset version and freeze timestamp.

## Non-negotiable rules
Raw responses are immutable. Corrections are appended as auditable events. Derived variables never overwrite source data. Personally identifying fields are excluded from ordinary research exports. Service consent, privacy consent, research consent and publication consent are distinct records.
