<?php
declare(strict_types=1);
/**
 * First-party PHP 8.3 bilingual NewsArticle HTML renderer for the EXISTING
 * Bertina CMS writer. Does not write a public file. Only accepts an
 * original, privately verified, immutable JREI editorial payload.
 * No model HTML, tracking scripts, remote fonts or user-supplied anchors.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

function jrNewsHtmlEscape(string $text):string {
    return htmlspecialchars($text,ENT_QUOTES|ENT_SUBSTITUTE|ENT_HTML5,'UTF-8');
}
function jrNewsOriginalPublicNewsHtml(
    string $persistedJson,string $approvalDigest,
    array $originalCmsContext,string $language,int $publishedAt
):array {
    if(!in_array($language,['fa','en'],true)||
       strlen($persistedJson)>250000||
       !preg_match('/^[a-f0-9]{64}$/D',$approvalDigest)||
       !hash_equals($approvalDigest,hash('sha256',$persistedJson))||
       ($originalCmsContext['source']??null)!=='ORIGINAL_AUTHENTICATED_CMS'||
       ($originalCmsContext['originalNewsroomReleaseAccepted']??null)!==true||
       ($originalCmsContext['currentOfficialEvidenceAndClaimsReviewed']??null)!==true||
       ($originalCmsContext['mediaRightsVerified']??null)!==true||
       ($originalCmsContext['verifiedOriginalCmsPolicy']??null)!==true||
       $publishedAt<=0)
        throw new RuntimeException('news_verified_html_authority_required');
    $payload=json_decode($persistedJson,true,24,JSON_THROW_ON_ERROR);
    $routes=$payload['routeProposal']??null;
    $langs=['fa','en'];$texts=$payload[$language]??null;
    if(!is_array($routes)||!is_array($texts)||
       ($payload['schema']??null)!=='jr.jrei.news-owner-editorial-payload.v1'||
       !preg_match('#^/fa/akhbar/[a-z0-9-]+/$#D',(string)($routes['faPath']??''))||
       !preg_match('#^/en/news-insights/[a-z0-9-]+/$#D',(string)($routes['enPath']??'')))
        throw new RuntimeException('news_verified_html_routes_invalid');
    foreach($langs as $lang){
        if(!is_array($payload[$lang]??null)||
           ($payload[$lang]['sourceUrl']??null)!==
             ($originalCmsContext['originalSourceUrl']??null)||
           ($payload[$lang]['language']??null)!==$lang)
            throw new RuntimeException('news_verified_html_languages_invalid');
        foreach(['headline','summary','body','nextSteps','description'] as $field)
            if(!is_string($payload[$lang][$field]??null)||
               trim($payload[$lang][$field])===''||
               strlen($payload[$lang][$field])>120000)
                throw new RuntimeException('news_verified_html_text_invalid');
    }
    $site='https://drjavadrezazadeh.com';
    $route=(string)$routes[$language.'Path'];
    $url=$site.$route;
    $alt=$language==='fa'?'en':'fa';
    $official=(string)$originalCmsContext['originalSourceUrl'];
    if(strlen($official)>1000||filter_var($official,FILTER_VALIDATE_URL)===false||
       parse_url($official,PHP_URL_SCHEME)!=='https')
        throw new RuntimeException('news_verified_html_source_url_invalid');
    $originalImage=(string)($payload['imageAssetReference']??'');
    $textOnly=$originalImage===''&&
        ($originalCmsContext['verifiedTextOnly']??null)===true;
    $image=str_starts_with($originalImage,'assets/images/')?
       '/'.$originalImage:$originalImage;
    if(($originalCmsContext['verifiedImageRef']??null)!==$originalImage||
       (!$textOnly&&(
         !preg_match('#^/assets/images/[a-zA-Z0-9_./-]+\\.(?:webp|png|jpe?g|avif)$#D',$image)||
         str_contains($image,'..')))||
       ($originalImage===''&&!$textOnly))
        throw new RuntimeException('news_verified_html_media_invalid');
    $originalAlt=$originalCmsContext[$language==='fa'?
        'verifiedImageAltFa':'verifiedImageAltEn']??null;
    $imageAlt=is_string($originalAlt)&&
        trim($originalAlt)!==''&&strlen($originalAlt)<=700?
        $originalAlt:($language==='fa'?
          'تصویر مفهومی مرتبط با خبر آموزشی':
          'Conceptual illustration accompanying this educational news');
    $title=jrNewsHtmlEscape((string)$texts['headline']);
    $summary=jrNewsHtmlEscape((string)$texts['summary']);
    $description=jrNewsHtmlEscape((string)$texts['description']);
    $sourceUrl=jrNewsHtmlEscape($official);
    $locale=jrNewsHtmlEscape($language);
    $other=jrNewsHtmlEscape($site.$routes[$alt.'Path']);
    $date=gmdate('Y-m-d\\TH:i:s\\Z',$publishedAt);
    $sections=[];
    foreach(['body','nextSteps'] as $part){
        $paragraphs=preg_split('/\\R\\R+/u',trim((string)$texts[$part]));
        if(!is_array($paragraphs))throw new RuntimeException('news_paragraph_parse_invalid');
        $markup=[];
        foreach(array_slice($paragraphs,0,100) as $paragraph){
            $paragraph=trim($paragraph);
            if($paragraph!=='')
                $markup[]='<p>'.nl2br(jrNewsHtmlEscape($paragraph),false).'</p>';
        }
        $sections[$part]=implode("\n",$markup);
    }
    $internal=[];
    foreach(($payload['internalLinks']??[]) as $link){
        if(!is_array($link)||($link['language']??null)!==$language||
           !is_string($link['path']??null)||
           !preg_match('#^/(?:fa|en)/[a-z0-9/-]+/$#D',(string)$link['path'])||
           str_contains($link['path'],'//')||
           !is_string($link['anchor']??null))continue;
        $internal[]='<li><a href="'.jrNewsHtmlEscape($link['path']).'">'.
          jrNewsHtmlEscape($link['anchor']).'</a></li>';
        if(count($internal)>=16)break;
    }
    $related=$internal?'<aside aria-label="Related resources"><h2>'.
        ($language==='fa'?'مطالعه و راهنمای مرتبط':'Related reading and guidance').
        '</h2><ul>'.implode('',$internal).'</ul></aside>':'';
    $structured=[
        '@context'=>'https://schema.org','@type'=>'NewsArticle',
        'headline'=>$texts['headline'],'description'=>$texts['description'],
        'inLanguage'=>$language,'mainEntityOfPage'=>$url,
        'datePublished'=>$date,'dateModified'=>$date,
        'isAccessibleForFree'=>true,
        'publisher'=>['@type'=>'Organization',
           'name'=>'JREI Education News & Intelligence','url'=>$site],
        'citation'=>[$official]
    ];
    if(!$textOnly)$structured['image']=[$site.$image];
    $jsonld=json_encode($structured,
        JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR|
        JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT);
    $home=$language==='fa'?'/fa/akhbar/':'/en/news-insights/';
    $nextLabel=$language==='fa'?'این خبر برای من چه معنایی دارد؟':'What does this mean for me?';
    $sourceLabel=$language==='fa'?'مشاهده اطلاعیه رسمی':'View original official notice';
    $dir=$language==='fa'?'rtl':'ltr';
    // JREI link is opt-in: never transmit a query or source text automatically.
    $html='<!doctype html><html lang="'.$language.'" dir="'.$dir.'"><head>'.
      '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'.
      '<title>'.$title.' | JREI</title><meta name="description" content="'.$description.'">'.
      '<meta name="robots" content="index,follow,max-image-preview:large">'.
      '<link rel="canonical" href="'.jrNewsHtmlEscape($url).'">'.
      '<link rel="alternate" hreflang="'.$language.'" href="'.jrNewsHtmlEscape($url).'">'.
      '<link rel="alternate" hreflang="'.$alt.'" href="'.$other.'">'.
      '<meta property="og:type" content="article"><meta property="og:title" content="'.$title.'">'.
      '<meta property="og:description" content="'.$description.'">'.
      ($textOnly?'':'<meta property="og:image" content="'.
        jrNewsHtmlEscape($site.$image).'">').
      '<link rel="stylesheet" href="/assets/css/style.css">'.
      '<link rel="stylesheet" href="/assets/css/jrei-news-article-v1.css">'.
      '<meta name="jr-assistant-endpoint" content="/api/assistant/v1/chat">'.
      '<script type="application/ld+json">'.$jsonld.'</script></head><body>'.
      '<a class="skip-link" href="#main">'.
      ($language==='fa'?'رفتن به متن':'Skip to article').'</a>'.
      '<header class="site-header"><a class="ni-news-wordmark" href="'.$home.'">JREI <span>NEWS</span></a>'.
      '<nav class="ni-public-news-nav" aria-label="'.($language==='fa'?'ناوبری اخبار':'News navigation').'">'.
      '<a href="'.$home.'">'.($language==='fa'?'همه اخبار':'All news').'</a>'.
      '<a href="'.$other.'" hreflang="'.$alt.'">'.($language==='fa'?'English':'فارسی').'</a>'.
      '</nav></header>'.
      '<main id="main"><article class="ni-article"><header><h1>'.$title.'</h1>'.
      '<p>'.$summary.'</p><time datetime="'.$date.'">'.substr($date,0,10).'</time>'.
      '<div class="ni-story-provenance"><span>'.($language==='fa'?'منبع مستقل و تاریخ بررسی‌شده':'Source-checked publication').'</span>'.
      '<a href="'.$sourceUrl.'" rel="noopener noreferrer external" target="_blank">'.
      jrNewsHtmlEscape($sourceLabel).'</a></div></header>'.
      ($textOnly?'':'<figure><img src="'.jrNewsHtmlEscape($image).
        '" alt="'.jrNewsHtmlEscape($imageAlt).'" loading="lazy"></figure>').
      '<section>'.$sections['body'].'</section>'.
      '<section aria-label="'.jrNewsHtmlEscape($nextLabel).'"><h2>'.
      jrNewsHtmlEscape($nextLabel).'</h2>'.$sections['nextSteps'].'</section>'.
      '<p><a rel="noopener external" href="'.$sourceUrl.'">'.
      jrNewsHtmlEscape($sourceLabel).'</a></p>'.$related.
      '<p><a href="'.$home.'">'.($language==='fa'?'بازگشت به اخبار':'More news').'</a></p>'.
      '<section class="ni-article-jrei" data-jrei-news-context aria-label="'.
      ($language==='fa'?'دستیار آموزشی JREI':'JREI educational assistant').'">'.
      '<h2>'.($language==='fa'?'گفت‌وگو دربارهٔ این خبر':'Discuss this announcement').'</h2>'.
      '<div data-jrei-existing-assistant-slot></div></section>'.
      '</article></main>'.
      '<script src="/assets/js/assistant.js" defer></script>'.
      '<script src="/assets/js/jrei-news-assistant-v1.js" defer></script>'.
      '</body></html>';
    if(strlen($html)>440000)
        throw new RuntimeException('news_verified_html_output_too_large');
    return ['schema'=>'jr.jrei.original-verified-public-html.v1',
        'route'=>$route,'canonical'=>$url,'language'=>$language,
        'html'=>$html,'contentSha256'=>hash('sha256',$html),
        'originalCmsMustWriteAtomically'=>true,'published'=>false];
}
