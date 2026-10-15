# JHELA | OJS 3.5 double-anonymised peer-review form, v1.0

**Purpose:** Operational configuration sheet for authorised journal managers. NOT an active public submission form.  
**Language:** English; the Persian site provides explanatory guidance but the journal's submitted research and review reports are in English.  
**Platform:** Native PKP Open Journal Systems 3.5. Do not programmatically write unpublished reviews into the public site, external spreadsheets or GitHub.

## 1. Install through supported native features
1. Once the installed OJS version and an administrator account are independently verified, sign in as the authorised **Journal Manager** (not the main site customer-admin account).
2. Navigate to the native OJS **Review Forms** configuration in the Journal Manager settings. The exact menu location and field-type labels must be checked in the installed release; refer to the [official PKP Journal Manager guide](https://github.com/pkp/pkp-docs/tree/main/learning-ojs/journal-managers/en).
3. Create a form titled **JHELA | Human-Centred Research Assessment v1.0**. Choose native long-answer, single-choice or tick-box field types as appropriate. For each item verify **requiredness** and the native option controlling whether its answer can be included in the author-facing editorial decision.
4. Mark **only** author-facing scientific observations as eligible for sharing. Confidential comments, reviewer identity, private integrity allegations, conflict declarations and other protected metadata must remain restricted to the handling editor. Confirm this using two distinct staging accounts.
5. Do not edit an already-used form in place when historical reviews exist. Create a new **v1.1** form and preserve the former form for audit/reproducibility. OJS review recommendations remain separate from any optional diagnostic rating; the handling editor has final scholarly authority.
6. Configure **Anonymous Reviewer / Anonymous Author** for independent research articles. Verify removal of tracked changes, acknowledgements, file properties, supplementary-file author names and self-identifying language before a review invitation.
7. Enter reviewer guidelines, invitation and decision templates in the native workflow. Test confidentiality, declined invitations, expired links, revisions and PDF/docx attachments before enabling external authors.

## 2. Questions to configure

### A. Editorial eligibility: confidential pre-review declarations
**Field A1 — Review competency and independence (required, handling-editor-only)**  
*Have you read the manuscript's title/abstract, and do you have sufficient disciplinary, methodological and contextual expertise to assess its principal claims? Disclose any personal, professional, financial, institutional or recent collaboration conflict. Decline if independence or available time is insufficient.*  
Suggested input: long-answer plus separate checkbox of confirmation. **Not sent to author.**

**Field A2 — Confidentiality agreement (required, handling-editor-only)**  
*I will keep the unpublished manuscript and all associated participant information confidential. I will not upload the manuscript or review to unapproved third-party AI systems, share it with others, or use unpublished findings for personal or professional advantage.*  
Suggested input: required checkbox. **Not sent to author.**

### B. Author-facing scholarly assessment (narrative; required unless clearly inapplicable)
**Field B1 — Research problem, significance and originality**  
*What question or problem does the manuscript address? How accurately does it position itself within the relevant literature, and what specific contribution is supported by the study? Distinguish a genuinely supported innovation from novelty asserted without comparison.*

**Field B2 — Conceptual/theoretical integrity**  
*Are key constructs defined and the argument developed coherently? Does the conceptual framing fit the inquiry rather than predetermine its conclusions? Explain relevant alternative interpretations where appropriate.*

**Field B3 — Methodological fit and transparency**  
*Are the research design, setting, participants/corpus, sampling, instruments, procedures and analytic strategy appropriate for the research questions? Identify material omissions. Do not penalise qualitative, mixed-methods, historical, design-based or locally situated research merely for not conforming to a quantitative template.*

**Field B4 — Evidence, results and warrant of interpretation**  
*Are the reported findings adequately supported by the data, documents or argument? Is the analysis reproducible or assessable to a reasonable extent? Identify possible biases, rival explanations and unwarranted causal or generalisable claims.*

**Field B5 — Ethical reasoning and protection**  
*Does the manuscript responsibly address consent, oversight when applicable, anonymity, data stewardship, safeguarding and any vulnerable participants, particularly learners or minors? Raise sensitive identifiable allegations privately to the editor rather than in the author-facing report.*

**Field B6 — Human-centred and contextual significance**  
*Does the study take account of educational actors, institutional relationships and contextual conditions? Evaluate the practical or theoretical implications without demanding that every study produce immediate classroom recommendations.*

**Field B7 — Presentation and scholarly transparency**  
*Assess clarity of English exposition, source accuracy, reporting statements, tables/figures, references, funding, competing interests, data availability and disclosed use of automated tools. Point out material barriers to understanding; do not impose a single dialect or rhetorical style where the scholarly content remains clear.*

**Field B8 — Prioritised revision guidance**  
*Explain the minimum changes needed to support the principal contribution. Organise essential revisions separately from helpful but optional improvements. Ensure requests are feasible and proportionate to the submission's design and purpose.*

### C. Optional descriptive rating (for internal calibration only)
For Fields B1–B7, a supplementary response may use:
- **5 — Strongly substantiated:** clear, coherent and appropriately evidenced
- **4 — Mostly substantiated:** limited, correctable qualifications
- **3 — Mixed evidence:** substantial but addressable uncertainties
- **2 — Weakly substantiated:** fundamental revision required
- **1 — Unsupported:** major defects prevent responsible interpretation
- **N/A — Not applicable to the method/article type**

**Never compute an automatic sum, average, acceptance threshold or algorithmic reviewer ranking.** Native OJS acceptance decisions remain independently justified by a responsible editor.

### D. Handling-editor-only commentary
**Field D1 — Integrity or identity-sensitive concerns**  
*State the precise observation and potential implications without making an unsubstantiated allegation of misconduct. Identify which private manuscript element needs independent examination.*

**Field D2 — Reviewer recommendation and confidence**  
Choose one of the native OJS recommendations appropriate to the installed configuration, typically accept, minor revisions, major revisions/resubmit, reject, or see comments. Explain any uncertainty and disciplinary limits. **The recommendation is advisory, not the editorial decision.**

**Field D3 — Further review required?**  
*Would a different methodological or disciplinary reviewer materially improve the assessment? Which expertise and why?*  
Do not supply private third-party contact information without a lawful reason.

## 3. Editor review and due process
- Normally use two independent, qualified external reports, with a documented exception path for other article types. A numerical majority is neither necessary nor sufficient for acceptance.
- The editor must check reviewer conflicts, anonymisation, report tone and substantive relevance before sharing any report.
- Manuscripts authored by the Editor-in-Chief or close collaborators require a documented independent handling editor and recusal.
- Authors receive a dated, reasoned decision letter with redacted anonymised reports and a revision deadline when applicable.
- Maintain immutable submission/revision versions and correspondence in OJS, and preserve appeal/complaint routes. The author must never see reviewer identity or editor-only fields.

## 4. Native acceptance tests
- Verify **author A** can see only a redacted review attached to author A's own manuscript.
- Verify **reviewer B** cannot see unrelated submission C, reviewer A's private report, or the author-identifying title page.
- Verify a refused/conflicted reviewer loses access; an editor cannot handle their own research; finance staff cannot access reviews.
- Verify a reviewer cannot submit an empty required narrative or force acceptance through an optional numeric rating.
- Verify an editor can draft an informed decision, request a revision, record the revision round and issue a letter with identities protected.
- Verify accessibility at 320px and keyboard-only operation, email dispatch and a restore of the staging review record.

## Source authority
- [PKP OJS 3.5: reviewer workflow](https://github.com/pkp/pkp-docs/blob/main/learning-ojs/reviewer/en/index.md)
- [PKP OJS 3.5: editor review and assignment](https://github.com/pkp/pkp-docs/blob/main/learning-ojs/editorial-workflow/en/review.md)
- JHELA's policy reference: `docs/journal/JHELA_EDITORIAL_DESIGN_FINANCE_RELEASE_MASTER_20261016.md`

This file is a configuration-ready specification. It does not assert that a form, reviewer account, private manuscript or decision currently exists in the production OJS database.
