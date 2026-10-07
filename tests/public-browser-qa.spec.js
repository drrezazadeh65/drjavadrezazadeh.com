const {test,expect}=require('@playwright/test');

test.use({serviceWorkers:'block'});

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
      await page.screenshot({path:'test-results/screenshots/'+name+'-'+label+'.png',fullPage:true});
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
    const items=dock.locator('a,button');
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
    const menu=dock.locator('[data-nav-toggle]');
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
    await page.screenshot({path:'test-results/screenshots/root-gateway-'+label+'-first-screen.png',fullPage:false});
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
  await page.waitForURL(/\/fa\/$/);
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
