const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try { for (const mobile of [false,true]) { for (const method of ["standard","exception"]) {
  const context=await browser.newContext({viewport: mobile?{width:390,height:760}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage(); page.setDefaultTimeout(90000); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('sanlee-lang','ko');localStorage.setItem('sanlee-met','1');localStorage.setItem('sanlee-promise','1');localStorage.setItem('sanlee-sfx','0');document.addEventListener('DOMContentLoaded',()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('test viewport'));});});
  await page.goto('http://127.0.0.1:3010/deleteseoul?debug&fx=off');
  await page.getByRole('button',{name:'방공호로 들어가기',exact:true}).click();
  await page.waitForFunction(()=>window.__neo?.tp);
  const action=async(x,z,yaw,label)=>{
   await page.evaluate(([x,z,yaw])=>window.__neo.tp(x,z,yaw),[x,z,yaw]);
   await page.waitForFunction(label=>document.querySelector('.prompt, .jump-btn.act')?.textContent.includes(label),label);
   if(mobile) { const box=await page.locator('.jump-btn.act').boundingBox(); assert.ok(box); await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2); } else await page.keyboard.press('KeyE');
  };
  await action(0,4.4,0,'정면 관찰');
  await action(2.7,-1,Math.PI,'스캐너');
  if(method==='exception') { await action(-4.7,-3,0,'보정 명세'); await page.getByRole('button',{name:'닫기',exact:true}).click(); }
  await action(-3,-3.5,0,'얼굴 인증');
  await page.getByRole('button',{name:'현장 스캔',exact:true}).click();
  await page.getByRole('button',{name:'표준 보정 미리보기',exact:true}).click();
  if(method==='exception') { await page.getByRole('button',{name:'자료: 현장 스캔',exact:true}).click(); await page.getByRole('button',{name:'현장 결과 칸 —',exact:true}).click(); await page.getByRole('button',{name:'자료: 보정 명세',exact:true}).click(); await page.getByRole('button',{name:'등록 기준 칸 —',exact:true}).click(); }
  await page.getByRole('button',{name:method==='standard'?'표준 보정 준비':'대조 오류 증명 준비',exact:true}).click();
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await action(-5,-6.9,0,'종 치기');
  const started=Date.now();
  await action(-3,-3.5,0,'얼굴 인증');
  await page.getByRole('button',{name:'최종 인증 실행',exact:true}).click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sanlee-face-auth-v1')).method),method);
  assert.equal(await page.evaluate(()=>window.__neo.citizenRecords.read().pending.filter(x=>x.kind==='face.authenticate').length),0);
  assert.ok(Date.now()-started<8000);
  await page.reload();await page.waitForFunction(()=>window.__neo?.tp);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sanlee-face-auth-v1')).method),method);
  console.log(`${mobile?'mobile':'desktop'} ${method} protected/reload PASS`);
  assert.deepEqual(errors,[]);await context.close();
 } } } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
