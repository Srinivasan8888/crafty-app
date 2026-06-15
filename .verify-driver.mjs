import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
const R=s=>console.log(s);
const tryFill=async(loc,val)=>{ try{ await loc.fill(val); return await loc.inputValue(); }catch(e){ return 'REJECTED'; } };
try{
  await p.setViewportSize({width:1280,height:1100});
  await p.goto('http://localhost:3000/dashboard/events/new',{waitUntil:'networkidle',timeout:30000});
  await p.waitForTimeout(400);
  await p.locator('label:has-text("Free entry") input[type="checkbox"]').uncheck();
  await p.waitForTimeout(150);
  const e=p.locator('#event-price');
  R('EVENT "-19.99" => "'+(await tryFill(e,'-19.99'))+'"  (expect 19)');
  R('EVENT "12.5"   => "'+(await tryFill(e,'12.5'))+'"  (expect 12)');
  R('EVENT "1,200"  => "'+(await tryFill(e,'1,200'))+'"  (expect 1200)');
  R('EVENT "500"    => "'+(await tryFill(e,'500'))+'"  (expect 500)');
  await p.goto('http://localhost:3000/dashboard/products/new',{waitUntil:'networkidle',timeout:30000});
  await p.waitForTimeout(400);
  const pp=p.locator('#pprice');
  R('PRODUCT "-12.50" => "'+(await tryFill(pp,'-12.50'))+'"  (expect 12)');
  R('PRODUCT "9.99"   => "'+(await tryFill(pp,'9.99'))+'"  (expect 9)');
  R('PRODUCT "1,500"  => "'+(await tryFill(pp,'1,500'))+'"  (expect 1500)');
}catch(e){R('DRIVER ERROR: '+e.message);}
await b.close();
