/* JR Future Publishing v5.2.2 — progressively replace editorial fallback with a real
   author-approved portrait only if its same-origin file has been installed.
   Never store personal data; absence of photo must not break the public page. */
(()=>{'use strict';
const target='/assets/images/authors/mehrab-mirkarimi-portrait-v52.webp';
for(const img of document.querySelectorAll('img[data-author-photo]')){
  const probe=new Image();
  probe.decoding='async';
  probe.onload=()=>{
    if(probe.naturalWidth<200||probe.naturalHeight<250)return;
    img.src=target;
    img.width=906;img.height=1184;
    img.dataset.photoReady='true';
    img.alt=document.documentElement.lang==='en'?
      'Portrait of author Seyyed Mehrab Mirkarimi, provided for his academic biography':
      'پرتره سید محراب میرکریمی، برای معرفی و رزومه مؤلف';
    const note=img.closest('figure')?.querySelector('figcaption');
    if(note)note.textContent=document.documentElement.lang==='en'?
       'Author portrait · academic profile':'پرتره مؤلف · معرفی و رزومه علمی';
  };
  probe.onerror=()=>{}; // Keep the already-existing accessible editorial illustration.
  probe.src=target;
}
})();
