<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/internal/jr-publishing-contract-draft.php';
$x=jrPublishingDraftContract('سید محراب میرکریمی');
if($x['status']!=='negotiation_draft_not_signed'
  ||($x['capabilities']['sign']??null)!==false
  ||($x['capabilities']['accept']??null)!==false
  ||($x['capabilities']['preview']??null)!==true
  ||count($x['clauses'])<10
  ||!str_contains($x['clauses'][4]['body'],'۷۰۰٬۰۰۰')
  ||!str_contains($x['clauses'][5]['body'],'۷۰٬۰۰۰'))
  throw new RuntimeException('unsafe_contract_preview');
try {jrPublishingDraftContract("bad\nname");throw new RuntimeException('unsafe_name_accepted');}
catch(InvalidArgumentException $e){}
echo "JR contract draft: no fake signature, twelve negotiation clauses PASS.\n";