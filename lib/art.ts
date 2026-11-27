// @ts-nocheck
// Poster artwork and moon drawing (browser canvas). Ported from the approved prototype.
import { mulberry, hashStr, moonInfo, KINDS } from "./core";
function paintMoon(ctx, cx, cy, r, frac, seed, dark="42,46,78"){
  // Clean, stylised moon: smooth surface with a few soft, large shadow shapes, a sharp day/night line
  // and a crisp anti-aliased edge. Deliberately NO craters, holes, dots or speckle texture.
  r = Math.max(2, Math.round(r));
  const size = r*2, img = ctx.createImageData(size, size), d = img.data;
  const th = 2*Math.PI*frac, lx = Math.sin(th), lz = -Math.cos(th), [dr,dg,db] = dark.split(",").map(Number);
  // Three broad, smooth shapes (gentle tone shifts, not spots)
  const SH = [[-.30,-.22,.55,.10],[.34,-.18,.38,.08],[-.10,.40,.42,.06]];
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++){
    const x = (px + .5 - r)/r, y = (py + .5 - r)/r, rr = x*x + y*y;
    if (rr > 1 + 2/r) continue;
    const z = Math.sqrt(Math.max(0, 1 - rr)), i = (py*size + px)*4;
    let tone = 1;
    for (const [sx,sy,sr,k] of SH){ const q = ((x-sx)**2 + (y-sy)**2)/(sr*sr); if (q < 1) tone -= k*(1-q)*(1-q); }
    const limb = .80 + .20*Math.pow(z, .7);
    const t = Math.max(0, Math.min(1, (x*lx + z*lz)*r/1.8 + .5));
    const R = 248*tone*limb, G = 240*tone*limb, B = 220*tone*limb;
    d[i] = dr + (R-dr)*t; d[i+1] = dg + (G-dg)*t; d[i+2] = db + (B-db)*t;
    d[i+3] = 255 * Math.max(0, Math.min(1, (1 - Math.sqrt(rr))*r + .5));
  }
  const off = document.createElement("canvas"); off.width = off.height = size;
  off.getContext("2d").putImageData(img, 0, 0);
  ctx.drawImage(off, cx - r, cy - r);
}
const MOON_CACHE = new Map();   // drawn moons kept in memory so navigating doesn't redraw them
function moonCanvas(canvas, frac, seed, dark){
  // offsetWidth ignores the entrance animation's scale, so the moon is drawn at its true size; up to 3x for sharp phone screens
  const dpr = Math.min(devicePixelRatio || 1, 3), w = canvas.offsetWidth || canvas.getBoundingClientRect().width, s = Math.round(Math.max(w, 10)*dpr);
  if (canvas.width === s && canvas.dataset.painted === `${frac}|${dark}`) return;
  canvas.width = canvas.height = s;
  const key = `${s}|${frac}|${seed}|${dark}`; let cached = MOON_CACHE.get(key);
  if (!cached){ cached = document.createElement("canvas"); cached.width = cached.height = s; paintMoon(cached.getContext("2d"), s/2, s/2, s/2 - 1, frac, seed, dark);
    MOON_CACHE.set(key, cached); if (MOON_CACHE.size > 60) MOON_CACHE.delete(MOON_CACHE.keys().next().value); }
  canvas.getContext("2d").drawImage(cached, 0, 0); canvas.dataset.painted = `${frac}|${dark}`;
}



/* ---------- occasions ---------- */
const MOTIFS = {
  confetti(ctx,W,H,rnd,o){ const cols=["#ffd166","#06d6a0","#ffffff","#ffb3d1","#7ce7ff","#ff7a59"];
    for(let i=0;i<90;i++){ ctx.save(); ctx.translate(rnd()*W, rnd()*H*0.9); ctx.rotate(rnd()*Math.PI); ctx.globalAlpha=.55+rnd()*.4; ctx.fillStyle=cols[i%cols.length];
      if(rnd()<.6) ctx.fillRect(0,0,o.m*.018,o.m*.05); else { ctx.beginPath(); ctx.arc(0,0,o.m*.013,0,7); ctx.fill(); } ctx.restore(); }
    ctx.globalAlpha=1; },
  stars(ctx,W,H,rnd,o){ for(let i=0;i<Math.round(W*H/1400);i++){ ctx.fillStyle=`rgba(255,255,255,${.2+rnd()*.7})`; const s=(rnd()<.06?2.4:1.1)*o.dpr; ctx.fillRect(rnd()*W,rnd()*H,s,s); }
    ctx.strokeStyle="rgba(255,255,255,.35)"; ctx.lineWidth=o.dpr;
    for(let c=0;c<3;c++){ const bx=rnd()*W*.7, by=rnd()*H*.6; const pts=[...Array(5)].map(()=>[bx+rnd()*W*.3, by+rnd()*H*.25]);
      ctx.beginPath(); pts.forEach((p,i)=> i?ctx.lineTo(...p):ctx.moveTo(...p)); ctx.stroke(); pts.forEach(p=>{ ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(p[0],p[1],1.8*o.dpr,0,7); ctx.fill(); }); } },
  bubbles(ctx,W,H,rnd,o){ ctx.lineWidth=1.3*o.dpr;
    for(let i=0;i<55;i++){ const y=H*(.25+Math.pow(rnd(),.6)*.75), r=o.m*(.008+rnd()*.05); ctx.strokeStyle=`rgba(255,240,220,${.25+rnd()*.35})`; ctx.fillStyle="rgba(255,255,255,.05)";
      ctx.beginPath(); ctx.arc(rnd()*W,y,r,0,7); ctx.fill(); ctx.stroke(); } },
  hills(ctx,W,H,rnd,o){ for(let l=0;l<4;l++){ const base=H*(.5+l*.11), amp=H*(.05+rnd()*.04), ph=rnd()*6;
      ctx.fillStyle=`rgba(4,${30+l*6},${24+l*4},${.28+l*.14})`; ctx.beginPath(); ctx.moveTo(0,H);
      for(let x=0;x<=W;x+=W/40) ctx.lineTo(x, base - Math.sin(x/W*Math.PI*(1.4+l*.5)+ph)*amp); ctx.lineTo(W,H); ctx.fill(); } },
  rays(ctx,W,H,rnd,o){ const n=30, R=Math.hypot(W,H); for(let i=0;i<n;i+=2){ const a1=i/n*Math.PI*2, a2=(i+1)/n*Math.PI*2; ctx.fillStyle="rgba(255,255,255,.075)";
      ctx.beginPath(); ctx.moveTo(o.cx,o.cy); ctx.lineTo(o.cx+Math.cos(a1)*R,o.cy+Math.sin(a1)*R); ctx.lineTo(o.cx+Math.cos(a2)*R,o.cy+Math.sin(a2)*R); ctx.fill(); }
    MOTIFS.confetti(ctx,W,H,mulberry(7),{...o, m:o.m*.6}); },
  rings(ctx,W,H,rnd,o){ ctx.strokeStyle="rgba(255,255,255,.13)"; ctx.lineWidth=o.dpr;
    for(let i=1;i<9;i++){ ctx.beginPath(); ctx.arc(o.cx,o.cy,o.r*(1+i*.42),0,7); ctx.stroke(); }
    ctx.fillStyle="rgba(255,255,255,.18)"; const g=o.m*.06; for(let x=g/2;x<W;x+=g) for(let y=g/2;y<H;y+=g) ctx.fillRect(x,y,o.dpr*1.2,o.dpr*1.2); },
  hatch(ctx,W,H,rnd,o){ ctx.strokeStyle="rgba(255,255,255,.08)"; ctx.lineWidth=o.dpr; const g=o.m*.035;
    for(let x=-H;x<W;x+=g){ ctx.beginPath(); ctx.moveTo(x,H); ctx.lineTo(x+H*.6,0); ctx.stroke(); }
    ctx.strokeStyle="rgba(255,230,180,.5)"; ctx.lineWidth=3*o.dpr; ctx.lineCap="round";
    for(let i=0;i<4;i++){ ctx.beginPath(); const x=rnd()*W*.6, y=H*(.2+rnd()*.5); ctx.moveTo(x,y); ctx.bezierCurveTo(x+W*.1,y-H*.08,x+W*.2,y+H*.08,x+W*.3,y); ctx.stroke(); } },
  network(ctx,W,H,rnd,o){ const pts=[...Array(16)].map(()=>[rnd()*W, rnd()*H*.85]); ctx.strokeStyle="rgba(255,255,255,.16)"; ctx.lineWidth=o.dpr;
    pts.forEach((a,i)=>pts.slice(i+1).forEach(b=>{ if(Math.hypot(a[0]-b[0],a[1]-b[1]) < o.m*.38){ ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); } }));
    pts.forEach(p=>{ ctx.fillStyle="rgba(255,255,255,.75)"; ctx.beginPath(); ctx.arc(p[0],p[1],(2+rnd()*3)*o.dpr,0,7); ctx.fill(); }); },
  film(ctx,W,H,rnd,o){ const sp=ctx.createLinearGradient(o.cx,0,W*.15,H); sp.addColorStop(0,"rgba(255,240,210,.22)"); sp.addColorStop(1,"rgba(255,240,210,0)");
    ctx.fillStyle=sp; ctx.beginPath(); ctx.moveTo(o.cx-o.r*.4,o.cy); ctx.lineTo(-W*.1,H); ctx.lineTo(W*.5,H); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(W*.5,H*.62); ctx.rotate(-.18); const bw=W*1.6, bh=o.m*.16; ctx.fillStyle="rgba(10,6,12,.75)"; ctx.fillRect(-bw/2,-bh/2,bw,bh);
    ctx.fillStyle="rgba(255,255,255,.55)"; const hs=bh*.14; for(let x=-bw/2;x<bw/2;x+=hs*2.4){ ctx.fillRect(x,-bh/2+hs*.6,hs,hs); ctx.fillRect(x,bh/2-hs*1.6,hs,hs); }
    ctx.fillStyle="rgba(255,255,255,.08)"; for(let x=-bw/2;x<bw/2;x+=bh*1.2) ctx.fillRect(x+bh*.1,-bh*.28,bh,bh*.56); ctx.restore();
    MOTIFS.stars(ctx,W,H*.5,rnd,o); },
  petals(ctx,W,H,rnd,o){ const cols=["rgba(255,236,240,.75)","rgba(255,205,215,.65)","rgba(255,250,235,.7)","rgba(242,182,61,.6)"];
    for(let i=0;i<46;i++){ ctx.save(); ctx.translate(rnd()*W, rnd()*H*.95); ctx.rotate(rnd()*Math.PI*2); ctx.fillStyle=cols[i%cols.length];
      const s=o.m*(.016+rnd()*.02); ctx.beginPath(); ctx.ellipse(0,0,s*1.6,s*.7,0,0,7); ctx.fill(); ctx.restore(); } },
  splatter(ctx,W,H,rnd,o){ const cols=["#FFD23F","#3BCEAC","#EE4266","#FFFFFF","#7B61FF","#FF9F1C"];
    for(let i=0;i<9;i++){ const x=rnd()*W, y=rnd()*H*.85, r=o.m*(.04+rnd()*.07), c=cols[i%cols.length]; ctx.fillStyle=c; ctx.globalAlpha=.85;
      ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill();
      for(let j=0;j<10;j++){ const a=rnd()*7, d=r*(1+rnd()*1.2); ctx.beginPath(); ctx.arc(x+Math.cos(a)*d, y+Math.sin(a)*d, r*(.08+rnd()*.18), 0, 7); ctx.fill(); }
      if(rnd()<.6){ ctx.fillRect(x-r*.12, y, r*.24, r*(1.5+rnd()*2)); ctx.beginPath(); ctx.arc(x, y+r*(1.5+rnd()*2), r*.16, 0, 7); ctx.fill(); } }
    ctx.globalAlpha=1;
    ctx.save(); ctx.translate(W*.12,H*.78); ctx.rotate(-.6); ctx.fillStyle="rgba(255,255,255,.7)"; ctx.fillRect(0,-o.m*.012,o.m*.32,o.m*.024); ctx.fillStyle="#EE4266"; ctx.fillRect(o.m*.32,-o.m*.03,o.m*.07,o.m*.06); ctx.restore(); },
  pitch(ctx,W,H,rnd,o){ ctx.save(); ctx.translate(W*.5,H*.66); ctx.rotate(-.08); ctx.scale(1,.45);
    ctx.strokeStyle="rgba(255,255,255,.5)"; ctx.lineWidth=2.4*o.dpr; const w=W*.95, hh=H*.9;
    ctx.strokeRect(-w/2,-hh/2,w,hh); ctx.beginPath(); ctx.moveTo(0,-hh/2); ctx.lineTo(0,hh/2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,o.m*.14,0,7); ctx.stroke(); ctx.strokeRect(-w/2,-hh*.22,w*.14,hh*.44); ctx.strokeRect(w/2-w*.14,-hh*.22,w*.14,hh*.44); ctx.restore();
    MOTIFS.stars(ctx,W,H*.45,rnd,o); },
  orbits(ctx,W,H,rnd,o){ ctx.strokeStyle="rgba(255,255,255,.18)"; ctx.lineWidth=o.dpr;
    for(let i=0;i<5;i++){ ctx.save(); ctx.translate(o.cx,o.cy); ctx.rotate(rnd()*Math.PI); ctx.beginPath(); ctx.ellipse(0,0,o.r*(1.6+i*.5),o.r*(.5+i*.18),0,0,7); ctx.stroke();
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(o.r*(1.6+i*.5),0,2.4*o.dpr,0,7); ctx.fill(); ctx.restore(); }
    MOTIFS.stars(ctx,W,H,rnd,{...o}); }
};
function drawPoster(canvas, ev, fixed){
  let dpr, W, H;
  if (fixed){ dpr = 1; W = canvas.width = fixed.w; H = canvas.height = fixed.h; }
  else { const box = canvas.parentElement.getBoundingClientRect(); if (!box.width) return;
    dpr = Math.min(devicePixelRatio||1, 2); W = canvas.width = Math.round(box.width*dpr); H = canvas.height = Math.round(box.height*dpr); }
  const ctx = canvas.getContext("2d"), k = KINDS[ev.kind] || KINDS.other, seed = hashStr(ev.id + (ev.title||"")), rnd = mulberry(seed), m = Math.min(W,H);
  const g = ctx.createLinearGradient(0,0,W*.5,H); g.addColorStop(0,k.c[0]); g.addColorStop(1,k.c[1]); ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  const r = m*.2, cx = W*.68, cy = H*.3;
  const v = ctx.createRadialGradient(cx,cy,r,cx,cy,Math.max(W,H)*1.1); v.addColorStop(0,"rgba(8,6,24,0)"); v.addColorStop(1,"rgba(8,6,24,.6)"); ctx.fillStyle = v; ctx.fillRect(0,0,W,H);
  MOTIFS[k.motif](ctx,W,H,rnd,{cx,cy,r,m,dpr});
  const info = moonInfo(ev.start);
  const glow = ctx.createRadialGradient(cx,cy,r*.8,cx,cy,r*2.4); glow.addColorStop(0,`rgba(255,240,205,${.12+info.lit/350})`); glow.addColorStop(1,"rgba(255,240,205,0)");
  ctx.fillStyle = glow; ctx.fillRect(0,0,W,H);
  paintMoon(ctx, cx, cy, r, info.frac, seed, "30,28,60");
  const b = ctx.createLinearGradient(0,H*.42,0,H); b.addColorStop(0,"rgba(6,6,20,0)"); b.addColorStop(1,"rgba(6,6,20,.82)"); ctx.fillStyle = b; ctx.fillRect(0,0,W,H);
}

export { paintMoon, moonCanvas, MOTIFS, drawPoster };
