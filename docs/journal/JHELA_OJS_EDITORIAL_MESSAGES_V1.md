# JHELA — English editorial correspondence kit v1.0 (OJS native templates)

**Status:** Editorial drafts for installation and staff approval, NOT emails already sent.  
**Privacy:** Messages are to be delivered from the verified journal mailbox through native OJS only after SMTP, sender identity, DKIM/SPF alignment, session links and permissions are tested. No external mailing list may receive manuscript titles, files, unpublished data or reviewer identities.  
**Template fields in square brackets are editorial placeholders, not verified OJS merge tags**. Replace using **supported OJS email variables** in the exact installed version or fill within its authenticated editor composer. Do not paste a raw manuscript, identifiable participant details or private links into a public page.

## 1. Acknowledgement of a successfully recorded submission
**Subject:** JHELA | Submission received — [MANUSCRIPT_ID]

Dear [CORRESPONDING_AUTHOR],

Your manuscript, “[ARTICLE_TITLE]” (reference [MANUSCRIPT_ID]), has been received by the Journal of Human-Centred Education, Learning and Assessment. It will first undergo an editorial screening for journal scope, completeness, research integrity and the requirements for independent peer review.

This acknowledgement confirms receipt in the journal's secure submission system; it does not indicate that the manuscript has been accepted for review or publication. Please use the authenticated author dashboard to track its status, provide missing information or respond to an editor's request.

JHELA does not charge a submission fee. Any future article-processing charge is governed by the disclosed policy applicable to your manuscript and does not influence editorial decisions.

Kind regards,  
JHELA Editorial Office

**Trigger:** OJS database commit of the actual submission, once only; never on an unfinished draft.

## 2. Invitation to independent review
**Subject:** Confidential review invitation | JHELA | [MANUSCRIPT_ID]

Dear [REVIEWER],

On behalf of JHELA, I invite you to consider reviewing manuscript [MANUSCRIPT_ID], provisionally titled “[BLINDED_TITLE]”, in your area of expertise. The research concerns [NON_IDENTIFYING_SUMMARY]. An anonymised manuscript and appropriate review instructions will be made available through your authenticated journal account only after you accept the invitation and confirm your independence.

Please respond through OJS by [RESPONSE_DUE_DATE]. If you accept, the proposed review deadline is [REVIEW_DUE_DATE]. You are free to decline if the subject, method, available time or any actual or perceived competing interest makes an independent review inappropriate.

The manuscript and all related records remain confidential. They must not be shared, used for professional advantage or uploaded to unauthorised generative-AI services. If a potential conflict or integrity concern exists, notify the handling editor privately before accessing the manuscript.

Thank you for considering this scholarly service.

Sincerely,  
[UNCONFLICTED_HANDLING_EDITOR]  
JHELA

**Trigger:** approved editor-initiated native OJS reviewer invitation with masked identity and an expiring access route.

## 3. Major revision required
**Subject:** Editorial decision — major revision | JHELA | [MANUSCRIPT_ID]

Dear [CORRESPONDING_AUTHOR],

Thank you for submitting “[ARTICLE_TITLE]”. After considering the available independent assessments and my own evaluation, I invite a substantially revised version for further consideration. This invitation is not a promise of acceptance.

The principal issues requiring attention are [EDITORIAL_SUMMARY_OF_ESSENTIAL_REVISIONS]. The attached/available anonymised reports provide additional reasoning and distinguish central methodological or interpretive concerns from more limited suggestions. Please submit a point-by-point response identifying where each material concern was addressed, or explaining with evidence why an alternative approach is justified.

If you decide to revise, upload the revised manuscript and response through your authenticated OJS account by [DATE]. Any additional review round will be considered in relation to the revisions and the manuscript's scholarly requirements.

With regards,  
[HANDLING_EDITOR]  
JHELA

**Check before sending:** no reviewer identities, editor-only content, protected files or payment prompts in author-facing message.

## 4. Minor revision required
**Subject:** Editorial decision — minor revision | JHELA | [MANUSCRIPT_ID]

Dear [CORRESPONDING_AUTHOR],

The manuscript “[ARTICLE_TITLE]” addresses a question of potential relevance to JHELA. Before a final editorial decision, the points identified in [CONCISE_EDITORIAL_SUMMARY] require clarification or limited revision.

Please provide an updated manuscript and a response to each substantive comment by [DATE]. The next editorial decision will be based on the adequacy of the revision, not on a numerical count of reviewer recommendations.

Kind regards,  
[HANDLING_EDITOR]

## 5. Rejection / desk rejection with due process
**Subject:** Editorial decision | JHELA | [MANUSCRIPT_ID]

Dear [CORRESPONDING_AUTHOR],

Thank you for considering JHELA for your work, “[ARTICLE_TITLE]”. After [EDITORIAL_SCREENING / INDEPENDENT_REVIEW], the journal is unable to proceed with the manuscript.

The central grounds for this decision are [SPECIFIC_REASONED_JUSTIFICATION]. In the context of the journal's current remit and evidential expectations, [CAREFUL_EXPLANATION_AND_LIMITS]. We recognise that this judgement does not necessarily determine the value of the research in other publication contexts.

If you believe a material procedural error or undisclosed conflict affected the decision, you may submit a reasoned appeal through the formal confidential channel described in the journal's policy. An appeal is distinct from disagreement with an otherwise reasoned scholarly assessment.

Sincerely,  
[UNCONFLICTED_HANDLING_EDITOR]  
JHELA

**Important:** No automatic accusations, no speculative misconduct claims, no invented reviewer consensus.

## 6. Conditional acceptance — not an invoice
**Subject:** Scholarly acceptance decision | JHELA | [MANUSCRIPT_ID]

Dear [CORRESPONDING_AUTHOR],

Following the completion of editorial review, I am pleased to inform you that “[ARTICLE_TITLE]” has been accepted in principle for publication in JHELA, subject to final production and metadata verification.

Our editorial office will contact you through OJS about copyediting, author proofs, affiliations, reference accuracy, ethics and disclosure statements, copyright and the approved open-access licence. Acceptance is an academic decision. Any applicable payment or waiver arrangement, if the journal's legally authorised fee service is active, is managed separately and may not affect the editorial record.

Please do not publicise an ISSN, DOI, issue assignment or publication date until the journal provides a verified record.

Sincerely,  
[INDEPENDENT_DECISION_EDITOR]  
JHELA

**Trigger:** final independent acceptance logged in native OJS only. This template must not be used while formal submissions remain closed.

## 7. Finance: authorised post-acceptance invoice / complete waiver
**Subject:** JHELA publication finance notice | [MANUSCRIPT_ID]

Dear [CORRESPONDING_AUTHOR],

Following the editorial acceptance of [MANUSCRIPT_ID], the separate JHELA finance office confirms [APC_TYPE] and the amount applicable under the published rate fixed at submission: [CURRENCY_AMOUNT]. The confirmed waiver for this article is [WAIVER_AMOUNT / WAIVER_PERCENT], leaving [AMOUNT_DUE] if any.

If a payment is lawfully due, the verified invoice [INVOICE_ID] states applicable tax, currency, issuer, payment method, refund policy and due date. The journal will never ask you to transfer funds to personal accounts or to provide card details by email. Do not pay an unverified payment request.

The editorial decision was made independently of payment or waiver eligibility. Please contact the finance office through the official journal channel if any detail requires correction.

JHELA Finance Office

**Current hard stop:** Do not activate this template, issue invoices or accept payments before OJS, publisher identity, legal currency collection and the full finance workflow are certified.

## 8. Appeal acknowledgement
**Subject:** Confidential appeal acknowledged | JHELA | [MANUSCRIPT_ID]

Dear [CORRESPONDING_AUTHOR],

Your request for review of the editorial process concerning [MANUSCRIPT_ID] has been received and will be examined by an editor who has no material conflict in the matter. The review will consider procedural fairness, the grounds provided and relevant recorded decisions; it is not an automatic new peer-review round.

A substantive response will be communicated through the private OJS account when the examination is complete. Please avoid sending research-participant identifiers or unpublished manuscript files outside the protected system.

Kind regards,  
JHELA Editorial Office

---

**Release instructions:** Journal Manager and Editor-in-Chief must review wording, configure native variable substitution, test emails with consented staging accounts, inspect blind-review leakage and confirm journal sender domain before first use. Maintain a versioned copy of text changes, but never store generated live correspondence or actual manuscript metadata in GitHub.

**Framework:** [PKP editor workflow](https://github.com/pkp/pkp-docs/blob/main/learning-ojs/editorial-workflow/en/review.md); [reviewer guide](https://github.com/pkp/pkp-docs/blob/main/learning-ojs/reviewer/en/index.md); [author guide](https://github.com/pkp/pkp-docs/blob/main/learning-ojs/author/en/index.md).
