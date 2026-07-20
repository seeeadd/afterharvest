/* =============================================================================
   AFTER HARVEST — CROSS-STITCH ENGINE  (v1.5)
   Woven two-ply stitches on canvas + a procedural botanical library
   (wheat sheaf, seed pod, sun, olive sprig, poppy, daisy, berry, lavender,
   rosebud) + a full bouquet spray + text-dissolve. Animated stitch-by-stitch
   assembly and idle twinkle. Palette leans grain / olive / gold (unisex);
   pinks + lavender are rationed accents. Honors prefers-reduced-motion.

   API:
     AHStitch.mount(canvas, { kind, cols, rows, cell, seed, side, animate })
       kind: 'spray' | 'wheat' | 'stalk' | 'poppy' | 'daisy' | 'seedpod'
             | 'olive' | 'berry' | 'sun' | 'lavender' | 'rosebud'
             | 'arch' | 'question' | 'arrow' | 'signpost'   // context symbols
     AHStitch.mount(canvas, { text, fontPx, cell, seed })
   ============================================================================= */
(function () {
  'use strict';

  /* ---------- color helpers ---------- */
  function hx(h){ h=h.replace('#',''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
  function toHex(r,g,b){ var c=function(n){return ('0'+Math.max(0,Math.min(255,Math.round(n))).toString(16)).slice(-2);}; return '#'+c(r)+c(g)+c(b); }
  function lighten(h,a){ var p=hx(h); return toHex(p[0]+(255-p[0])*a, p[1]+(255-p[1])*a, p[2]+(255-p[2])*a); }
  function darken(h,a){ var p=hx(h); return toHex(p[0]*(1-a), p[1]*(1-a), p[2]*(1-a)); }
  function mix(h1,h2,t){ var a=hx(h1),b=hx(h2); return toHex(a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t); }
  function clamp(v,a,b){ return v<a?a:(v>b?b:v); }

  /* ---------- palette (embroidery only) ---------- */
  var P = {
    wheat:'#C89B4B', wheatDk:'#A97E38', yolk:'#E8A100', gold:'#D9A93B',
    olive:'#5C5340', oliveDk:'#433D2C', sage:'#8A9068', sageLt:'#A7AE86',
    rust:'#B06A4A', rustDk:'#7E3B2F', umber:'#6E6554', umberDk:'#4A4438',
    poppy:'#B0503C', poppyHot:'#C4573F',
    cream:'#EBDFC6', creamLt:'#F6EFDD', creamSh:'#D6C7A8',
    rose:'#C77E82', roseDk:'#9E5563', roseLt:'#E0AEA9',
    dusk:'#B6AFC4', plum:'#6E6079', sand:'#E8E0CF',
    ink:'#161310', inkDk:'#0B0906', inkLt:'#2C2820'
  };

  function rngFrom(seed){ var s=seed>>>0; return function(){ s+=0x6D2B79F5; var t=s; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }

  /* directional light (top-left) + gentle radial depth */
  function shade(tone, dx, dy, t){
    var v = -(dx+dy)*0.05 + (0.5 - t)*0.10;
    return v>0 ? lighten(tone, Math.min(0.26, v)) : darken(tone, Math.min(0.28, -v));
  }

  /* ---------- grid ---------- */
  function mkGrid(cols,rows){ var G=new Array(rows); for(var r=0;r<rows;r++){G[r]=new Array(cols).fill(null);} return G; }
  function put(G,c,r,tone){ r=Math.round(r); c=Math.round(c); if(r<0||c<0||r>=G.length||c>=G[0].length) return; G[r][c]=tone; }

  /* ---------- drawers (mutate grid G) ---------- */
  function stem(G, x0,y0, x1,y1, cx1,cy1, tone, w){
    var steps=Math.hypot(x1-x0,y1-y0)*2+8;
    for(var i=0;i<=steps;i++){
      var t=i/steps, u=1-t;
      var x=u*u*x0+2*u*t*cx1+t*t*x1, y=u*u*y0+2*u*t*cy1+t*t*y1;
      var ww=w*(1-0.35*t);
      for(var o=-ww;o<=ww;o+=0.7){
        var s=o/Math.max(0.6,ww);
        put(G, x+o, y, s<0?lighten(tone,0.12*-s):darken(tone,0.18*s));
      }
    }
  }
  function leaf(G, cx,cy, len, wid, ang, tone, rnd){
    var ca=Math.cos(ang), sa=Math.sin(ang);
    for(var u=-len;u<=len;u+=0.6){
      var tt=u/len, half=wid*Math.cos(tt*Math.PI/2)*0.9;
      for(var v=-half;v<=half;v+=0.6){
        var x=cx+u*ca-v*sa, y=cy+u*sa+v*ca, mid=Math.abs(v)/Math.max(0.5,half);
        if(mid>0.82 && rnd()<0.5) continue;
        put(G,x,y, mid<0.16?darken(tone,0.16):shade(tone, v*0.3, u*0.2, 0.4+mid*0.4));
      }
    }
  }
  function rose(G, cx,cy, R, base, rnd){
    for(var r=-R;r<=R;r++)for(var c=-R;c<=R;c++){
      var d=Math.hypot(c,r)/R; if(d>1.04) continue;
      var ang=Math.atan2(r,c), band=Math.sin(d*Math.PI*2.7-ang*1.3);
      var t=Math.min(1, d*0.78+0.22*(0.5+0.5*band));
      var tone=mix(base.dk, base.lt, t);
      if(d<0.16) tone=darken(base.dk,0.22);
      tone=shade(tone,c,r,d);
      if(band<-0.55) tone=darken(tone,0.16);
      if(d>0.8 && rnd()<(d-0.8)/0.24) continue;
      put(G,cx+c,cy+r,tone);
    }
    put(G,cx,cy-R*0.05, P.yolk);
  }
  function poppy(G, cx,cy, R, rnd){
    for(var r=-R;r<=R;r++)for(var c=-R;c<=R;c++){
      var d=Math.hypot(c,r*1.05)/R; if(d>1.04) continue;
      var ang=Math.atan2(r,c), crimp=0.5+0.5*Math.sin(ang*2), tone;
      if(d<0.26) tone=mix(P.rustDk,P.plum,0.4);
      else tone=mix(P.poppyHot,P.rustDk,Math.min(1,d*0.7+0.12*crimp));
      tone=shade(tone,c,r,d);
      if(d>0.82 && rnd()<(d-0.82)/0.22) continue;
      put(G,cx+c,cy+r,tone);
    }
    for(var k=0;k<9;k++){ var a=k/9*6.28; put(G,cx+Math.cos(a)*R*0.32,cy+Math.sin(a)*R*0.32,darken(P.plum,0.25)); }
    put(G,cx,cy-1,P.yolk);
  }
  function daisy(G, cx,cy, R, petals, petalTone, rnd){
    for(var r=-R;r<=R;r++)for(var c=-R;c<=R;c++){
      var d=Math.hypot(c,r)/R; if(d>1.04) continue;
      var ang=Math.atan2(r,c), pet=Math.abs(Math.cos(ang*petals/2));
      if(d>0.34){
        if(pet<0.35) continue;
        var tone=shade(mix(petalTone,P.creamSh,(d-0.34)/0.66*0.6),c,r,d);
        if(d>0.9 && rnd()<0.4) continue;
        put(G,cx+c,cy+r,tone);
      } else put(G,cx+c,cy+r, d<0.18?P.yolk:mix(P.yolk,P.olive,0.5));
    }
  }
  function bells(G, x0,y0, x1,y1){
    var n=10;
    for(var i=0;i<n;i++){
      var t=i/(n-1), x=x0+(x1-x0)*t, y=y0+(y1-y0)*t;
      var side=(i%2?1:-1)*(0.8+t*1.5);         // florets alternate, splay toward base
      var tone=i%2? mix(P.dusk,P.plum,0.45) : P.dusk;
      put(G, x+side,     y,     tone);
      put(G, x+side*0.55, y,    lighten(tone,0.22));
      put(G, x+side,     y+0.8, darken(tone,0.16));
    }
    put(G, x0, y0-1, lighten(P.dusk,0.28));    // crown bud at tip
    put(G, x0, y0,   P.dusk);
  }
  /* a single tapering lavender flower spike (dense florets, pointed tip) */
  function lavenderSpike(G, bx,by, tx,ty){
    var len=Math.hypot(tx-bx,ty-by), steps=Math.max(7,Math.round(len*1.5));
    for(var i=0;i<=steps;i++){
      var t=i/steps, x=bx+(tx-bx)*t, y=by+(ty-by)*t;
      var w=(1-t)*1.9+0.35;                              // wide base -> pointed tip
      var tone=mix(P.dusk,P.plum,0.22+(1-t)*0.42);        // deeper at base, softer up top
      var s=(i%2?1:-1);
      put(G, x,          y,     tone);
      put(G, x+s*w,      y,     lighten(tone,0.16));
      put(G, x-s*w*0.6,  y+0.5, darken(tone,0.12));
      if(w>1){ put(G, x+s*w*0.5, y-0.7, lighten(tone,0.28)); }
    }
    put(G, tx, ty-1, lighten(P.dusk,0.34));               // pale crown bud
    put(G, tx, ty,   mix(P.dusk,P.plum,0.3));
  }
  function berries(G, cx,cy, n, tone, rnd){
    for(var i=0;i<n;i++){
      var a=rnd()*6.28, rr=rnd()*3.0, x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr;
      put(G,x,y,tone); put(G,x-0.5,y-0.5,lighten(tone,0.3));
    }
  }
  /* small plump seed (teardrop, shaded) — building block for grain heads */
  function grain(G, cx,cy, lean, tone){
    put(G, cx, cy, tone);
    put(G, cx, cy+1, darken(tone,0.14));
    put(G, cx+lean*0.7, cy-1, lighten(tone,0.28));
    put(G, cx-lean*0.5, cy+0.4, darken(tone,0.18));
    put(G, cx+(lean>0?1:-1), cy+0.2, mix(tone,P.gold,0.45));
  }
  /* teardrop seed-pod capsule with a dark central seam */
  function pod(G, cx,cy, L, rnd){
    for(var u=-L*0.5;u<=L*0.5;u+=0.5){
      var tt=u/(L*0.5), half=Math.max(0, Math.cos(tt*1.35)*L*0.22);
      for(var v=-half;v<=half;v+=0.5){
        var mid=Math.abs(v)/Math.max(0.5,half);
        var tone = mid<0.16 ? mix(P.umber,P.oliveDk,0.5) : shade(mix(P.wheat,P.cream,0.34), v,u,0.4+mid*0.3);
        if(mid>0.86 && rnd()<0.4) continue;
        put(G,cx+v,cy+u,tone);
      }
    }
    for(var s=-2;s<=2;s++) put(G,cx,cy+s*(L*0.15),P.umberDk);
  }
  /* a curved, nodding wheat ear: paired grains along a bending spine + fine awns */
  function wheatSprig(G, cx,cy, h, rnd){
    var bend=h*0.11;
    function sx(t){ return cx + bend*Math.sin(t*1.4); }   // t: 0 base .. 1 tip
    var botY=cy+h*0.5, tipY=cy-h*0.5;
    stem(G, sx(0),botY, sx(0.5),cy+h*0.04, sx(0.28),cy+h*0.26, P.olive, 1.0);
    var rows=8;
    for(var k=0;k<rows;k++){
      var t=k/(rows-1);
      var y=cy+h*0.16 - t*(h*0.64), x=sx(0.35+t*0.65);
      var open=(1-t)*2.4+0.7;
      grain(G, x-open, y,      -0.6, k%2? P.wheat:P.wheatDk);
      grain(G, x+open, y+0.5,   0.6, k%2? P.wheatDk:P.wheat);
      put(G, x, y+0.2, P.wheatDk);
    }
    var tx=sx(1), ty=tipY;
    for(var a=-1;a<=1;a++){ for(var s=1;s<=4;s++){ put(G, tx+a*s*0.55, ty-s+1, P.yolk); } }
    put(G, tx, ty, P.yolk);
  }
  /* composed berry sprig: curved stem, paired leaves, cluster of round shaded berries */
  function berrySprig(G, cx,cy, H, rnd){
    stem(G, cx+1,cy+H*0.5, cx-1,cy-H*0.34, cx+2,cy+H*0.06, P.oliveDk, 0.9);
    leaf(G, cx-3.6,cy+H*0.16, 4.6,2.2, -0.6, P.sage, rnd);
    leaf(G, cx+3.6,cy+H*0.24, 4.2,2.0,  0.7, P.sageLt, rnd);
    var pts=[[-2.6,-0.30],[0.2,-0.37],[2.6,-0.27],[-1.1,-0.19],[1.7,-0.15],[0.4,-0.05]];
    for(var i=0;i<pts.length;i++){
      var bx=cx+pts[i][0], by=cy+pts[i][1]*H, R=1.9+ (i%2?0:0.4);
      var tone=i%2? P.rust : P.rustDk;
      for(var r=-R;r<=R;r++)for(var c=-R;c<=R;c++){ if(Math.hypot(c,r)>R) continue; put(G,bx+c,by+r, shade(tone,c,r,0.5)); }
      put(G, bx-0.7, by-0.8, lighten(tone,0.45));
    }
  }
  function wheatSheaf(G, cx,cy, H, rnd){
    var fan=[-1.7,-0.6,0.6,1.7];
    for(var i=0;i<fan.length;i++){
      var f=fan[i];
      var bx=cx+f*1.1, by=cy+H*0.5, tx=cx+f*2.8, ty=cy-H*0.48;
      stem(G, bx,by, tx,ty, cx+f*1.8, cy, P.wheatDk, 0.75);
      var gn=7;
      for(var k=0;k<gn;k++){
        var t=k/(gn-1);
        var gx=tx + (bx-tx)*t*0.5, gy=ty + (by-ty)*t*0.5;
        grain(G, gx+(f>0?0.8:-0.8), gy, f>0?0.6:-0.6, k%2?P.wheat:P.gold);
        if(k<3) put(G, gx, gy-1, P.yolk);
      }
    }
    for(var b=-2;b<=2;b++){ put(G,cx+b, cy+H*0.20, mix(P.rust,P.wheatDk,0.4)); }
  }
  function seedpod(G, cx,cy, H, rnd){
    stem(G, cx,cy+H*0.5, cx-0.5,cy-H*0.44, cx-1.5,cy, P.olive, 0.9);
    var pods=[[0,-0.42,1.0],[-2.4,-0.04,0.82],[2.6,-0.16,0.9]];
    for(var i=0;i<pods.length;i++){
      var px=cx+pods[i][0], py=cy+pods[i][1]*H;
      if(i>0) stem(G, cx-0.5,py+H*0.06, px,py, (cx+px)/2,py+1, P.oliveDk, 0.6);
      pod(G, px,py, H*0.4*pods[i][2], rnd);
    }
  }
  function oliveSprig(G, cx,cy, H, rnd){
    stem(G, cx-1,cy+H*0.5, cx+2,cy-H*0.48, cx+3,cy, P.oliveDk, 0.95);
    var n=5;
    for(var i=0;i<n;i++){
      var t=i/(n-1), y=cy+H*0.42 - H*0.84*t, x=cx-1+3*t;
      leaf(G, x-3, y,     4.6,2.0, -0.5-0.12*t, P.sage,   rnd);
      leaf(G, x+3, y+1.2, 4.6,2.0,  0.6+0.12*t, P.sageLt, rnd);
    }
    function olv(ox,oy,tone){ for(var r=-2;r<=2;r++)for(var c=-2;c<=2;c++){ if(Math.hypot(c,r*1.15)>2) continue; put(G,ox+c,oy+r,shade(tone,c,r,0.5)); } put(G,ox-0.7,oy-0.8,lighten(tone,0.38)); }
    olv(cx+0.5, cy+H*0.06, P.plum);
    olv(cx+2.6, cy-H*0.16, mix(P.olive,P.plum,0.5));
  }
  function sun(G, cx,cy, R, rnd){
    for(var r=-R;r<=R;r++)for(var c=-R;c<=R;c++){
      var d=Math.hypot(c,r)/R; if(d>1.02) continue;
      put(G,cx+c,cy+r, d<0.55?P.yolk : (rnd()<0.75?P.gold:P.wheat));
    }
    for(var a=0;a<8;a++){ var ang=a/8*6.28; put(G, cx+Math.cos(ang)*(R+1.6), cy+Math.sin(ang)*(R+1.6), P.gold); }
  }

  /* ---------- collect: fray edges into a cell list ---------- */
  function collect(G, cols, rows, rnd, dense){
    var cells=[];
    for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){
      var tone=G[r][c]; if(!tone) continue;
      var edge=Math.min(1, Math.min(Math.min(c,cols-1-c)/(cols*0.5), Math.min(r,rows-1-r)/(rows*0.5))*1.5);
      var keep = dense ? (0.955+0.045*edge) : (0.5+0.5*edge), spark=false;
      if(rnd()>keep){ if(!dense && rnd()<0.1) spark=true; else continue; }
      if(edge<0.26 && rnd()<(dense?0.05:0.5)) spark=true;
      cells.push({c:c, r:r, tone:tone, spark:spark});
    }
    return { cells:cells, cols:cols, rows:rows };
  }

  /* ---------- compositions ---------- */
  function buildSpray(cols, rows, seed){
    var G=mkGrid(cols,rows), rnd=rngFrom(seed), W=cols, H=rows;
    stem(G, W*0.46,H*1.02, W*0.54,H*0.16, W*0.36,H*0.55, P.olive, 1.3);
    wheatSheaf(G, W*0.52,H*0.34, H*0.5, rnd);
    seedpod(G, W*0.30,H*0.5, H*0.34, rnd);
    seedpod(G, W*0.72,H*0.44, H*0.30, rnd);
    poppy(G, W*0.34,H*0.30, Math.round(W*0.12), rnd);
    daisy(G, W*0.68,H*0.62, Math.round(W*0.11), 12, P.creamLt, rnd);
    oliveSprig(G, W*0.62,H*0.72, H*0.4, rnd);
    leaf(G, W*0.40,H*0.6, 6,3, -0.4, P.sage, rnd);
    rose(G, W*0.24,H*0.66, Math.round(W*0.085), {dk:P.roseDk, lt:P.roseLt}, rnd); // small accent
    berries(G, W*0.5,H*0.14, 5, P.rust, rnd);
    return collect(G, cols, rows, rnd);
  }

  /* ---------- context symbols (meaning-driven motifs) ---------- */
  /* archway / threshold — "how they would begin" (stepping through) */
  function motifArch(G,W,H){
    var cx=W*0.5, aw=Math.max(3,W*0.30), topY=H*0.46, baseY=H*0.84, th=1.1;
    var t1=P.olive, t2=P.oliveDk, hi=P.wheat;
    function bandV(x,y,tone){ for(var o=-th;o<=th;o+=0.7){ put(G,x+o,y, Math.abs(o)>th*0.55?darken(tone,0.14):tone); } }
    for(var y=topY;y<=baseY;y+=0.6){ bandV(cx-aw,y,t1); bandV(cx+aw,y,t2); }
    for(var a=Math.PI;a<=2*Math.PI+0.01;a+=0.05){ var x=cx+Math.cos(a)*aw, y=topY+Math.sin(a)*aw;
      for(var o=-th;o<=th;o+=0.7){ put(G, x+Math.cos(a)*o, y+Math.sin(a)*o, a<1.5*Math.PI?t1:t2); } }
    for(var xx=cx-aw-1.6;xx<=cx+aw+1.6;xx+=0.6){ put(G,xx,baseY,t2); put(G,xx,baseY+1,darken(t2,0.16)); }
    grain(G,cx,topY-aw-0.6,0.3,hi); grain(G,cx,topY-aw-2,0.3,P.yolk);
  }
  /* question mark — "say the doubt before they have to" */
  function motifQuestion(G,W,H){
    var pts=[[0.24,0.32],[0.28,0.17],[0.42,0.09],[0.58,0.09],[0.72,0.18],[0.73,0.34],[0.60,0.45],[0.50,0.53],[0.50,0.63]];
    function MX(u){ return W*0.5+(u-0.5)*W*0.62; } function MY(v){ return H*0.10+v*H*0.66; }
    var th=1.0;
    for(var i=0;i<pts.length-1;i++){
      var x0=MX(pts[i][0]),y0=MY(pts[i][1]),x1=MX(pts[i+1][0]),y1=MY(pts[i+1][1]);
      var steps=Math.hypot(x1-x0,y1-y0)*2+4;
      for(var s=0;s<=steps;s++){ var t=s/steps, x=x0+(x1-x0)*t, y=y0+(y1-y0)*t;
        for(var o=-th;o<=th;o+=0.7)for(var p=-th;p<=th;p+=0.7){ if(Math.hypot(o,p)>th) continue; put(G,x+o,y+p,(o+p<0)?P.rust:P.rustDk); } }
    }
    var dx=MX(0.50), dy=MY(0.92);
    for(var o2=-th;o2<=th;o2+=0.7)for(var p2=-th;p2<=th;p2+=0.7){ if(Math.hypot(o2,p2)>th*1.1) continue; put(G,dx+o2,dy+p2,P.plum); }
  }
  /* forward arrow — "prescribe the next move" */
  function motifArrow(G,W,H){
    var x0=W*0.22,y0=H*0.74, x1=W*0.76,y1=H*0.26, th=1.1;
    function seg(ax,ay,bx,by,tone){ var st=Math.hypot(bx-ax,by-ay)*2+4; for(var s=0;s<=st;s++){ var t=s/st, x=ax+(bx-ax)*t, y=ay+(by-ay)*t; for(var o=-th;o<=th;o+=0.7)for(var p=-th;p<=th;p+=0.7){ if(Math.hypot(o,p)>th) continue; put(G,x+o,y+p, (o+p<0)?tone:darken(tone,0.16)); } } }
    seg(x0,y0,x1,y1,P.wheat);
    seg(x1,y1, x1-W*0.28, y1+H*0.03, P.wheatDk);
    seg(x1,y1, x1-W*0.03, y1+H*0.22, P.wheatDk);
    grain(G,x0-1,y0+1,0.4,P.gold);
  }
  /* fingerpost signpost with botanical footing — "still guiding them / the next step" */
  function motifSignpost(G,W,H,rnd){
    var cx=W*0.46, topY=H*0.10, baseY=H*0.80, th=1.6;
    function arm(ay,dir,tone){
      var ax0=cx-dir*1.2, ax1=cx+dir*W*0.34, ah=H*0.055;
      for(var x=Math.min(ax0,ax1);x<=Math.max(ax0,ax1);x+=0.6){ for(var o=-ah;o<=ah;o+=0.7){ put(G,x,ay+o,(o<0)?lighten(tone,0.12):darken(tone,0.14)); } }
      for(var k=0;k<=ah*2;k+=0.7){ var tx=ax1+dir*(k*0.9), hh=ah-k*0.5; for(var o2=-hh;o2<=hh;o2+=0.7){ put(G,tx,ay+o2,tone); } }
    }
    for(var y=topY;y<=baseY;y+=0.6){ for(var o=-th;o<=th;o+=0.7){ put(G,cx+o,y, Math.abs(o)>th*0.55?P.umberDk:P.umber); } }
    for(var o3=-th-1;o3<=th+1;o3+=0.7){ put(G,cx+o3,topY-1,P.umberDk); }
    arm(H*0.26, 1, P.wheatDk);
    arm(H*0.43,-1, P.olive);
    wheatSprig(G, cx-W*0.15, baseY-H*0.01, H*0.22, rnd);
    wheatSprig(G, cx+W*0.17, baseY,        H*0.20, rnd);
    oliveSprig(G, cx-W*0.02, baseY+H*0.03, H*0.20, rnd);
    poppy(G, cx+W*0.03, baseY+H*0.01, Math.round(W*0.10), rnd);
    leaf(G, cx-W*0.18, baseY+H*0.03, 5,2.4,-0.5,P.sage,rnd);
    leaf(G, cx+W*0.20, baseY+H*0.04, 5,2.4, 0.6,P.sageLt,rnd);
    berries(G, cx-W*0.04, baseY+H*0.05, 6, P.rust, rnd);
  }

  /* ---------- embroidered scene primitives (little stitched landscapes) ---------- */
  function scGround(G,W,H,hz,base,dk,rnd){
    for(var y=hz;y<=H;y++)for(var x=0;x<=W;x++){
      if(rnd()<0.14) continue;
      put(G,x,y, rnd()<0.16?dk:(rnd()<0.5?lighten(base,0.08):base));
    }
  }
  function scPath(G,W,H,hz,x0,x1,tone,rnd){
    for(var y=H;y>=hz;y--){
      var t=(H-y)/(H-hz), cx=x0+(x1-x0)*t, half=(1-t)*W*0.15+1.2;
      for(var x=cx-half;x<=cx+half;x++){
        if(rnd()<0.08) continue;
        var e=Math.abs(x-cx)/half;
        put(G,x,y, e>0.8?darken(tone,0.12):(rnd()<0.4?lighten(tone,0.10):tone));
      }
    }
  }
  function scCottage(G,cx,by,s){
    var w=Math.round(s*1.0), h=Math.round(s*0.85), top=by-h;
    for(var y=top;y<=by;y++)for(var x=cx-w;x<=cx+w;x++){ put(G,x,y,((x+y)%5===0)?P.creamSh:P.creamLt); }
    var rh=Math.round(s*0.7);
    for(var k=0;k<=rh;k++){ var half=(w+2)*(1-k/(rh+0.001)); for(var x=Math.round(cx-half);x<=Math.round(cx+half);x++){ put(G,x,top-k,(half-Math.abs(x-cx)<1.5)?darken(P.poppy,0.20):P.poppy); } }
    for(var y2=by;y2>=by-Math.round(s*0.45);y2--)for(var x2=Math.round(cx-s*0.14);x2<=Math.round(cx+s*0.14);x2++){ put(G,x2,y2,P.umberDk); }
    for(var y3=top+2;y3<=top+2+Math.round(s*0.26);y3++)for(var x3=Math.round(cx+w*0.30);x3<=Math.round(cx+w*0.30+s*0.26);x3++){ put(G,x3,y3,P.yolk); }
    for(var y4=top-Math.round(rh*0.55);y4<=top-Math.round(rh*0.10);y4++)for(var x4=Math.round(cx+w*0.5);x4<=Math.round(cx+w*0.68);x4++){ put(G,x4,y4,P.umber); }
  }
  function scTree(G,cx,by,s,bare,rnd){
    for(var y=by;y>=by-s*0.9;y--){ put(G,cx-1,y,P.umber); put(G,cx,y,P.umberDk); }
    if(bare){
      stem(G,cx,by-s*0.6, cx-s*0.55,by-s*1.25, cx-s*0.3,by-s*0.95, P.umber,0.6);
      stem(G,cx,by-s*0.55, cx+s*0.5,by-s*1.15, cx+s*0.3,by-s*0.9, P.umberDk,0.6);
      stem(G,cx,by-s*0.7, cx,by-s*1.4, cx+s*0.1,by-s, P.umber,0.6);
    } else {
      var top=by-s*1.05, R=s*0.72;
      for(var r=-R;r<=R;r++)for(var c=-R;c<=R;c++){ var d=Math.hypot(c,r*1.05)/R; if(d>1.02) continue; if(rnd()<0.16) continue; put(G,cx+c,top+r, d<0.4?P.olive:(rnd()<0.4?P.sageLt:P.sage)); }
      for(var b=0;b<5;b++){ put(G, cx+(rnd()-0.5)*R*1.4, top+(rnd()-0.5)*R*1.4, rnd()<0.5?P.rust:P.gold); }
    }
  }
  function scFigure(G,cx,by,s,tone,tone2){
    var hd=by-Math.round(s*0.95);
    for(var r=-1;r<=1;r++)for(var c=-1;c<=1;c++){ if(Math.hypot(c,r)>1.4) continue; put(G,cx+c,hd+r,P.creamSh); }
    for(var y=by-Math.round(s*0.8);y<=by;y++){ var t=(y-(by-s*0.8))/(s*0.8), half=0.8+t*s*0.30; for(var x=Math.round(cx-half);x<=Math.round(cx+half);x++){ put(G,x,y,(x<cx)?tone:(tone2||tone)); } }
  }
  function scGate(G,cx,by,s){
    var w=Math.round(s*0.75), top=by-Math.round(s*1.0);
    for(var y=top;y<=by;y++){ put(G,cx-w,y,P.umber); put(G,cx-w-1,y,P.umberDk); put(G,cx+w,y,P.umberDk); put(G,cx+w+1,y,P.umber); }
    for(var x=cx-w;x<=cx+w;x++){ put(G,x,top+1,P.wheatDk); put(G,x,Math.round((top+by)/2),P.wheat); put(G,x,by-1,P.wheatDk); }
  }
  function scWheatField(G,W,H,hz,rnd){
    for(var i=0;i<42;i++){ var x=rnd()*W, y=hz+(H-hz)*(0.15+rnd()*0.85), hh=2+Math.round(rnd()*3); for(var k=0;k<hh;k++){ put(G,x,y-k,k>=hh-1?P.yolk:(k%2?P.wheat:P.wheatDk)); } put(G,x,y+1,P.oliveDk); }
  }
  function scCloud(G,cx,cy,s,rnd){ var n=Math.round(s*5); for(var i=0;i<n;i++){ var a=rnd()*6.28, rr=Math.sqrt(rnd())*s; put(G,cx+Math.cos(a)*rr*1.7, cy+Math.sin(a)*rr*0.7, rnd()<0.55?P.creamLt:P.dusk); } }
  function scBirds(G,x,y,n,rnd){ for(var i=0;i<n;i++){ var bx=Math.round(x+i*4+rnd()*2), by=Math.round(y+(i%2)*2); put(G,bx-1,by-1,P.umber); put(G,bx,by,P.umber); put(G,bx+1,by-1,P.umber); } }

  /* 01 — "how they would begin": a mapped path to a lit cottage at first light */
  function sceneBegin(G,W,H,rnd){
    var hz=Math.round(H*0.60);
    scGround(G,W,H,hz,P.sage,P.olive,rnd);
    sun(G,Math.round(W*0.17),Math.round(H*0.22),Math.round(H*0.10),rnd);
    scBirds(G,W*0.60,H*0.20,3,rnd);
    scPath(G,W,H,hz,W*0.50,W*0.66,P.creamLt,rnd);
    scTree(G,Math.round(W*0.14),hz+4,H*0.24,false,rnd);
    scCottage(G,Math.round(W*0.70),hz+1,Math.round(H*0.15));
  }
  /* 02 — "the doubt": a lone figure at a fork under uncertain clouds */
  function sceneDoubt(G,W,H,rnd){
    var hz=Math.round(H*0.60);
    scGround(G,W,H,hz,P.sageLt,P.sage,rnd);
    scCloud(G,W*0.26,H*0.22,H*0.10,rnd);
    scCloud(G,W*0.58,H*0.15,H*0.12,rnd);
    scCloud(G,W*0.82,H*0.27,H*0.08,rnd);
    scPath(G,W,H,hz,W*0.50,W*0.32,P.creamSh,rnd);
    scPath(G,W,H,hz,W*0.50,W*0.70,P.creamSh,rnd);
    scTree(G,Math.round(W*0.86),hz+3,H*0.20,true,rnd);
    scFigure(G,Math.round(W*0.50),Math.round(hz+(H-hz)*0.46),H*0.16,P.olive,P.oliveDk);
  }
  /* 03 — "the next move": a figure walking through the gate into the harvest */
  function sceneMove(G,W,H,rnd){
    var hz=Math.round(H*0.58);
    scGround(G,W,H,hz,P.sage,P.olive,rnd);
    scWheatField(G,W,H,hz,rnd);
    sun(G,Math.round(W*0.80),Math.round(H*0.20),Math.round(H*0.11),rnd);
    scBirds(G,W*0.20,H*0.18,3,rnd);
    scPath(G,W,H,hz,W*0.50,W*0.52,P.creamLt,rnd);
    scGate(G,Math.round(W*0.52),hz+2,Math.round(H*0.17));
    scFigure(G,Math.round(W*0.44),Math.round(H*0.88),H*0.17,P.rustDk,P.rust);
  }

  /* ---------- detailed webinar-UI motifs (dense stitched app screens) ---------- */
  function tRect(G,x0,y0,x1,y1,tone,rnd,dens){ dens=(dens==null)?1:dens; for(var y=Math.round(y0);y<=Math.round(y1);y++)for(var x=Math.round(x0);x<=Math.round(x1);x++){ if(rnd&&dens<1&&rnd()>dens) continue; put(G,x,y,tone); } }
  function tBorder(G,x0,y0,x1,y1,tone){ x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1); for(var x=x0;x<=x1;x++){ put(G,x,y0,tone); put(G,x,y1,tone); } for(var y=y0;y<=y1;y++){ put(G,x0,y,tone); put(G,x1,y,tone); } }
  function tH(G,x0,x1,y,tone){ y=Math.round(y); for(var x=Math.round(x0);x<=Math.round(x1);x++) put(G,x,y,tone); }
  function tV(G,x,y0,y1,tone){ x=Math.round(x); for(var y=Math.round(y0);y<=Math.round(y1);y++) put(G,x,y,tone); }
  function tDots(G,x,y,tone){ put(G,x,y,tone); put(G,x+3,y,tone); put(G,x+6,y,tone); }
  function tDisc(G,cx,cy,r,tone){ cx=Math.round(cx);cy=Math.round(cy); for(var y=-r;y<=r;y++)for(var x=-r;x<=r;x++){ if(x*x+y*y>r*r+0.6) continue; put(G,cx+x,cy+y,tone); } }
  function tTextLines(G,x0,x1,y,n,gap,tone){ for(var i=0;i<n;i++){ var xx=(i===n-1)?x0+(x1-x0)*0.6:x1; tH(G,x0,xx,y+i*gap,tone); } }
  function tCursor(G,cx,cy,tone){ cx=Math.round(cx);cy=Math.round(cy); for(var i=0;i<6;i++) put(G,cx+i,cy+i,tone); for(var j=0;j<5;j++) put(G,cx,cy+j,tone); for(var k=0;k<5;k++) put(G,cx+k,cy,tone); put(G,cx+2,cy+5,tone); put(G,cx+4,cy+6,tone); }

  /* 01 — live webinar: presenter video + running agenda + control bar */
  function techAgenda(G,W,H,rnd){
    tBorder(G,2,2,W-3,H-3,P.umberDk);
    var tb=Math.round(H*0.12), ty=Math.round(tb/2);
    tRect(G,3,3,W-4,tb,P.oliveDk,null,1);
    tDisc(G,8,ty,1,P.poppyHot); tDisc(G,13,ty,1,P.wheat); tDisc(G,18,ty,1,P.sageLt);
    tRect(G,W-31,ty-2,W-7,ty+2,P.rustDk,null,1); tDisc(G,W-27,ty,1,P.creamLt); tH(G,W-23,W-11,ty,P.creamLt);
    var mTop=tb+4, mBot=H-Math.round(H*0.18), split=Math.round(W*0.56);
    tRect(G,5,mTop,split-3,mBot,P.dusk,null,1);
    tRect(G,5,mTop,split-3,mTop+Math.round((mBot-mTop)*0.46),mix(P.dusk,P.plum,0.55),null,1);
    var vcx=Math.round((5+split)/2);
    tRect(G,vcx-13,mBot-19,vcx+13,mBot,mix(P.umberDk,P.plum,0.35),null,1);
    tDisc(G,vcx,mBot-23,6,P.creamSh);
    tRect(G,vcx-9,mBot-32,vcx+9,mBot-26,P.umberDk,null,1);
    tRect(G,9,mBot-6,9+Math.round(W*0.22),mBot-2,P.oliveDk,null,1); tH(G,12,9+Math.round(W*0.17),mBot-4,P.wheat);
    var ax0=split+2, ax1=W-6;
    tRect(G,ax0,mTop,ax1,mTop+6,P.wheatDk,null,1); tH(G,ax0+3,Math.round((ax0+ax1)/2),mTop+3,P.umberDk);
    var rows=4, gap=Math.round((mBot-mTop-12)/rows);
    for(var i=0;i<rows;i++){ var ry=mTop+13+i*gap;
      if(i===0) tRect(G,ax0,ry-4,ax1,ry+4,mix(P.wheat,P.creamLt,0.45),null,1);
      tDisc(G,ax0+4,ry,2,i===0?P.yolk:P.wheatDk);
      tH(G,ax0+9,ax1-15,ry,i===0?P.umberDk:P.umber);
      tH(G,ax0+9,ax1-26,ry+3,P.creamSh);
      tRect(G,ax1-12,ry-2,ax1-4,ry+1,P.creamSh,null,1);
    }
    var cb=H-Math.round(H*0.12);
    tH(G,4,W-5,cb-3,P.umber);
    for(var b=0;b<5;b++){ var bx=9+b*11; tRect(G,bx,cb,bx+7,cb+6,P.umber,null,1); }
    tRect(G,W-17,cb,W-8,cb+6,P.poppy,null,1);
    tH(G,6,W-7,H-6,P.creamSh); tH(G,6,6+Math.round((W-13)*0.42),H-6,P.yolk);
  }
  /* 02 — live Q&A: avatars, question bubbles with upvotes, host reply, input */
  function techChat(G,W,H,rnd){
    tBorder(G,2,2,W-3,H-3,P.umberDk);
    var tb=Math.round(H*0.12), ty=Math.round(tb/2);
    tRect(G,3,3,W-4,tb,P.oliveDk,null,1);
    tDisc(G,8,ty,1,P.poppyHot); tDisc(G,13,ty,1,P.wheat); tDisc(G,18,ty,1,P.sageLt);
    tRect(G,W-24,ty-2,W-7,ty+2,P.wheatDk,null,1); tH(G,W-21,W-11,ty,P.umberDk);
    var y=tb+7;
    function bubble(incoming,wf,q,up){
      var ah=Math.round(H*0.15);
      if(incoming){
        tDisc(G,10,y+Math.round(ah/2),4,mix(P.sage,P.olive,0.45));
        var bx=17,bx2=Math.round(17+(W-38)*wf);
        tRect(G,bx,y,bx2,y+ah,P.creamSh,null,1);
        if(q) tRect(G,bx+2,y+2,bx+6,y+6,P.rust,null,1);
        tTextLines(G,bx+(q?9:3),bx2-4,y+3,2,4,P.umber);
        if(up){ tRect(G,bx2-11,y+ah-4,bx2-3,y+ah-1,P.wheat,null,1); tDisc(G,bx2-9,y+ah-6,1,P.wheatDk); }
      } else {
        var rx2=W-11,rx=Math.round(W-11-(W-38)*wf);
        tDisc(G,W-7,y+Math.round(ah/2),4,P.wheat);
        tRect(G,rx,y,rx2,y+ah,P.wheat,null,1);
        tTextLines(G,rx+3,rx2-4,y+3,2,4,P.umberDk);
      }
      y+=ah+4;
    }
    bubble(true,0.62,true,true); bubble(false,0.5,false,false); bubble(true,0.5,true,true); bubble(true,0.42,true,false);
    var ib=H-Math.round(H*0.17);
    tRect(G,6,ib,W-24,H-6,P.creamLt,null,1); tBorder(G,6,ib,W-24,H-6,P.umber);
    tH(G,10,Math.round(W*0.45),Math.round((ib+H-6)/2),P.creamSh);
    tRect(G,W-21,ib,W-6,H-6,P.rustDk,null,1);
    var scy=Math.round((ib+H-6)/2); tH(G,W-18,W-10,scy,P.creamLt); put(G,W-11,scy-1,P.creamLt); put(G,W-11,scy+1,P.creamLt);
  }
  /* 03 — checkout: order summary, card fields, secure badge, CTA + cursor */
  function techCheckout(G,W,H,rnd){
    tBorder(G,2,2,W-3,H-3,P.umberDk);
    var tb=Math.round(H*0.12), ty=Math.round(tb/2), mid=Math.round(W*0.5);
    tRect(G,3,3,W-4,tb,P.oliveDk,null,1);
    tDisc(G,8,ty,1,P.poppyHot); tDisc(G,13,ty,1,P.wheat); tDisc(G,18,ty,1,P.sageLt);
    tH(G,W-24,W-9,ty,P.creamSh);
    var lx=8, lx2=mid-7, oy=tb+8;
    tRect(G,lx,oy,lx+16,oy+16,mix(P.wheat,P.rust,0.35),null,1); tRect(G,lx+4,oy+4,lx+9,oy+8,P.creamLt,null,1); tDisc(G,lx+11,oy+11,2,P.oliveDk);
    tH(G,lx+20,lx2-4,oy+3,P.umberDk); tH(G,lx+20,lx2-14,oy+9,P.creamSh); tH(G,lx+20,lx2-20,oy+14,P.creamSh);
    for(var i=0;i<3;i++){ var ry=oy+24+i*7; tH(G,lx,lx2-16,ry,P.umber); tH(G,lx2-11,lx2,ry,P.umber); }
    var toty=oy+24+3*7+3; tH(G,lx,lx2,toty-3,P.umberDk); tH(G,lx,lx2-24,toty+2,P.umberDk); tRect(G,lx2-20,toty,lx2,toty+4,P.yolk,null,1);
    var fx0=mid+7, fx1=W-8;
    tH(G,fx0,fx0+14,tb+7,P.umber);
    for(var f=0;f<2;f++){ var fy=tb+11+f*13; tBorder(G,fx0,fy,fx1,fy+9,P.umber); for(var d=0;d<10;d++) tRect(G,fx0+3+d*3,fy+4,fx0+4+d*3,fy+6,P.umber,null,1); }
    var f3=tb+11+2*13; tBorder(G,fx0,f3,Math.round((fx0+fx1)/2),f3+9,P.umber); for(var g=0;g<3;g++) tRect(G,fx0+3+g*3,f3+4,fx0+4+g*3,f3+6,P.umber,null,1);
    tDisc(G,fx0+3,f3+15,2,P.sage); tH(G,fx0+8,fx0+28,f3+15,P.creamSh);
    var by=H-Math.round(H*0.26), by2=H-8;
    tRect(G,fx0,by,fx1,by2,P.rustDk,null,1); tH(G,fx0+8,fx1-8,Math.round((by+by2)/2),P.creamLt);
    tCursor(G,Math.round((fx0+fx1)/2)+10,by+3,P.oliveDk);
  }

  /* 04 — LAUNCH DAY (the harvest): a creator pitching an offer to a full, warm
     audience (faces + reactions) while live sales land in the feed — climbing
     revenue, payment rows, a harvest-goal bar. Not a stock webinar: attention
     on the left, money coming in on the right, botanicals as the AH seal. */
  function techLaunch(G,W,H,rnd){
    var uDk=P.umberDk, u=P.umber, cream=P.creamLt, creamSh=P.creamSh, gold=P.gold, yolk=P.yolk, olive=P.olive, oliveDk=P.oliveDk;
    var green=mix(P.sage,P.oliveDk,0.32);
    var skins=[mix(P.creamLt,P.wheat,0.34),mix(P.wheat,P.rust,0.42),mix(P.rust,P.umber,0.34),mix(P.umberDk,P.rust,0.46),mix(P.wheat,P.creamLt,0.10),mix(P.rust,P.wheat,0.5)];
    var hairs=[P.inkDk,P.umberDk,P.wheatDk,mix(P.rust,P.umberDk,0.5),mix(P.umber,P.ink,0.5),P.gold,P.creamSh,P.rustDk];
    var cloths=[P.olive,P.sage,P.rustDk,P.dusk,P.plum,P.wheatDk,mix(P.poppy,P.rustDk,0.4),P.sageLt,P.umber,mix(P.sage,P.olive,0.5),P.rust];
    var tints=[mix(P.dusk,P.creamSh,0.5),mix(P.sageLt,P.creamSh,0.5),mix(P.wheat,P.creamLt,0.55),mix(P.plum,P.creamSh,0.42),mix(P.rose,P.creamSh,0.5),mix(P.olive,P.creamSh,0.5)];
    var r,c,i,b,x,y,x0,y0,ry,rr;

    function person(cx,by,s,skin,hair,cloth,face){
      cx=Math.round(cx); by=Math.round(by);
      var hr=Math.max(2,Math.round(s*0.27));
      var hcy=Math.round(by-s*0.58);
      var shTop=hcy+hr, shH=Math.max(2,by-shTop), yy,xx,d2;
      for(yy=shTop;yy<=by;yy++){
        var t=(yy-shTop)/shH, half=hr*0.5+t*(s*0.52-hr*0.5);
        for(xx=Math.round(cx-half);xx<=Math.round(cx+half);xx++){
          var e=Math.abs(xx-cx)/Math.max(0.6,half);
          put(G,xx,yy, e>0.85?darken(cloth,0.20):(xx<cx?lighten(cloth,0.07):cloth));
        }
      }
      for(var ny=hcy+hr-1;ny<=shTop;ny++){ put(G,cx-1,ny,skin); put(G,cx,ny,darken(skin,0.10)); put(G,cx+1,ny,darken(skin,0.18)); }
      for(yy=-hr;yy<=hr;yy++)for(xx=-hr;xx<=hr;xx++){ if(xx*xx+yy*yy>hr*hr+0.5) continue; put(G,cx+xx,hcy+yy,shade(skin,xx,yy,0.5)); }
      for(yy=-hr;yy<=0;yy++)for(xx=-hr;xx<=hr;xx++){ d2=xx*xx+yy*yy; if(d2>hr*hr+0.5) continue; var top=yy<=-hr*0.36, rim=d2>=(hr-1)*(hr-1)-0.5; if(top||rim) put(G,cx+xx,hcy+yy,(yy<-hr*0.62)?hair:darken(hair,0.05)); }
      if(face && hr>=4){ put(G,cx-Math.round(hr*0.42),hcy,P.inkDk); put(G,cx+Math.round(hr*0.42),hcy,P.inkDk); tH(G,cx-1,cx+1,hcy+Math.round(hr*0.5),darken(skin,0.30)); }
    }
    function heart(cx,cy,rd,tone){
      cx=Math.round(cx);cy=Math.round(cy); var lr=Math.max(1,Math.round(rd*0.6));
      tDisc(G,cx-Math.round(rd*0.5),cy-Math.round(rd*0.22),lr,tone);
      tDisc(G,cx+Math.round(rd*0.5),cy-Math.round(rd*0.22),lr,tone);
      for(var yy=0;yy<=rd*1.3;yy++){ var half=rd*(1-yy/(rd*1.3)); for(var xx=-half;xx<=half;xx++) put(G,cx+xx,cy+yy-Math.round(rd*0.1),tone); }
    }
    function payCard(x,y,w,h,tone){ x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
      tRect(G,x+1,y,x+w-1,y+h,tone,null,1); tRect(G,x,y+1,x+w,y+h-1,tone,null,1);
      tH(G,x+1,x+w-1,y+Math.max(1,Math.round(h*0.34)),darken(tone,0.34));
      tRect(G,x+2,y+h-2,x+Math.max(3,Math.round(w*0.36)),y+h-1,lighten(tone,0.36),null,1);
    }
    function pill(x0,x1,y,tone){ x0=Math.round(x0);x1=Math.round(x1);y=Math.round(y); tRect(G,x0,y-1,x1,y+1,tone,null,1); put(G,x0-1,y,tone); put(G,x1+1,y,tone); }

    tBorder(G,2,2,W-3,H-3,uDk);
    /* ---- title bar ---- */
    var tb=Math.max(6,Math.round(H*0.11)), ty=Math.round((3+tb)/2);
    tRect(G,3,3,W-4,tb,oliveDk,null,1);
    tDisc(G,8,ty,1,P.poppyHot); tDisc(G,13,ty,1,P.wheat); tDisc(G,18,ty,1,P.sageLt);
    tH(G,24,24+Math.round(W*0.14),ty,P.creamSh);                                  // window title
    var lvx1=W-8, lvx0=W-Math.round(W*0.13);                                       // LIVE badge
    pill(lvx0,lvx1,ty,P.poppy); tDisc(G,lvx0+2,ty,1,P.creamLt); tH(G,lvx0+5,lvx1-2,ty,P.creamLt);
    var wcx=lvx0-Math.round(W*0.12);                                               // watching count (eye + bar)
    tDisc(G,wcx,ty,2,P.creamLt); tDisc(G,wcx,ty,1,oliveDk); tH(G,wcx+4,wcx+Math.round(W*0.06),ty,P.creamSh);

    var mTop=tb+4, mBot=H-4, sx=Math.round(W*0.62);

    /* ================= LEFT — the broadcast ================= */
    var bx0=6, bx1=sx-4;
    tRect(G,bx0,mTop,bx1,mBot, mix(P.umberDk,P.plum,0.28),null,1);                 // dark stage backdrop
    var stageBot=mTop+Math.round((mBot-mTop)*0.52);

    /* presenter (the creator) */
    var pv0=bx0+2, pv1=bx0+Math.round((bx1-bx0)*0.50), pt0=mTop+2, pt1=stageBot-2;
    tRect(G,pv0,pt0,pv1,pt1, mix(P.dusk,P.creamSh,0.52),null,1); tBorder(G,pv0,pt0,pv1,pt1, oliveDk);
    person((pv0+pv1)/2, pt1-2, (pt1-pt0)*0.88, skins[1], hairs[1], P.olive, true);
    tRect(G,pv0+1,pt1-4,pv0+Math.round((pv1-pv0)*0.62),pt1-1, oliveDk,null,1);     // nameplate
    tH(G,pv0+3,pv0+Math.round((pv1-pv0)*0.52),pt1-2,P.wheat);
    heart(pv1-3,pt0+3,2,P.poppy);

    /* the offer slide they're pitching */
    var ov0=pv1+3, ov1=bx1-2, ot0=pt0, ot1=pt1;
    tRect(G,ov0,ot0,ov1,ot1, cream,null,1); tBorder(G,ov0,ot0,ov1,ot1, P.wheatDk);
    tRect(G,ov0+3,ot0+3,ov0+Math.round((ov1-ov0)*0.30),ot0+Math.round((ot1-ot0)*0.44), mix(P.wheat,P.rust,0.40),null,1); // product thumb
    tDisc(G,ov0+3+Math.round((ov1-ov0)*0.14),ot0+3+Math.round((ot1-ot0)*0.20),2,P.creamLt);
    var tlx=ov0+Math.round((ov1-ov0)*0.36);
    tH(G,tlx,ov1-3,ot0+5,uDk); tH(G,tlx,ov1-8,ot0+8,creamSh); tH(G,tlx,ov1-6,ot0+11,creamSh);
    pill(ov0+4, ov0+Math.round((ov1-ov0)*0.44), ot1-8, yolk);                      // price
    tRect(G,ov0+4,ot1-5,ov1-4,ot1-2, P.rustDk,null,1); tH(G,ov0+9,ov1-9,ot1-4,P.creamLt); // CTA (enroll)

    /* the warm audience — a full gallery of faces + reactions */
    var gTop=stageBot+2, gBot=mBot-Math.round((mBot-mTop)*0.11);
    var gcols=5, grows=2, gap=1;
    var cellW=Math.floor((bx1-bx0-2-(gcols-1)*gap)/gcols), cellH=Math.floor((gBot-gTop-(grows-1)*gap)/grows);
    var speak=(Math.floor(rnd()*gcols*grows));
    for(r=0;r<grows;r++)for(c=0;c<gcols;c++){
      var idx=r*gcols+c; x0=bx0+1+c*(cellW+gap); y0=gTop+r*(cellH+gap);
      var tnt=tints[(idx+ (r? 3:0))%tints.length];
      tRect(G,x0,y0,x0+cellW-1,y0+cellH-1, tnt,null,1);
      person(x0+cellW/2, y0+cellH-1, cellH*1.02, skins[(idx*3+1)%skins.length], hairs[(idx*2+r)%hairs.length], cloths[(idx*4+c)%cloths.length], false);
      if(idx===speak){ tBorder(G,x0,y0,x0+cellW-1,y0+cellH-1, yolk); }              // active speaker
      if(idx%3===0){ heart(x0+cellW-3,y0+2,1.6, idx%2?P.rose:P.poppy); }            // reactions
      var mic=(idx%4===0); tDisc(G,x0+2,y0+cellH-2,1, mic?P.poppyHot:mix(P.creamSh,P.umber,0.4)); // mic state
    }
    /* floating reactions rising off the crowd */
    heart(bx0+Math.round((bx1-bx0)*0.30),gTop-2,1.6,P.rose);
    heart(bx0+Math.round((bx1-bx0)*0.62),gTop-3,2,P.poppy);
    heart(bx0+Math.round((bx1-bx0)*0.80),gTop-1,1.4,P.roseDk);

    /* broadcast control bar */
    var cby=mBot-2;
    tH(G,bx0,bx1,gBot+1, mix(P.umber,P.plum,0.4));
    for(b=0;b<4;b++){ var cbx=bx0+3+b*7; tRect(G,cbx,cby-3,cbx+4,cby, mix(P.creamSh,P.umber,0.35),null,1); }
    tRect(G,bx1-9,cby-3,bx1-2,cby, P.poppy,null,1);

    /* ================= RIGHT — live sales feed ================= */
    var qx0=sx+2, qx1=W-6, qy0=mTop, qy1=mBot;
    tRect(G,qx0,qy0,qx1,qy1, cream,null,1); tBorder(G,qx0,qy0,qx1,qy1, P.wheatDk);
    var qh=qy0+Math.round((qy1-qy0)*0.14);
    tRect(G,qx0,qy0,qx1,qh, P.wheatDk,null,1);
    wheatSprig(G, qx0+6, Math.round((qy0+qh)/2)+1, (qh-qy0)*1.5, rnd);              // harvest seal
    tH(G,qx0+12,qx1-14,Math.round((qy0+qh)/2)-1,P.creamLt);                        // "today's sales"
    payCard(qx1-11,Math.round((qy0+qh)/2)-2,8,5,P.creamLt);                        // card glyph

    /* revenue climbing — a rising bar chart */
    var chTop=qh+4, chBot=chTop+Math.round((qy1-qy0)*0.15);
    var nb=6, span=qx1-qx0-10, bw=Math.max(2,Math.floor(span/(nb*1.6))), bgap=Math.floor((span-nb*bw)/(nb-1));
    for(i=0;i<nb;i++){ var bh=Math.round((chBot-chTop)*(0.28+0.72*i/(nb-1))); var bxx=qx0+5+i*(bw+bgap);
      tRect(G,bxx,chBot-bh,bxx+bw-1,chBot, i>=nb-2?yolk:mix(P.wheat,P.olive,0.35),null,1); }
    tH(G,qx0+5,qx1-5,chBot+1, mix(P.creamSh,P.umber,0.3));

    /* payment rows landing — [buyer] name ··· $amount ✓ */
    var rowsTop=chBot+4, rowsBot=qy1-Math.round((qy1-qy0)*0.13);
    var nr=4, rh=Math.floor((rowsBot-rowsTop)/nr);
    for(i=0;i<nr;i++){ ry=rowsTop+i*rh; var rmid=ry+Math.round(rh/2);
      if(i===0){ tRect(G,qx0+2,ry,qx1-2,ry+rh-2, mix(P.wheat,P.creamLt,0.55),null,1); tDisc(G,qx0+4,ry+2,1,yolk); } // newest highlighted
      tDisc(G,qx0+6,rmid,2, skins[(i*2)%skins.length]);                            // buyer avatar
      for(var hy=-2;hy<=-1;hy++)for(var hx=-2;hx<=2;hx++){ if(hx*hx+hy*hy>4) continue; put(G,qx0+6+hx,rmid+hy,hairs[(i*3)%hairs.length]); }
      tH(G,qx0+11,qx0+11+Math.round((qx1-qx0)*0.30),rmid-2, u);                     // buyer name
      tH(G,qx0+11,qx0+11+Math.round((qx1-qx0)*0.20),rmid+1, creamSh);              // "just enrolled"
      pill(qx1-Math.round((qx1-qx0)*0.30), qx1-9, rmid-1, i===0?yolk:gold);        // amount
      checkMark(G,qx1-7,rmid-3,6,green);                                            // paid ✓
    }

    /* harvest goal — a filling progress bar */
    var gy=qy1-Math.round((qy1-qy0)*0.09), gw=qx1-qx0-10;
    tRect(G,qx0+5,gy,qx1-5,gy+3, mix(P.creamSh,P.umber,0.22),null,1);
    var fill=Math.round(gw*0.78);
    tRect(G,qx0+5,gy,qx0+5+fill,gy+3, yolk,null,1);
    grain(G,qx0+5+fill,gy+1,0.4,P.wheatDk);                                         // grain marker at the tip
    tV(G,qx1-5,gy-1,gy+4, P.rustDk);                                                // goal tick
  }

  /* black cross-stitch pendant lamp — dome shade, warm bulb (glow added in CSS) */
  function motifLamp(G,W,H){
    var cx=W*0.5, sTop=Math.round(H*0.17), sBot=Math.round(H*0.55);
    for(var y=0;y<sTop;y++){ put(G,cx-0.5,y,P.ink); put(G,cx+0.5,y,P.inkDk); }
    for(var cxo=-2;cxo<=2;cxo++){ put(G,cx+cxo,0,P.inkDk); put(G,cx+cxo,1,P.ink); }
    for(var yy=sTop;yy<=sBot;yy++){
      var t=(yy-sTop)/(sBot-sTop), hw=W*(0.12+0.30*Math.pow(t,0.72)), hwr=Math.round(hw);
      for(var x=-hwr;x<=hwr;x++){ var f=(x+hw)/(2*hw); put(G,cx+x,yy, f<0.30?P.inkLt:(f>0.72?P.inkDk:P.ink)); }
    }
    var hwB=Math.round(W*0.42);
    for(var xr=-hwB;xr<=hwB;xr++){ put(G,cx+xr,sBot,mix(P.ink,P.yolk,0.12)); }
    var hwG=Math.round(W*0.26);
    for(var xi=-hwG;xi<=hwG;xi++){ put(G,cx+xi,sBot+1,P.yolk); }
    var by=Math.round(H*0.66), br=W*0.11, brc=Math.ceil(br);
    for(var oy=-brc;oy<=brc;oy++)for(var ox=-brc;ox<=brc;ox++){ if(ox*ox+oy*oy>br*br+0.6) continue; var d=Math.hypot(ox,oy)/br; put(G,cx+ox,by+oy, d<0.5?P.creamLt:(d<0.85?P.yolk:P.wheatDk)); }
  }

  /* ---------- literal content samplers: stitched text + folk motifs ---------- */
  function blitText(G, chart, ox, oy){ ox=Math.round(ox); oy=Math.round(oy); for(var i=0;i<chart.cells.length;i++){ var q=chart.cells[i]; put(G, ox+q.c, oy+q.r, q.tone); } return chart; }
  function textChart(text, stitchH, tone){ var fontPx=100, cell=Math.max(2, Math.round(fontPx*1.62/stitchH)); return buildText(text, {fontPx:fontPx, cell:cell, solid:true, tone:tone}); }
  function centerText(G, text, stitchH, tone, W, y){ var ch=textChart(text, stitchH, tone); blitText(G, ch, (W-ch.cols)/2, y); return ch; }
  function xTick(G,cx,cy,tone){ cx=Math.round(cx); cy=Math.round(cy); for(var d=-1;d<=1;d++){ put(G,cx+d,cy+d,tone); put(G,cx+d,cy-d,tone); } }
  function sampBorder(G,W,H,tone,accent){ tBorder(G,2,2,W-3,H-3,tone); var x,y; for(x=5;x<W-5;x+=3){ put(G,x,5,accent); put(G,x,H-6,accent); } for(y=5;y<H-5;y+=3){ put(G,5,y,accent); put(G,W-6,y,accent); } }
  var FONT35={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'101111111111101',O:'010101101101010',P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111','0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'111001010001110','?':'110001010000010',' ':'000000000000000'};
  function bmChar(G,ch,x,y,tone){ var g=FONT35[ch]||FONT35['?']; x=Math.round(x); y=Math.round(y); for(var r=0;r<5;r++)for(var c=0;c<3;c++){ if(g[r*3+c]==='1') put(G,x+c,y+r,tone); } }
  function bmWidth(str){ return (''+str).length*4-1; }
  function bmText(G,str,x,y,tone){ str=(''+str).toUpperCase(); x=Math.round(x); for(var i=0;i<str.length;i++){ bmChar(G,str[i],x,y,tone); x+=4; } }
  function bmCenter(G,str,y,tone,W){ bmText(G,str, Math.round((W-bmWidth(str))/2), y, tone); }

  function bubbleCloud(G,cx,cy,r,fill,edge){
    var L=[[0,0,1.0],[-0.85,0.15,0.62],[-0.45,-0.55,0.66],[0.35,-0.6,0.68],[0.85,-0.05,0.62],[0.5,0.5,0.66],[-0.4,0.55,0.62]];
    var i, rr;
    for(i=0;i<L.length;i++){ rr=Math.max(3,Math.round(L[i][2]*r*0.62)); tDisc(G,Math.round(cx+L[i][0]*r),Math.round(cy+L[i][1]*r),rr+1,edge); }
    for(i=0;i<L.length;i++){ rr=Math.max(3,Math.round(L[i][2]*r*0.62)); tDisc(G,Math.round(cx+L[i][0]*r),Math.round(cy+L[i][1]*r),rr-1,fill); }
  }
  function glyphQ(G,cx,cy,s,tone){
    var w=Math.max(1.4,s*0.17);
    stem(G, cx-s*0.72, cy-s*0.18, cx+s*0.06, cy+s*0.12, cx+s*0.06, cy-s*1.02, tone, w);
    stem(G, cx+s*0.06, cy+s*0.12, cx-s*0.02, cy+s*0.5, cx+s*0.12, cy+s*0.32, tone, w);
    tDisc(G, Math.round(cx-s*0.02), Math.round(cy+s*0.82), Math.max(1,Math.round(s*0.13)), tone);
  }
  function stitchLine(G,x0,x1,y,tone){ x0=Math.round(x0);x1=Math.round(x1);y=Math.round(y); tH(G,x0,x1,y,tone); tH(G,x0,Math.round(x0+(x1-x0)*0.97),y+1,darken(tone,0.16)); }
  function ringOutline(G,cx,cy,r,tone){ cx=Math.round(cx);cy=Math.round(cy);r=Math.round(r); var n=Math.max(14,Math.round(r*6.5)); for(var i=0;i<n;i++){ var a=i/n*6.2832; put(G,cx+Math.cos(a)*r,cy+Math.sin(a)*r,tone); put(G,cx+Math.cos(a)*(r-1),cy+Math.sin(a)*(r-1),darken(tone,0.14)); } }
  function checkMark(G,x0,y0,s,tone){
    var i,t,n1=Math.max(3,Math.round(s*0.5)),n2=Math.max(4,Math.round(s*0.8)),rr=Math.max(1,Math.round(s*0.1));
    for(i=0;i<=n1;i++){ t=i/n1; tDisc(G, x0+s*0.14+s*0.26*t, y0+s*0.46+s*0.36*t, rr, tone); }
    for(i=0;i<=n2;i++){ t=i/n2; tDisc(G, x0+s*0.40+s*0.46*t, y0+s*0.82-s*0.66*t, rr, i>n2*0.6?lighten(tone,0.12):tone); }
  }
  function checkBox(G,x,y,s,checked,accent){
    x=Math.round(x);y=Math.round(y);s=Math.round(s);
    tRect(G,x,y,x+s,y+s,'#FBF5E6',null,1);
    tBorder(G,x-1,y-1,x+s+1,y+s+1,mix(P.wheatDk,P.umber,0.4)); tBorder(G,x,y,x+s,y+s,P.umberDk);
    if(checked){ tRect(G,x+1,y+1,x+s-1,y+s-1,lighten(accent,0.66),null,1); checkMark(G,x,y,s,accent); }
  }

  /* 01 — the plan: a stitched clipboard, the first steps all checked off */
  function samplerPlan(G,W,H,rnd){
    var bx0=Math.round(W*0.15), bx1=Math.round(W*0.85), by0=Math.round(H*0.13), by1=Math.round(H*0.93);
    tRect(G,bx0,by0,bx1,by1,mix(P.wheat,P.wheatDk,0.4),null,1);
    tBorder(G,bx0,by0,bx1,by1,P.umberDk);
    var mid=Math.round((bx0+bx1)/2);
    tRect(G,mid-5,by0-3,mid+5,by0+2,P.umberDk,null,1); tRect(G,mid-2,by0-5,mid+2,by0-2,P.umber,null,1);
    var px0=bx0+3, px1=bx1-3, py0=by0+5, py1=by1-4;
    tRect(G,px0,py0,px1,py1,'#FBF5E6',null,1); tBorder(G,px0,py0,px1,py1,P.creamSh);
    stitchLine(G,px0+4,px0+(px1-px0)*0.55,py0+4,P.wheatDk);
    stitchLine(G,px0+4,px0+(px1-px0)*0.4,py0+7,P.creamSh);
    var ph=py1-py0, rows=3, rTop=py0+ph*0.34, rBot=py0+ph*0.82, gp=(rBot-rTop)/(rows-1);
    var boxS=Math.max(5,Math.round(ph*0.17)), accs=[P.poppy,P.olive,P.gold];
    for(var i=0;i<rows;i++){ var ry=Math.round(rTop+i*gp);
      checkBox(G,px0+5,ry-Math.round(boxS/2),boxS, true, accs[i]);
      var lx0=px0+5+boxS+5, lx1=px1-5, wdt=(i===1)?(lx1-lx0)*0.76:(lx1-lx0);
      stitchLine(G,lx0,lx0+wdt,ry-1,P.umber);
      stitchLine(G,lx0,lx0+wdt*0.6,ry+2,P.creamSh);
    }
    oliveSprig(G, Math.round(W*0.1), Math.round(H*0.9), H*0.16, rnd);
  }

  function bigQ(G,cx,cy,blk,tone){
    var Q=['01110','10001','00011','00110','00100','00000','00100'];
    var ox=Math.round(cx-2.5*blk), oy=Math.round(cy-3.5*blk), r, c;
    for(r=0;r<7;r++)for(c=0;c<5;c++){ if(Q[r].charAt(c)==='1'){ tRect(G,ox+c*blk,oy+r*blk,ox+(c+1)*blk-1,oy+(r+1)*blk-1,tone,null,1); } }
  }
  /* 02 — the doubt: a clean thought cloud with the question in their head */
  function samplerDoubts(G,W,H,rnd){
    var ccx=Math.round(W*0.52), ccy=Math.round(H*0.42), cs=Math.round(H*0.31);
    bubbleCloud(G,ccx+1,ccy+2,cs,mix(P.creamSh,P.umber,0.18),mix(P.creamSh,P.umber,0.18));
    bubbleCloud(G,ccx,ccy,cs,'#FBF5E6',P.umberDk);
    bigQ(G,ccx,ccy,Math.max(2,Math.round(H*0.055)),P.rustDk);
    var puffs=[[W*0.33,H*0.72,4],[W*0.25,H*0.83,3],[W*0.18,H*0.92,2]];
    for(var i=0;i<puffs.length;i++){ var pr=Math.round(puffs[i][2]); tDisc(G,Math.round(puffs[i][0]),Math.round(puffs[i][1]),pr+1,P.umberDk); tDisc(G,Math.round(puffs[i][0]),Math.round(puffs[i][1]),pr,'#FBF5E6'); }
    oliveSprig(G, Math.round(W*0.9), Math.round(H*0.92), H*0.15, rnd);
  }

  /* 03 — the first week: a stitched calendar, first row circled + checked */
  function samplerNext(G,W,H,rnd){
    var bx0=Math.round(W*0.15), bx1=Math.round(W*0.85), by0=Math.round(H*0.2), by1=Math.round(H*0.9);
    var r1=Math.round(W*0.36), r2=Math.round(W*0.64);
    tV(G,r1,by0-8,by0+2,P.umber); tV(G,r2,by0-8,by0+2,P.umber); tDisc(G,r1,by0-9,2,P.umberDk); tDisc(G,r2,by0-9,2,P.umberDk);
    tRect(G,bx0,by0,bx1,by1,'#FBF5E6',null,1);
    tBorder(G,bx0-1,by0-1,bx1+1,by1+1,mix(P.wheatDk,P.umber,0.3)); tBorder(G,bx0,by0,bx1,by1,P.umberDk);
    var hb=Math.round(by0+(by1-by0)*0.2); tRect(G,bx0+1,by0+1,bx1-1,hb,P.rustDk,null,1);
    stitchLine(G,bx0+(bx1-bx0)*0.3,bx0+(bx1-bx0)*0.7,Math.round((by0+hb)/2),P.creamLt);
    var cols=5, rowsN=3, gx0=bx0+3, gx1=bx1-3, gy0=hb+3, gy1=by1-3;
    var cw=(gx1-gx0)/cols, chh=(gy1-gy0)/rowsN, c, r;
    tRect(G,gx0,gy0,gx1,Math.round(gy0+chh),mix(P.wheat,P.creamLt,0.45),null,1);
    for(r=1;r<rowsN;r++)for(c=0;c<cols;c++){ if((r+c)%2===0){ tRect(G,Math.round(gx0+c*cw)+1,Math.round(gy0+r*chh)+1,Math.round(gx0+(c+1)*cw)-1,Math.round(gy0+(r+1)*chh)-1,mix(P.creamLt,P.creamSh,0.4),null,1); } }
    for(c=0;c<=cols;c++) tV(G,Math.round(gx0+c*cw),gy0,gy1,mix(P.creamSh,P.umber,0.38));
    for(r=0;r<=rowsN;r++) tH(G,gx0,gx1,Math.round(gy0+r*chh),mix(P.creamSh,P.umber,0.38));
    var cyf=Math.round(gy0+chh*0.5), sq=Math.round(Math.min(cw,chh));
    ringOutline(G,Math.round(gx0+cw*0.5),cyf,Math.round(sq*0.34),P.poppy);
    checkMark(G,Math.round(gx0+cw*1.5-sq*0.3),cyf-Math.round(sq*0.3),Math.round(sq*0.62),P.olive);
    checkMark(G,Math.round(gx0+cw*2.5-sq*0.3),cyf-Math.round(sq*0.3),Math.round(sq*0.62),P.olive);
    tDisc(G,Math.round(gx0+cw*3.5),cyf,2,P.wheatDk); tDisc(G,Math.round(gx0+cw*4.5),cyf,2,P.wheatDk);
    for(r=1;r<rowsN;r++)for(c=0;c<cols;c++){ tDisc(G,Math.round(gx0+cw*(c+0.5)),Math.round(gy0+chh*(r+0.5)),1,mix(P.sage,P.umber,0.25)); }
    berrySprig(G, Math.round(W*0.9), Math.round(H*0.92), H*0.16, rnd);
  }

  function buildMotif(kind, cols, rows, seed){
    var G=mkGrid(cols,rows), rnd=rngFrom(seed), W=cols, H=rows, cx=W*0.5, cy=H*0.5;
    switch(kind){
      case 'wheat': case 'sheaf': wheatSheaf(G,cx,cy,H*0.78,rnd); break;
      case 'stalk': wheatSprig(G,cx,cy,H*0.8,rnd); break;
      case 'poppy':
        stem(G,cx,H*0.98,cx,cy,cx-2,cy+H*0.3,P.olive,0.8); leaf(G,cx-2,cy+H*0.22,4,2,-0.6,P.sage,rnd);
        poppy(G,cx,cy-H*0.12,Math.round(W*0.34),rnd); break;
      case 'daisy':
        stem(G,cx,H*0.98,cx,cy,cx+2,cy+H*0.3,P.olive,0.8); leaf(G,cx+2,cy+H*0.22,4,2,0.6,P.sageLt,rnd);
        daisy(G,cx,cy-H*0.1,Math.round(W*0.32),12,P.creamLt,rnd); break;
      case 'seedpod': seedpod(G,cx,cy,H*0.8,rnd); break;
      case 'olive': oliveSprig(G,cx,cy,H*0.8,rnd); break;
      case 'berry':
        berrySprig(G,cx,cy,H*0.86,rnd); break;
      case 'sun': sun(G,cx,cy,Math.round(W*0.3),rnd); break;
      case 'arch': motifArch(G,W,H); break;
      case 'question': motifQuestion(G,W,H); break;
      case 'arrow': motifArrow(G,W,H); break;
      case 'lamp': motifLamp(G,W,H); break;
      case 'signpost': motifSignpost(G,W,H,rnd); break;
      case 'scene-begin': sceneBegin(G,W,H,rnd); break;
      case 'scene-doubt': sceneDoubt(G,W,H,rnd); break;
      case 'scene-move': sceneMove(G,W,H,rnd); break;
      case 'ui-agenda': techAgenda(G,W,H,rnd); break;
      case 'ui-chat': techChat(G,W,H,rnd); break;
      case 'ui-checkout': techCheckout(G,W,H,rnd); break;
      case 'launch': case 'ui-launch': case 'launch-day': techLaunch(G,W,H,rnd); break;
      case 'plan-week': samplerPlan(G,W,H,rnd); break;
      case 'doubts': samplerDoubts(G,W,H,rnd); break;
      case 'next-steps': samplerNext(G,W,H,rnd); break;
      case 'lavender': {
        var lbY=H*0.98, lmY=cy+H*0.2;
        stem(G, cx, lbY, cx,        lmY,      cx,        cy+H*0.46, P.olive,  0.85);
        stem(G, cx, lbY, cx-W*0.15, lmY,      cx-W*0.06, cy+H*0.5,  P.sage,   0.6);
        stem(G, cx, lbY, cx+W*0.15, lmY,      cx+W*0.06, cy+H*0.5,  P.sageLt, 0.6);
        lavenderSpike(G, cx,        cy+H*0.16, cx,        cy-H*0.40);
        lavenderSpike(G, cx-W*0.16, cy+H*0.22, cx-W*0.21, cy-H*0.16);
        lavenderSpike(G, cx+W*0.16, cy+H*0.22, cx+W*0.21, cy-H*0.16);
        leaf(G, cx-2, lmY+1, 3, 1.6, -0.5, P.sage,   rnd);
        leaf(G, cx+2, lmY+1, 3, 1.6,  0.5, P.sageLt, rnd);
        break;
      }
      case 'rosebud':
        stem(G,cx,H*0.98,cx,cy,cx+1,cy+H*0.3,P.olive,0.8); leaf(G,cx+2,cy+H*0.2,4,2,0.6,P.sage,rnd);
        rose(G,cx,cy-H*0.1,Math.round(W*0.28),{dk:P.roseDk,lt:P.roseLt},rnd); break;
      default: wheatSheaf(G,cx,cy,H*0.78,rnd);
    }
    return collect(G, cols, rows, rnd, /^(ui-|launch)/.test(kind));
  }

  /* horizontal GARLAND — undulating vine, flowers clustered toward both ends
     (so it wraps a header), thin vine through the middle, frayed ends only */
  function buildGarland(cols, rows, seed){
    var G=mkGrid(cols,rows), rnd=rngFrom(seed), W=cols, H=rows;

    /* one dense, layered corner bouquet that wraps a header corner and trails inward */
    function corner(side){
      var dir = side==='L' ? 1 : -1;
      var ox  = side==='L' ? W*0.028 : W*0.972;      // outer anchor column
      function X(f){ return ox + dir*f*W; }          // f = inward fraction of full width
      // all stems gather to ONE hand-tied point low in the frame, then fan upward
      var bx = X(0.055), by = H*0.8;                 // bouquet tie node
      stem(G, bx,by, X(0.07),H*0.22, X(0.02),H*0.5,  P.olive,   0.85);
      stem(G, bx,by, X(0.03),H*0.32, X(0.075),H*0.56, P.oliveDk, 0.72);
      stem(G, bx,by, X(0.11),H*0.4,  X(0.05),H*0.6,  P.olive,   0.66);
      // a couple of short leaves nod down past the tie so it doesn't end abruptly
      leaf(G, X(0.03), H*0.88, 2.2, 2.2*0.4, dir*-0.5, P.sageLt, rnd);
      leaf(G, X(0.085),H*0.9,  2.0, 2.0*0.4, dir*0.6,  P.sage,   rnd);
      // leaves — small, angled upward
      var lf=[[0.055,0.5,2.6,0.7],[0.02,0.42,2.4,-0.8],[0.09,0.38,2.4,0.95],
              [0.038,0.6,2.3,-0.45],[0.11,0.48,2.2,1.0]];
      for(var q=0;q<lf.length;q++){ var L=lf[q];
        leaf(G, X(L[0]), H*L[1], L[2], L[2]*0.42, dir*L[3], (q%2?P.sage:P.sageLt), rnd); }
      // upright sprigs rising just above the blooms (contained in frame)
      lavenderSpike(G, X(0.036),H*0.48, X(0.022),H*0.08);
      lavenderSpike(G, X(0.085),H*0.42, X(0.104),H*0.06);
      wheatSprig(G, X(0.128), H*0.4, H*0.36, rnd);
      // blooms — layered, overlapping, largest at the outer corner
      poppy(G, X(0.05),  H*0.44, Math.round(H*0.19), rnd);
      rose (G, X(0.016), H*0.56, Math.round(H*0.135), {dk:P.roseDk,lt:P.roseLt}, rnd);
      daisy(G, X(0.098), H*0.32, Math.round(H*0.16), 12, P.dusk, rnd);
      rose (G, X(0.113), H*0.5, Math.round(H*0.095), {dk:P.wheatDk,lt:P.gold}, rnd);
      // berry / seed filler tucked between blooms
      berries(G, X(0.078), H*0.6, 6, P.rust,   rnd);
      berries(G, X(0.006), H*0.4, 5, P.roseDk, rnd);
      // trailing buds tapering toward the centre
      grain(G, X(0.148), H*0.5, dir, P.wheat);
      pod(G,   X(0.164),H*0.44, 3, rnd);
      grain(G, X(0.18), H*0.48, dir, P.wheatDk);
      // trailing buds tapering toward the centre
      grain(G, X(0.152), H*0.58, dir, P.wheat);
      pod(G,   X(0.168),H*0.5, 3, rnd);
      grain(G, X(0.185), H*0.54, dir, P.wheatDk);
    }
    corner('L'); corner('R');

    /* keep each corner solid; fray only the trailing tips as they reach the centre */
    var cells=[];
    for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){ var tn=G[r][c]; if(!tn) continue;
      var inner = Math.min(c, cols-1-c)/cols;          // 0 at outer edge .. 0.5 centre
      var keep  = inner < 0.135 ? 1 : Math.max(0, 1-(inner-0.135)/0.05);
      if(keep<1 && rnd()>keep) continue;
      cells.push({c:c,r:r,tone:tn,spark: inner>0.12 && rnd()<0.14});
    }
    return { cells:cells, cols:cols, rows:rows };
  }

  /* text -> stitch chart; letterforms solid on the left, fray at the tail */
  function buildText(text, opts){
    opts=opts||{};
    var cell=opts.cell||6, fontPx=opts.fontPx||110;
    var font=opts.font||("400 "+fontPx+"px 'Olivera', Georgia, serif");
    var mc=document.createElement('canvas'), mx=mc.getContext('2d');
    mx.font=font; var w=Math.ceil(mx.measureText(text).width);
    var padX=Math.round(fontPx*0.14), padTop=Math.round(fontPx*0.24), padBot=Math.round(fontPx*0.34);
    var Wd=w+padX*2, Hd=fontPx+padTop+padBot;
    mc.width=Wd; mc.height=Hd; mx=mc.getContext('2d');
    mx.font=font; mx.fillStyle='#000'; mx.textBaseline='alphabetic';
    mx.fillText(text, padX, padTop+fontPx*0.80);
    var img=mx.getImageData(0,0,Wd,Hd).data;
    var cols=Math.floor(Wd/cell), rows=Math.floor(Hd/cell), cells=[], rnd=rngFrom(opts.seed||7);
    var pk=[P.yolk,P.wheat,P.rust,P.olive,P.poppy,P.dusk,P.rose];
    for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){
      var px=Math.min(Wd-1,Math.round(c*cell+cell/2)), py=Math.min(Hd-1,Math.round(r*cell+cell/2));
      if(img[(py*Wd+px)*4+3]<70) continue;
      var fx=c/cols;
      if(!opts.solid && fx>0.70){ var keep=1-(fx-0.70)/0.40; if(rnd()>keep) continue; }
      var tone;
      if(opts.solid){ tone = opts.tone || mix(P.umber,'#262119',0.72); }
      else if(fx<0.72 || rnd()<0.4){ tone = rnd()<0.07 ? P.yolk : mix(P.umber,'#262119',0.72); }
      else { tone = pk[(rnd()*pk.length)|0]; }
      cells.push({c:c, r:r, tone:tone, spark: fx>0.72});
    }
    return { cells:cells, cols:cols, rows:rows, cell:cell };
  }

  /* ---------- render ---------- */
  function drawStitch(ctx, x, y, s, tone, alpha, jit){
    var i=s*0.14, w=s*0.42;
    var base = jit ? (jit>0?lighten(tone,jit):darken(tone,-jit)) : tone;
    ctx.globalAlpha=alpha; ctx.lineCap='round';
    ctx.lineWidth=w; ctx.strokeStyle=darken(base,0.26);
    ctx.beginPath(); ctx.moveTo(x+i,y+i); ctx.lineTo(x+s-i,y+s-i); ctx.stroke();
    ctx.strokeStyle=base;
    ctx.beginPath(); ctx.moveTo(x+s-i,y+i); ctx.lineTo(x+i,y+s-i); ctx.stroke();
    ctx.lineWidth=w*0.30; ctx.strokeStyle=lighten(base,0.42);
    ctx.beginPath(); ctx.moveTo(x+s-i*1.3,y+i*1.5); ctx.lineTo(x+i*1.5,y+s-i*1.3); ctx.stroke();
    ctx.globalAlpha=1;
  }

  function mount(canvas, opts){
    opts=opts||{};
    var cols=opts.cols||40, rows=opts.rows||40, cell=opts.cell||6, seed=opts.seed||1;
    var animate = opts.animate!==false && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    var built = opts.text ? buildText(opts.text, opts)
              : opts.kind==='garland' ? buildGarland(cols, rows, seed)
              : (opts.kind && opts.kind!=='spray') ? buildMotif(opts.kind, cols, rows, seed)
              : buildSpray(cols, rows, seed);
    var cells=built.cells; cols=built.cols; rows=built.rows; if(built.cell) cell=built.cell;

    if(opts.side==='right'){ for(var m=0;m<cells.length;m++){ cells[m].c=cols-1-cells[m].c; } }

    var rnd=rngFrom(seed*7+3);
    for(var q=0;q<cells.length;q++){
      var cc=cells[q];
      cc.jit=(rnd()-0.5)*0.12;
      cc.order = opts.kind==='garland' ? (cc.c/cols)*0.9+rnd()*0.1
               : opts.text ? (cc.c/cols)*0.85+rnd()*0.15
               : (rows-cc.r)/rows*0.8+rnd()*0.2;
    }
    cells.sort(function(a,b){return a.order-b.order;});
    var total=cells.length;
    for(var o=0;o<total;o++){ cells[o].birth=o/total; }

    var dpr=Math.min(2, window.devicePixelRatio||1), Wc=cols*cell, Hc=rows*cell;
    canvas.style.width=Wc+'px'; canvas.style.height=Hc+'px';
    canvas.width=Math.round(Wc*dpr); canvas.height=Math.round(Hc*dpr);
    var ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);

    function paint(alphaFn){
      ctx.clearRect(0,0,Wc,Hc);
      for(var k=0;k<total;k++){ var c=cells[k], a=alphaFn?alphaFn(c):1; if(a>0) drawStitch(ctx,c.c*cell,c.r*cell,cell,c.tone,a,c.jit); }
    }

    var buf=document.createElement('canvas'); buf.width=canvas.width; buf.height=canvas.height;
    var bctx=buf.getContext('2d'); bctx.scale(dpr,dpr);
    function paintBuffer(){ bctx.clearRect(0,0,Wc,Hc); for(var k=0;k<total;k++){ var c=cells[k]; drawStitch(bctx,c.c*cell,c.r*cell,cell,c.tone,1,c.jit); } }

    var sparks=cells.filter(function(c){return c.spark;});

    if(!animate){ paint(function(){return 1;}); return { redraw:function(){paint(function(){return 1;});} }; }

    var DUR=1400, t0=null, raf, tw, finished=false;
    function ease(x){ return 1-Math.pow(1-x,3); }
    function finish(){ if(finished) return; finished=true; paintBuffer(); ctx.clearRect(0,0,Wc,Hc); ctx.drawImage(buf,0,0,Wc,Hc); if(opts.twinkle!==false) twinkle(); }
    function frame(ts){
      if(t0===null) t0=ts;
      var p=ease(Math.min(1,(ts-t0)/DUR));
      paint(function(c){ return Math.max(0,Math.min(1,(p-c.birth)/0.05)); });
      if(p<1) raf=requestAnimationFrame(frame); else finish();
    }
    // safety net: if rAF is throttled/paused (background or offscreen tab), still land the final paint
    var fallback=setTimeout(finish, DUR+600);
    function twinkle(){
      if(!sparks.length){ return; }
      var active=[];
      function tick(){
        if(finished===false) return;
        if(Math.random()<0.13 && active.length<5) active.push({cell:sparks[(Math.random()*sparks.length)|0], t:0});
        ctx.clearRect(0,0,Wc,Hc); ctx.drawImage(buf,0,0,Wc,Hc);
        for(var a=active.length-1;a>=0;a--){
          var it=active[a]; it.t+=0.03;
          if(it.t>=1){ active.splice(a,1); continue; }
          var g=Math.sin(Math.min(Math.PI,it.t*Math.PI)), c=it.cell;
          drawStitch(ctx,c.c*cell,c.r*cell,cell,mix(c.tone,P.yolk,0.55*g),1,0.15*g);
        }
        tw=requestAnimationFrame(tick);
      }
      tw=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(frame);
    return { stop:function(){ cancelAnimationFrame(raf); cancelAnimationFrame(tw); } };
  }

  /* animated crystal SHIMMER — soft drifting iridescent glow + twinkling glints on a
     canvas (blended 'lighter' over eggshell). Reads as living crystal, not flat vector. */
  function mountShimmer(canvas, opts){
    opts=opts||{};
    var dpr=Math.min(2, window.devicePixelRatio||1);
    var ctx=canvas.getContext('2d');
    function size(){ var r=canvas.getBoundingClientRect(); canvas.width=Math.max(1,Math.round(r.width*dpr)); canvas.height=Math.max(1,Math.round(r.height*dpr)); }
    size();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var tints=[[255,249,232],[214,236,232],[228,220,244],[246,236,212],[255,244,224]];
    var blobs=[]; for(var i=0;i<6;i++){ blobs.push({x:Math.random(),y:Math.random(),r:0.26+Math.random()*0.30,tint:tints[i%tints.length],ph:Math.random()*6.28,sp:0.05+Math.random()*0.12,amp:0.05+Math.random()*0.06}); }
    var sparks=[]; for(var s=0;s<40;s++){ sparks.push({x:Math.random(),y:Math.random(),ph:Math.random()*6.28,sp:0.5+Math.random()*1.6,sz:0.5+Math.random()*1.1}); }
    var intensity = opts.intensity||1;
    function draw(t){
      var W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H);
      ctx.globalCompositeOperation='lighter';
      blobs.forEach(function(b){
        var x=(b.x+b.amp*Math.sin(t*b.sp+b.ph))*W, y=(b.y+b.amp*Math.cos(t*b.sp*0.8+b.ph))*H, rr=b.r*Math.max(W,H);
        var g=ctx.createRadialGradient(x,y,0,x,y,rr);
        var a=(0.13+0.05*Math.sin(t*0.4+b.ph))*intensity;
        g.addColorStop(0,'rgba('+b.tint[0]+','+b.tint[1]+','+b.tint[2]+','+a.toFixed(3)+')');
        g.addColorStop(1,'rgba('+b.tint[0]+','+b.tint[1]+','+b.tint[2]+',0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,rr,0,6.2832); ctx.fill();
      });
      sparks.forEach(function(p){
        var tw=Math.sin(t*p.sp+p.ph); if(tw<0.4) return; tw=(tw-0.4)/0.6;
        var x=p.x*W,y=p.y*H,s=p.sz*dpr*6*tw;
        var g=ctx.createRadialGradient(x,y,0,x,y,s*2.4); g.addColorStop(0,'rgba(255,255,255,'+(0.85*tw*intensity).toFixed(3)+')'); g.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,s*2.4,0,6.2832); ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,'+(0.8*tw*intensity).toFixed(3)+')'; ctx.lineWidth=dpr*0.7;
        ctx.beginPath(); ctx.moveTo(x,y-s*2.6);ctx.lineTo(x,y+s*2.6);ctx.moveTo(x-s*2.6,y);ctx.lineTo(x+s*2.6,y); ctx.stroke();
      });
      ctx.globalCompositeOperation='source-over';
    }
    if(reduce){ draw(2); return { stop:function(){} }; }
    draw(0.6);   // paint a first frame immediately (visible even before rAF / in an unfocused tab)
    var raf, on=true; function loop(ts){ if(!on) return; draw(ts/1000); raf=requestAnimationFrame(loop); } raf=requestAnimationFrame(loop);
    var ro; try{ ro=new ResizeObserver(function(){ size(); }); ro.observe(canvas); }catch(e){}
    return { stop:function(){ on=false; cancelAnimationFrame(raf); if(ro) ro.disconnect(); } };
  }

  /* faceted CRYSTAL — visible shattered-glass facets on egg-white, iridescent (cool
     ice/teal/lavender) glints, a travelling specular sweep + twinkling sparkles.
     Reads like real crystal catching light, not a flat gradient. */
  function mountCrystal(canvas, opts){
    opts=opts||{};
    var dpr=Math.min(2, window.devicePixelRatio||1);
    var ctx=canvas.getContext('2d');
    var W,H,tris=[],glow=[];
    var TINTS=[[239,224,221],[239,233,221],[227,232,222],[229,226,235],[235,225,231],[239,227,226],[225,230,236],[244,242,238],[232,234,235],[241,239,235],[227,231,227]];
    function build(){
      var r=canvas.getBoundingClientRect();
      canvas.width=Math.max(1,Math.round(r.width*dpr)); canvas.height=Math.max(1,Math.round(r.height*dpr));
      W=canvas.width; H=canvas.height;
      var rnd=rngFrom(19);
      var TARGET=118*dpr;
      var cols=Math.max(7,Math.round(W/TARGET)), rows=Math.max(5,Math.round(H/TARGET));
      var cw=W/cols, ch=H/rows, P=[];
      for(var rr=0;rr<=rows;rr++){ P[rr]=[]; for(var c=0;c<=cols;c++){ var x=c*cw,y=rr*ch; if(c>0&&c<cols)x+=(rnd()-0.5)*cw*0.62; if(rr>0&&rr<rows)y+=(rnd()-0.5)*ch*0.62; P[rr][c]={x:x,y:y}; } }
      tris=[];
      for(var rr2=0;rr2<rows;rr2++)for(var c2=0;c2<cols;c2++){
        var tl=P[rr2][c2],tr=P[rr2][c2+1],br=P[rr2+1][c2+1],bl=P[rr2+1][c2];
        var set = rnd()<0.5 ? [[tl,tr,br],[tl,br,bl]] : [[tl,tr,bl],[tr,br,bl]];
        set.forEach(function(t){
          var cx=(t[0].x+t[1].x+t[2].x)/3, cy=(t[0].y+t[1].y+t[2].y)/3, ang=rnd()*6.2832;
          tris.push({p:t,cx:cx,cy:cy,nx:Math.cos(ang),ny:Math.sin(ang),base:-14+rnd()*28,tint:TINTS[(rnd()*TINTS.length)|0],ph:rnd()*6.2832,sp:0.5+rnd()*1.3});
        });
      }
    }
    build();
    var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function facetFill(f, spec){
      var v=f.base*0.55 + spec*14;
      var R=243+v,G=241+v,B=236+v;                          // neutral soft white base (de-yellowed — non-tinted facets read clean, not beige)
      var it=Math.min(0.26, 0.1+spec*0.24);                  // muted, desaturated brand tint — subtle color, no candy
      R=R+(f.tint[0]-R)*it; G=G+(f.tint[1]-G)*it; B=B+(f.tint[2]-B)*it;
      var w=spec*spec*0.5; R+=(255-R)*w; G+=(253-G)*w; B+=(249-B)*w;   // bright glass-edge highlight → white
      return 'rgb('+Math.round(clamp(R,206,255))+','+Math.round(clamp(G,210,254))+','+Math.round(clamp(B,200,250))+')';
    }
    function draw(t){
      ctx.clearRect(0,0,W,H);
      var lx=Math.cos(t*0.55), ly=Math.sin(t*0.46);
      var band=(t*0.27)%1.6-0.3;
      for(var i=0;i<tris.length;i++){
        var f=tris[i];
        var dot=f.nx*lx+f.ny*ly;
        var spec=(Math.pow(Math.max(0,dot),2.5) + 0.7*Math.pow(Math.max(0,-dot),2.5))*0.33;   // lit from both sides so right-facing facets glint too
        var dpos=((f.cx/W)+(f.cy/H))/2, d=Math.abs(dpos-band); 
        var sweep=Math.max(0,1-d/0.26)*0.35;
        var tw=(0.5+0.5*Math.sin(t*f.sp+f.ph))*0.17;
        var s=Math.min(1, spec+sweep+tw);
        ctx.beginPath(); ctx.moveTo(f.p[0].x,f.p[0].y); ctx.lineTo(f.p[1].x,f.p[1].y); ctx.lineTo(f.p[2].x,f.p[2].y); ctx.closePath();
        var g=ctx.createLinearGradient(f.p[0].x,f.p[0].y,f.p[2].x,f.p[2].y);   // subtle per-facet gradient — refined glass, not flat
        g.addColorStop(0, facetFill(f, Math.min(1,s+0.13)));
        g.addColorStop(1, facetFill(f, Math.max(0,s-0.1)));
        ctx.fillStyle=g; ctx.fill();
        // facet seams — faint cool lines that define the shatter, brighter as the glimmer passes
        // seams reveal part-by-part: the traveling light band "draws" the shatter as it passes; at rest only a warm whisper remains
        var seam=Math.max(0, sweep-0.02);
        if(seam>0.05){ ctx.strokeStyle='rgba('+Math.round(f.tint[0]*0.62)+','+Math.round(f.tint[1]*0.62)+','+Math.round(f.tint[2]*0.68)+','+(0.06+seam*0.34).toFixed(2)+')'; ctx.lineWidth=dpr*0.6; ctx.stroke(); }
      }
      // inner glow — soft light pooling out from within the crystal (blended 'lighter')
      if(!glow.length){ for(var b0=0;b0<6;b0++) glow.push({x:Math.random(),y:Math.random(),r:0.2+Math.random()*0.26,ph:Math.random()*6.2832,sp:0.12+Math.random()*0.22}); }
      ctx.globalCompositeOperation='lighter';
      for(var b=0;b<glow.length;b++){ var gb=glow[b];
        var gx=(gb.x+0.06*Math.sin(t*gb.sp+gb.ph))*W, gy=(gb.y+0.05*Math.cos(t*gb.sp*0.9+gb.ph))*H, gr=gb.r*Math.max(W,H);
        var ga=(0.09+0.06*Math.sin(t*0.7+gb.ph));
        var rgg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr); rgg.addColorStop(0,'rgba(255,253,247,'+ga.toFixed(3)+')'); rgg.addColorStop(1,'rgba(255,253,247,0)');
        ctx.fillStyle=rgg; ctx.beginPath(); ctx.arc(gx,gy,gr,0,6.2832); ctx.fill();
      }
      ctx.globalCompositeOperation='source-over';
      // no popping glints — the shimmer is the specular band gliding across the facets + gentle per-facet modulation
    }
    if(reduce){ draw(1.4); return {stop:function(){}}; }
    draw(0.5);
    var raf,on=true; function loop(ts){ if(!on) return; draw(ts/1000*1.5); raf=requestAnimationFrame(loop); } raf=requestAnimationFrame(loop);
    var ro; try{ ro=new ResizeObserver(function(){ build(); }); ro.observe(canvas); }catch(e){}
    return { stop:function(){ on=false; cancelAnimationFrame(raf); if(ro) ro.disconnect(); } };
  }

  window.AHStitch = { mount:mount, shimmer:mountShimmer, crystal:mountCrystal, buildSpray:buildSpray, buildMotif:buildMotif, buildGarland:buildGarland, buildText:buildText, palette:P };
})();
