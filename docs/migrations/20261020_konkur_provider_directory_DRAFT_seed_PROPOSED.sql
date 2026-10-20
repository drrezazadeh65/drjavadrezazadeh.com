-- Proposed 003f provider directory intake — DRAFT ONLY (not a production migration).
-- Requires existing mother DB `drjavad1_store`, installed and independently reviewed 003e/003f,
-- tested restore, owner permission, fresh live information_schema and no duplicate/drift.
-- This file inserts provider *metadata*, never a student's result, identity, consent, rank or grade.
-- ALL entries default to provider_review_state=DRAFT. Listing is not approval of proprietary layouts.
-- Crucial: SANJESH_NATIONAL is an official *national* scorecard; SANJESH_MOCK is a DIFFERENT
-- mock-exam issuer/series. Do NOT equate score scales or merge their outcomes.
SET NAMES utf8mb4;
USE drjavad1_store;

INSERT INTO eco_exam_providers (id,provider_code,display_name,provider_kind,documented_source_url,provider_review_state)
SELECT UUID(),'SANJESH_NATIONAL','سازمان سنجش، کارنامه رسمی سراسری','OFFICIAL_ADMISSION','https://www.sanjesh.org/','DRAFT'
WHERE NOT EXISTS (SELECT 1 FROM eco_exam_providers WHERE provider_code='SANJESH_NATIONAL');
INSERT INTO eco_exam_providers (id,provider_code,display_name,provider_kind,documented_source_url,provider_review_state)
SELECT UUID(),'GHALAMCHI','کانون قلم‌چی','PRIVATE_MOCK','https://t.me/s/kanoonir/8684','DRAFT'
WHERE NOT EXISTS (SELECT 1 FROM eco_exam_providers WHERE provider_code='GHALAMCHI');
INSERT INTO eco_exam_providers (id,provider_code,display_name,provider_kind,documented_source_url,provider_review_state)
SELECT UUID(),'GAJ','گاج','PRIVATE_MOCK','https://t.me/s/gaj_ir','DRAFT'
WHERE NOT EXISTS (SELECT 1 FROM eco_exam_providers WHERE provider_code='GAJ');
INSERT INTO eco_exam_providers (id,provider_code,display_name,provider_kind,documented_source_url,provider_review_state)
SELECT UUID(),'GOZINE2','گزینه دو','PRIVATE_MOCK','https://t.me/s/gozine2?after=38982','DRAFT'
WHERE NOT EXISTS (SELECT 1 FROM eco_exam_providers WHERE provider_code='GOZINE2');
INSERT INTO eco_exam_providers (id,provider_code,display_name,provider_kind,documented_source_url,provider_review_state)
SELECT UUID(),'MAZ','ماز','PRIVATE_MOCK','https://www.scribd.com/document/904196526/','DRAFT'
WHERE NOT EXISTS (SELECT 1 FROM eco_exam_providers WHERE provider_code='MAZ');
INSERT INTO eco_exam_providers (id,provider_code,display_name,provider_kind,documented_source_url,provider_review_state)
SELECT UUID(),'SANJESH_MOCK','آزمون‌های آزمایشی تعاونی خدمات آموزشی سنجش','PRIVATE_MOCK','https://www.heyvagroup.com/shownews/7121/','DRAFT'
WHERE NOT EXISTS (SELECT 1 FROM eco_exam_providers WHERE provider_code='SANJESH_MOCK');
INSERT INTO eco_exam_providers (id,provider_code,display_name,provider_kind,documented_source_url,provider_review_state)
SELECT UUID(),'VALEH','واله — قالب کارنامه بررسی نشده','OTHER','https://www.webmasterfa.com/entrance-exam/','DRAFT'
WHERE NOT EXISTS (SELECT 1 FROM eco_exam_providers WHERE provider_code='VALEH');
INSERT INTO eco_exam_providers (id,provider_code,display_name,provider_kind,documented_source_url,provider_review_state)
SELECT UUID(),'MOBTAKERAN','مبتکران — قالب کارنامه بررسی نشده','OTHER','https://www.webmasterfa.com/entrance-exam/','DRAFT'
WHERE NOT EXISTS (SELECT 1 FROM eco_exam_providers WHERE provider_code='MOBTAKERAN');
INSERT INTO eco_exam_providers (id,provider_code,display_name,provider_kind,documented_source_url,provider_review_state)
SELECT UUID(),'AYANDESAZAN','آینده‌سازان — قالب کارنامه بررسی نشده','OTHER','https://www.webmasterfa.com/entrance-exam/','DRAFT'
WHERE NOT EXISTS (SELECT 1 FROM eco_exam_providers WHERE provider_code='AYANDESAZAN');
INSERT INTO eco_exam_providers (id,provider_code,display_name,provider_kind,documented_source_url,provider_review_state)
SELECT UUID(),'SCHOOL_LOCAL','آزمون مدرسه یا مؤسسه محلی','OTHER',NULL,'DRAFT'
WHERE NOT EXISTS (SELECT 1 FROM eco_exam_providers WHERE provider_code='SCHOOL_LOCAL');
INSERT INTO eco_exam_providers (id,provider_code,display_name,provider_kind,documented_source_url,provider_review_state)
SELECT UUID(),'OTHER','سایر برگزارکنندگان','OTHER',NULL,'DRAFT'
WHERE NOT EXISTS (SELECT 1 FROM eco_exam_providers WHERE provider_code='OTHER');

-- STOP. No CREATE/ALTER/DROP/UPDATE/DELETE, no schema approval, no learner data and no production execution evidence.
