import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const out = path.resolve('../../docs/design/14d-qa', process.argv[2] || 'after');
  fs.mkdirSync(out, { recursive: true });
  const widths=process.argv[2]==='before'?[375]:[320,375,430,768,1440];
  const results=[];
  for(const width of widths) {
  await page.setViewportSize({width,height:900});
  for (const [name, route] of [['landing','/'],['register','/registro'],['login','/login'],['reset','/recuperar-clave'],['offline','/offline']]) {
    await page.goto((process.argv[3]||'http://localhost:3001')+route);
    await page.waitForLoadState('networkidle');
    await page.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:true});
    results.push({name,width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)});
    if(name==='landing'&&width<=430){const box=await page.locator('.primary-action').boundingBox();if(!box||box.y+box.height>900)throw Error('CTA outside first viewport');}
  }
  }
  console.log(JSON.stringify(results.filter(x=>x.overflow)));
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
  await browser.close();
})();
