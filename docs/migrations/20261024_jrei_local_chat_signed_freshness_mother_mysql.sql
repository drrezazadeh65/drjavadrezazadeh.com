-- JREI-LM independent signed generative Worker freshness.
-- ADDITIVE ONLY on EXISTING drjavad1_store mother database, NOT EXECUTED.
-- Apply separately after backup, schema reconciliation and owner-approved
-- integrated acceptance. Neither a browser, crawler nor Windows Worker may
-- run this DDL. Preserve all existing approvals, keys and conversation data.
--
-- Evaluation-only Worker heartbeats on jrei_hybrid_nodes can legitimately
-- advertise model_id=NULL. They must not mask whether a generative Worker
-- is currently online. Keep an independent, signed chat-mode observation
-- tied to the existing owner-reviewed authorization row.
ALTER TABLE jrei_local_chat_node_authorizations
  ADD COLUMN IF NOT EXISTS last_signed_chat_seen_at BIGINT UNSIGNED NULL;

-- A nullable observation is UNKNOWN/OFFLINE, never an implicit model grant.
-- In particular, previously approved nodes cannot be shown online until
-- their original Ed25519 key submits a new valid signed local-chat poll.
-- No second worker registry, node identity or parallel database is created.
