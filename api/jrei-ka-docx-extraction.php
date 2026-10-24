<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Local-only, bounded DOCX plaintext preview. NOT OCR, layout preservation,
 * equation transcription, scientific validation or public publication.
 *
 * Invoked only on the already-hash-verified, rights-reviewed private archive.
 * No HTTP, shell, external Zip entry extraction, DOM external entities or
 * model-provider calls. Only the approved document.xml part is read.
 */
function jrKaDocxTextFromPrivateFile(string $path,string $expectedSha256): array {
    if(!class_exists('ZipArchive')||!class_exists('DOMDocument'))
        throw new DomainException('ka_docx_parser_unavailable');
    if(!preg_match('/^[a-f0-9]{64}$/D',$expectedSha256)||
       !is_file($path)||is_link($path)||!is_readable($path)||
       filesize($path)<100||filesize($path)>8388608||
       !hash_equals($expectedSha256,(string)hash_file('sha256',$path)))
        throw new DomainException('ka_docx_private_object_invalid');
    $zip=new ZipArchive();
    $opened=$zip->open($path,ZipArchive::RDONLY);
    if($opened!==true)
        throw new DomainException('ka_docx_invalid_zip');
    try{
        if($zip->numFiles<2||$zip->numFiles>220)
            throw new DomainException('ka_docx_entry_count_invalid');
        $sum=0;
        for($i=0;$i<$zip->numFiles;$i++){
            $info=$zip->statIndex($i);
            if(!is_array($info)||!is_string($info['name']??null))
                throw new DomainException('ka_docx_entry_invalid');
            $name=$info['name'];
            $bytes=(int)($info['size']??-1);
            $compressed=(int)($info['comp_size']??-1);
            if($bytes<0||$compressed<0||$bytes>8388608||
               ($bytes>4096&&$compressed<max(1,(int)floor($bytes/180)))||
               str_starts_with($name,'/')||str_contains($name,'\\')||
               preg_match('~(?:^|/)\.\.(?:/|$)~',$name)||
               str_contains($name,"\0"))
                throw new DomainException('ka_docx_unsafe_zip_entry');
            $sum+=$bytes;
            if($sum>12582912)
                throw new DomainException('ka_docx_expansion_limit');
            if(preg_match('~(?:^|/)vbaProject(?:Signature)?\.bin$~i',$name)||
               str_ends_with(strtolower($name),'.exe')||
               str_ends_with(strtolower($name),'.js'))
                throw new DomainException('ka_docx_active_content_present');
        }
        if($zip->locateName('[Content_Types].xml')===false||
           $zip->locateName('word/document.xml')===false)
            throw new DomainException('ka_docx_main_part_missing');
        $index=$zip->locateName('word/document.xml');
        $info=$zip->statIndex($index);
        if(!is_array($info)||(int)$info['size']>2097152)
            throw new DomainException('ka_docx_main_part_too_large');
        $xml=$zip->getFromIndex($index,2097153);
        if(!is_string($xml)||strlen($xml)<20||strlen($xml)>2097152||
           !preg_match('//u',$xml)||preg_match('/<!DOCTYPE|<!ENTITY/i',$xml))
            throw new DomainException('ka_docx_xml_unsafe');
        $dom=new DOMDocument('1.0','UTF-8');
        $old=libxml_use_internal_errors(true);
        try{
            if(!$dom->loadXML($xml,LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING))
                throw new DomainException('ka_docx_invalid_xml');
        }finally{
            libxml_clear_errors();
            libxml_use_internal_errors($old);
        }
        $ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
        $paragraphs=$dom->getElementsByTagNameNS($ns,'p');
        if($paragraphs->length>12000)
            throw new DomainException('ka_docx_paragraph_limit');
        $text='';
        foreach($paragraphs as $p){
            $part='';
            foreach($p->getElementsByTagNameNS($ns,'t') as $node){
                // Revisions inside a deleted run are not current document text.
                $ancestor=$node->parentNode;
                $deleted=false;
                while($ancestor!==null&&$ancestor!==$p){
                    if($ancestor instanceof DOMElement&&
                       $ancestor->namespaceURI===$ns&&
                       in_array($ancestor->localName,['del','moveFrom'],true)){
                        $deleted=true;break;
                    }
                    $ancestor=$ancestor->parentNode;
                }
                if(!$deleted)$part.=(string)$node->textContent;
                if(strlen($text)+strlen($part)>524288)
                    throw new DomainException('ka_docx_text_over_limit');
            }
            if(trim($part)!=='')$text.=trim($part)."\n";
        }
        if(strlen(trim($text))<20)
            return ['state'=>'OCR_OR_MANUAL_REVIEW_REQUIRED','text'=>null,
              'method'=>'DOCX_PARTIAL_VISIBLE_TEXT','requiresOcr'=>false,
              'requiresLayoutReview'=>true];
        // Pictures, formulas, tables, comments and tracked revisions make
        // scientific interpretation additionally provisional.
        $layoutParts=['tbl','drawing','object','oMath','oMathPara',
            'pict','ins','del','footnoteReference','endnoteReference'];
        $layout=false;
        foreach($layoutParts as $tag){
            if($dom->getElementsByTagNameNS($ns,$tag)->length>0){
                $layout=true;break;
            }
        }
        return ['state'=>'TEXT_PENDING_SCIENTIFIC_REVIEW',
          'text'=>$text,'method'=>'DOCX_PARTIAL_VISIBLE_TEXT',
          'requiresOcr'=>false,'requiresLayoutReview'=>$layout,
          'sourcePartsRead'=>['word/document.xml'],
          'externalNetworkRequests'=>0,'scientificValidation'=>false];
    }finally{$zip->close();}
}
