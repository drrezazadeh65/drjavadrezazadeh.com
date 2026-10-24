<?php
declare(strict_types=1);
// Synthetic private DOCX fixture only. No database, website, network,
// commercial document, or model provider is accessed.
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/api/jrei-ka-private-text-extraction.php';
function verifyDocx(bool $ok,string $reason): void {
    if(!$ok){fwrite(STDERR,"FAIL: ".$reason."\n");exit(1);}
}
verifyDocx(class_exists('ZipArchive')&&class_exists('DOMDocument'),
    'PHP ZipArchive + DOM are required to verify real DOCX extraction');
$root=sys_get_temp_dir().'/jrei-docx-'.bin2hex(random_bytes(8));
verifyDocx(@mkdir($root,0700),'isolated fixture directory');
$file=$root.'/sample.bin';
$word='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function makeDocx(string $file,string $body): void {
    $z=new ZipArchive();
    verifyDocx($z->open($file,ZipArchive::CREATE|ZipArchive::OVERWRITE)===true,
        'create a synthetic word processing ZIP');
    $z->addFromString('[Content_Types].xml',
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
    $z->addFromString('word/document.xml',$body);
    $z->close();
}
try {
    makeDocx($file,'<?xml version="1.0" encoding="UTF-8"?>'.
       '<w:document xmlns:w="'.$word.'"><w:body>'.
       '<w:p><w:r><w:t>Evidence-based educational planning requires careful review.</w:t></w:r></w:p>'.
       '<w:p><w:r><w:t>Second paragraph remains unverified until expert approval.</w:t></w:r></w:p>'.
       '</w:body></w:document>');
    $raw=file_get_contents($file);
    verifyDocx(is_string($raw),'fixture bytes readable');
    $sha=hash('sha256',$raw);
    $extracted=jrKaDocxTextFromPrivateFile($file,$sha);
    verifyDocx($extracted['state']==='TEXT_PENDING_SCIENTIFIC_REVIEW',
        'successful DOCX remains pending scientific review');
    verifyDocx(str_contains($extracted['text'],'Evidence-based educational planning'),
        'reads real paragraphs from Word document.xml');
    verifyDocx($extracted['externalNetworkRequests']===0&&
      $extracted['scientificValidation']===false,'no invented scientific proof or network access');
    $pipeline=jrKaTextExtractBytes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',$raw,$file);
    verifyDocx($pipeline['method']==='DOCX_PARTIAL_VISIBLE_TEXT'&&
      $pipeline['state']==='TEXT_PENDING_SCIENTIFIC_REVIEW',
      'original text worker can ingest DOCX without inventing verified layout');
    verifyDocx(jrKaTextExtractBytes(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','opaque-data')
      ['state']==='PARSER_REVIEW_REQUIRED','xlsx without parser must be quarantined');
    verifyDocx(jrKaTextExtractBytes(
      'application/pdf','%PDF-1.7') ['state']==='OCR_REQUIRED',
      'PDF not mislabeled as accurately extracted');
    try {
        jrKaDocxTextFromPrivateFile($file,str_repeat('a',64));
        verifyDocx(false,'digest tampering must block extraction');
    } catch(DomainException $expected) {}
    makeDocx($file,'<?xml version="1.0" encoding="UTF-8"?>'.
        '<!DOCTYPE doc [ <!ENTITY spy SYSTEM "file:///etc/passwd"> ]>'.
        '<w:document xmlns:w="'.$word.'"><w:body><w:p><w:t>&spy;</w:t></w:p></w:body></w:document>');
    try {
        jrKaDocxTextFromPrivateFile($file,hash_file('sha256',$file));
        verifyDocx(false,'XML with external entity must be rejected');
    } catch(DomainException $expected) {}
    echo "JREI private DOCX archive and science-review checks passed\n";
} finally {
    @unlink($file);
    @rmdir($root);
}
