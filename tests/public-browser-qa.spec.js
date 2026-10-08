const {test,expect}=require('@playwright/test');

test.use({serviceWorkers:'block'});

async function prepareVisualCapture(page){
  // The site uses system-native stacks. Clearing unresolved synthetic/custom
  // FontFace entries prevents Chromium CI from stalling screenshots while
  // preserving the actual system font rendering used by production pages.
  await page.evaluate(()=>{
    try{ document.fonts?.clear?.(); }catch(_){}
  });
  await page.waitForTimeout(40);
}

async function stableOverflow(page){
  let last;
  for(let attempt=0;attempt<4;attempt++){
    try{
      return await page.evaluate(()=>({
        viewport:window.innerWidth,
        html:document.documentElement.scrollWidth,
        body:document.body.scrollWidth
      }));
    }catch(error){
      last=error;
      if(!/Execution context was destroyed|navigation/i.test(String(error))||attempt===3) throw error;
      await page.waitForLoadState('domcontentloaded').catch(()=>{});
      await page.waitForTimeout(120);
    }
  }
  throw last;
}

const base='http://127.0.0.1:4173';
const viewports=[
  ['mobile-320',320,800],
  ['mobile-360',360,800],
  ['mobile-390',390,844],
  ['mobile-430',430,932],
  ['desktop-1280',1280,800],
  ['desktop-1366',1366,768],
  ['desktop-1440',1440,900],
  ['desktop-1600',1600,900],
  ['desktop-1920',1920,1080]
];
const coreRoutes=['/','/fa/','/en/','/fa/rahnamaha/','/fa/rahnamaha/moghayese-reshteha-ba-matris-tasmim/','/en/publications/'];

for(const [label,width,height] of viewports){
  test(label+' core public layout',async({page})=>{
    await page.setViewportSize({width,height});
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    for(const route of coreRoutes){
      await page.goto(base+route,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(120);
      await expect(page.locator('h1')).toHaveCount(1);
      const overflow=await stableOverflow(page);
      expect(Math.max(overflow.html,overflow.body),route+' horizontal overflow at '+label).toBeLessThanOrEqual(overflow.viewport+1);
      const main=page.locator('main').first();
      await expect(main).toBeVisible();
      const skip=page.locator('a.skip, a.skip-link').first();
      if(await skip.count()) await expect(skip).toHaveAttribute('href',/^#/);
    }
    expect(errors,'uncaught page errors at '+label).toEqual([]);
  });
}

test('Persian public search v2 works without private leakage',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/fa/jostojo/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(120);
  const input=page.locator('[data-site-search] input[type="search"]');
  await expect(input).toBeVisible();
  await input.fill('استعداد');
  await page.waitForTimeout(250);
  const results=page.locator('[data-search-results] a');
  await expect(results.first()).toBeVisible();
  const hrefs=await results.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')||''));
  for(const href of hrefs){
    expect(href).not.toMatch(/(?:login|register|account|assessment|checkout|darkhast-moshavere|request-consultation)/i);
  }
  await page.locator('[data-search-clear]').click();
  await expect(input).toHaveValue('');
});

test('keyboard focus reaches primary public navigation',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto(base+'/en/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(120);
  await page.keyboard.press('Tab');
  const focused=await page.evaluate(()=>({
    tag:document.activeElement?.tagName,
    href:document.activeElement?.getAttribute?.('href')||'',
    text:(document.activeElement?.textContent||'').trim().slice(0,80)
  }));
  expect(focused.tag).toBe('A');
  expect(focused.href).toMatch(/^#/);
});

for(const [route,name] of [['/fa/','fa-home'],['/en/','en-home'],['/fa/rahnamaha/moghayese-reshteha-ba-matris-tasmim/','fa-guide']]){
  test('visual evidence '+name,async({page})=>{
    for(const [label,width,height] of [['mobile-390',390,844],['desktop-1440',1440,900]]){
      await page.setViewportSize({width,height});
      await page.goto(base+route,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(120);
      await prepareVisualCapture(page);
      await page.screenshot({path:'test-results/screenshots/'+name+'-'+label+'.png',fullPage:true,animations:'disabled'});
    }
  });
}


test('homepage exposes visible account access in both languages',async({page})=>{
  for(const route of ['/fa/','/en/']){
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    const strip=page.locator('.home-account-strip');
    await expect(strip).toBeVisible();
    await expect(strip.locator('a[href="./login/"]')).toBeVisible();
    await expect(strip.locator('a[href="./register/"]')).toBeVisible();
    const overflow=await stableOverflow(page);
    expect(Math.max(overflow.html,overflow.body),route+' auth strip horizontal overflow').toBeLessThanOrEqual(overflow.viewport+1);
  }
});

for (const route of ['/fa/darkhast-moshavere/', '/en/request-consultation/']) {
  test('consultation draft stays local and invalidates edits: '+route, async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    const form=page.locator('[data-consultation-composer]');
    await expect(form.locator('fieldset')).toBeVisible();
    const outgoing=[];
    page.on('request', request=>{if(request.method()!=='GET') outgoing.push(request.url());});
    await form.locator('[name="service"]').selectOption({index:1});
    await form.locator('[name="context"]').fill('Student / دانش‌آموز');
    await form.locator('[name="question"]').fill('Compare A & B? <script>test</script>');
    await form.locator('button[type="submit"]').click();
    const preview=form.locator('[data-composer-preview]');
    await expect(preview).toBeVisible();
    const href=await form.locator('[data-composer-email]').getAttribute('href');
    const url=new URL(href);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('dr.rezazadeh65@gmail.com');
    expect(url.searchParams.get('body')).toContain('Compare A & B? <script>test</script>');
    await form.locator('[name="question"]').fill('Revised question');
    await expect(preview).toBeHidden();
    await expect(form.locator('[data-composer-draft]')).toHaveValue('');
    await form.locator('button[type="submit"]').click();
    expect(await form.locator('[data-composer-draft]').inputValue()).toContain('Revised question');
    await form.locator('button[type="reset"]').click();
    await expect(preview).toBeHidden();
    await expect(form.locator('[name="question"]')).toHaveValue('');
    expect(outgoing).toEqual([]);
    const overflow=await stableOverflow(page);
    expect(Math.max(overflow.html,overflow.body)).toBeLessThanOrEqual(overflow.viewport+1);
  });
}


function hexChannel(v){
  const n=parseInt(v,16)/255;
  return n<=0.04045?n/12.92:Math.pow((n+0.055)/1.055,2.4);
}
function contrastRatio(a,b){
  const norm=x=>x.trim().replace('#','');
  const lum=x=>{
    const h=norm(x);
    if(!/^[0-9a-f]{6}$/i.test(h)) throw new Error('Expected six-digit hex colour, got '+x);
    const r=hexChannel(h.slice(0,2)),g=hexChannel(h.slice(2,4)),bl=hexChannel(h.slice(4,6));
    return 0.2126*r+0.7152*g+0.0722*bl;
  };
  const l1=lum(a),l2=lum(b),hi=Math.max(l1,l2),lo=Math.min(l1,l2);
  return (hi+0.05)/(lo+0.05);
}

for(const route of ['/fa/','/en/']){
  test('mobile luxury shell meets touch and dialog interaction gates: '+route,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(160);
    const dock=page.locator('.app-dock');
    await expect(dock).toBeVisible();
    const items=dock.locator('a');
    await expect(items).toHaveCount(5);
    const boxes=await items.evaluateAll(nodes=>nodes.map(n=>{
      const r=n.getBoundingClientRect();
      return {w:r.width,h:r.height};
    }));
    for(const box of boxes){
      expect(box.h,'mobile dock target height').toBeGreaterThanOrEqual(44);
      expect(box.w,'mobile dock target width').toBeGreaterThanOrEqual(44);
    }
    await expect(dock.locator('[aria-current="page"]')).toHaveCount(1);
    const menu=page.locator('.site-header .mobile-menu-trigger[data-nav-toggle]').first();
    await expect(menu).toBeVisible();
    await menu.click();
    const sheet=page.locator('#mobile-app-menu');
    await expect(sheet).toBeVisible();
    await expect(menu).toHaveAttribute('aria-expanded','true');
    expect(await page.evaluate(()=>document.querySelector('#mobile-app-menu')?.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(menu).toHaveAttribute('aria-expanded','false');
  });

  test('luxury palette keeps core text contrast above WCAG thresholds: '+route,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    const tokens=await page.evaluate(()=>{
      const s=getComputedStyle(document.body);
      return {
        text:s.getPropertyValue('--ux-text').trim(),
        muted:s.getPropertyValue('--ux-muted').trim(),
        surface:s.getPropertyValue('--ux-surface').trim()
      };
    });
    expect(contrastRatio(tokens.text,tokens.surface),'primary text contrast').toBeGreaterThanOrEqual(7);
    expect(contrastRatio(tokens.muted,tokens.surface),'secondary text contrast').toBeGreaterThanOrEqual(4.5);
  });
}


for(const route of ['/fa/','/en/']){
  test('mobile home identity enters view before fixed dock: '+route,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(160);
    const h1=page.locator('.hero h1').first();
    const dock=page.locator('.app-dock').first();
    await expect(h1).toBeVisible();
    await expect(dock).toBeVisible();
    const [hb,db]=await Promise.all([h1.boundingBox(),dock.boundingBox()]);
    expect(hb).not.toBeNull();
    expect(db).not.toBeNull();
    expect(hb.y+hb.height,'hero identity should finish before the fixed dock').toBeLessThan(db.y-20);
  });
}


for(const route of ['/fa/','/en/']){
  test('mobile primary home action is available above the fixed dock: '+route,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(160);
    const cta=page.locator('.hero .actions .button.primary').first();
    const dock=page.locator('.app-dock').first();
    await expect(cta).toBeVisible();
    await expect(dock).toBeVisible();
    const [cb,db]=await Promise.all([cta.boundingBox(),dock.boundingBox()]);
    expect(cb).not.toBeNull();
    expect(db).not.toBeNull();
    expect(cb.y+cb.height,'primary hero CTA should finish before the fixed dock').toBeLessThan(db.y-12);
  });
}


test('mobile editorial metadata clears the app dock',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/fa/rahnamaha/moghayese-reshteha-ba-matris-tasmim/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(180);
  const hero=page.locator('.article-hero');
  const title=hero.locator('h1');
  const meta=hero.locator('.article-meta');
  const lead=hero.locator('.lead');
  const dock=page.locator('.app-dock').first();
  await expect(title).toBeVisible();
  await expect(meta).toBeVisible();
  await expect(dock).toBeVisible();
  const [tb,mb,lb,db]=await Promise.all([title.boundingBox(),meta.boundingBox(),lead.boundingBox(),dock.boundingBox()]);
  for(const box of [tb,mb,lb,db]) expect(box).not.toBeNull();
  expect(tb.y+tb.height,'article title should finish before dock').toBeLessThan(db.y-16);
  expect(mb.y+mb.height,'trust metadata should finish before dock').toBeLessThan(db.y-10);
  expect(mb.y,'metadata should precede long lead visually').toBeLessThan(lb.y);
  const titleSize=parseFloat(await title.evaluate(el=>getComputedStyle(el).fontSize));
  expect(titleSize,'mobile editorial title should remain controlled').toBeLessThanOrEqual(35.5);
});


test('first-screen visual evidence for representative product surfaces',async({page})=>{
  const surfaces=[
    ['/en/services/','en-services'],
    ['/en/academic-profile/','en-profile'],
    ['/fa/golden-talent/','fa-golden-talent'],
    ['/fa/darkhast-moshavere/','fa-consultation']
  ];
  for(const [route,name] of surfaces){
    for(const [label,width,height] of [['mobile-390',390,844],['desktop-1440',1440,900]]){
      await page.setViewportSize({width,height});
      await page.goto(base+route,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(180);
      await page.screenshot({path:'test-results/screenshots/'+name+'-'+label+'-first-screen.png',fullPage:false});
    }
  }
});

test('mobile product heroes expose decision controls before the app dock',async({page})=>{
  const cases=[
    ['/en/services/','.service-hero .button.primary'],
    ['/en/academic-profile/','.authority-hero .button.primary'],
    ['/fa/golden-talent/','.service-hero .button.primary'],
    ['/fa/darkhast-moshavere/','.service-hero .foundation-status']
  ];
  for(const [route,targetSel] of cases){
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(180);
    const hero=page.locator('.service-hero,.authority-hero').first();
    const title=hero.locator('h1').first();
    const target=page.locator(targetSel).first();
    const dock=page.locator('.app-dock').first();
    await expect(title).toBeVisible();
    await expect(target).toBeVisible();
    await expect(dock).toBeVisible();
    const [tb,xb,db]=await Promise.all([title.boundingBox(),target.boundingBox(),dock.boundingBox()]);
    for(const box of [tb,xb,db]) expect(box).not.toBeNull();
    expect(tb.y+tb.height,route+' title should finish before dock').toBeLessThan(db.y-14);
    expect(xb.y+xb.height,route+' primary decision control should finish before dock').toBeLessThan(db.y-10);
    const size=parseFloat(await title.evaluate(el=>getComputedStyle(el).fontSize));
    expect(size,route+' title scale').toBeLessThanOrEqual(35.5);
  }
});

test('mobile concierge remains accessible without colliding with the app dock',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/en/services/',{waitUntil:'domcontentloaded'});
  const launcher=page.locator('.jr-assistant-launcher');
  const dock=page.locator('.app-dock').first();
  await expect(launcher).toBeVisible();
  await expect(dock).toBeVisible();
  const [lb,db]=await Promise.all([launcher.boundingBox(),dock.boundingBox()]);
  expect(lb).not.toBeNull();expect(db).not.toBeNull();
  expect(lb.width).toBeGreaterThanOrEqual(44);
  expect(lb.height).toBeGreaterThanOrEqual(44);
  expect(lb.width).toBeLessThanOrEqual(48);
  expect(lb.y+lb.height,'assistant launcher should clear the app dock').toBeLessThanOrEqual(db.y-4);
  await launcher.click();
  await expect(launcher).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#jr-assistant-panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#jr-assistant-panel')).toBeHidden();
  await expect(launcher).toHaveAttribute('aria-expanded','false');
});

test('root gateway first-screen visual evidence',async({page})=>{
  for(const [label,width,height] of [['mobile-390',390,844],['desktop-1440',1440,900]]){
    await page.setViewportSize({width,height});
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(180);
    await prepareVisualCapture(page);
    await page.screenshot({path:'test-results/screenshots/root-gateway-'+label+'-first-screen.png',fullPage:false,animations:'disabled'});
  }
});

test('PWA manifest stays installable without locking device orientation',async({request})=>{
  const res=await request.get(base+'/site.webmanifest');
  expect(res.ok()).toBeTruthy();
  const m=await res.json();
  expect(m.display).toBe('standalone');
  expect(m.orientation).toBe('any');
  expect(m.start_url).toBe('./');
  expect(m.scope).toBe('./');
  expect(m.icons.some(i=>i.sizes==='192x192'&&i.purpose==='any')).toBeTruthy();
  expect(m.icons.some(i=>i.sizes==='512x512'&&i.purpose==='any')).toBeTruthy();
  expect(m.icons.some(i=>i.sizes==='512x512'&&i.purpose==='maskable')).toBeTruthy();
  expect(m.shortcuts.some(s=>s.url==='./en/')).toBeTruthy();
  expect(m.shortcuts.some(s=>s.url==='./fa/')).toBeTruthy();
});

test('standalone gateway resumes the saved language',async({page})=>{
  await page.addInitScript(()=>{
    const native=window.matchMedia?.bind(window);
    window.matchMedia=(query)=>{
      if(query==='(display-mode: standalone)') return {
        matches:true,media:query,onchange:null,
        addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},
        dispatchEvent(){return false}
      };
      return native?native(query):{
        matches:false,media:query,onchange:null,
        addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},
        dispatchEvent(){return false}
      };
    };
    localStorage.setItem('preferred-language','fa');
  });
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>new URL(page.url()).pathname,{timeout:5000}).toMatch(/\/fa\/(?:index\.html)?$/);
});

test('private student shells obey the frozen five-tab mobile contract',async({page})=>{
  const routes=['/fa/app/student/','/en/golden-talent/student/'];
  for(const route of routes){
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(180);
    const dock=page.locator('.app-dock');
    await expect(dock).toBeVisible();
    const links=dock.locator('a');
    await expect(links).toHaveCount(5);
    const labels=await links.locator('span').allTextContents();
    expect(labels).toEqual(route.startsWith('/fa/')?['خانه','کشف','آزمون‌ها','مسیر من','حساب']:['Home','Discover','Tests','My Path','Account']);
    const boxes=await links.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {w:r.width,h:r.height}}));
    for(const box of boxes){expect(box.w).toBeGreaterThanOrEqual(44);expect(box.h).toBeGreaterThanOrEqual(44)}
    await expect(page.locator('.gt-mobile-dock')).toHaveCount(0);
    if(route.startsWith('/fa/')) await expect(page.locator('.dashboard-sidebar')).toBeHidden();
  }

  await page.setViewportSize({width:1440,height:900});
  await page.goto(base+'/fa/app/student/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.dashboard-sidebar')).toBeVisible();
  await expect(page.locator('.app-dock')).toBeHidden();
});

test('private student app visual evidence',async({page})=>{
  const surfaces=[['/fa/app/student/','fa-student-dashboard'],['/en/golden-talent/student/','en-student-gateway']];
  for(const [route,name] of surfaces){
    for(const [label,width,height] of [['mobile-390',390,844],['desktop-1440',1440,900]]){
      await page.setViewportSize({width,height});
      await page.goto(base+route,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(180);
      await page.screenshot({path:'test-results/screenshots/'+name+'-'+label+'-first-screen.png',fullPage:false});
    }
  }
});

test('private mobile heroes prioritize actions and compact evidence',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/en/golden-talent/student/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(180);
  const enHero=page.locator('.gt-private-hero');
  const enTitle=enHero.locator('h1'), enActions=enHero.locator('.actions'), enLead=enHero.locator('.lead'), enDock=page.locator('.app-dock');
  const [et,ea,el,ed]=await Promise.all([enTitle.boundingBox(),enActions.boundingBox(),enLead.boundingBox(),enDock.boundingBox()]);
  for(const box of [et,ea,el,ed]) expect(box).not.toBeNull();
  expect(parseFloat(await enTitle.evaluate(el=>getComputedStyle(el).fontSize))).toBeLessThanOrEqual(33.5);
  expect(ea.y,'English student actions should precede explanatory copy').toBeLessThan(el.y);
  expect(ea.y+ea.height,'English student actions should clear the app dock').toBeLessThan(ed.y-10);

  await page.goto(base+'/fa/app/student/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(180);
  const faTitle=page.locator('.student-dash-hero h1'), faStatus=page.locator('.student-status-card'), faDock=page.locator('.app-dock');
  const [ft,fs,fd]=await Promise.all([faTitle.boundingBox(),faStatus.boundingBox(),faDock.boundingBox()]);
  for(const box of [ft,fs,fd]) expect(box).not.toBeNull();
  expect(parseFloat(await faTitle.evaluate(el=>getComputedStyle(el).fontSize))).toBeLessThanOrEqual(33.5);
  expect(fs.y+fs.height,'Persian dashboard status card should clear the app dock').toBeLessThan(fd.y-8);
});

function cssRgbToHex(css){
  const nums=(String(css).match(/[\d.]+/g)||[]).slice(0,3).map(Number);
  if(nums.length!==3) throw new Error('Expected rgb color, got '+css);
  return '#'+nums.map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0')).join('');
}
test('private dashboard muted labels maintain AA contrast',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/fa/app/student/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(160);
  const selectors=[
    '.dashboard-kpi span',
    '.student-overview small',
    '.decision-question small',
    '.evidence-readiness-row>small',
    '.student-domain-grid small'
  ];
  for(const sel of selectors){
    const node=page.locator(sel).first();
    await expect(node).toBeAttached();
    const cssColor=await node.evaluate(el=>getComputedStyle(el).color);
    const ratio=contrastRatio(cssRgbToHex(cssColor),'#151517');
    expect(ratio,sel+' contrast on the lightest dashboard card surface').toBeGreaterThanOrEqual(4.5);
  }
});

test('PWA install affordance temporarily yields the bottom layer',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/en/',{waitUntil:'domcontentloaded'});
  const launcher=page.locator('.jr-assistant-launcher');
  await expect(launcher).toBeVisible();
  await page.evaluate(()=>{
    const wrap=document.createElement('div');
    wrap.className='pwa-install';
    wrap.innerHTML='<button class="pwa-install-btn">Install</button><button class="pwa-install-close">×</button>';
    document.body.appendChild(wrap);
  });
  await expect(launcher).toBeHidden();
  await page.locator('.pwa-install').evaluate(el=>el.remove());
  await expect(launcher).toBeVisible();
});

test('auth entry visual evidence',async({page})=>{
  const surfaces=[
    ['/fa/login/','fa-login'],
    ['/fa/register/','fa-register'],
    ['/en/login/','en-login'],
    ['/en/register/','en-register']
  ];
  for(const [route,name] of surfaces){
    for(const [label,width,height] of [['mobile-390',390,844],['desktop-1440',1440,900]]){
      await page.setViewportSize({width,height});
      await page.goto(base+route,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(180);
      await page.screenshot({path:'test-results/screenshots/'+name+'-'+label+'-first-screen.png',fullPage:false});
    }
  }
});

test('English student mobile masthead stays compact and single-line',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/en/golden-talent/student/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(160);
  const brand=page.locator('.site-header .brand');
  await expect(brand).toBeVisible();
  const b=await brand.boundingBox();
  expect(b).not.toBeNull();
  expect(b.height,'mobile student brand should remain a compact masthead').toBeLessThanOrEqual(26);
  const direction=await brand.evaluate(el=>getComputedStyle(el).flexDirection);
  expect(direction).toBe('row');
});

for(const route of ['/en/login/','/en/register/','/fa/login/','/fa/register/']){
  test('auth routes suppress the public concierge and keep a compact masthead: '+route,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(350);
    await expect(page.locator('.jr-assistant')).toHaveCount(0);
    const brand=page.locator('.site-header .brand');
    await expect(brand).toBeVisible();
    const b=await brand.boundingBox();
    expect(b).not.toBeNull();
    expect(b.height,route+' auth masthead height').toBeLessThanOrEqual(34);
    expect(await brand.evaluate(el=>getComputedStyle(el).flexDirection)).toBe('row');
    const robots=await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots||'').toContain('noindex');
    const activeTab=page.locator('.app-dock a[aria-current="page"] span');
    await expect(activeTab).toHaveText(route.startsWith('/fa/')?'حساب':'Account');
  });
}

test('system-native typography stacks stay unified without external font requests',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/en/',{waitUntil:'domcontentloaded'});
  const enBody=await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily);
  const enH1=await page.locator('h1').first().evaluate(el=>getComputedStyle(el).fontFamily);
  expect(enBody).toMatch(/Segoe UI|Helvetica Neue|Arial/);
  expect(enH1).toMatch(/Iowan Old Style|Baskerville|Palatino|Georgia/);
  await page.goto(base+'/fa/',{waitUntil:'domcontentloaded'});
  const faBody=await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily);
  const faH1=await page.locator('h1').first().evaluate(el=>getComputedStyle(el).fontFamily);
  expect(faBody).toMatch(/Noto Sans Arabic|Segoe UI|Tahoma/);
  expect(faH1).toMatch(/Noto Sans Arabic|Segoe UI|Tahoma/);
  const externalFonts=await page.evaluate(()=>[...document.styleSheets].map(s=>s.href).filter(Boolean).filter(h=>/fonts\.(?:googleapis|gstatic)|use\.typekit/i.test(h)));
  expect(externalFonts).toEqual([]);
});

test('Persian auth brand preserves Golden Talent word order',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/fa/login/',{waitUntil:'domcontentloaded'});
  const brand=page.locator('.site-header .brand');
  await expect(brand).toBeVisible();
  expect(await brand.evaluate(el=>getComputedStyle(el).direction)).toBe('ltr');
  expect((await brand.textContent()).replace(/\s+/g,' ').trim()).toMatch(/^Golden Talent/);
});

test('commerce publishing first-screen visual evidence',async({page})=>{
  const surfaces=[
    ['/fa/shop/','fa-shop'],
    ['/en/shop/','en-shop'],
    ['/journal/','jhela-journal'],
    ['/publisher/','publisher']
  ];
  for(const [route,name] of surfaces){
    for(const [label,width,height] of [['mobile-390',390,844],['desktop-1440',1440,900]]){
      await page.setViewportSize({width,height});
      await page.goto(base+route,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(180);
      await expect(page.locator('h1')).toHaveCount(1);
      const overflow=await stableOverflow(page);
      expect(Math.max(overflow.html,overflow.body),route+' commerce/publishing overflow').toBeLessThanOrEqual(overflow.viewport+1);
      await page.screenshot({path:'test-results/screenshots/'+name+'-'+label+'-first-screen.png',fullPage:false});
    }
  }
});

for(const route of ['/fa/shop/','/en/shop/']){
  test('bookstore exposes the three owner-approved sellable print titles without claiming live gateway completion: '+route,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(320);
    const cards=page.locator('[data-book-catalog] .book-product-card');
    await expect(cards).toHaveCount(3);
    await expect(page.locator('[data-add-book]')).toHaveCount(3);
    await expect(page.locator('.book-price')).toHaveCount(3);
    await expect(page.locator('.book-pending')).toHaveCount(0);
    const body=(await page.locator('body').innerText()).replace(/\s+/g,' ');
    expect(body).toMatch(/(?:درگاه|gateway|payment)/i);
  });
}

test('private student mobile shell uses the frozen five-tab contract',async({page})=>{
  const cases=[
    ['/fa/app/student/','fa'],
    ['/en/golden-talent/student/','en']
  ];
  for(const [route,locale] of cases){
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(180);
    const dock=page.locator('.app-dock');
    await expect(dock).toBeVisible();
    const links=dock.locator('a');
    await expect(links).toHaveCount(5);
    const hrefs=await links.evaluateAll(nodes=>nodes.map(n=>new URL(n.href).pathname));
    if(locale==='fa'){
      expect(hrefs).toEqual([
        '/fa/app/student/',
        '/fa/golden-talent/',
        '/fa/assessments/golden-talent/',
        '/fa/app/student/golden-path/',
        '/fa/app/account/'
      ]);
      await expect(page.locator('.dashboard-sidebar')).toBeHidden();
    }else{
      expect(hrefs).toEqual([
        '/en/golden-talent/student/',
        '/en/golden-talent/',
        '/en/golden-talent/assessment/',
        '/en/golden-talent/dashboard/golden-path/',
        '/en/account/'
      ]);
    }
    const boxes=await links.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {w:r.width,h:r.height}}));
    for(const b of boxes){expect(b.w).toBeGreaterThanOrEqual(44);expect(b.h).toBeGreaterThanOrEqual(44)}
  }

  await page.setViewportSize({width:1440,height:900});
  await page.goto(base+'/fa/app/student/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.dashboard-sidebar')).toBeVisible();
  await expect(page.locator('.dashboard-sidebar nav a')).toHaveCount(11);
  await expect(page.locator('.app-dock')).toBeHidden();
});

test('tablet portrait and landscape visual resilience',async({page})=>{
  const routes=[
    ['/en/','en-home'],
    ['/fa/','fa-home'],
    ['/en/services/','en-services'],
    ['/fa/golden-talent/','fa-golden-talent'],
    ['/fa/app/student/','fa-student-dashboard'],
    ['/en/golden-talent/student/','en-student-gateway']
  ];
  for(const [label,width,height] of [['tablet-portrait-768',768,1024],['tablet-landscape-1024',1024,768]]){
    for(const [route,name] of routes){
      await page.setViewportSize({width,height});
      await page.goto(base+route,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(180);
      const dims=await page.evaluate(()=>({
        sw:document.documentElement.scrollWidth,
        cw:document.documentElement.clientWidth,
        body:document.body.scrollWidth,
        inner:window.innerWidth
      }));
      expect(Math.max(dims.sw,dims.body),route+' '+label+' horizontal overflow')
        .toBeLessThanOrEqual(dims.inner+1);
      await expect(page.locator('main').first()).toBeVisible();
      const h1=page.locator('main h1').first();
      if(await h1.count()) await expect(h1).toBeVisible();
      await prepareVisualCapture(page);
      await page.screenshot({
        path:'test-results/screenshots/'+name+'-'+label+'-first-screen.png',
        fullPage:false,
        animations:'disabled'
      });
    }
  }
});

test('tablet public navigation avoids wrapped desktop menus',async({page})=>{
  for(const route of ['/en/','/fa/','/en/services/','/fa/golden-talent/']){
    await page.setViewportSize({width:1024,height:768});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(160);
    await expect(page.locator('.site-header nav')).toBeHidden();
    await expect(page.locator('.app-dock')).toBeHidden();
    const trigger=page.locator('.tablet-menu-trigger');
    await expect(trigger).toBeVisible();
    const box=await trigger.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await trigger.click();
    const sheet=page.locator('#mobile-app-menu');
    await expect(sheet).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded','true');
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  }
  await page.setViewportSize({width:1101,height:800});
  await page.goto(base+'/en/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(120);
  await expect(page.locator('.site-header nav')).toBeVisible();
  await expect(page.locator('.tablet-menu-trigger')).toBeHidden();
  await expect(page.locator('.app-dock')).toBeHidden();
});

test('private student app first-screen visual evidence',async({page})=>{
  const surfaces=[
    ['/fa/app/student/','fa-student-dashboard'],
    ['/en/golden-talent/student/','en-student-gateway']
  ];
  for(const [route,name] of surfaces){
    for(const [label,width,height] of [['mobile-390',390,844],['desktop-1440',1440,900]]){
      await page.setViewportSize({width,height});
      await page.goto(base+route,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(220);
      await expect(page.locator('main').first()).toBeVisible();
      const overflow=await stableOverflow(page);
      expect(Math.max(overflow.html,overflow.body),route+' private-app overflow').toBeLessThanOrEqual(overflow.viewport+1);
      await page.screenshot({path:'test-results/screenshots/'+name+'-'+label+'-first-screen.png',fullPage:false});
    }
  }
});

test('Persian student dashboard prioritizes next action before analytics',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/fa/app/student/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(180);
  const hero=page.locator('.student-dash-hero');
  const next=page.locator('.student-next-action');
  const kpi=page.locator('.dashboard-kpi-row');
  const dock=page.locator('.app-dock');
  await expect(hero).toBeVisible();
  await expect(next).toBeVisible();
  await expect(kpi).toBeVisible();
  await expect(dock).toBeVisible();
  const [hb,nb,kb,db]=await Promise.all([hero.boundingBox(),next.boundingBox(),kpi.boundingBox(),dock.boundingBox()]);
  for(const box of [hb,nb,kb,db]) expect(box).not.toBeNull();
  expect(nb.y,'next action must follow hero').toBeGreaterThanOrEqual(hb.y+hb.height-2);
  expect(kb.y,'analytics should follow the actionable next step').toBeGreaterThanOrEqual(nb.y+nb.height-2);
  expect(nb.y+Math.min(nb.height,46),'next action should enter the first app viewport before the dock').toBeLessThan(db.y-8);
  const title=hero.locator('h1');
  const size=parseFloat(await title.evaluate(el=>getComputedStyle(el).fontSize));
  expect(size,'mobile dashboard title should be product-scale').toBeLessThanOrEqual(32.5);
});

test('private role mobile shells obey the frozen five-tab contract',async({page})=>{
  const cases=[
    ['/fa/app/valed/',['/fa/app/valed/','/fa/app/valed/resources/','/fa/assessments/golden-talent/observer/','/fa/app/valed/my-path/','/fa/app/account/']],
    ['/fa/app/moallem/',['/fa/app/moallem/','/fa/app/moallem/resources/','/fa/assessments/golden-talent/observer/','/fa/app/moallem/my-path/','/fa/app/account/']],
    ['/fa/app/moshaver/',['/fa/app/moshaver/','/fa/golden-talent/ravesh-shenasi/','/fa/app/moshaver/case-preview/','/fa/app/moshaver/my-path/','/fa/app/account/']],
    ['/en/golden-talent/roles/parent/',['/en/golden-talent/roles/parent/','/en/golden-talent/roles/parent/resources/','/en/golden-talent/observer/','/en/golden-talent/roles/parent/my-path/','/en/account/']],
    ['/en/golden-talent/roles/teacher/',['/en/golden-talent/roles/teacher/','/en/golden-talent/roles/teacher/resources/','/en/golden-talent/observer/','/en/golden-talent/roles/teacher/my-path/','/en/account/']],
    ['/en/golden-talent/roles/adviser/',['/en/golden-talent/roles/adviser/','/en/golden-talent/methodology/','/en/golden-talent/roles/adviser/case-preview/','/en/golden-talent/roles/adviser/my-path/','/en/account/']]
  ];
  for(const [route,expected] of cases){
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(180);
    const dock=page.locator('.app-dock');
    await expect(dock).toBeVisible();
    const links=dock.locator('a');
    await expect(links).toHaveCount(5);
    const paths=await links.evaluateAll(nodes=>nodes.map(n=>new URL(n.href).pathname));
    expect(paths).toEqual(expected);
    const robots=await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots||'',route+' must remain noindex').toContain('noindex');
    const overflow=await stableOverflow(page);
    expect(Math.max(overflow.html,overflow.body),route+' private role overflow').toBeLessThanOrEqual(overflow.viewport+1);
  }
});

test('representative private role first-screen visual evidence',async({page})=>{
  const surfaces=[
    ['/fa/app/valed/','fa-parent-app'],
    ['/en/golden-talent/roles/adviser/','en-adviser-app']
  ];
  for(const [route,name] of surfaces){
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(200);
    await page.screenshot({path:'test-results/screenshots/'+name+'-mobile-390-first-screen.png',fullPage:false});
  }
});

test('Persian private role shells keep usable mobile content width',async({page})=>{
  for(const route of ['/fa/app/valed/','/fa/app/moallem/','/fa/app/moshaver/']){
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(180);
    const main=page.locator('main.foundation-main.app-prototype');
    const hero=page.locator('.foundation-hero');
    const h1=hero.locator('h1');
    await expect(main).toBeVisible();
    await expect(hero).toBeVisible();
    await expect(h1).toBeVisible();
    const [mb,hb,tb]=await Promise.all([main.boundingBox(),hero.boundingBox(),h1.boundingBox()]);
    for(const box of [mb,hb,tb]) expect(box).not.toBeNull();
    expect(mb.width,route+' app shell width').toBeGreaterThanOrEqual(350);
    expect(hb.width,route+' hero width').toBeGreaterThanOrEqual(350);
    expect(tb.width,route+' heading usable width').toBeGreaterThanOrEqual(280);
    const direction=await h1.evaluate(el=>getComputedStyle(el).direction);
    expect(direction).toBe('rtl');
  }
});

test('English student gateway uses a two-by-two mobile action grid',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/en/golden-talent/student/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(180);
  const actions=page.locator('.gt-private-hero>.actions .button');
  await expect(actions).toHaveCount(4);
  const boxes=await actions.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}));
  const eps=3;
  expect(Math.abs(boxes[0].y-boxes[1].y)).toBeLessThanOrEqual(eps);
  expect(Math.abs(boxes[2].y-boxes[3].y)).toBeLessThanOrEqual(eps);
  expect(boxes[1].x).toBeGreaterThan(boxes[0].x+20);
  expect(boxes[3].x).toBeGreaterThan(boxes[2].x+20);
  expect(boxes[2].y).toBeGreaterThan(boxes[0].y+boxes[0].h-2);
  const dock=await page.locator('.app-dock').boundingBox();
  expect(dock).not.toBeNull();
  expect(boxes[0].y+boxes[0].h).toBeLessThan(dock.y-10);
});

test('Persian role dashboards keep title and trust status above the app dock',async({page})=>{
  const routes=['/fa/app/valed/','/fa/app/moallem/','/fa/app/moshaver/'];
  for(const route of routes){
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(180);
    const title=page.locator('.foundation-hero h1').first();
    const firstStatus=page.locator('.role-status-card').first();
    const dock=page.locator('.app-dock').first();
    await expect(title).toBeVisible();
    await expect(firstStatus).toBeVisible();
    await expect(dock).toBeVisible();
    const [tb,sb,db]=await Promise.all([title.boundingBox(),firstStatus.boundingBox(),dock.boundingBox()]);
    for(const box of [tb,sb,db]) expect(box).not.toBeNull();
    const size=parseFloat(await title.evaluate(el=>getComputedStyle(el).fontSize));
    expect(size,route+' mobile role title size').toBeLessThanOrEqual(33.5);
    expect(tb.y+tb.height,route+' title should clear dock').toBeLessThan(db.y-18);
    expect(sb.y,route+' first trust card should begin before dock').toBeLessThan(db.y-24);
    const links=page.locator('.app-dock a');
    await expect(links).toHaveCount(5);
  }
});

test('Persian private role visual evidence',async({page})=>{
  const surfaces=[
    ['/fa/app/valed/','fa-parent-app'],
    ['/fa/app/moallem/','fa-teacher-app'],
    ['/fa/app/moshaver/','fa-adviser-app']
  ];
  for(const [route,name] of surfaces){
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(180);
    await page.screenshot({path:'test-results/screenshots/'+name+'-mobile-390-first-screen.png',fullPage:false});
  }
});

test('auth previews keep trust evidence visible before the mobile dock',async({page})=>{
  const routes=['/en/login/','/en/register/','/fa/login/','/fa/register/'];
  for(const route of routes){
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(180);
    const title=page.locator('.article-hero h1').first();
    const status=page.locator('.role-status-card').first();
    const dock=page.locator('.app-dock').first();
    await expect(title).toBeVisible();
    await expect(status).toBeVisible();
    await expect(dock).toBeVisible();
    const [tb,sb,db]=await Promise.all([title.boundingBox(),status.boundingBox(),dock.boundingBox()]);
    for(const box of [tb,sb,db]) expect(box).not.toBeNull();
    expect(parseFloat(await title.evaluate(el=>getComputedStyle(el).fontSize)),route+' auth title size').toBeLessThanOrEqual(34.5);
    expect(tb.y+tb.height,route+' auth title should clear dock').toBeLessThan(db.y-18);
    expect(sb.y,route+' first trust status should enter before dock').toBeLessThan(db.y-24);
    const form=page.locator('.auth-form');
    await expect(form.locator('input,select').first()).toBeDisabled();
  }
});

test('auth mobile visual evidence',async({page})=>{
  const surfaces=[
    ['/en/login/','en-login'],
    ['/en/register/','en-register'],
    ['/fa/login/','fa-login'],
    ['/fa/register/','fa-register']
  ];
  for(const [route,name] of surfaces){
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(180);
    await page.screenshot({path:'test-results/screenshots/'+name+'-mobile-390-first-screen.png',fullPage:false});
  }
});


test('knowledge article explicit sharing and on-device bookmarks',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const route='/fa/rahnamaha/golden-talent-chist/';
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  const bookmark=page.locator('[data-article-bookmark]');
  await expect(bookmark).toBeVisible();
  await expect(bookmark).toHaveAttribute('aria-pressed','false');

  const menus=page.locator('.knowledge-article-actionmenu');
  await expect(menus).toHaveCount(2);
  await menus.first().locator('summary').click();
  const links=menus.first().locator('a');
  await expect(links).toHaveCount(3);
  expect(await links.nth(0).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/);
  expect(await links.nth(1).getAttribute('href')).toMatch(/^https:\/\/t\.me\/share\/url\?/);
  expect(await links.nth(2).getAttribute('href')).toMatch(/^mailto:\?subject=/);

  await bookmark.click();
  await expect(bookmark).toHaveAttribute('aria-pressed','true');
  await menus.nth(1).locator('summary').click();
  await expect(menus.nth(1).locator('a[href$="'+route+'"]')).toHaveCount(1);

  await page.reload({waitUntil:'domcontentloaded'});
  const persisted=page.locator('[data-article-bookmark]');
  await expect(persisted).toHaveAttribute('aria-pressed','true');
  await persisted.click();
  await expect(persisted).toHaveAttribute('aria-pressed','false');

  const overflow=await stableOverflow(page);
  expect(Math.max(overflow.html,overflow.body)).toBeLessThanOrEqual(overflow.viewport+1);
});


test('knowledge reader private enquiry, font controls and print presentation',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/fa/rahnamaha/golden-talent-chist/',{waitUntil:'domcontentloaded'});
  const enquire=page.locator('.knowledge-article-private-question');
  await expect(enquire).toBeVisible();
  const href=await enquire.getAttribute('href');
  expect(href).toMatch(/^mailto:dr\.rezazadeh65@gmail\.com\?subject=/);
  const email=new URL(href);
  expect(email.searchParams.get('subject')).toContain('Golden Talent');
  expect(email.searchParams.get('body')).toContain('https://drjavadrezazadeh.com/fa/rahnamaha/golden-talent-chist/');
  expect(email.searchParams.get('body')).toContain('\n');

  const font=page.locator('[data-reader-font]');
  await expect(font).toBeVisible();
  await expect(font).toHaveAttribute('aria-pressed','false');
  const paragraph=page.locator('.knowledge-article-content p').first();
  const original=await paragraph.evaluate(node=>parseFloat(getComputedStyle(node).fontSize));
  await font.click();
  await expect(font).toHaveAttribute('aria-pressed','true');
  const enlarged=await paragraph.evaluate(node=>parseFloat(getComputedStyle(node).fontSize));
  expect(enlarged).toBeGreaterThan(original);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-reader-font]')).toHaveAttribute('aria-pressed','true');

  await page.evaluate(()=>{window.__printTriggered=false;window.print=()=>{window.__printTriggered=true}});
  await page.locator('[data-reader-print]').click();
  expect(await page.evaluate(()=>window.__printTriggered)).toBe(true);
  await page.emulateMedia({media:'print'});
  await expect(page.locator('.knowledge-article-tools')).toBeHidden();
  await expect(page.locator('.knowledge-article-content h2').first()).toBeVisible();
  await page.emulateMedia({media:'screen'});
  const layout=await stableOverflow(page);
  expect(Math.max(layout.html,layout.body)).toBeLessThanOrEqual(layout.viewport+1);
});


test('service diagnostic example is honest, usable and responsive',async({page,request})=>{
  for(const [width,height] of [[390,844],[1440,900]]){
    await page.setViewportSize({width,height});
    await page.goto(base+'/fa/khadamat/',{waitUntil:'domcontentloaded'});
    const sample=page.locator('#sample-diagnostic-report');
    await expect(sample).toBeVisible();
    await expect(sample.locator('h2')).toContainText('نمونه ساختار گزارش');
    await expect(sample).toContainText('کاملاً فرضی');
    await expect(sample).toContainText('تضمین پذیرش مقاله نیست');
    await expect(sample.locator('.service-offer')).toHaveCount(3);
    const requestLink=sample.locator('a[href*="darkhast-moshavere/"]');
    await expect(requestLink).toHaveAttribute('href',/\?service=manuscript_diagnostic$/);
    const guide=sample.locator('a[href*="chera-maghale-amade-ersal-nist/"]');
    const destination=new URL(await guide.getAttribute('href'),page.url());
    expect(destination.pathname).toBe('/fa/rahnamaha/chera-maghale-amade-ersal-nist/');
    const layout=await stableOverflow(page);
    expect(Math.max(layout.html,layout.body),'services horizontal overflow '+width)
      .toBeLessThanOrEqual(layout.viewport+1);
  }
  const target=await request.get(base+'/fa/rahnamaha/chera-maghale-amade-ersal-nist/');
  expect(target.ok()).toBe(true);
});


test('international service example remains explicitly hypothetical and accessible',async({page})=>{
  for(const [width,height] of [[390,844],[1440,900]]){
    await page.setViewportSize({width,height});
    await page.goto(base+'/en/services/',{waitUntil:'domcontentloaded'});
    const sample=page.locator('#sample-diagnostic-report');
    await expect(sample).toBeVisible();
    await expect(sample.locator('h2')).toContainText('manuscript diagnostic review');
    await expect(sample).toContainText('hypothetical');
    await expect(sample).toContainText('not a client case');
    await expect(sample.locator('.service-offer')).toHaveCount(3);
    await expect(sample.locator('a[href="../request-consultation/"]')).toHaveCount(1);
    const dims=await stableOverflow(page);
    expect(Math.max(dims.html,dims.body),'English services overflow '+width).toBeLessThanOrEqual(dims.viewport+1);
  }
});
