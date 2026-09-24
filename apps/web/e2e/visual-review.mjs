import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
const req=createRequire(import.meta.url);
const esbuild=createRequire(req.resolve('vitest/package.json'))('esbuild');
const webRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const axePackage=fs.readdirSync(path.join(webRoot,'..','..','node_modules','.pnpm')).find(name=>name.startsWith('axe-core@'));
if(!axePackage)throw Error('axe-core is required for the accessibility audit');
const axeSource=fs.readFileSync(path.join(webRoot,'..','..','node_modules','.pnpm',axePackage,'node_modules','axe-core','axe.min.js'),'utf8');
const out=path.join(webRoot,'.local','21-accessibility-qa');fs.mkdirSync(out,{recursive:true});
const capture=path.join(out,'captures');fs.mkdirSync(capture,{recursive:true});
const style=[];
await esbuild.build({absWorkingDir:webRoot,stdin:{contents:'import "./e2e/visual-fixtures.tsx";',resolveDir:webRoot,loader:'js'},bundle:true,write:true,outfile:path.join(out,'app.js'),jsx:'automatic',platform:'browser',define:{'process.env.NODE_ENV':'"development"','process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY':'""'},plugins:[{name:'fixtures',setup(build){
 build.onResolve({filter:/\.css$/},a=>({path:path.resolve(a.resolveDir,a.path),namespace:'styles'}));
 build.onLoad({filter:/.*/,namespace:'styles'},a=>{let css=fs.readFileSync(a.path,'utf8');const names={};if(a.path.endsWith('.module.css')){const prefix=path.basename(a.path).split('.')[0].replaceAll('-','_');css=css.replace(/\.([a-zA-Z_][\w-]*)/g,(_,n)=>{names[n]=prefix+'_'+n;return '.'+names[n];});}else{css=css.replace('@import "./tokens.css";',fs.readFileSync(path.join(webRoot,'app','tokens.css'),'utf8'));}style.push(css);return{contents:'export default '+JSON.stringify(names),loader:'js'};});
 build.onResolve({filter:/^next\/(link|navigation)$/},a=>({path:a.path,namespace:'mock'}));
 build.onResolve({filter:/auth\/actions$/},()=>({path:'actions',namespace:'mock'}));
 build.onResolve({filter:/lib\/supabase\/server$/},()=>({path:'auth',namespace:'mock'}));
 build.onResolve({filter:/server\/user-profile$/},()=>({path:'profile',namespace:'mock'}));
 build.onResolve({filter:/server\/ingestion-admin$/},()=>({path:'ingestion-admin',namespace:'mock'}));
 build.onResolve({filter:/server\/sports-data-revisions$/},()=>({path:'sports-data-revisions',namespace:'mock'}));
 build.onResolve({filter:/packages\/domain\/notifications$/},()=>({path:'notifications',namespace:'mock'}));
 build.onLoad({filter:/.*/,namespace:'mock'},a=>{
  const modules={
   'next/link':'import React from "react"; export default function Link({children,...p}){return React.createElement("a",p,children)}',
   'next/navigation':'export const usePathname=()=>({home:"/app",market:"/app/mercado",team:"/app/mi-equipo",journey:"/app/jornada",league:"/app/ligas",admin:"/app/admin/ingestion"}[new URLSearchParams(location.search).get("case")]||"/app/perfil"); export const useRouter=()=>({refresh(){},prefetch(){}});export const redirect=()=>{};export const notFound=()=>{};',
   actions:'export async function logout(){document.body.dataset.loggedOut="true";}',
   auth:'export async function createClient(){return {auth:{getUser:async()=>({data:{user:{id:"demo",email:"demo@example.test",email_confirmed_at:"2026-09-07"}}})}}}',
   profile:'export async function getUserProfileOverview(){return {username:"pepe_rodriguez",displayName:"Pepe Rodríguez Fernández",avatarPath:null,leagueCount:2,totalPoints:124.5,leagues:[{id:"demo",name:"Los del viernes",teamName:"Sevilla Supersonics",hasTeam:true,memberCount:12}]}}',
   'ingestion-admin':'export class AdminError extends Error{};export async function requireIngestionAdmin(){return "admin"};const now=new Date("2026-09-11T12:00:00Z");export async function getIngestionDashboard(){return {health:"HEALTHY",heartbeat:{seenAt:now},lastSuccess:{finishedAt:now},jobs:[{id:"j1",type:"GAME",targetKey:"gameId:123",status:"RUNNING",effectiveStatus:"RUNNING",requestedAt:now,errorCode:null}],runs:[{id:"r1",jobName:"stats",status:"SUCCEEDED",startedAt:now,errorCategory:null}]}};export async function listRawPayloads(){return [{id:"raw1",entityType:"game_stats",externalId:"123",httpStatus:200,retrievedAt:now,endpoint:"/v2/envivo/estadisticas.ashx"}]}',
   'sports-data-revisions':'export async function requireRevisionAdmin(){return "admin"};export async function listRevisions(){return [{id:"rev1",targetType:"PLAYER_GAME_STAT",fieldName:"points",status:"APPLIED",sourceType:"SOURCE_CORRECTION",recomputationStatus:"SUCCEEDED",revertsRevisionId:null,createdAt:new Date("2026-09-11T12:00:00Z")}] }',
   notifications:'export const NOTIFICATION_GROUPS={Equipo:["TEAM_LINEUP"]};'
  };return{contents:modules[a.path],loader:'jsx',resolveDir:webRoot};
 });
}}]});
const css=style.join('\n');
const server=http.createServer((r,res)=>{const url=new URL(r.url,'http://localhost');if(url.pathname==='/app.js'){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(path.join(out,'app.js')));}else if(url.pathname.startsWith('/fonts/')){res.end(fs.readFileSync(path.join(webRoot,'public',url.pathname)));}else{res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="es"><head><title>Canastio · revisión visual</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+css+'</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>');}});
await new Promise(resolve=>server.listen(4178,'127.0.0.1',resolve));
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({...(fs.existsSync(edge)?{executablePath:edge}:{}),headless:true});
const page=await browser.newPage();
const results=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
let correctionApplyMode='success';let reversalApplyCalls=0;
await page.route('**/api/**',route=>{
 const request=route.request(),url=new URL(request.url());
 if(request.method()==='POST'&&url.pathname==='/api/admin/revisions')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({revision:{id:'preview-1',fieldName:'homeScore',sourceType:'SOURCE_CORRECTION'},label:'Partido · homeScore',diff:{before:70,after:71},impact:{roundNumber:3,recomputes:['scores','rankings','prices']}})});
 if(request.method()==='POST'&&url.pathname==='/api/admin/revisions/rev1/revert')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({revision:{id:'rev-revert',fieldName:'points'},diff:{before:18,after:16}})});
 if(request.method()==='POST'&&url.pathname.endsWith('/apply')){
  if(url.pathname.includes('rev-revert'))reversalApplyCalls++;
  if(correctionApplyMode==='conflict')return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'REVISION_CONFLICT'})});
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({replayed:false})});
 }
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:[]})});
});
try{
 for(const width of [320,375,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  for(const name of (process.env.VISUAL_ONLY ? process.env.VISUAL_ONLY.split(',') : ['register','onboarding','home','home-live','home-final','home-degraded','market','market-v2','team','journey','league','profile','preferences','admin','corrections','sports','states'])){
   await page.goto('http://127.0.0.1:4178/?case='+name);await page.locator('main').waitFor({timeout:30000}).catch(error=>{throw new Error(`${name} failed to render at ${width}px: ${error.message}; page errors: ${errors.join(' | ')}`)});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(capture,`${name}-${width}.png`),fullPage:true});
   if(name==='home'&&width<=720){const nav=page.locator('.bottom-nav');if(!await nav.isVisible())throw Error(`Mobile navigation hidden at ${width}px`);const pinned=await nav.evaluate(el=>{const rect=el.parentElement.getBoundingClientRect();return Math.abs(rect.bottom-innerHeight)<2&&rect.left===0&&Math.abs(rect.right-innerWidth)<2});if(!pinned)throw Error(`Mobile navigation is not pinned at ${width}px`);}
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   results.push({name,width,overflow});
   if(overflow)throw Error(`${name} has horizontal overflow at ${width}px`);
   await page.addScriptTag({content:axeSource});
   const violations=await page.evaluate(async()=>{const result=await globalThis.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.filter(item=>item.impact==='critical'||item.impact==='serious').map(item=>`${item.id}: ${item.nodes.slice(0,3).flatMap(node=>node.target).join(' | ')}`)});
   if(violations.length)throw Error(`${name} has serious axe violations at ${width}px: ${violations.join(', ')}`);
  }
 }
 if(!process.env.VISUAL_ONLY){
 await page.setViewportSize({width:375,height:900});
 await page.goto('http://127.0.0.1:4178/?case=register');
 const username=page.locator('input[name="username"]');
 if(!await username.evaluate(el=>el.required))throw Error('Username must remain required');
 await username.fill('no válido');if(await username.evaluate(el=>el.checkValidity()))throw Error('Invalid username accepted');
 await username.fill('pepe_23');if(!await username.evaluate(el=>el.checkValidity()))throw Error('Valid username rejected');
 await page.getByLabel('Correo electrónico').focus();await page.keyboard.press('Tab');
 if(!await username.evaluate(el=>el===document.activeElement))throw Error('Registration focus order changed');
 await page.goto('http://127.0.0.1:4178/?case=onboarding');if(await page.locator('.bottom-nav').count())throw Error('Onboarding exposes navigation');
 if(await page.getByLabel('Código de liga').count())throw Error('Onboarding shows both alternatives at once');
 await page.getByRole('button',{name:/Crear liga/}).click();
 if(!await page.getByRole('alert').isVisible())throw Error('Create league validation feedback missing');
 await page.getByText('Tengo un código',{exact:true}).click();
 if(!await page.getByLabel('Código de liga').isVisible()||await page.getByLabel('Nombre de la liga').count())throw Error('Onboarding mode switch failed');
 await page.goto('http://127.0.0.1:4178/?case=market');
 if(await page.locator('.bottom-nav a').count()!==5)throw Error('Navigation must have five destinations');
 if(await page.locator('.bottom-nav [aria-current="page"]').getAttribute('href')!=='/app/mercado')throw Error('Active section missing');
 await page.getByRole('button',{name:'Comprar',exact:true}).first().click();
 await page.getByRole('dialog').waitFor();await page.screenshot({path:path.join(capture,'market-dialog-375.png'),fullPage:true});
 const dialogTargets=await page.getByRole('dialog').locator('button:not([disabled]),input:not([disabled]),select:not([disabled])').count();if(dialogTargets<2)throw Error('Dialog focus order is incomplete');
 await page.keyboard.press('Escape');if(await page.getByRole('dialog').isVisible())throw Error('Escape failed');
 if(!await page.getByRole('button',{name:'Comprar',exact:true}).first().evaluate(el=>el===document.activeElement))throw Error('Dialog failed to restore focus');
 await page.getByPlaceholder('Jugador o equipo…').fill('Nadie coincide');if(!await page.getByText('No hay jugadores para este filtro.').isVisible())throw Error('Filtering failed');
 await page.goto('http://127.0.0.1:4178/?case=team');await page.getByRole('button',{name:'Puntos',exact:true}).click();await page.screenshot({path:path.join(capture,'team-points-375.png'),fullPage:true});
 await page.goto('http://127.0.0.1:4178/?case=profile');await page.locator('.profile-logout > .logout-button').click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
 await page.goto('http://127.0.0.1:4178/?case=preferences');await page.getByLabel('Claro').check();if(await page.evaluate(()=>document.documentElement.dataset.theme)!=='light')throw Error('Light theme did not apply');
 if(await page.evaluate(()=>localStorage.getItem('canastio-theme'))!=='light')throw Error('Theme preference did not persist');
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
 await page.goto('http://127.0.0.1:4178/?case=league-member');await page.getByRole('button',{name:'Mi liga',exact:true}).click();await page.getByRole('button',{name:'Abandonar liga',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Cancelar',exact:true}).click();if(await page.getByRole('dialog').isVisible())throw Error('League cancel failed');
 await page.goto('http://127.0.0.1:4178/?case=corrections');
 await page.getByPlaceholder('UUID').fill('11111111-1111-4111-8111-111111111111');
 await page.getByLabel('Campo').selectOption('homeScore');await page.getByLabel('Nuevo valor').fill('71');await page.getByLabel('Motivo interno').fill('Marcador confirmado con el acta');
 await page.getByRole('button',{name:'Preparar vista previa'}).click();await page.getByText('Confirmación pendiente').waitFor();
 if(!await page.getByText('Jornada 3 · scores, rankings, prices').isVisible())throw Error('Correction impact preview missing');
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Confirmar y aplicar'}).click();
 correctionApplyMode='conflict';page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Confirmar y aplicar'}).click();
 await page.getByText('REVISION_CONFLICT').waitFor();
 correctionApplyMode='success';await page.goto('http://127.0.0.1:4178/?case=corrections');
 page.on('dialog',dialog=>dialog.type()==='prompt'?dialog.accept('Reversión verificada en smoke'):dialog.accept());
 await Promise.all([page.waitForResponse(response=>response.url().includes('/rev-revert/apply')&&response.request().method()==='POST'),page.getByRole('button',{name:'Preparar reversión'}).click()]);
 if(reversalApplyCalls!==1)throw Error('Correction reversal was not previewed and applied');
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:4178/?case=home');
 const animation=await page.locator('main').evaluate(el=>getComputedStyle(el).animationName);if(animation!=='none')throw Error('Reduced motion failed');
 await page.setViewportSize({width:400,height:900});await page.goto('http://127.0.0.1:4178/?case=home-degraded');await page.evaluate(()=>document.body.style.zoom='2');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Home overflows at 200% zoom');
 await page.screenshot({path:path.join(capture,'home-degraded-zoom200.png'),fullPage:true});
 await page.setViewportSize({width:768,height:900});await page.goto('http://127.0.0.1:4178/?case=onboarding');await page.evaluate(()=>document.body.style.zoom='2');await page.screenshot({path:path.join(capture,'onboarding-zoom200.png'),fullPage:true});
 }
 fs.writeFileSync(path.join(capture,'results.json'),JSON.stringify({results,errors,smoke:process.env.VISUAL_ONLY ? 'targeted visual and accessibility review' : 'username required/validity/focus, onboarding navigation gate, five destinations/current section, market dialog/Escape/focus restoration/filter, team tabs, profile dialog, league leave cancellation, correction preview/cancel/conflict/reversal, reduced motion, zoom'},null,2));
 console.log(JSON.stringify({overflows:results.filter(r=>r.overflow),errors,captures:results.length}));
}finally{await browser.close();server.close();}
