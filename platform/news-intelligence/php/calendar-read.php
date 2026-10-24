<?php
declare(strict_types=1);
/**
 * Approved examination calendar public projection — mother DB read only.
 * The original JREI source-registry resolver supplies official HTTPS links
 * and current issuer status. The DB source_ref is NOT a URL.
 *
 * This is a source-only PHP library, not a public endpoint.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

function jrNewsApprovedExamCalendarSnapshot(
    PDO $pdo,int $nowEpoch,callable $originalJreiPublicSourceResolver,
    int $limit=300
): array {
    if ($nowEpoch<=0 || $limit<1 || $limit>300)
        throw new InvalidArgumentException('news_calendar_snapshot_invalid');
    $query=$pdo->prepare(
        "SELECT milestone_id,external_exam_key,milestone_type,title_fa,
                title_en,event_utc,timezone_name,source_ref,
                source_evidence_sha256,version_number
         FROM jrei_news_exam_milestones AS m
         WHERE m.review_state='OFFICIAL_DATE_REVIEWED' AND m.owner_approved=1
           AND m.event_utc>=?
           AND NOT EXISTS (
             SELECT 1 FROM jrei_news_exam_milestones AS newer
             WHERE newer.external_exam_key=m.external_exam_key
               AND newer.milestone_type=m.milestone_type
               AND newer.version_number>m.version_number
               AND newer.review_state='OFFICIAL_DATE_REVIEWED'
               AND newer.owner_approved=1
           )
         ORDER BY m.event_utc ASC LIMIT ?"
    );
    $query->bindValue(1,$nowEpoch,PDO::PARAM_INT);
    $query->bindValue(2,$limit,PDO::PARAM_INT);
    $query->execute();
    $events=[];$omitted=0;$verifiedSources=[];
    foreach ($query->fetchAll(PDO::FETCH_ASSOC) as $row) {
        // Several milestone updates can cite the same original source
        // and evidence version. Resolve each pair just once per request:
        // no cross-request cache can outlive an issuer's correction.
        $sourceKey=hash('sha256',(string)$row['source_ref']."\0".
            (string)$row['source_evidence_sha256']);
        if (!array_key_exists($sourceKey,$verifiedSources)) {
            $verifiedSources[$sourceKey]=$originalJreiPublicSourceResolver(
                $row['source_ref'],$row['source_evidence_sha256']
            );
        }
        $source=$verifiedSources[$sourceKey];
        if (!is_array($source) ||
            ($source['source']??null)!=='ORIGINAL_JREI_SOURCE_REGISTRY' ||
            ($source['issuerVerified']??null)!==true ||
            ($source['current']??null)!==true ||
            ($source['rightsCurrent']??null)!==true ||
            ($source['contentSha256']??null)!==$row['source_evidence_sha256'] ||
            !is_string($source['officialUrl']??null) ||
            !filter_var($source['officialUrl'],FILTER_VALIDATE_URL) ||
            !str_starts_with($source['officialUrl'],'https://')) {
            $omitted++;continue;
        }
        if (strlen((string)$row['external_exam_key'])>80 ||
            !preg_match('/^[a-zA-Z0-9._:-]{1,80}$/D',
                (string)$row['external_exam_key'])) {
            $omitted++;continue;
        }
        $events[]=[
            'schema'=>'jr.jrei.exam-event.v1',
            'eventId'=>$row['milestone_id'],
            'examId'=>$row['external_exam_key'],
            'milestone'=>$row['milestone_type'],
            'titleFa'=>$row['title_fa'],'titleEn'=>$row['title_en'],
            'startsAt'=>gmdate('Y-m-d\TH:i:s\Z',(int)$row['event_utc']),
            'timezone'=>$row['timezone_name'],
            'sourceUrl'=>$source['officialUrl'],
            'evidenceSha256'=>$row['source_evidence_sha256'],
            'version'=>(int)$row['version_number'],
            'status'=>'OFFICIAL_DATE_REVIEWED',
            'ownerPublicationApproved'=>true,
            'sourceVerifiedAtReadTime'=>true
        ];
    }
    return ['schema'=>'jr.jrei.news-approved-calendar-snapshot.v1',
        'generatedAtUtc'=>gmdate('Y-m-d\TH:i:s\Z',$nowEpoch),
        'events'=>$events,'approvedEventsReturned'=>count($events),
        'unverifiedEventsOmitted'=>$omitted,
        'privateAccountDataIncluded'=>false,
        'noScheduledNotificationsSent'=>true];
}
