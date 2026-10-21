-- Konkur 1405 live import acceptance — READ ONLY, 2026-10-21
-- Use against drjavad1_store after owner's successful six-document import.
-- Does not approve or publish any programme offerings.
SELECT DATABASE() AS selected_schema,
       CASE WHEN DATABASE()='drjavad1_store' THEN 'TARGET_OK' ELSE 'WRONG_DATABASE' END AS database_check;
SELECT d.document_code,d.pdf_page_count AS expected_pages,
       COUNT(p.id) AS actual_pages,
       COUNT(DISTINCT p.pdf_page_number) AS distinct_page_numbers,
       MIN(p.pdf_page_number) AS first_page,MAX(p.pdf_page_number) AS last_page,
       SUM(CASE WHEN p.page_review_state='UNREVIEWED' THEN 1 ELSE 0 END) AS unreviewed_pages,
       CASE WHEN COUNT(p.id)=d.pdf_page_count
             AND COUNT(DISTINCT p.pdf_page_number)=d.pdf_page_count
             AND MIN(p.pdf_page_number)=1
             AND MAX(p.pdf_page_number)=d.pdf_page_count
            THEN 'PAGE_ANCHORS_COMPLETE' ELSE 'INVESTIGATE' END AS page_integrity
FROM eco_admission_documents d
LEFT JOIN eco_admission_document_pages p ON p.document_id=d.id
WHERE d.document_code IN ('SANJESH_1405_HUMANITIES','SANJESH_1405_EXPERIMENTAL','SANJESH_1405_MATHEMATICS','SANJESH_1405_ARTS','SANJESH_1405_APPENDICES','SANJESH_1405_RECORDS_BASED')
AND d.revision_no=1
GROUP BY d.id,d.document_code,d.pdf_page_count
ORDER BY d.document_code;
SELECT COUNT(*) AS source_documents,COALESCE(SUM(d.pdf_page_count),0) AS expected_page_total
FROM eco_admission_documents d
WHERE d.document_code IN ('SANJESH_1405_HUMANITIES','SANJESH_1405_EXPERIMENTAL','SANJESH_1405_MATHEMATICS','SANJESH_1405_ARTS','SANJESH_1405_APPENDICES','SANJESH_1405_RECORDS_BASED') AND d.revision_no=1;
-- Expected: 6 documents, 2412 pages. This is metadata completeness only.
