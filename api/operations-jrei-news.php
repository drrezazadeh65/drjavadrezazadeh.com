<?php
declare(strict_types=1);
/**
 * Bind the JREI News source contracts to the EXISTING operations session,
 * never a parallel owner identity or public API. The caller has already
 * authenticated SUPER_ADMIN and recent TOTP, and verified the exact CSRF.
 * Source only: BOTH independent release flags default OFF.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once dirname(__DIR__).'/platform/news-intelligence/php/news-library.php';

function jrOperationsNewsDispatch(
    PDO $pdo,array $config,string $route,string $method,
    array $body,string $ownerId,string $mfaSessionHash
): array {
    if(!in_array($method,['GET','POST'],true)||
       !preg_match('#^/owner/[a-z0-9/-]{1,90}$#D',$route)||
       !preg_match('/^[a-f0-9-]{36}$/iD',$ownerId)||
       !preg_match('/^[a-f0-9]{64}$/D',$mfaSessionHash))
        throw new InvalidArgumentException('news_owner_original_route_invalid');
    if(($config['jrei_news_integrated_release_accepted']??false)!==true||
       getenv('JR_JREI_NEWS_API_ENABLED')!=='true')
        throw new DomainException('news_original_integration_not_accepted');
    // The caller constructed this context only from the existing PHP
    // operationsRoute verified session + TOTP + same-origin CSRF, never JSON.
    $owner=[
        'source'=>'EXISTING_OPERATIONS_SESSION',
        'ownerAuthenticated'=>true,'mfaVerified'=>true,
        'csrfVerified'=>true,'scope'=>'JREI_NEWS_EDITORIAL',
        'accountId'=>$ownerId,
        'mfaAuditReference'=>'operations-mfa:'.substr($mfaSessionHash,0,64)
    ];
    $ctx=[
        'originalApiBootstrap'=>true,
        'finalIntegratedAcceptanceVerified'=>true,
        'ownerAuthorizedActivation'=>true,
        'existingOwnerMfaSession'=>$owner
    ];
    // All unsupported original integration ports deliberately throw.
    // A source-only bridge can list/read/stage/PAUSE approved metadata but
    // cannot counterfeit CMS receipts, Eco consent, independent review,
    // payment, journalism or mail delivery.
    $unavailable=static function(): never {
        throw new DomainException('news_original_external_port_not_accepted');
    };
    $ports=[];
    if(($config['jrei_news_source_activation_accepted']??false)===true){
        $ports['originalNewsMonitorActivationPolicy']=
          static function(string $monitorId,string $actor)use($ownerId):array{
            if($actor!==$ownerId||
               !preg_match('/^[a-f0-9-]{36}$/iD',$monitorId))
                throw new DomainException('news_owner_monitor_policy_invalid');
            return [
                'source'=>'ORIGINAL_OWNER_APPROVED_JREI_RELEASE',
                'finalIntegratedAcceptanceVerified'=>true,
                'newsMonitoringActivatedByOwner'=>true
            ];
          };
    }
    return jrNewsDispatchApi(
        $pdo,$method,'/news/v1'.$route,$body,$ctx,
        $unavailable,
        static fn():bool=>false,
        $unavailable,$unavailable,$ports
    );
}
