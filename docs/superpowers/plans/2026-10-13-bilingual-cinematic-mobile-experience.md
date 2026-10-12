# Bilingual homepage and account experience — implementation plan

**Date:** 2026-10-13  
**Branch:** `migration/bertina-linux6`

## Goal
Make the Persian and English homepages easier to scan on phone and desktop, route visitors to services and the bookstore, and remove phone number as a registration barrier without changing account security, public URLs, SEO metadata, or the existing mobile app shell.

## Steps
1. Add a regression check for optional registration phone, visible bookstore entry points, and the dedicated responsive homepage stylesheet.
2. Add bilingual bookstore CTAs and load a small homepage-only experience stylesheet after existing styles.
3. Improve homepage visual hierarchy, card affordance, keyboard focus, reduced-motion behavior, and small-screen account actions.
4. Mark the phone field optional in the Persian account form and update its helper text. Leave email/password authentication and same-origin API behavior unchanged.
5. Run syntax/contract checks and the existing browser, SEO, and responsive CI gates; deploy the latest branch head once all required gates pass.
