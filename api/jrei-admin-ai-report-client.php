<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Website-only API client. Never evaluate an AI engine or generate simulated
 * analytics on Bertina. The operations controller must enforce SUPER_ADMIN,
 * fresh MFA, rate controls, and site account authorization BEFORE calling.
 * Returns upstream source-inventory truth, not a fabricated live report.
 */
function jrJreiAdminAiReportViaApi(array $configuration): array
{
    if (($configuration['jrei_python_internal_enabled']??false)!==true ||
        ($configuration['jrei_ai_admin_reports_enabled']??false)!==true) {
        throw new RuntimeException('JREI_ADMIN_REPORT_API_NOT_ENABLED');
    }
    require_once __DIR__.'/jrei-remote-api-client.php';
    $result=jrJreiPythonInternalPropose(
        $configuration, '/internal/v1/admin/ai-reports/snapshot', []
    );
    if (($result['ok']??false)!==true ||
        ($result['schema_version']??null)!=='jr.jrei.admin-ai-reporting-snapshot.v1' ||
        !in_array($result['status']??null,['SOURCE_INVENTORY_ONLY'],true) ||
        ($result['source_repository']??null)!=='drrezazadeh65/JREI' ||
        !is_array($result['engine_reports']??null) ||
        !is_array($result['workspaces']??null) ||
        count($result['engine_reports'])!==13 ||
        count($result['workspaces'])!==21 ||
        ($result['source_engine_count']??null)!==13 ||
        ($result['source_report_count']??null)!==36 ||
        ($result['source_action_count']??null)!==52) {
        throw new RuntimeException('JREI_ADMIN_REPORT_CONTRACT_REJECTED');
    }
    // The website does not merge local calculations into this AI report.
    // On an unavailable host, the caller must show unavailable/unknown.
    return $result;
}
