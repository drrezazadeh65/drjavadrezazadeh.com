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
  expect(href).toMatch(/^mailto:info@drjavadrezazadeh\.com\?subject=/);
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


test('decision matrix compares documented evidence privately and exports safe CSV',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const outbound=[];
  page.on('request',req=>{if(req.method()!=='GET')outbound.push(req.url())});
  await page.goto(base+'/fa/rahnamaha/moghayese-reshteha-ba-matris-tasmim/',{waitUntil:'domcontentloaded'});
  const tool=page.locator('[data-decision-matrix]');
  await expect(tool).toBeVisible();
  const form=tool.locator('[data-dm-form]');
  await expect(form).toBeVisible();
  await form.locator('[data-dm-render]').click();
  await expect(form.locator('[data-dm-status]')).toContainText('حداقل دو رشته');
  const routeBefore=page.url();
  await form.locator('.dm-option').first().locator('[data-dm-name]').press('Enter');
  expect(page.url()).toBe(routeBefore);

  const options=tool.locator('.dm-option');
  await options.nth(0).locator('[data-dm-name]').fill('رشته الف');
  await options.nth(0).locator('[data-dm-key="interest"]').fill('علاقه به پژوهش');
  await options.nth(1).locator('summary').click();
  await options.nth(1).locator('[data-dm-name]').fill('رشته ب');
  await options.nth(1).locator('[data-dm-key="questions"]').fill('بررسی سرفصل رسمی');
  await form.locator('[data-dm-render]').click();
  await expect(tool.locator('[data-dm-result]')).toBeVisible();
  const table=tool.locator('[data-dm-table]');
  await expect(table.locator('thead th')).toHaveCount(3);
  await expect(table).toContainText('علاقه به پژوهش');
  await expect(table).toContainText('بررسی سرفصل رسمی');

  const downloadPromise=page.waitForEvent('download');
  await form.locator('[data-dm-export]').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('comparison-of-study-paths.csv');
  expect(outbound).toEqual([]);

  await form.locator('[data-dm-reset]').click();
  await expect(tool.locator('[data-dm-result]')).toBeHidden();
  await expect(options.nth(0).locator('[data-dm-name]')).toHaveValue('');
  const overflow=await stableOverflow(page);
  expect(Math.max(overflow.html,overflow.body)).toBeLessThanOrEqual(overflow.viewport+1);

  await page.setViewportSize({width:1440,height:900});
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-dm-form]')).toBeVisible();
  const desktopOverflow=await stableOverflow(page);
  expect(Math.max(desktopOverflow.html,desktopOverflow.body)).toBeLessThanOrEqual(desktopOverflow.viewport+1);
});


test('new service worker activation does not discard in-progress matrix input',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/fa/rahnamaha/moghayese-reshteha-ba-matris-tasmim/',{waitUntil:'domcontentloaded'});
  const input=page.locator('.dm-option').first().locator('[data-dm-name]');
  await expect(input).toBeVisible();
  await input.fill('رشته نمونه ثبت‌نشده');
  const navigation=[];
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigation.push(frame.url())});
  const hasSW=await page.evaluate(()=>!!navigator.serviceWorker);
  if(hasSW) await page.evaluate(()=>navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));
  await page.waitForTimeout(240);
  await expect(input).toHaveValue('رشته نمونه ثبت‌نشده');
  expect(navigation).toEqual([]);
});


test('practical CV and assessment guides offer verifiable examples at mobile and desktop',async({page})=>{
  const guides=[
    ['/fa/rahnamaha/academic-cv-professional/','چک‌لیست هفت‌گانه پیش از ارسال CV',0],
    ['/fa/rahnamaha/azmoon-khoob-vijegiha/','نمونه فرضی جدول مشخصات برای یک آزمون کلاسی',1]
  ];
  for(const [route,heading,hasTable] of guides){
    for(const [width,height] of [[390,844],[1440,900]]){
      await page.setViewportSize({width,height});
      const resp=await page.goto(base+route,{waitUntil:'domcontentloaded'});
      expect(resp.status()).toBe(200);
      const content=page.locator('.knowledge-article-content');
      await expect(content).toContainText(heading);
      await expect(content).toContainText('صرفاً');
      if(hasTable)await expect(content.locator('table tbody tr')).toHaveCount(3);
      const overflow=await stableOverflow(page);
      expect(Math.max(overflow.html,overflow.body),'guide overflow '+route+' '+width)
        .toBeLessThanOrEqual(overflow.viewport+1);
      expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://drjavadrezazadeh.com'+route);
    }
  }
});


test('evidence-led practical classroom and manuscript guides retain responsive SEO',async({page})=>{
 const guides=[
 ['/fa/rahnamaha/barname-yek-mahe-konkur/','برگه بازبینی پایان ماه'],
 ['/fa/rahnamaha/ai-dar-tadris/','یک فعالیت کلاسی با AI'],
 ['/fa/rahnamaha/arzyabi-mavad-amoozeshi/','کاربرگ مشاهده پس از تدریس'],
 ['/fa/rahnamaha/ghabl-az-submit-maghale/','پرونده آماده ارسال']
 ];
 for(const [route,needle] of guides){
  for(const [width,height] of [[390,844],[1440,900]]){
   await page.setViewportSize({width,height});
   const resp=await page.goto(base+route,{waitUntil:'domcontentloaded'});
   expect(resp.status(),route).toBe(200);
   await expect(page.locator('.knowledge-article-content')).toContainText(needle);
   await expect(page.locator('.knowledge-article-content h2[id]').first()).toBeVisible();
   expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://drjavadrezazadeh.com'+route);
   const overflow=await stableOverflow(page);
   expect(Math.max(overflow.html,overflow.body),route+' horizontal overflow '+width).toBeLessThanOrEqual(overflow.viewport+1);
  }
 }
});


test('talent report, higher-ed selection and student development articles include usable evidence examples',async({page})=>{
  const guides=[
   ['/fa/rahnamaha/gozaresh-estedaad-va-masir-roshd/','نمونه چرخه رشد ۱۴روزه'],
   ['/fa/rahnamaha/entekhab-reshteh-jame/','کاربرگ توجیه اولویت'],
   ['/fa/rahnamaha/az-arzyabi-ta-barname-roshd-danesh-amooz/','نمونه چرخه دوهفته‌ای رشد']
  ];
  for(const [route,required] of guides){
    for(const [width,height] of [[390,844],[1440,900]]){
      await page.setViewportSize({width,height});
      const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
      expect(response.status(),route).toBe(200);
      await expect(page.locator('.knowledge-article-content')).toContainText(required);
      expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://drjavadrezazadeh.com'+route);
      const rects=await stableOverflow(page);
      expect(Math.max(rects.html,rects.body),route+' viewport '+width).toBeLessThanOrEqual(rects.viewport+1);
    }
  }
});


test('institutional advisory and teacher training guides supply practical, cautious examples',async({page})=>{
  const pages=[
   ['/fa/rahnamaha/madarese-system-estedaadyabi/','طرح آزمایشی کوچک پیش از گسترش'],
   ['/fa/rahnamaha/madarese-che-zamani-moshaver-amoozeshi/','چه چیزهایی باید در شرح خدمات نوشته شود'],
   ['/fa/rahnamaha/kargah-amoozeshi-asarbakhsh/','نمونه طراحی یک جلسه ۹۰دقیقه‌ای']
  ];
  for(const [route,required] of pages){
   for(const [width,height] of [[390,844],[1440,900]]){
    await page.setViewportSize({width,height});
    const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
    expect(response.status()).toBe(200);
    await expect(page.locator('.knowledge-article-content')).toContainText(required);
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://drjavadrezazadeh.com'+route);
    const geo=await stableOverflow(page);
    expect(Math.max(geo.html,geo.body),route+' overflow at '+width).toBeLessThanOrEqual(geo.viewport+1);
   }
  }
});


test('manuscript editing revision and reviewer response guides contain traceable worked examples',async({page})=>{
 const guides=[
 ['/fa/rahnamaha/proofreading-editing-manuscript-review/','نمونه فرضی: چگونه ادعای بیش‌ازحد قاطع'],
 ['/fa/rahnamaha/major-revision-az-koja-shoroo-konim/','نمونه ماتریس مدیریت بازنگری'],
 ['/fa/rahnamaha/pasokh-be-davaran/','نمونه پاسخ انگلیسیِ فرضی']
 ];
 for(const [route,needle] of guides){
  for(const [width,height] of [[390,844],[1440,900]]){
   await page.setViewportSize({width,height});
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
   expect(response.status()).toBe(200);
   await expect(page.locator('.knowledge-article-content')).toContainText(needle);
   expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://drjavadrezazadeh.com'+route);
   const widthData=await stableOverflow(page);
   expect(Math.max(widthData.html,widthData.body),route+' overflow '+width).toBeLessThanOrEqual(widthData.viewport+1);
  }
 }
});


test('premium service selection guides explain decisions and boundaries on mobile and desktop',async({page})=>{
 const articles=[
  ['/fa/rahnamaha/khadamat-amoozeshi-pajouheshi-moshavere-javad-rezazadeh/','پیش از خرید، پنج سؤال'],
  ['/fa/rahnamaha/moshavere-tahsili-takhasosi-chist/','نمونه ساختار خروجی جلسه'],
  ['/fa/rahnamaha/tahlil-karname-tahsili/','از مشاهده تا اقدام'],
  ['/fa/rahnamaha/moshavere-konkur-herfei/','داشبورد کاغذی کوتاه']
 ];
 for(const [route,snippet] of articles){
  for(const [width,height] of [[390,844],[1440,900]]){
   await page.setViewportSize({width,height});
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
   expect(response.status()).toBe(200);
   await expect(page.locator('.knowledge-article-content')).toContainText(snippet);
   await expect(page.locator('.knowledge-article-layout')).toHaveCount(1);
   expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://drjavadrezazadeh.com'+route);
   const overflow=await stableOverflow(page);
   expect(Math.max(overflow.html,overflow.body),route+' '+width).toBeLessThanOrEqual(overflow.viewport+1);
  }
 }
});


test('bilingual intake, service pages and shops disclose real booking and payment state',async({page})=>{
  const cases=[
    ['/fa/darkhast-moshavere/','رزرو آنلاین فعلاً غیرفعال','پرداخت آنلاین فعلاً غیرفعال'],
    ['/en/request-consultation/','Online booking not active','Online payment not active'],
    ['/fa/khadamat/','رزرو و پرداخت آنلاین در این مرحله فعال نیستند','درخواست اولیه، خرید نیست'],
    ['/en/services/','Live appointment booking is not currently available','Online payments are not yet enabled'],
    ['/fa/shop/','تسویه آنلاین غیرفعال','تسویه عمومی این فروشگاه هنوز فعال نیست'],
    ['/en/shop/','Checkout not yet active','No online order or payment'],
    ['/fa/shop/checkout/','تسویه فعلاً غیرفعال','ثبت نهایی سفارش انجام نمی‌شود']
  ];
  for(const [route,first,second] of cases){
    for(const [width,height] of [[390,844],[1440,900]]){
      await page.setViewportSize({width,height});
      const res=await page.goto(base+route,{waitUntil:'domcontentloaded'});
      expect(res.status(),route).toBe(200);
      await expect(page.locator('body')).toContainText(first);
      await expect(page.locator('body')).toContainText(second);
      const d=await stableOverflow(page);
      expect(Math.max(d.html,d.body),route+' overflow at '+width).toBeLessThanOrEqual(d.viewport+1);
    }
  }
});


test('official Persian service catalogue supports search and price sorting without altering fees',async({page})=>{
 for(const [width,height] of [[390,844],[1440,900]]){
  await page.setViewportSize({width,height});
  const response=await page.goto(base+'/fa/khadamat/',{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  const cards=page.locator('[data-service-pricing] .service-pricing-card');
  await expect(cards).toHaveCount(21);
  const search=page.locator('[data-service-search]');
  const sort=page.locator('[data-service-sort]');
  await expect(search).toBeVisible();
  await search.fill('پشتیبانی پاسخ به داوران');
  await expect(cards).toHaveCount(1);
  await expect(page.locator('[data-service-filter-count]')).toContainText('۱ خدمت از ۲۱ خدمت');
  await search.fill('عبارت ناموجود مثال');
  await expect(cards).toHaveCount(0);
  await expect(page.locator('[data-service-empty]')).toBeVisible();
  await page.locator('[data-service-clear]').click();
  await expect(cards).toHaveCount(21);
  await sort.selectOption('asc');
  const prices=await cards.evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.servicePrice)));
  expect(prices).toEqual([...prices].sort((a,b)=>a-b));
  await sort.selectOption('desc');
  const desc=await cards.evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.servicePrice)));
  expect(desc).toEqual([...desc].sort((a,b)=>b-a));
  await page.locator('[data-service-clear]').click();
  await expect(cards).toHaveCount(21);
  const overflow=await stableOverflow(page);
  expect(Math.max(overflow.html,overflow.body)).toBeLessThanOrEqual(overflow.viewport+1);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://drjavadrezazadeh.com/fa/khadamat/');
 }
});


test('mobile above-the-fold typography keeps shop and service entry actions visible',async({page})=>{
  for(const width of [320,390,430]){
    const height=844;
    await page.setViewportSize({width,height});
    for(const route of ['/fa/shop/','/fa/darkhast-moshavere/','/en/services/']){
      const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
      expect(response.status()).toBe(200);
      const h1=page.locator('main h1').first();
      await expect(h1).toBeVisible();
      const fontSize=await h1.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
      expect(fontSize,route+' at '+width+' too large').toBeLessThanOrEqual(34);
      expect(fontSize,route+' at '+width+' too small').toBeGreaterThanOrEqual(27);
      const metrics=await stableOverflow(page);
      expect(Math.max(metrics.html,metrics.body),route+' at '+width+' overflow').toBeLessThanOrEqual(metrics.viewport+1);
      if(route==='/fa/shop/'){
        const links=page.locator('.book-store-hero .store-nav a');
        await expect(links).toHaveCount(2);
        const rects=await links.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));
        expect(Math.abs(rects[0].top-rects[1].top)).toBeLessThanOrEqual(3);
      }
    }
  }
});


test('three newly discovered or pending-index guides provide actionable value with stable canonicals',async({page})=>{
 const guides=[
 ['/fa/rahnamaha/bazaar-kar-dar-entekhab-reshteh/','کاربرگ چهارستونی'],
 ['/fa/rahnamaha/entekhab-reshteh-jame/','چک‌لیست پایانی برای جلوگیری از خطای رشته‌محل'],
 ['/fa/rahnamaha/golden-talent-chist/','از فرضیه تا تجربه آموزشی کوتاه']
 ];
 for(const [route,example] of guides){
  for(const [width,height] of [[390,844],[1440,900]]){
   await page.setViewportSize({width,height});
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
   expect(response.status(),route).toBe(200);
   await expect(page.locator('.knowledge-article-content')).toContainText(example);
   expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://drjavadrezazadeh.com'+route);
   await expect(page.locator('.knowledge-article-content img').first()).toHaveAttribute('src',/featured\.webp$/);
   const overflow=await stableOverflow(page);
   expect(Math.max(overflow.html,overflow.body)).toBeLessThanOrEqual(overflow.viewport+1);
  }
 }
});


test('bilingual bookstore cart sends enquiries, never fictitious payment or orders',async({page})=>{
 for(const [route,locale] of [['/fa/shop/cart/','fa'],['/en/shop/cart/','en']]){
  await page.addInitScript(()=>{
   localStorage.setItem('jr-book-cart-v1',JSON.stringify([
    {book_id:'roshanaei',quantity:2},{book_id:'tariki',quantity:1},
    {book_id:'nonexistent',quantity:4}
   ]));
  });
  for(const [width,height] of [[390,844],[1440,900]]){
   await page.setViewportSize({width,height});
   const resp=await page.goto(base+route,{waitUntil:'domcontentloaded'});
   expect(resp.status()).toBe(200);
   const cart=page.locator('[data-book-cart]');
   await expect(cart.locator('.cart-row')).toHaveCount(2);
   await expect(cart.locator('.cart-summary strong')).toContainText(locale==='fa'?'۶٬۰۰۰٬۰۰۰':'6,000,000');
   await expect(cart.locator('a[data-book-inquiry]')).toBeVisible();
   const href=await cart.locator('[data-book-inquiry]').getAttribute('href');
   expect(href).toMatch(/^mailto:info@drjavadrezazadeh\.com\?subject=/);
   expect(decodeURIComponent(href)).toContain('Sepid');
   expect(decodeURIComponent(href)).toContain('Tariki');
   await expect(cart.locator('[data-book-copy]')).toBeVisible();
   await expect(cart.locator('a[href*="/checkout/"]')).toHaveCount(0);
   const overflow=await stableOverflow(page);
   expect(Math.max(overflow.html,overflow.body),route+' '+width).toBeLessThanOrEqual(overflow.viewport+1);
   await cart.locator('[data-remove-book]').first().click();
   await expect(cart.locator('.cart-row')).toHaveCount(1);
  }
 }
});

test('book selection rejects corrupt or excessive device-only quantities',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('jr-book-cart-v1',JSON.stringify([
   {book_id:'roshanaei',quantity:999},{book_id:'roshanaei',quantity:5},
   {book_id:'tariki',quantity:-2},{book_id:'oops',quantity:'12'}
  ]));
 });
 await page.setViewportSize({width:320,height:800});
 await page.goto(base+'/fa/shop/cart/',{waitUntil:'domcontentloaded'});
 const cart=page.locator('[data-book-cart]');
 await expect(cart.locator('.cart-row')).toHaveCount(1);
 await expect(cart.locator('.cart-row small')).toContainText('20');
 await expect(cart.locator('.cart-summary strong')).toContainText('۴۰٬۰۰۰٬۰۰۰');
 await expect(cart.locator('[data-book-inquiry]')).toHaveAttribute('href',/^mailto:/);
 await expect(cart.locator('a[href*="/checkout/"]')).toHaveCount(0);
});


test('bilingual book detail retains verified identity and explicitly flags missing publishing data',async({page})=>{
 for(const [route,language] of [['/fa/shop/book/?id=roshanaei','fa'],['/en/shop/book/?id=roshanaei','en']]){
  for(const [width,height] of [[390,844],[1440,900]]){
   await page.setViewportSize({width,height});
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
   expect(response.status()).toBe(200);
   const main=page.locator('[data-book-detail]');
   await expect(main.locator('h1')).toContainText('سپید');
   await expect(main.locator('.book-meta')).toContainText(language==='fa'?'هنوز تأیید نشده':'Not yet verified');
   await expect(main.locator('.book-meta')).toContainText(language==='fa'?'ناشر':'Publisher');
   await expect(main.locator('.book-meta')).toContainText(language==='fa'?'نوبت چاپ':'Edition');
   await expect(main.locator('[data-book-info-request]')).toHaveAttribute('href',/^mailto:/);
   await expect(main.locator('[data-detail-add]')).toBeVisible();
   const o=await stableOverflow(page);
   expect(Math.max(o.html,o.body)).toBeLessThanOrEqual(o.viewport+1);
  }
 }
 const route='/en/books/';
 await page.goto(base+route,{waitUntil:'domcontentloaded'});
 const published=page.locator('.authority-section').first();
 await expect(published).toContainText('سپید');
 await expect(published).not.toContainText('روشنایی');
});


test('premium service catalogue compares three offers without changing prices or booking state',async({page})=>{
 for(const [width,height] of [[390,844],[1440,900]]){
  await page.setViewportSize({width,height});
  const response=await page.goto(base+'/fa/khadamat/',{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  const cards=page.locator('[data-service-pricing] .service-pricing-card');
  await expect(cards).toHaveCount(21);
  const choices=cards.locator('[data-service-compare]');
  await expect(choices).toHaveCount(21);
  await choices.nth(0).check();
  await choices.nth(1).check();
  await choices.nth(2).check();
  const comparison=page.locator('[data-service-comparison]');
  await expect(comparison).toBeVisible();
  const table=comparison.locator('[data-service-comparison-table]');
  await expect(table.locator('thead th')).toHaveCount(4);
  await expect(table.locator('tbody tr')).toHaveCount(5);
  await expect(table).toContainText('۶٬۰۰۰٬۰۰۰');
  await choices.nth(3).click(); // click, not check(): the 3-item limit deliberately reverts selection
  await expect(choices.nth(3)).not.toBeChecked();
  await expect(comparison.locator('[data-service-comparison-status]')).toContainText('حداکثر سه');
  const search=page.locator('[data-service-search]');
  await search.fill('جستجوی ناموجود آزمایشی');
  await expect(cards).toHaveCount(0);
  await expect(comparison).toBeVisible();
  await comparison.locator('[data-service-comparison-clear]').click();
  await expect(comparison).toBeHidden();
  await search.fill('');
  await expect(cards).toHaveCount(21);
  const overflow=await stableOverflow(page);
  expect(Math.max(overflow.html,overflow.body),'service compare '+width).toBeLessThanOrEqual(overflow.viewport+1);
 }
});


test('bilingual student identity shells remain honestly disabled until real authentication exists',async({page})=>{
 const pages=[
  ['/fa/login/','هنوز فعال نشده'],
  ['/en/login/','Not yet active'],
  ['/fa/register/','ثبت‌نام آنلاین به‌زودی'],
  ['/en/register/','Registration coming soon']
 ];
 for(const [route,status] of pages){
  for(const [width,height] of [[390,844],[1440,900]]){
   await page.setViewportSize({width,height});
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
   expect(response.status(),route).toBe(200);
   await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
   await expect(page.locator('main')).toContainText(status);
   await expect(page.locator('form input:not([disabled])')).toHaveCount(0);
   await expect(page.locator('form select:not([disabled])')).toHaveCount(0);
   await expect(page.locator('form button:not([disabled])')).toHaveCount(0);
   const o=await stableOverflow(page);
   expect(Math.max(o.html,o.body),route+' overflow at '+width).toBeLessThanOrEqual(o.viewport+1);
  }
 }
});

test('three evidence-led guidance upgrades preserve canonical links and responsive reading',async({page})=>{
 const guides=[
  ['/fa/rahnamaha/mosahabe-heyat-elmi/','الگوی سه‌لایه برای روایت پژوهشی','تمرین پاسخ به نقد روش‌شناختی'],
  ['/fa/rahnamaha/tahlil-karname-tahsili/','مقایسه منصفانه دو درس','چگونه بفهمیم اقدام آموزشی اثر داشته است؟'],
  ['/fa/rahnamaha/moshavere-konkur-herfei/','مسیر بازگشت پس از یک هفته دشوار','نمونه چرخه بازنگری دو‌هفته‌ای']
 ];
 for(const [route,first,second] of guides){
  for(const [width,height] of [[320,800],[390,844],[820,1024],[1440,900]]){
   await page.setViewportSize({width,height});
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
   expect(response.status(),route).toBe(200);
   const article=page.locator('.knowledge-article-content');
   await expect(article).toContainText(first);
   await expect(article).toContainText(second);
   await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://drjavadrezazadeh.com'+route);
   expect(await page.locator('.knowledge-article-content h2[id]').count()).toBeGreaterThanOrEqual(7);
   const size=await stableOverflow(page);
   expect(Math.max(size.html,size.body),route+' overflow at '+width).toBeLessThanOrEqual(size.viewport+1);
  }
 }
});


test('book payments remain disabled when legacy Worker omits category readiness',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('jr-book-cart-v1',JSON.stringify([{book_id:'roshanaei',quantity:1}]));
  });
  await page.route('**/commerce/health',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({ok:true,service:'commerce',checkout:true})
  }));
  for(const route of ['/fa/shop/cart/','/fa/shop/checkout/']){
    const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
    expect(response.status(),route).toBe(200);
    const button=route.includes('/cart/')?
      page.locator('[data-book-cart] [data-book-payment]'):
      page.locator('[data-book-checkout] button.primary');
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
    await expect(button).toContainText('هنوز فعال نیست');
  }
});

test('all 27 service checkout cards have owned illustrations and no premature payment',async({page})=>{
  await page.route('**/commerce/health',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({ok:true,service:'commerce',checkout:true})
  }));
  for(const [route,selector,count] of [
    ['/fa/services/checkout/','[data-commerce-services]',21],
    ['/fa/vip/','[data-commerce-vip]',6]
  ]){
    const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
    expect(response.status(),route).toBe(200);
    const host=page.locator(selector);
    await expect(host.locator('.commerce-card')).toHaveCount(count);
    await expect(host.locator('.commerce-card img')).toHaveCount(count);
    await expect(host.locator('.commerce-card .commerce-fit')).toHaveCount(count);
    await expect(host.locator('.commerce-pay:enabled')).toHaveCount(0);
    await expect(host.locator('.commerce-pay')).toHaveCount(count);
  }
});
