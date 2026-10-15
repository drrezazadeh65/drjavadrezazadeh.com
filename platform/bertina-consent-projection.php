<?php
declare(strict_types=1);
/**
 * Research-stage pure consent projection for the proposed Bertina eco_consent_*
 * schema. NO database I/O, routes, or production integration.
 *
 * The caller MUST supply rows loaded by trusted server SQL, scoped to one
 * subject, actor and purpose. Rows require unique ID, timestamp and notice
 * metadata. Any ambiguity fails closed.
 */
function bertinaCurrentConsent(array $rows, string $purpose, int $now): array {
    $deny=static fn(string $reason): array=>['allowed'=>false,'reason'=>$reason];
    if(!in_array($purpose,['ASSESSMENT','PARENT_VISIBILITY'],true)||$now<=0)
        return $deny('INVALID_PURPOSE_OR_CLOCK');
    if(count($rows)===0)return $deny('NO_DECISION');
    $events=[];$ids=[];
    foreach($rows as $row){
        if(!is_array($row)||!is_string($row['id']??null)||($row['id']??'')===''||
           isset($ids[$row['id']])||($row['purpose_code']??null)!==$purpose)
            return $deny('MALFORMED_OR_DUPLICATE_EVENT');
        $ids[$row['id']]=true;
        $ts=$row['granted_at']??null;
        if(!is_string($ts)||!preg_match('/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d{1,3})?$/D',$ts))
            return $deny('INVALID_EVENT_TIME');
        $dt=DateTimeImmutable::createFromFormat('!Y-m-d H:i:s.u',str_contains($ts,'.')?$ts:$ts.'.000',new DateTimeZone('UTC'));
        if(!$dt)return $deny('INVALID_EVENT_TIME');
        $timestamp=(float)$dt->format('U.u');
        if($timestamp>$now)return $deny('FUTURE_DECISION');
        if(!in_array($row['decision']??null,['GRANTED','WITHDRAWN','DENIED'],true))
            return $deny('UNKNOWN_DECISION');
        $events[]=['row'=>$row,'time'=>$timestamp];
    }
    usort($events,static fn(array $a,array $b): int=>$b['time']<=>$a['time']);
    if(count($events)>1&&$events[0]['time']===$events[1]['time'])
        return $deny('AMBIGUOUS_LATEST_DECISION');
    $latest=$events[0]['row'];
    if($latest['decision']!=='GRANTED'||($latest['withdrawn_at']??null)!==null)
        return $deny('CONSENT_NOT_GRANTED');
    if(!is_string($latest['version_label']??null)||$latest['version_label']==='')
        return $deny('NOTICE_VERSION_MISSING');
    foreach(['effective_at','retired_at'] as $field){
        $value=$latest[$field]??null;
        if($field==='retired_at'&&$value===null)continue;
        if(!is_string($value)||!preg_match('/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d{1,3})?$/D',$value))
            return $deny('INVALID_NOTICE_TIME');
        $dt=DateTimeImmutable::createFromFormat('!Y-m-d H:i:s.u',str_contains($value,'.')?$value:$value.'.000',new DateTimeZone('UTC'));
        if(!$dt)return $deny('INVALID_NOTICE_TIME');
        $time=(float)$dt->format('U.u');
        if($field==='effective_at'&&$time>$now)return $deny('NOTICE_NOT_EFFECTIVE');
        if($field==='retired_at'&&$time<=$now)return $deny('NOTICE_RETIRED');
    }
    return ['allowed'=>true,'reason'=>'CURRENT_CONSENT','noticeVersion'=>$latest['version_label']];
}
