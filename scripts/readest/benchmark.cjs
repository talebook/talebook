const { chromium } = require('../../app/node_modules/@playwright/test');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.READEST_BASE_URL;
assert(base && process.env.READEST_PASSWORD, 'Set READEST_BASE_URL and READEST_PASSWORD');
(async () => {
  const browser = await chromium.launch({args:['--no-sandbox']});
  const results = [];
  try {
    for (const latency of (process.env.LATENCIES || '0,100').split(',').map(Number)) {
      for (let trial=1; trial<=Number(process.env.TRIALS || 3); trial++) {
        const context = await browser.newContext({viewport:{width:412,height:915},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 EdgA/149.0.0.0'});
        assert.equal((await (await context.request.post(base+'/api/user/sign_in',{form:{username:process.env.READEST_USERNAME || 'admin',password:process.env.READEST_PASSWORD}})).json()).err,'ok');
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions',{offline:false,latency,downloadThroughput:1250000,uploadThroughput:1250000});
        let requests=[], errors=[], started=0;
        page.on('pageerror',e=>errors.push(e.message));
        page.on('response',r=>{if(r.url().includes('/read/resource/10.epub')) requests.push({at:Date.now()-started,method:r.request().method(),range:r.request().headers().range,status:r.status(),bytes:Number(r.headers()['content-length'] || 0)});});
        for (const cache of ['cold','warm']) {
          requests=[]; errors=[]; started=Date.now();
          await page.goto(base+'/read/10?reader=readest');
          await page.waitForFunction(()=>/\d+\s*\/\s*\d+/.test(document.body.innerText),null,{timeout:120000});
          const readyMs=Date.now()-started;
          const firstRequests=requests.slice();
          const perf=await page.evaluate(()=>({resources:performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,start:r.startTime,duration:r.duration,bytes:r.transferSize})),metrics:window.__MOKE_ONLINE_SOURCE_METRICS}));
          await page.waitForTimeout(2000);
          assert(page.frames().length > 1,'EPUB frame must render; chapter interaction is verified separately');
          assert.equal(errors.length,0);
          const result={latency,trial,cache,readyMs,rangeRequests:firstRequests.filter(r=>r.method==='GET').length,headRequests:firstRequests.filter(r=>r.method==='HEAD').length,epubBytes:firstRequests.filter(r=>r.method==='GET').reduce((n,r)=>n+r.bytes,0),requests:firstRequests,perf,errors};
          results.push(result);
          console.log(JSON.stringify({...result,requests:undefined,perf:undefined}));
          if(trial===1&&cache==='cold'&&process.env.READEST_SCREENSHOT_PREFIX) await page.screenshot({path:process.env.READEST_SCREENSHOT_PREFIX+'-'+latency+'.png'});
        }
        await context.close();
      }
    }
  } finally {await browser.close();if(process.env.READEST_RESULT_PATH) fs.writeFileSync(process.env.READEST_RESULT_PATH,JSON.stringify(results,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
