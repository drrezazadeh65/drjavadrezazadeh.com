<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * One-owner, internally asserted consultation capacity, NOT a public or
 * external-calendar availability claim. All changes require owner TOTP,
 * authenticated session, CSRF and rate control in operationsRoute.
 * The advisory lock is shared with Stage09 booking transitions.
 */
function operationsConsultationAvailabilitySchemaReady(?PDO $pdo): bool {
    if (!$pdo) return false;
    try {
        $probe=$pdo->query('SELECT id,start_utc,end_utc,state,created_by,created_at,updated_at
            FROM commerce_consultation_availability LIMIT 0');
        if ($probe===false) return false;
        $meta=$pdo->query("SELECT ENGINE FROM information_schema.TABLES
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commerce_consultation_availability'")->fetchColumn();
        if (strcasecmp((string)$meta,'InnoDB')!==0) return false;
        $rows=$pdo->query("SELECT CONSTRAINT_NAME,CONSTRAINT_TYPE
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commerce_consultation_availability'")->fetchAll(PDO::FETCH_ASSOC);
        $primary=false;$check=false;
        foreach ($rows as $row) {
            if ($row['CONSTRAINT_TYPE']==='PRIMARY KEY') $primary=true;
            if ($row['CONSTRAINT_TYPE']==='CHECK'
                && strcasecmp((string)$row['CONSTRAINT_NAME'],'ck_consultation_capacity_interval')===0) $check=true;
        }
        return $primary && $check;
    } catch (Throwable $e) { return false; }
}
function operationsConsultationUtc(string $value): ?DateTimeImmutable {
    if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/D',$value))return null;
    $date=DateTimeImmutable::createFromFormat('!Y-m-d H:i:s',$value,new DateTimeZone('UTC'));
    return $date instanceof DateTimeImmutable && $date->format('Y-m-d H:i:s')===$value ? $date : null;
}
/**
 * Always call after acquiring the shared advisory lock, INSIDE a transaction.
 * A slot is allowed only if one explicitly OPEN window contains it in full.
 */
function operationsConsultationWithinCapacity(PDO $pdo,string $start,string $end): bool {
    if (!operationsConsultationAvailabilitySchemaReady($pdo))return false;
    $q=$pdo->prepare("SELECT id FROM commerce_consultation_availability
        WHERE state='OPEN' AND start_utc<=? AND end_utc>=? LIMIT 1");
    $q->execute([$start,$end]);
    return $q->fetchColumn()!==false;
}
/** Open or close a capacity window; never changes a paid order or a booking. */
function operationsConsultationAvailabilityChange(PDO $pdo,string $actor,array $input): array {
    if (array_keys($input)!==['action','windowId','startUtc','endUtc']
        ||!is_string($input['action'])||!validUuid($actor))
        throw new InvalidArgumentException('invalid_capacity_request_shape');
    $action=$input['action'];
    if (!in_array($action,['open','close'],true))
        throw new InvalidArgumentException('invalid_capacity_action');
    $id=$input['windowId'];$start=$input['startUtc'];$end=$input['endUtc'];
    if ($action==='open') {
        if ($id!==null||!is_string($start)||!is_string($end))
            throw new InvalidArgumentException('invalid_capacity_open_fields');
        $from=operationsConsultationUtc($start);$to=operationsConsultationUtc($end);
        $now=time();
        if (!$from||!$to||$from->getTimestamp()<=$now
            ||$from->getTimestamp()>$now+90*86400
            ||$to->getTimestamp()<=$from->getTimestamp()+15*60
            ||$to->getTimestamp()>$from->getTimestamp()+8*3600
            ||$to->getTimestamp()>$now+90*86400)
            throw new InvalidArgumentException('invalid_capacity_window_utc');
        // The visitor sees only a small, genuinely published daily budget.
        // The owner can set e.g. two hours on Saturday and four on Sunday.
        $localStart=$from->setTimezone(new DateTimeZone('Asia/Tehran'));
        $localEnd=$to->setTimezone(new DateTimeZone('Asia/Tehran'));
        $duration=$to->getTimestamp()-$from->getTimestamp();
        if ($duration<3600||$duration>4*3600||$duration%3600!==0
            ||$localStart->format('Y-m-d')!==$localEnd->format('Y-m-d')
            ||$localStart->format('i:s')!=='00:00'
            ||$localEnd->format('i:s')!=='00:00')
            throw new InvalidArgumentException('owner_capacity_hour_policy_required');
    } else {
        if (!is_string($id)||!validUuid($id)||$start!==null||$end!==null)
            throw new InvalidArgumentException('invalid_capacity_close_fields');
    }
    if (!operationsConsultationAvailabilitySchemaReady($pdo))
        throw new RuntimeException('consultation_capacity_schema_unavailable');
    $locked=(int)$pdo->query("SELECT GET_LOCK('jr_stage09_owner_booking_v1',5)")->fetchColumn()===1;
    if (!$locked)throw new DomainException('consultation_calendar_busy');
    try {
        if (!$pdo->beginTransaction())throw new RuntimeException('capacity_transaction_required');
        if ($action==='open') {
            // Global advisory lock serialises parallel owner opens and customer
            // booking transitions. No overlapping OPEN windows for this one resource.
            $q=$pdo->prepare("SELECT id FROM commerce_consultation_availability
                WHERE state='OPEN' AND start_utc<? AND end_utc>? LIMIT 1");
            $q->execute([$end,$start]);
            if ($q->fetchColumn()!==false)
                throw new DomainException('capacity_window_overlap');
            // The limit counts ALL published owner hours on that Tehran day,
            // including separate morning/afternoon windows. Shared lock makes
            // the check atomic with the insert.
            $iranDayStart=$localStart->setTime(0,0,0);
            $dayStart=$iranDayStart->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
            $dayEnd=$iranDayStart->modify('+1 day')->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
            $q=$pdo->prepare("SELECT start_utc,end_utc FROM commerce_consultation_availability
                WHERE state='OPEN' AND end_utc>? AND start_utc<?");
            $q->execute([$dayStart,$dayEnd]);
            $totalSeconds=$duration;
            $dayStartTs=strtotime($dayStart.' UTC');$dayEndTs=strtotime($dayEnd.' UTC');
            foreach($q->fetchAll(PDO::FETCH_ASSOC) as $existing){
                $s=strtotime((string)$existing['start_utc'].' UTC');
                $e=strtotime((string)$existing['end_utc'].' UTC');
                if($s===false||$e===false)throw new RuntimeException('invalid_existing_capacity');
                $totalSeconds+=max(0,min($e,$dayEndTs)-max($s,$dayStartTs));
            }
            if($totalSeconds>4*3600)throw new DomainException('daily_capacity_four_hours_max');
            $hex=bin2hex(random_bytes(16));
            // Canonical RFC 4122 v4 layout: version nibble 4, variant nibble 8.
            $id=substr($hex,0,8).'-'.substr($hex,8,4).'-4'.substr($hex,13,3)
                .'-8'.substr($hex,17,3).'-'.substr($hex,20,12);
            if (!validUuid($id))throw new RuntimeException('capacity_uuid_generation_failed');
            $insert=$pdo->prepare("INSERT INTO commerce_consultation_availability
                (id,start_utc,end_utc,state,created_by) VALUES(?,?,?,'OPEN',?)");
            $insert->execute([$id,$start,$end,$actor]);
        } else {
            $q=$pdo->prepare('SELECT state,start_utc,end_utc
                FROM commerce_consultation_availability WHERE id=? FOR UPDATE');
            $q->execute([$id]);$window=$q->fetch(PDO::FETCH_ASSOC);
            if (!is_array($window)||$window['state']!=='OPEN')
                throw new DomainException('capacity_window_already_closed');
            // Never quietly remove the recorded basis for an upcoming booking.
            $clash=$pdo->prepare("SELECT order_id FROM commerce_service_cases
                WHERE status IN ('booked','in_progress')
                  AND booking_start<? AND booking_end>?
                  AND booking_end>UTC_TIMESTAMP() LIMIT 1");
            $clash->execute([$window['end_utc'],$window['start_utc']]);
            if ($clash->fetchColumn()!==false)
                throw new DomainException('capacity_contains_existing_booking');
            $q=$pdo->prepare("UPDATE commerce_consultation_availability
                SET state='CLOSED' WHERE id=? AND state='OPEN'");
            $q->execute([$id]);
            if ($q->rowCount()!==1)throw new DomainException('capacity_state_conflict');
        }
        operationsAudit($pdo,$actor,'consultation_capacity_'.$action,$id);
        if (!$pdo->commit())throw new RuntimeException('capacity_commit_failed');
        return ['windowId'=>$id,'state'=>$action==='open'?'OPEN':'CLOSED',
            'startUtc'=>$action==='open'?$start:null,
            'endUtc'=>$action==='open'?$end:null,
            'customerNotified'=>false,'appointmentConfirmed'=>false,
            'externalCalendarSynchronized'=>false];
    } catch (Throwable $e) {
        if ($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    } finally {
        $release=$pdo->query("SELECT RELEASE_LOCK('jr_stage09_owner_booking_v1')");
        if ($release!==false)$release->fetchColumn();
    }
}


/**
 * Privacy-safe next-seven-days view of the single-owner internal calendar.
 * Published 60-minute slots only; private order and customer data NEVER leave
 * this projection. A green slot is an expression-of-interest opportunity,
 * not a hold, confirmed booking or independently synchronized free/busy.
 */
function operationsConsultationWeeklySnapshot(PDO $pdo,int $at): array {
    if(!operationsConsultationAvailabilitySchemaReady($pdo)
        ||!function_exists('stage9SchemaReady')||!stage9SchemaReady($pdo))
        throw new RuntimeException('consultation_week_not_ready');
    $tehran=new DateTimeZone('Asia/Tehran');
    $utc=new DateTimeZone('UTC');
    $today=(new DateTimeImmutable('@'.$at))->setTimezone($tehran)->setTime(0,0,0);
    $until=$today->modify('+7 days');
    $sinceUtc=gmdate('Y-m-d H:i:s',$at);
    $untilUtc=$until->setTimezone($utc)->format('Y-m-d H:i:s');
    $q=$pdo->prepare("SELECT id,start_utc,end_utc FROM commerce_consultation_availability
        WHERE state='OPEN' AND start_utc<? AND end_utc>?
        ORDER BY start_utc,id LIMIT 101");
    $q->execute([$untilUtc,$sinceUtc]);$windows=$q->fetchAll(PDO::FETCH_ASSOC);
    if(count($windows)>100)throw new RuntimeException('capacity_snapshot_truncated');
    $q=$pdo->prepare("SELECT booking_start,booking_end FROM commerce_service_cases
        WHERE status IN ('booked','in_progress')
          AND booking_start<? AND booking_end>?
        ORDER BY booking_start,booking_end LIMIT 101");
    $q->execute([$untilUtc,$sinceUtc]);$booked=$q->fetchAll(PDO::FETCH_ASSOC);
    if(count($booked)>100)throw new RuntimeException('booking_snapshot_truncated');
    $bookedTimes=[];
    foreach($booked as $row){
        $start=operationsConsultationUtc((string)$row['booking_start']);
        $end=operationsConsultationUtc((string)$row['booking_end']);
        if(!$start||!$end||$end<=$start)
            throw new RuntimeException('booking_snapshot_invalid');
        $bookedTimes[]=[$start->getTimestamp(),$end->getTimestamp()];
    }
    $days=[];$seen=[];
    for($i=0;$i<7;$i++){
        $day=$today->modify('+'.$i.' days');
        $date=$day->format('Y-m-d');
        $dayEnd=$day->modify('+1 day');
        $dayStartTs=$day->getTimestamp();$dayEndTs=$dayEnd->getTimestamp();
        $slots=[];
        foreach($windows as $win){
            $start=operationsConsultationUtc((string)$win['start_utc']);
            $end=operationsConsultationUtc((string)$win['end_utc']);
            if(!$start||!$end||$end<=$start)
                throw new RuntimeException('capacity_window_invalid');
            $from=$start->getTimestamp();$to=$end->getTimestamp();
            if($from>=$dayEndTs||$to<=$dayStartTs)continue;
            // Whole one-hour slots; ignore incomplete legacy fragments.
            for($t=$from;$t+3600<=$to&&$t<$dayEndTs;$t+=3600){
                if($t<$at||$t<$dayStartTs||$t+3600>$dayEndTs)continue;
                $id=gmdate('Y-m-d H:i:s',$t);
                if(isset($seen[$id]))throw new RuntimeException('capacity_window_duplicate');
                $seen[$id]=true;
                $full=false;
                foreach($bookedTimes as $busy){
                    if($busy[0]<$t+3600&&$busy[1]>$t){$full=true;break;}
                }
                $slots[]=[
                    'startUtc'=>$id,
                    'endUtc'=>gmdate('Y-m-d H:i:s',$t+3600),
                    'status'=>$full?'FULL':'AVAILABLE'
                ];
                if(count($slots)>4)throw new RuntimeException('capacity_day_limit_breached');
            }
        }
        usort($slots,static fn($a,$b)=>strcmp($a['startUtc'],$b['startUtc']));
        $remaining=count(array_filter($slots,static fn($s)=>$s['status']==='AVAILABLE'));
        $days[]=['date'=>$date,'totalSlots'=>count($slots),
            'remainingSlots'=>$remaining,'slots'=>$slots];
    }
    return [
        'ok'=>true,'schema'=>'consultation-week-v1','timezone'=>'Asia/Tehran',
        'slotMinutes'=>60,'maxPublishedDailyHours'=>4,
        'asOfUtc'=>gmdate('Y-m-d H:i:s',$at),
        'days'=>$days,'customerReservationEnabled'=>false,
        'availabilitySource'=>'owner-published internal windows minus recorded bookings',
        'externalCalendarConfirmed'=>false,
        'limitation'=>'Availability may change before review; clicking a slot does not hold or confirm it.'
    ];
}
