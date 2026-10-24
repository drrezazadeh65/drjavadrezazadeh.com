<?php
declare(strict_types=1);
// Source-only Iran night-window regressions. No DB, HTTP, crawler or payments.
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/jrei-nightly-window.php';
function jrNightAssert(bool $ok,string $name): void {
    if(!$ok)throw new RuntimeException('JREI_IRAN_NIGHT_REGRESSION_'.$name);
    echo "PASS ".$name."\n";
}
function jrNightTime(string $local): int {
    return (new DateTimeImmutable($local,new DateTimeZone('Asia/Tehran')))->getTimestamp();
}
jrNightAssert(!jrJreiIranNightOpen(jrNightTime('2026-10-24 01:59:59')),'before_02_blocked');
jrNightAssert(jrJreiIranNightOpen(jrNightTime('2026-10-24 02:00:00')),'02_open');
jrNightAssert(jrJreiIranNightOpen(jrNightTime('2026-10-24 04:59:59')),'before_05_open');
jrNightAssert(!jrJreiIranNightOpen(jrNightTime('2026-10-24 05:00:00')),'05_closed');
jrNightAssert(jrJreiIranNightAllowsRequest(jrNightTime('2026-10-24 04:57:59')),'bounded_fetch_before_cutoff');
jrNightAssert(!jrJreiIranNightAllowsRequest(jrNightTime('2026-10-24 04:58:01')),'reject_last_two_minutes');
jrNightAssert(jrJreiIranNightDate(jrNightTime('2026-10-24 03:29:59'))==='2026-10-24'&&
  jrJreiIranNightDate(jrNightTime('2026-10-24 03:30:01'))==='2026-10-24','quota_day_not_utc_midnight');
jrNightAssert(jrJreiIranNightTransferCap(350000000000)===300000000000,'cap_at_300_decimal_gb');
jrNightAssert(jrJreiIranNightTransferCap(5000000)===5000000,'lower_owner_cap_preserved');
jrNightAssert(jrJreiIranNightTransferCap(-1)===0,'reject_negative_cap');
$acquisition=(string)file_get_contents(__DIR__.'/../api/jrei-ka-acquisition-dispatch.php');
$scheduler=(string)file_get_contents(__DIR__.'/../api/jrei-ka-scheduler.php');
jrNightAssert(substr_count($acquisition,'jrJreiIranNightAllowsRequest(time())')>=2,
    'independent_acquisition_gates');
jrNightAssert(str_contains($acquisition,'jrJreiIranNightTransferCap(')&&
    str_contains($acquisition,'jrJreiIranNightDate($at)'), 'bounded_local_reservation');
jrNightAssert(str_contains($scheduler,"'IRAN_NIGHT_MODE_DISABLED'")&&
    str_contains($scheduler,'jrJreiIranNightOpen($at)'), 'scheduler_fail_closed');
jrNightAssert(!jrJreiKaAcquisitionWindowAllowed([],jrNightTime('2026-10-24 12:00:00'),true),'continuous_defaults_off');
jrNightAssert(jrJreiKaAcquisitionWindowAllowed(
  ['jrei_ka_night_mode_enabled'=>true],jrNightTime('2026-10-24 02:30:00'),true),
  'night_mode_remains_compatible');
jrNightAssert(!jrJreiKaAcquisitionWindowAllowed(
  ['jrei_ka_night_mode_enabled'=>true],jrNightTime('2026-10-24 12:00:00'),true),
  'night_mode_rejects_day');
jrNightAssert(jrJreiKaAcquisitionWindowAllowed(
  ['jrei_ka_continuous_enabled'=>true],jrNightTime('2026-10-24 12:00:00'),true),
  'continuous_mode_opt_in');
jrNightAssert(!jrJreiKaUncappedDailyAuthorized(
  ['jrei_ka_uncapped_daily_enabled'=>true]),'no_uncapped_without_continuous');
jrNightAssert(jrJreiKaUncappedDailyAuthorized(
  ['jrei_ka_continuous_enabled'=>true,'jrei_ka_uncapped_daily_enabled'=>true]),
  'two_independent_owner_opt_ins_required');
echo "JREI Iran 02:00-05:00 offline window contract PASS. NO CRAWLING.\n";
