# JR Konkur 1405 — First-Pass Official Source Text Audit
**Date:** 2026-10-20  
**Authority:** Iranian National Organization of Educational Testing (سازمان سنجش آموزش کشور), as identified in the six owner-supplied guides.  
**Status:** WHOLE-EXTRACTED-TEXT SCAN / NOT PAGE-VERIFIED / NO PROGRAMME ROWS RELEASED

## Method and limits

Read the available full extracted text returned by the connected Google Drive provider for each of six Sanjesh PDFs. Count text characters, lines, unclassified five-digit number patterns and key terminology. These counts are **not** PDF page counts, validated programme row counts, or official programme capacity totals. Five-digit tokens include telephone, statistical, reference and other non-programme numbers. The extracted text lacks reliable machine-verified per-page table geometry and full page-image inspection; publication remains disabled until visual page/table checks and applicable amendments are audited.

| Guide | Drive file ID | Extracted chars | Lines | 5-digit occurrences (unclassified) | Distinct 5-digit tokens | Kodereshteh mentions | PDF page-verified? |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| humanities | `1zN9cfFW8tDuYCy8qZAJUikq8NKw5hTjb` | 2001625 | 44325 | 18081 | 18079 | 595 | No |
| experimental | `16Q_b-WE59-pWEteApAJxx0FxT5uLinR7` | 2163789 | 46687 | 18557 | 18553 | 695 | No |
| mathematics | `1EtfLzh7YnsjnWqQYTGamLBIAmjkQ8VG2` | 1520773 | 31866 | 15053 | 15048 | 360 | No |
| arts | `1z2u4VKDSNBCjw403o9tqty6ztt5jetFZ` | 973228 | 19334 | 10523 | 10521 | 335 | No |
| appendices | `1AZkqD801KS0wp3pmT0Kcu-MC_Sr0FHJZ` | 235013 | 3309 | 40 | 34 | 2 | No |
| records_based | `1a1kdO6WWaOt3GrKFKmxjgeWqsQCddMlC` | 833988 | 15461 | 9458 | 9457 | 288 | No |

## Data quality observations

- The extracted content includes official admission rules, programme-related terminology and candidate numeric codes, but linear text order sometimes joins row values and printed-page headers.
- Programme-location codes must be recorded as five-character strings; conversion from Persian and Arabic numerals must never lose leading zeros.
- Official issuer verification and software extraction accuracy are separate gates.
- Key admission fields (institution, programme, method, degree, capacity, source page, special conditions and amendments) cannot be published as verified from these text counts.
- The foreign-languages guide and later official correction notices have not been confirmed within the current six-file inventory.
- The current implementation intentionally returns no probability estimate and does not automatically activate any unreviewed rows.

## Required next source-validation work

1. Extract page-resolved PDF text and visually inspect programme tables and repeated headings.
2. Associate every prospective programme row with its exact source PDF, file fingerprint, original page and edition.
3. Human-review unique five-digit programme-location codes, institute names, capacities and supplementary requirements.
4. Track amendments as separate versioned source records with supersession and effective dates.
5. After authorized production database/permission audit, expose reviewed rows through the existing PHP/Studio architecture.

## Machine-readable measurements

```json
{
  "schema": "jr-konkur-source-text-audit-v1",
  "cycle": 1405,
  "findings": [
    {
      "key": "humanities",
      "id": "1zN9cfFW8tDuYCy8qZAJUikq8NKw5hTjb",
      "title": "رونوشت ensani_v1.pdf",
      "extractedTextCharacters": 2001625,
      "extractedTextLines": 44325,
      "unclassifiedFiveDigitTokenOccurrences": 18081,
      "distinctUnclassifiedFiveDigitTokens": 18079,
      "terms": {
        "programmeReferences": 595,
        "quotaMentions": 114,
        "tuitionMentions": 65,
        "commitmentMentions": 218
      },
      "sanjeshWebsiteMentioned": true,
      "sourceTextRead": true,
      "pdfPageAuditComplete": false,
      "programmeTablesVerified": false
    },
    {
      "key": "experimental",
      "id": "16Q_b-WE59-pWEteApAJxx0FxT5uLinR7",
      "title": "Tajrobi_v3.pdf",
      "extractedTextCharacters": 2163789,
      "extractedTextLines": 46687,
      "unclassifiedFiveDigitTokenOccurrences": 18557,
      "distinctUnclassifiedFiveDigitTokens": 18553,
      "terms": {
        "programmeReferences": 695,
        "quotaMentions": 125,
        "tuitionMentions": 903,
        "commitmentMentions": 2138
      },
      "sanjeshWebsiteMentioned": true,
      "sourceTextRead": true,
      "pdfPageAuditComplete": false,
      "programmeTablesVerified": false
    },
    {
      "key": "mathematics",
      "id": "1EtfLzh7YnsjnWqQYTGamLBIAmjkQ8VG2",
      "title": "Riazi_v1.pdf",
      "extractedTextCharacters": 1520773,
      "extractedTextLines": 31866,
      "unclassifiedFiveDigitTokenOccurrences": 15053,
      "distinctUnclassifiedFiveDigitTokens": 15048,
      "terms": {
        "programmeReferences": 360,
        "quotaMentions": 114,
        "tuitionMentions": 104,
        "commitmentMentions": 357
      },
      "sanjeshWebsiteMentioned": true,
      "sourceTextRead": true,
      "pdfPageAuditComplete": false,
      "programmeTablesVerified": false
    },
    {
      "key": "arts",
      "id": "1z2u4VKDSNBCjw403o9tqty6ztt5jetFZ",
      "title": "honar_v1.pdf",
      "extractedTextCharacters": 973228,
      "extractedTextLines": 19334,
      "unclassifiedFiveDigitTokenOccurrences": 10523,
      "distinctUnclassifiedFiveDigitTokens": 10521,
      "terms": {
        "programmeReferences": 335,
        "quotaMentions": 111,
        "tuitionMentions": 62,
        "commitmentMentions": 183
      },
      "sanjeshWebsiteMentioned": true,
      "sourceTextRead": true,
      "pdfPageAuditComplete": false,
      "programmeTablesVerified": false
    },
    {
      "key": "appendices",
      "id": "1AZkqD801KS0wp3pmT0Kcu-MC_Sr0FHJZ",
      "title": "Peyvast_v1.pdf",
      "extractedTextCharacters": 235013,
      "extractedTextLines": 3309,
      "unclassifiedFiveDigitTokenOccurrences": 40,
      "distinctUnclassifiedFiveDigitTokens": 34,
      "terms": {
        "programmeReferences": 2,
        "quotaMentions": 14,
        "tuitionMentions": 25,
        "commitmentMentions": 119
      },
      "sanjeshWebsiteMentioned": true,
      "sourceTextRead": true,
      "pdfPageAuditComplete": false,
      "programmeTablesVerified": false
    },
    {
      "key": "records_based",
      "id": "1a1kdO6WWaOt3GrKFKmxjgeWqsQCddMlC",
      "title": "NoExamCsSar1405_v2.pdf",
      "extractedTextCharacters": 833988,
      "extractedTextLines": 15461,
      "unclassifiedFiveDigitTokenOccurrences": 9458,
      "distinctUnclassifiedFiveDigitTokens": 9457,
      "terms": {
        "programmeReferences": 288,
        "quotaMentions": 158,
        "tuitionMentions": 16,
        "commitmentMentions": 168
      },
      "sanjeshWebsiteMentioned": true,
      "sourceTextRead": true,
      "pdfPageAuditComplete": false,
      "programmeTablesVerified": false
    }
  ]
}
```

**Release gate:** 0 officially approved programme-location records at this stage. All source data are retained in read-only connected Drive; no PDF content was republished into the website.
