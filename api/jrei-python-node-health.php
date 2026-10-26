<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Signed, outbound Windows -> Bertina Python *liveness* observations.
 * Existing jrei-hybrid-worker.php Ed25519 node auth and unique nonce ledger
 * are mandatory before calling jrPythonNodeStore(). No Python port is opened.
 * An observation is NOT proof of inference, ML training, DB, crawling or News.
 */
const JR_PY_NODE_SCHEMA = 'jr.jrei.python-node-observation.v1';
const JR_PY_NODE_HEALTH_SCHEMA = 'jr.jrei.python-health.v1';

function jrPythonNodeSchemaReady(PDO $pdo): bool
{
    try {
        $pdo->query('SELECT node_id,python_process,health_schema,node_observed_at,server_received_at FROM jrei_python_node_health LIMIT 0');
        return true;
    } catch (Throwable $e) { return false; }
}
function jrPythonNodeValidate(mixed $body, int $now): ?array
{
    if (!is_array($body) || array_is_list($body) ||
        array_keys($body) !== ['schema','pythonProcess','pythonHealthSchema','nodeObservedAt']) {
        return null;
    }
    if ($body['schema'] !== JR_PY_NODE_SCHEMA ||
        !in_array($body['pythonProcess'], ['RESPONDING','UNAVAILABLE'], true) ||
        !is_string($body['pythonHealthSchema']) ||
        ($body['pythonProcess'] === 'RESPONDING' &&
         $body['pythonHealthSchema'] !== JR_PY_NODE_HEALTH_SCHEMA) ||
        ($body['pythonProcess'] === 'UNAVAILABLE' &&
         $body['pythonHealthSchema'] !== 'NOT_OBSERVED') ||
        !is_int($body['nodeObservedAt']) ||
        abs($now - $body['nodeObservedAt']) > 120) {
        return null;
    }
    return $body;
}
function jrPythonNodeStore(PDO $pdo, string $node, array $data, int $now): void
{
    if (!jrHybridUuid($node)) throw new DomainException('python_node_id_invalid');
    $q=$pdo->prepare('INSERT INTO jrei_python_node_health
      (node_id,python_process,health_schema,node_observed_at,server_received_at)
      VALUES(?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        python_process=IF(VALUES(node_observed_at)>=node_observed_at,
                          VALUES(python_process),python_process),
        health_schema=IF(VALUES(node_observed_at)>=node_observed_at,
                         VALUES(health_schema),health_schema),
        server_received_at=IF(VALUES(node_observed_at)>=node_observed_at,
                              VALUES(server_received_at),server_received_at),
        node_observed_at=GREATEST(node_observed_at,VALUES(node_observed_at))');
    $q->execute([$node,$data['pythonProcess'],$data['pythonHealthSchema'],
                 $data['nodeObservedAt'],$now]);
}
function jrPythonNodeOwnerSnapshot(PDO $pdo, array $cfg): array
{
    $ready=jrPythonNodeSchemaReady($pdo);
    $enabled=($cfg['jrei_python_node_heartbeat_enabled']??false)===true;
    $result=[
       'ok'=>true,'schema'=>'jr.jrei.python-node-owner-snapshot.v1',
       'bridgeEnabled'=>$enabled,'motherTableReady'=>$ready,
       'signaturesVerifiedByGateway'=>true, // applies only to persisted reports
       'pythonApiConnectedToMotherDb'=>false,
       'modelInferenceAttested'=>false,
       'autonomousLearningActive'=>false,
       'newsPublishingActive'=>false,
       'publicReleaseApproved'=>false,
       'nodes'=>[],'checkedAt'=>time()
    ];
    if (!$ready) return $result;
    $q=$pdo->query('SELECT h.node_id,h.python_process,h.health_schema,
        h.node_observed_at,h.server_received_at,n.status,n.revoked_at
      FROM jrei_python_node_health h
      JOIN jrei_hybrid_nodes n ON n.node_id=h.node_id
      ORDER BY h.server_received_at DESC LIMIT 20');
    $now=time();
    foreach($q as $row) {
        $enabledNode=$row['status']==='ENABLED' && $row['revoked_at']===null;
        $age=max(0,$now-(int)$row['server_received_at']);
        $result['nodes'][]=[
            'nodeId'=>$row['node_id'],
            'reportedPythonProcess'=>$row['python_process'],
            'healthSchema'=>$row['health_schema'],
            'nodeObservedAt'=>(int)$row['node_observed_at'],
            'serverReceivedAt'=>(int)$row['server_received_at'],
            'reportAgeSeconds'=>$age,
            'liveNodeReportFresh'=>$enabled && $enabledNode && $age<=90 &&
                $row['python_process']==='RESPONDING',
            'observationScope'=>'SIGNED_EXISTING_NODE_REPORT_NOT_INDEPENDENT_PYTHON_AUDIT'
        ];
    }
    return $result;
}
