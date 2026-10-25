<?php
declare(strict_types=1);
/**
 * JREI News: ORIGINAL mother-registry seeding for institution origins.
 *
 * The latest owner's standing directive names the official institutions.
 * Their origins may be DISCOVERED automatically without nine separate
 * owner approvals. This is source metadata only, never a grant of robots,
 * transport, redistribution, article trust or permission to publish.
 *
 * The original JREI-KA reviewer must independently establish current policy
 * before acquisition. Uses no network, parallel database, second crawler,
 * background PHP daemon, or synthetic editorial/CMS approval.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}
require_once __DIR__.'/official-institution-directory.php';
require_once __DIR__.'/candidate-intake.php';
require_once __DIR__.'/owner-editorial.php';

/** One bounded private Cron iteration; idempotent and fail-closed. */
function jrNewsOriginalSeedOfficialInstitutionSources(
    PDO $pdo,array $privateJob,int $nowEpoch,int $limit=12
):array {
    $fromCron=($privateJob['source']??null)==='ORIGINAL_JREI_PRIVATE_NEWS_WORKER'&&
        ($privateJob['originalCronLeaseVerified']??null)===true&&
        ($privateJob['institutionCatalogueSeedEnabled']??null)===true;
    $fromMfa=($privateJob['source']??null)==='EXISTING_OWNER_NEWS_OPERATIONS'&&
        ($privateJob['confirmation']??null)==='DISCOVER_KNOWN_OFFICIAL_ORIGINS'&&
        is_array($privateJob['ownerSession']??null);
    if ((!$fromCron&&!$fromMfa)||$nowEpoch<=0||$limit<1||$limit>20)
        throw new RuntimeException('news_official_seed_private_authority_required');
    if($fromMfa)jrNewsOwnerAuthority($privateJob['ownerSession']);

    $summary=[
        'schema'=>'jr.jrei.news-original-institution-seed.v1',
        'examined'=>0,'newDiscovered'=>0,'alreadyRegistered'=>0,
        'previouslyRevokedOrSuperseded'=>0,'technicalHolds'=>0,
        'activeMonitorsAdded'=>0,'sourcePermissionsGranted'=>0,
        'articleApprovalsCreated'=>0,'publicationsCreated'=>0
    ];
    // A source-registration lease, not a second scheduling authority.
    $lockName='jrei-news-official-catalogue';
    $lease=$pdo->prepare('SELECT GET_LOCK(?,0)');
    $lease->execute([$lockName]);
    if((int)$lease->fetchColumn()!==1)
        return [...$summary,'leaseUnavailable'=>true];

    try{
        foreach(array_slice(jrNewsOfficialInstitutionDirectory(),0,$limit) as $entry){
            $summary['examined']++;
            $url=(string)$entry['origin'];
            $matches=jrNewsOfficialDirectoryMatch($url);
            if(($matches['institutionId']??null)!==$entry['id']||
               !in_array($entry['category'],['universities','examinations'],true)||
               !in_array($entry['priority'],['P0','P1','P2'],true)){
                $summary['technicalHolds']++;
                continue;
            }
            $pdo->beginTransaction();
            try{
                $check=$pdo->prepare(
                    'SELECT source_id,is_revoked,is_superseded
                       FROM jrei_exam_sources
                      WHERE BINARY source_locator_uri=BINARY ?
                      ORDER BY created_at DESC,source_id LIMIT 1 FOR UPDATE'
                );
                $check->execute([$url]);
                $existing=$check->fetch(PDO::FETCH_ASSOC);
                if(is_array($existing)){
                    if((int)$existing['is_revoked']===1||
                       (int)$existing['is_superseded']===1)
                        $summary['previouslyRevokedOrSuperseded']++;
                    else
                        $summary['alreadyRegistered']++;
                    $pdo->commit();
                    continue;
                }

                $id=jrNewsPrivateUuid();
                $sha=hash('sha256',$url);
                $type=$entry['category']==='examinations'?
                    'OFFICIAL_EXAM_NOTICE':'OFFICIAL_UNIVERSITY_NEWS';
                // No invented issuer/rights/reviewer or approved policy.
                $insert=$pdo->prepare(
                    "INSERT INTO jrei_exam_sources (
                        source_id,source_authority_id,source_title,
                        source_version,source_locator_digest,source_locator_uri,
                        country_code,educational_level,exam_category,
                        curriculum_version,subject_id,examination_year,
                        source_kind,rights_state,review_state,created_at,updated_at
                     ) VALUES (
                        ?,?,?, 'NEWS_DIRECTORY_V1',?,?,'IR',
                        'EDUCATIONAL_NEWS','OFFICIAL_ANNOUNCEMENTS',
                        'NEWS_CURRENT','NEWS_SOURCE',?,
                        ?,'PERMISSION_UNVERIFIED','DISCOVERED',?,?
                     )"
                );
                $insert->execute([
                    $id,'institution-'.$entry['id'],
                    $entry['nameFa'],$sha,$url,
                    (int)gmdate('Y',$nowEpoch),$type,
                    $nowEpoch,$nowEpoch
                ]);
                $policy=$pdo->prepare(
                    "INSERT INTO jrei_ka_source_policies (
                       source_id,priority_tier,refresh_interval_seconds,
                       next_due_at,updated_at,scheduling_state
                     ) VALUES (?, ?,3600,?,?,'PENDING_REVIEW')"
                );
                $policy->execute([
                    $id,$entry['priority'],$nowEpoch,$nowEpoch
                ]);
                $pdo->commit();
                $summary['newDiscovered']++;
            }catch(Throwable $e){
                if($pdo->inTransaction())$pdo->rollBack();
                // One unavailable source never prevents other official
                // institutions from being registered for review.
                $summary['technicalHolds']++;
            }
        }
    }finally{
        $release=$pdo->prepare('SELECT RELEASE_LOCK(?)');
        $release->execute([$lockName]);
    }
    return $summary;
}
