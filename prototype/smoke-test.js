// Run from anywhere: node prototype/smoke-test.js (rebuild underfoot-poc.html first if you changed the parts).
const fs=require('fs'); const path=require('path'); const html=fs.readFileSync(path.join(__dirname,'underfoot-poc.html'),'utf8');
const js=html.split('<script>')[1].split('</script>')[0];
const els={}; const mk=()=>{ const o={style:{},classList:{toggle(){},add(){},remove(){}},ls:{},addEventListener(t,f){o.ls[t]=f},setPointerCapture(){},dataset:{},getContext:()=>new Proxy({},{get:(t,k)=>k==='globalAlpha'?1:()=>{}}),innerHTML:'',textContent:''}; return o; };
global.document={getElementById:id=>els[id]||(els[id]=mk()),createElement:()=>mk()};
global.window={innerWidth:390,innerHeight:844,devicePixelRatio:2,addEventListener(){}};
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
let raf=null; global.performance={now:()=>Date.now()}; global.requestAnimationFrame=f=>{raf=f}; global.confirm=()=>true; global.setInterval=()=>1; global.clearInterval=()=>{}; global.setTimeout=()=>{};
global.module=undefined;
eval(js.replace("if (typeof module !== 'undefined') module.exports = SIM;","").replace('function hint(){','function hint(){ if (placing) console.log("HINT", JSON.stringify(placing), view, JSON.stringify(P().msg));').replace("if (b.dataset.place){","console.log('CLICK place', b.dataset.place); if (b.dataset.place){").replace('function updateHud(){','function updateHud(){ if (placing) console.log("HUD", JSON.stringify(placing), introStep(), JSON.stringify(introText()));'));
const SIM = require(path.join(__dirname, 'sim.js'));
let t=performance.now(); const run=n=>{ for(let i=0;i<n;i++){ t+=50; raf(t); } };
const dismiss=()=>els.sheet.ls.click({target:{closest:()=>({dataset:{close:'1'}})}});
const next=()=>els.msg.ls.click({target:{id:'intronext'}});
const Z=Math.min(2.4,390/384); const nestXY=(cx,cy)=>[((cx+0.5)*16-192)*Z+195, ((cy+0.5)*16-CY())*Z+362]; let CY=()=>320;
const tapN=(cx,cy)=>{ const [x,y]=nestXY(cx,cy); els.c.ls.pointerdown({pointerId:1,clientX:x,clientY:y}); els.c.ls.pointerup({pointerId:1,clientX:x,clientY:y,type:'pointerup'}); };
run(5); console.log('intro0:', els.msg.innerHTML.slice(0,60)); next(); run(5); console.log('intro1:', els.msg.innerHTML.slice(0,40));
tapN(12,1); run(5); console.log('intro2:', els.msg.innerHTML.slice(0,40)); tapN(12,2); tapN(12,3); run(5); console.log('intro3:', els.msg.innerHTML.slice(0,40));
els.buildnest.ls.click(); run(5); console.log('intro4:', els.msg.innerHTML.slice(0,40));
run(500); console.log('intro5:', els.msg.innerHTML.slice(0,60));
els.exitnest.ls.click(); run(200); dismiss(); run(5); console.log('intro6:', els.msg.innerHTML.slice(0,40), '| viewbtn', els.viewbtn.textContent);
// go back in, lay builder, dig orders, build room
els.enter.ls.click(); run(200); dismiss(); run(5);
// open queen menu by tapping the queen: queen at room center; find via sheet
let qx=null; for (let y=2;y<6&&qx==null;y++) for (let x=9;x<16;x++){ tapN(x,y); if (els.sheet.innerHTML.includes('Queen level')){ qx=[x,y]; break; } dismiss(); }
console.log('queen menu at', qx, 'has upgrade btn', els.sheet.innerHTML.includes('Upgrade queen'));
els.sheet.ls.click({target:{closest:()=>({dataset:{egg:'builder'}})}}); dismiss();
// order digs right of queen room: cells (14..17, 2..4) assuming room x0=11
let orders=0; for (let x=14;x<18;x++) for (let y=2;y<5;y++){ tapN(x,y); }
run(5); console.log('orders queued label:', els.levelbtn.textContent, '| msg', els.msg.textContent.slice(0,50));
run(20*60*2);
console.log('after 2 min: digs label', els.levelbtn.textContent, '| stats', els.stats.innerHTML.replace(/<br>/,' | '));
next(); run(5); dismiss(); els.levelbtn.ls.click(); run(5); console.log('catalog?', els.sheet.innerHTML.includes('Hatchery · 4×3'), els.sheet.innerHTML.replace(/<[^>]+>/g,' ').slice(0,160));
els.sheet.ls.click({target:{closest:()=>({dataset:{place:'hatchery'}})}}); run(5); next(); run(5); console.log('placing msg:', els.msg.textContent.slice(0,60)); tapN(15,3); run(5); console.log('after tap msg:', els.msg.textContent.slice(0,60)); tapN(16,3); run(5); console.log('after tap2 msg:', els.msg.textContent.slice(0,60)); els.levelbtn.ls.click(); run(5); console.log('catalog status:', (els.sheet.innerHTML.match(/Hatchery[^<]*<\/b><i>[^<]*<\/i><i>([^<]*)/)||[])[1]); run(20*60);
console.log('stats', els.stats.innerHTML.replace(/<br>/,' | '));
