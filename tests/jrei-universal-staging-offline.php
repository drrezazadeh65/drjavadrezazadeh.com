<?php
declare(strict_types=1);
// Exercise the original mother-DB candidate staging SQL with an in-memory
// PDO recorder. No production DB, network, rights grants or downloads.
define('BERTINA_API_BOOTSTRAPPED', true);
function validUuid(string $value): bool {
    return preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D', $value) === 1;
}
function jrKaUuid(): string { return 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; }
require_once dirname(__DIR__).'/api/jrei-ka-safe-discovery.php';
function insist(bool $ok, string $message): void {
    if (!$ok) { fwrite(STDERR, "FAIL: ".$message."\n"); exit(1); }
}
class StagingRecorder extends PDO {
    public array $writes = [];
    public string $preparedSql = '';
    public function __construct() {}
    public function prepare(string $query, array $options = []): PDOStatement|false {
        $this->preparedSql = $query;
        return new StagingStatement($this);
    }
}
class StagingStatement extends PDOStatement {
    public function __construct(private StagingRecorder $recorder) {}
    public function execute(?array $params = null): bool {
        $this->recorder->writes[] = $params;
        return true;
    }
    public function rowCount(): int { return 1; }
}
if (!class_exists('DOMDocument')) {
    echo "Universal staging offline: SKIP DOM extension unavailable\n";
    exit(0);
}
$seed = 'https://example.org/exams/index.html';
$html = '<a href="../resources/sample.pdf">PDF examination</a>'
       .'<a href="../resources/sample.docx">Word syllabus</a>'
       .'<a href="../resources/plan.xlsx">Study plan</a>'
       .'<a href="../resources/sample.docx">Duplicate link</a>'
       .'<a href="https://evil.example/steal.pdf">Unsafe cross-host link</a>';
$pdo = new StagingRecorder();
$count = jrKaStageHtmlDiscovery($pdo,
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222', $seed, $html, 123456);
insist($count === 3, 'must stage three unique same-host formats');
insist(count($pdo->writes) === 3, 'three SQL candidate writes');
insist(str_contains($pdo->preparedSql, "'DISCOVERED_REQUIRES_RIGHTS_REVIEW'"),
    'every discovered item remains unlicensed and under review');
$kinds = array_column($pdo->writes, 6);
insist(count(array_filter($kinds, fn($v) => $v === 'POTENTIAL_EXAM_DOCUMENT')) === 1,
    'original PDF kind unchanged');
insist(count(array_filter($kinds, fn($v) => $v === 'POTENTIAL_EDUCATIONAL_FILE')) === 2,
    'Word and spreadsheet staged as unapproved educational files');
$urls = array_column($pdo->writes, 3);
insist(count(array_unique($urls)) === 3, 'deduplicate URLs before insert');
echo "Universal educational source staging offline checks passed\n";
