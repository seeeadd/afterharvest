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
  var _cc={};
  function hx(h){ h=h.replace('#',''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
  function toHex(r,g,b){ var c=function(n){return ('0'+Math.max(0,Math.min(255,Math.round(n))).toString(16)).slice(-2);}; return '#'+c(r)+c(g)+c(b); }
  function lighten(h,a){ var k='l'+h+a; var v=_cc[k]; if(v!==undefined) return v;
    var p=hx(h); return (_cc[k]=toHex(p[0]+(255-p[0])*a, p[1]+(255-p[1])*a, p[2]+(255-p[2])*a)); }
  /* These three are pure, and drawStitch calls them three times for EVERY
     stitch - each call parses a hex string, does the arithmetic, and builds a
     new string. Across a page of ~100k stitches that is ~300k parses. Cached,
     they become map lookups. Output is bit-identical. */
  function darken(h,a){ var k='d'+h+a; var v=_cc[k]; if(v!==undefined) return v;
    var p=hx(h); return (_cc[k]=toHex(p[0]*(1-a), p[1]*(1-a), p[2]*(1-a))); }
  function mix(h1,h2,t){ var k='m'+h1+h2+t; var v=_cc[k]; if(v!==undefined) return v;
    var a=hx(h1),b=hx(h2); return (_cc[k]=toHex(a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t)); }
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
    slate:'#7E8894', slateDk:'#5B6570', slateLt:'#AEB6BF', steel:'#C9CDD2',
    stripe:'#635BFF', stripeDk:'#4A43CC', stripeLt:'#918CFF', stripeXl:'#C6C3FF',
    ink:'#161310', inkDk:'#0B0906', inkLt:'#2C2820',
    /* ---- rebuilt 2026-08-28 ---- */
    /* birds */
    dove:'#9A948C',   doveDk:'#6E6A63',  doveLt:'#BEB8AE',
    jay:'#6B7C8C',    jayDk:'#4C5A67',   jayLt:'#96A4B1',
    robin:'#A5705A',  robinDk:'#7A4E3C',
    owlB:'#7A6650',   owlDk:'#57472F',
    crow:'#3A3A3C',   crowDk:'#232326',  crowLt:'#5C5C60', crowSheen:'#7C8290',
    barn:'#C9B48E',   barnDk:'#96805C',  barnFace:'#F2ECE0',
    breast:'#B98A5E', breastDk:'#8A6440',
    slateF:'#7E858E', slateFDk:'#5A616A', slateFLt:'#A6ACB4',
    awn:'#C6B27A',    awnDk:'#9C8A54',
    /* wood + foliage */
    bark:'#6B5644',   barkDk:'#463628',  barkLt:'#8E765E',
    trunkA:'#5E4936', trunkB:'#7A6048',  trunkC:'#3B2C1F',
    leafA:'#7C8A5E',  leafB:'#93A071',   leafC:'#5F6E46',  leafD:'#A9B489',
    /* ACTUAL autumn — scarlet, orange, gold, crimson. Browns are supporting only;
       an all-brown set reads as late winter, not October. */
    /* money. Held well back from a saturated dollar-green: on a cream ground a
       true banknote green goes fluorescent and drags the whole page toward
       novelty. This is a grey-green that sits with the autumn leaves. */
    notePaper:'#C7D4BB', noteField:'#9DB690', noteInk:'#3B5440',
    noteDeep:'#233527', noteHi:'#E6ECDD', noteSeal:'#8A5A3C',
    coin:'#C0A03A', coinDk:'#876920', coinLt:'#DEC578', coinRim:'#6B5418',
    cardA:'#26231F', cardB:'#38342F', cardChip:'#C0A03A', cardBand:'#4A453E',
    blA:'#E67E22', blB:'#D9503D', blC:'#EFB33F', blD:'#F2D072',
    blE:'#B4483B', blF:'#F08C4A', blG:'#C86B34', blH:'#F7E08F',
    blI:'#D65C41', blJ:'#EC9635', blK:'#BE5A2E', blL:'#F7BB60'
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
  /* A petal is the thing that reads decorative. These are the parts of a plant that
     do not have any: needles, seed heads, husks, bare wood. Same stitch, same field,
     none of the nursery. */
  function pineSprig(G, cx,cy, len, ang, rnd){
    var dx=Math.cos(ang), dy=Math.sin(ang);
    for(var i=0;i<len;i++){
      var x=cx+dx*i, y=cy+dy*i;
      put(G, x, y, i<len*0.4? P.oliveDk : P.olive);
      if(i%2) continue;
      var nl = 2.6 + (1-i/len)*2.2;
      for(var s2=-1;s2<=1;s2+=2){
        var na = ang + s2*(0.95 + rnd()*0.18);
        for(var k=1;k<=nl;k++)
          put(G, x+Math.cos(na)*k, y+Math.sin(na)*k, (k>nl-1.4)? P.sageLt : (s2<0? P.sage : P.olive));
      }
    }
  }
  /* teasel: the dry architectural seed head. All spike, no bloom. */
  function teasel(G, cx,cy, h, rnd){
    var w=h*0.42;
    for(var y=-h;y<=h;y++){
      var t=(y+h)/(2*h), half=w*Math.sqrt(Math.max(0,1-(y/h)*(y/h)))*(0.75+t*0.35);
      for(var x=-half;x<=half;x++){
        var d=Math.abs(x)/Math.max(0.6,half);
        put(G, cx+x, cy+y, d>0.72? P.umberDk : (x+y<-half*0.3? P.wheat : P.umber));
      }
    }
    for(var i=0;i<26;i++){
      var a=-Math.PI/2 + (rnd()-0.5)*3.0, L=w*(1.15+rnd()*0.5);
      put(G, cx+Math.cos(a)*L, cy+Math.sin(a)*L*1.5, i%3? P.wheatDk : P.sand);
    }
    tV(G, cx, cy+h, cy+h*1.9, P.oliveDk);
  }
  /* a bare forked twig */
  function twig(G, cx,cy, len, ang, rnd){
    var dx=Math.cos(ang), dy=Math.sin(ang);
    for(var i=0;i<len;i++) put(G, cx+dx*i, cy+dy*i, i%4? P.umber : P.umberDk);
    for(var f=0;f<2;f++){
      var at=len*(0.42+f*0.30), fa=ang + (f?1:-1)*(0.55+rnd()*0.2), fl=len*(0.38-f*0.10);
      var bx=cx+dx*at, by=cy+dy*at;
      for(var k=0;k<fl;k++) put(G, bx+Math.cos(fa)*k, by+Math.sin(fa)*k, P.umber);
    }
  }
  /* a grass head, drooping with seed */
  function grassHead(G, cx,cy, len, ang, tone, rnd){
    var dx=Math.cos(ang), dy=Math.sin(ang);
    for(var i=0;i<len;i++){
      var t=i/len, droop=t*t*2.2;
      var x=cx+dx*i, y=cy+dy*i+droop;
      put(G, x, y, tone);
      if(i>len*0.35 && i%2===0){
        put(G, x+0.9, y-0.6, P.sand);
        put(G, x-0.9, y+0.4, (rnd()<0.5? P.wheatDk : tone));
      }
    }
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
      /* dense: false = frayed border (the sampler look), true = mostly solid,
         'solid' = no fray at all. Anything drawn as a FIGURE rather than a motif
         has to be solid: the fray is keyed to the tile border, so a bird whose
         tail reaches the edge of its tile gets that tail eaten. */
      var keep = dense==='solid' ? 1 : (dense ? (0.955+0.045*edge) : (0.5+0.5*edge)), spark=false;
      if(rnd()>keep){ if(!dense && rnd()<0.1) spark=true; else continue; }
      if(dense==='solid'){ if(edge>0.30 && rnd()<0.010) spark=true; }
      else if(edge<0.26 && rnd()<(dense?0.05:0.5)) spark=true;
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
    teasel(G, W*0.34,H*0.30, Math.round(W*0.11), rnd);
    pineSprig(G, W*0.68,H*0.66, Math.round(H*0.34), -1.25, rnd);
    oliveSprig(G, W*0.62,H*0.72, H*0.4, rnd);
    leaf(G, W*0.40,H*0.6, 6,3, -0.4, P.sage, rnd);
    twig(G, W*0.22,H*0.70, Math.round(H*0.30), -1.35, rnd);   // bare wood, no bloom
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
  /* ---------- stroked primitives ----------
     Deliberately named sbar/sarc/sspike rather than bar/arc/spike: a later
     `function bar(G,x0,x1,y,tone)` in this file hoists over any earlier one, and
     that collision silently fed coordinates in as colour values. */
  function sbar(G, x0, y0, x1, y1, w, tone, tone2){
    var dx=x1-x0, dy=y1-y0, n=Math.max(Math.abs(dx),Math.abs(dy)), h=(w||1)/2;
    if(n<1) n=1;
    for(var i=0;i<=n;i++){
      var t=i/n, cx=x0+dx*t, cy=y0+dy*t;
      var t2=(tone2 && i>n*0.55)? tone2 : tone;
      for(var oy=-h;oy<=h;oy+=0.5) for(var ox=-h;ox<=h;ox+=0.5){
        if(ox*ox+oy*oy > h*h+0.30) continue;
        put(G, cx+ox, cy+oy, t2);
      }
    }
  }
  function sarc(G, cx, cy, r, a0, a1, w, tone, tone2){
    var steps=Math.max(6, Math.round(Math.abs(a1-a0)*r*1.9)), h=(w||1)/2;
    for(var i=0;i<=steps;i++){
      var a=a0+(a1-a0)*(i/steps), x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r;
      var t2=(tone2 && i>steps*0.55)? tone2 : tone;
      for(var oy=-h;oy<=h;oy+=0.5) for(var ox=-h;ox<=h;ox+=0.5){
        if(ox*ox+oy*oy > h*h+0.30) continue;
        put(G, x+ox, y+oy, t2);
      }
    }
  }
  function sspike(G, x0, y0, x1, y1, w0, w1, tone){
    var dx=x1-x0, dy=y1-y0, n=Math.max(Math.abs(dx),Math.abs(dy)); if(n<1) n=1;
    for(var i=0;i<=n;i++){
      var t=i/n, cx=x0+dx*t, cy=y0+dy*t, h=(w0+(w1-w0)*t)/2;
      for(var oy=-h;oy<=h;oy+=0.5) for(var ox=-h;ox<=h;ox+=0.5){
        if(ox*ox+oy*oy > h*h+0.30) continue;
        put(G, cx+ox, cy+oy, tone);
      }
    }
  }
  /* tapered wood that WALKS each segment. Stamping only at polyline vertices
     renders a 3-point trunk as two thin bars with nothing between them. */
  function swood(G, pts, w0, w1, lit, mid, dark){
    var segs=[], total=0, i;
    for(i=0;i<pts.length-1;i++){
      var L=Math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1])||0.001;
      segs.push(L); total+=L;
    }
    var acc=0;
    for(i=0;i<pts.length-1;i++){
      var x0=pts[i][0], y0=pts[i][1], dx=pts[i+1][0]-x0, dy=pts[i+1][1]-y0;
      var L2=segs[i], nx=-dy/L2, ny=dx/L2, steps=Math.max(2, Math.ceil(L2*2));
      for(var j=0;j<=steps;j++){
        var f=j/steps, x=x0+dx*f, y=y0+dy*f;
        var t=(acc+L2*f)/total, wd=w0+(w1-w0)*t;
        for(var o=-wd/2;o<=wd/2;o+=0.5)
          put(G, x+nx*o, y+ny*o, o<-wd*0.2? lit : (o>wd*0.25? dark : mid));
      }
      acc+=L2;
    }
  }

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
  /* a band running bottom-left to top-right: constant x+y, so it never fragments */
  function tDiag(G,x0,y0,x1,y1,k,wide,tone){
    for(var y=y0;y<=y1;y++) for(var x=x0;x<=x1;x++){
      var d=(x+y)-k; if(d>=0 && d<wide) put(G,x,y,tone);
    }
  }

  /* PAYMENT — a card seen face on, with the band running across it, a chip, the number
     and the charge cleared. Our own thread, not anyone else's mark. */
  function techPay(G,W,H,rnd){
    var x0=2, y0=Math.round(H*0.14), x1=W-3, y1=H-Math.round(H*0.16);

    /* the card in Stripe indigo, top edge in the light, bottom in shadow */
    tRect(G,x0+1,y0+1,x1-1,y1-1,P.stripe,null,1);
    tH(G,x0+2,x1-2,y0+1,P.stripeLt);
    tH(G,x0+2,x1-2,y0+2,P.stripeLt);
    tH(G,x0+2,x1-2,y1-2,P.stripeDk);
    tH(G,x0+2,x1-2,y1-1,P.stripeDk);
    tBorder(G,x0,y0,x1,y1,P.stripeDk);
    /* corners softened rather than punched out: a hole shows the page through as a speck */
    [[x0,y0],[x1,y0],[x0,y1],[x1,y1]].forEach(function(c){ put(G,c[0],c[1],P.stripeDk); });

    /* the band: three diagonals climbing left to right, the middle one brightest */
    var bx0=x0+1, bx1=x1-1, by0=y0+1, by1=y1-7;
    var kMid=Math.round((bx0+bx1+by0+by1)/2) + 4;
    tDiag(G,bx0,by0,bx1,by1,kMid-9,2,P.creamLt);
    tDiag(G,bx0,by0,bx1,by1,kMid-3,4,P.creamLt);
    tDiag(G,bx0,by0,bx1,by1,kMid+5,2,P.creamLt);

    /* the chip */
    var cx0=x0+3, cy0=y0+3, cx1=cx0+6, cy1=cy0+5;
    tRect(G,cx0,cy0,cx1,cy1,P.gold,null,1);
    tBorder(G,cx0,cy0,cx1,cy1,P.wheatDk);
    tH(G,cx0+1,cx1-1,cy0+2,P.wheatDk);
    tV(G,cx0+3,cy0+1,cy1-1,P.wheatDk);

    /* the number: four groups, the way a card prints it */
    var ny=y1-4;
    for(var g=0;g<4;g++){
      var gx=x0+3+g*6;
      for(var d=0;d<3;d++){
        var dx=gx+d*2;
        if(dx>=x1-2) break;
        put(G,dx,ny,P.creamLt);
        put(G,dx,ny-1,P.creamLt);
      }
    }

    /* cleared: a dark disc with a cream tick, riding over the band */
    var tx=x1-6, ty=y0+Math.round((y1-y0)*0.40);
    tDisc(G,tx,ty,5,P.oliveDk);
    tDisc(G,tx,ty,4,P.sage);
    /* two strokes, two cells thick, so it survives at marker size */
    [[-2,0],[-2,-1],[-1,1],[-1,0],[0,2],[0,1]].forEach(function(o){ put(G,tx+o[0],ty+o[1],P.creamLt); });
    [[1,0],[1,1],[2,-1],[2,0],[3,-2],[3,-1]].forEach(function(o){ put(G,tx+o[0],ty+o[1],P.creamLt); });
  }

  /* STRIPE — the payment badge: an indigo tile with the diagonal bars across it, in
     our thread. Reads at marker size, which the wordmark never would. */
  function techStripe(G,W,H,rnd){
    var m=Math.min(W,H), x0=Math.round((W-m)/2)+1, y0=Math.round((H-m)/2)+1;
    var x1=x0+m-3, y1=y0+m-3;
    tRect(G,x0,y0,x1,y1,P.stripe,null,1);
    tH(G,x0+1,x1-1,y0,P.stripeLt);
    tH(G,x0+1,x1-1,y0+1,P.stripeLt);
    tH(G,x0+1,x1-1,y1,P.stripeDk);
    tBorder(G,x0,y0,x1,y1,P.stripeDk);
    [[x0,y0],[x1,y0],[x0,y1],[x1,y1]].forEach(function(c){ put(G,c[0],c[1],P.stripeDk); });

    /* three bars climbing left to right, the middle one brightest */
    var p2=3, bx0=x0+p2, bx1=x1-p2, by0=y0+p2, by1=y1-p2;
    var kc=Math.round((bx0+bx1+by0+by1)/2);
    tDiag(G,bx0,by0,bx1,by1,kc-8,2,P.creamLt);
    tDiag(G,bx0,by0,bx1,by1,kc-2,4,P.creamLt);
    tDiag(G,bx0,by0,bx1,by1,kc+6,2,P.creamLt);
  }

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


  /* ---------- chapter-seam blooms ----------------------------------------------
     A distinct species per chapter knot. Deliberately NOT the hero set — the seam
     should read as its own row of planting, not a reprise of the header. -------- */
  function petalRing(G, cx,cy, R, petals, tone, rnd, notch, twist, thresh){
    for(var r=-R-1;r<=R+1;r++)for(var c=-R-1;c<=R+1;c++){
      var d=Math.hypot(c,r)/R; if(d>1.08) continue;
      var ang=Math.atan2(r,c)+(twist||0);
      var lobe=Math.abs(Math.cos(ang*petals/2));
      var edge=notch? lobe*(0.93+0.11*Math.cos(ang*petals)) : lobe;
      if(d<=0.30) continue;
      if(edge<(thresh||0.34)) continue;
      if(d>0.92 && rnd()<0.42) continue;
      put(G,cx+c,cy+r, shade(mix(tone,P.creamSh,(d-0.30)/0.78*0.55),c,r,d));
    }
  }
  function core(G,cx,cy,R,tone,edgeTone){
    for(var r=-R;r<=R;r++)for(var c=-R;c<=R;c++){
      var d=Math.hypot(c,r)/Math.max(0.6,R); if(d>1.05) continue;
      put(G,cx+c,cy+r, d<0.5?tone:mix(tone,edgeTone,0.6));
    }
  }
  function cupBloom(G,cx,cy,R,tone,lobes){
    for(var r=-R;r<=R*1.25;r++)for(var c=-R;c<=R;c++){
      var nx=c/R, ny=r/(R*1.25);
      if(nx*nx+ny*ny>1.02) continue;
      if(ny<-0.15){
        var w=Math.abs(Math.cos(Math.atan2(r,c)*lobes/2));
        if(w<0.30) continue;
      }
      put(G,cx+c,cy+r, shade(mix(tone,P.creamSh,(ny+1)/2*0.42),c,r,0.45));
    }
  }
  function umbel(G,cx,cy,W,tone,rnd){
    for(var i=0;i<26;i++){
      var a=rnd()*Math.PI*2, rr=Math.sqrt(rnd())*W;
      var x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr*0.42;
      put(G,x,y, i%3? tone : lighten(tone,0.24));
      if(rnd()<0.5) put(G,x, y-0.9, lighten(tone,0.3));
    }
  }
  /* CUT STONES.
     The chapter markers, in the same language as the CTA pill and the booking dock:
     a faceted silhouette with wedges of light across it, stitched. Geometry rather
     than botany, so nothing about them reads decorative. One shape per chapter, cut
     differently each time, all from the same slate/wheat/cream thread. */
  var CUT_TONES = {
    /* lit face, two mids, shadowed face. No rose or plum: those are the threads that
       were reading decorative. Slate is the one cool note on an otherwise warm page. */
    steel: [P.creamLt, P.steel,  P.slateLt, P.slate,   P.slateDk],
    wheat: [P.creamLt, P.sand,   P.gold,    P.wheatDk, P.olive],
    ink:   [P.sand,    P.umber,  P.slate,   P.umberDk, P.ink],
    olive: [P.creamLt, P.sageLt, P.sage,    P.olive,   P.oliveDk],
    mixed: [P.creamLt, P.steel,  P.gold,    P.slate,   P.umberDk]
  };

  /* fill the polygon, then cut it into wedges from an off-centre crown so each face
     takes a different thread. The scanline test is what keeps the edges clean. */
  function cutStone(G, pts, tones, crown, seams){
    var minY=1e9, maxY=-1e9, minX=1e9, maxX=-1e9;
    for(var i=0;i<pts.length;i++){
      if(pts[i][1]<minY) minY=pts[i][1]; if(pts[i][1]>maxY) maxY=pts[i][1];
      if(pts[i][0]<minX) minX=pts[i][0]; if(pts[i][0]>maxX) maxX=pts[i][0];
    }
    function inside(x,y){
      var c=false;
      for(var i=0,j=pts.length-1;i<pts.length;j=i++){
        var xi=pts[i][0],yi=pts[i][1],xj=pts[j][0],yj=pts[j][1];
        if(((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi)) c=!c;
      }
      return c;
    }
    for(var y=Math.floor(minY); y<=Math.ceil(maxY); y++){
      for(var x=Math.floor(minX); x<=Math.ceil(maxX); x++){
        if(!inside(x+0.5,y+0.5)) continue;
        var a=Math.atan2(y-crown[1], x-crown[0]);           // which wedge this cell is in
        var w=Math.floor(((a+Math.PI)/(Math.PI*2))*seams) % tones.length;
        put(G, x, y, tones[w]);
      }
    }
    /* the girdle: the outline in the shadow thread, so the silhouette holds at any
       size without the heavy black outline that made these look rough */
    var edge=tones[tones.length-2];
    for(var e=0;e<pts.length;e++){
      var p0=pts[e], p1=pts[(e+1)%pts.length];
      var n=Math.max(2, Math.round(Math.hypot(p1[0]-p0[0], p1[1]-p0[1])*1.6));
      for(var k=0;k<=n;k++) put(G, p0[0]+(p1[0]-p0[0])*k/n, p0[1]+(p1[1]-p0[1])*k/n, edge);
    }
    /* one bright seam running off the crown: the light catching a cut */
    var ga=-1.05, gl=Math.max(2,(maxX-minX)*0.42);
    for(var g=0;g<gl;g++){
      var gx=crown[0]+Math.cos(ga)*g, gy=crown[1]+Math.sin(ga)*g;
      if(inside(gx+0.5,gy+0.5)) put(G, gx, gy, P.creamLt);
      var hx=crown[0]+Math.cos(ga+2.2)*g*0.8, hy=crown[1]+Math.sin(ga+2.2)*g*0.8;
      if(inside(hx+0.5,hy+0.5)) put(G, hx, hy, tones[0]);
    }
  }

  /* a stone of n sides, radius R, jittered so no two chapters are cut alike */
  function stonePts(cx, cy, R, n, squash, rot, jag, rnd){
    var pts=[];
    for(var i=0;i<n;i++){
      var a=rot + (i/n)*Math.PI*2;
      var rr=R*(1 - jag*0.5 + jag*rnd());
      pts.push([cx+Math.cos(a)*rr, cy+Math.sin(a)*rr*squash]);
    }
    return pts;
  }

  function chapterStone(G, kind, W, H, rnd){
    var cx=W*0.5, cy=H*0.5, R=Math.max(3, Math.min(W,H)*0.46);
    var S = {
      /* sides, squash, rotation, jaggedness, thread, wedges */
      'cut-brilliant': [8,  0.96, -0.20, 0.04, 'steel', 12],
      'cut-emerald':   [6,  0.78,  0.00, 0.02, 'wheat', 10],
      'cut-marquise':  [7,  0.60,  0.10, 0.05, 'steel', 11],
      'cut-rose':      [9,  0.92, -0.35, 0.06, 'mixed', 13],
      'cut-baguette':  [4,  0.56,  0.16, 0.02, 'ink',    9],
      'cut-trillion':  [3,  0.92, -1.57, 0.03, 'olive', 10],
      'cut-shard':     [5,  0.84,  0.62, 0.10, 'steel',  9],
      'cut-kite':      [4,  0.86, -0.79, 0.06, 'wheat', 10],
      'cut-drop':      [7,  0.72, -1.20, 0.05, 'mixed', 11],
      'cut-step':      [8,  0.68,  0.39, 0.02, 'ink',   12],
      'cut-raw':       [10, 0.90,  0.25, 0.12, 'olive', 10]
    }[kind] || [8, 0.94, -0.2, 0.05, 'steel', 12];

    /* At chapter-marker size the grid is 13x13, and a dozen wedges there is mush.
       Below that threshold the stone is cut into three or four broad faces with flat
       thread instead, which is the same lesson the step motifs taught. */
    var small = Math.min(W,H) <= 16;
    var sides = small ? Math.min(S[0], 6) : S[0];
    var jag   = small ? 0 : S[3];
    var wedge = small ? 3 : S[5];
    var tones = CUT_TONES[S[4]];
    if (small) tones = [tones[0], tones[2], tones[3], tones[4]];   // drop the near-white mid
    var pts = stonePts(cx, cy, R, sides, S[1], S[2], jag, rnd);
    /* the crown sits high and off to one side, so the light has a direction */
    cutStone(G, pts, tones, [cx - R*0.34, cy - R*0.62], wedge);
  }

  /* SEEDS.
     The knots render at a 13x13 grid, about 19px on the page, so anything with thin
     parts or fine faceting turns to porridge there. Seeds are the one subject that is
     already a compact solid: a body, one shade, one highlight. They are also what the
     company is literally about, they carry no gendered read, and the thread stays in
     wheat / olive / umber / sand with no rose or plum anywhere. */
  function seedBody(G, cx, cy, rx, ry, tilt, tone, dark, lit){
    tilt = tilt || 0;
    var ct=Math.cos(tilt), st=Math.sin(tilt), m=Math.ceil(Math.max(rx,ry))+1;
    for(var y=-m;y<=m;y++) for(var x=-m;x<=m;x++){
      var u=(x*ct+y*st)/rx, v=(-x*st+y*ct)/ry, d=u*u+v*v;
      if(d>1.05) continue;
      /* light from the upper left, shadow along the lower right rim */
      var t = (u+v < -0.45) ? lit : (d > 0.62 && u+v > 0.25) ? dark : tone;
      put(G, cx+x, cy+y, t);
    }
  }
  function seedStripe(G, cx, cy, len, ang, tone){
    for(var i=-len;i<=len;i++) put(G, cx+Math.cos(ang)*i, cy+Math.sin(ang)*i, tone);
  }
  function seedStalk(G, cx, cy, len, lean, tone){
    for(var i=0;i<len;i++) put(G, cx+lean*(i/len)*2, cy-i, tone);
  }

  function chapterSeed(G, kind, W, H, rnd){
    var cx=W*0.5, cy=H*0.52, R=Math.min(W,H)*0.5;
    switch(kind){
      case 'seed-grain':                       /* a single ear of wheat */
        seedBody(G,cx,cy+R*0.05,R*0.30,R*0.72,0.10,P.wheat,P.wheatDk,P.gold);
        seedStripe(G,cx,cy,R*0.60,1.57,P.wheatDk);
        seedStalk(G,cx,cy+R*0.78,Math.round(R*0.5),0,P.olive); break;
      case 'seed-sunflower':                   /* striped, wedge-shaped */
        seedBody(G,cx,cy,R*0.40,R*0.70,0.16,P.umberDk,P.ink,P.umber);
        seedStripe(G,cx-R*0.14,cy,R*0.50,1.45,P.sand);
        seedStripe(G,cx+R*0.14,cy,R*0.44,1.45,P.sand); break;
      case 'seed-acorn':
        seedBody(G,cx,cy+R*0.18,R*0.52,R*0.58,0,P.wheat,P.wheatDk,P.gold);
        seedBody(G,cx,cy-R*0.42,R*0.56,R*0.28,0,P.olive,P.oliveDk,P.sage);
        seedStalk(G,cx,cy-R*0.62,Math.round(R*0.34),0,P.oliveDk); break;
      case 'seed-pinecone':
        seedBody(G,cx,cy,R*0.48,R*0.76,0,P.rust,P.rustDk,P.wheat);
        for(var i=-2;i<=2;i++) seedStripe(G,cx,cy+i*R*0.28,R*0.44,0.45,P.rustDk); break;
      case 'seed-bean':
        seedBody(G,cx,cy,R*0.66,R*0.44,-0.32,P.sand,P.umber,P.creamLt);
        seedStripe(G,cx+R*0.10,cy+R*0.14,R*0.22,-0.32,P.umberDk); break;
      case 'seed-pod':                         /* a split pod, seeds showing */
        seedBody(G,cx,cy,R*0.34,R*0.80,0.22,P.olive,P.oliveDk,P.sage);
        tDisc(G,cx-R*0.04,cy-R*0.34,Math.max(1,R*0.13),P.sand);
        tDisc(G,cx+R*0.02,cy+R*0.02,Math.max(1,R*0.13),P.sand);
        tDisc(G,cx+R*0.06,cy+R*0.38,Math.max(1,R*0.13),P.sand); break;
      case 'seed-poppy':                       /* the seed head, with its crown */
        seedBody(G,cx,cy+R*0.10,R*0.58,R*0.54,0,P.sage,P.olive,P.sageLt);
        for(var k=-2;k<=2;k++) put(G,cx+k*1.1,cy-R*0.52,P.oliveDk);
        seedStalk(G,cx,cy+R*0.70,Math.round(R*0.4),0,P.olive); break;
      case 'seed-burr':                        /* spiky, but a compact core */
        tDisc(G,cx,cy,Math.max(2,R*0.44),P.umber);
        tDisc(G,cx-R*0.12,cy-R*0.12,Math.max(1,R*0.24),P.sand);
        for(var b=0;b<10;b++){ var a=b/10*6.2832;
          put(G,cx+Math.cos(a)*R*0.70,cy+Math.sin(a)*R*0.70,P.umberDk); } break;
      case 'seed-kernel':                      /* corn */
        seedBody(G,cx,cy,R*0.52,R*0.62,0,P.gold,P.wheatDk,P.creamLt);
        put(G,cx,cy+R*0.52,P.wheatDk); break;
      case 'seed-chestnut':
        seedBody(G,cx,cy+R*0.10,R*0.62,R*0.56,0,P.rust,P.rustDk,P.wheat);
        seedStripe(G,cx,cy+R*0.42,R*0.30,0,P.sand); break;
      case 'seed-husk':                        /* a seed still in its papery case */
        seedBody(G,cx,cy,R*0.44,R*0.78,-0.18,P.sand,P.umber,P.creamLt);
        seedBody(G,cx,cy+R*0.06,R*0.20,R*0.40,-0.18,P.wheatDk,P.umberDk,P.wheat); break;
      default:
        seedBody(G,cx,cy,R*0.55,R*0.68,0,P.wheat,P.wheatDk,P.gold);
    }
  }

  function chapterBloom(G, kind, W,H, rnd){
    var cx=W*0.5, cy=H*0.5, R=Math.max(3,Math.round(Math.min(W,H)*0.44));
    switch(kind){
      case 'cosmos':
        petalRing(G,cx,cy,R,8,P.rose,rnd,true,0.2,0.47);
        core(G,cx,cy,Math.max(1,R*0.30),P.yolk,P.wheatDk); break;
      case 'thistle':
        for(var i=0;i<16;i++){
          var a=-Math.PI/2+(i/15-0.5)*2.1, L=R*(0.95+rnd()*0.5);
          put(G,cx+Math.cos(a)*L, cy-R*0.35+Math.sin(a)*L*0.8, i%2?P.dusk:mix(P.dusk,P.plum,0.5));
        }
        cupBloom(G,cx,cy+R*0.10,R*0.70,P.plum,5);
        core(G,cx,cy-R*0.1,R*0.34,mix(P.dusk,P.plum,0.35),P.plum); break;
      case 'clover':
        core(G,cx-R*0.80,cy+R*0.30,R*0.50,P.sage,P.oliveDk);
        core(G,cx+R*0.80,cy+R*0.30,R*0.50,P.sage,P.oliveDk);
        core(G,cx,cy-R*0.72,R*0.50,P.sageLt,P.sage);
        put(G,cx,cy+R*0.05,P.wheat); break;
      case 'chamomile':
        petalRing(G,cx,cy,R,16,P.creamLt,rnd,false,0,0.30);
        core(G,cx,cy,Math.max(1,R*0.34),P.yolk,P.gold); break;
      case 'tulip':
        cupBloom(G,cx,cy-R*0.18,R*0.86,P.poppy,3); break;
      case 'sunflower':
        petalRing(G,cx,cy,R,13,P.yolk,rnd,true,0,0.38);
        core(G,cx,cy,Math.max(1.4,R*0.42),P.oliveDk,P.umberDk); break;
      case 'bluebell':
        cupBloom(G,cx-R*0.46,cy+R*0.10,R*0.44,P.dusk,4);
        cupBloom(G,cx+R*0.46,cy+R*0.22,R*0.40,mix(P.dusk,P.plum,0.35),4);
        cupBloom(G,cx,cy-R*0.52,R*0.40,lighten(P.dusk,0.2),4); break;
      case 'flax':
        petalRing(G,cx,cy,R,5,mix(P.dusk,P.creamLt,0.25),rnd,false,0.35,0.60);
        core(G,cx,cy,Math.max(1,R*0.28),P.creamLt,P.wheat); break;
      case 'marigold':
        petalRing(G,cx,cy,R,9,P.rust,rnd,true,0,0.26);
        petalRing(G,cx,cy,R*0.72,11,mix(P.gold,P.rust,0.35),rnd,true,0.4,0.24);
        core(G,cx,cy,Math.max(1,R*0.26),P.rustDk,P.umberDk); break;
      case 'cornflower':
        petalRing(G,cx,cy,R,7,P.dusk,rnd,true,0.15,0.52);
        petalRing(G,cx,cy,R*0.55,6,P.plum,rnd,true,0.5,0.44);
        core(G,cx,cy,Math.max(1,R*0.24),mix(P.plum,P.ink,0.3),P.plum); break;
      case 'yarrow':
        umbel(G,cx,cy+R*0.15,R*1.05,P.creamLt,rnd);
        umbel(G,cx,cy-R*0.30,R*0.62,P.cream,rnd); break;
      default:
        petalRing(G,cx,cy,R,8,P.creamLt,rnd,false,0);
        core(G,cx,cy,Math.max(1,R*0.3),P.yolk,P.gold);
    }
  }


  /* ---------- form step markers: literal, readable at 26px on a dark card ---------- */
  function blockRect(G,x0,y0,x1,y1,tone){
    for(var y=y0;y<=y1;y++)for(var x=x0;x<=x1;x++) put(G,x,y,tone);
  }
  function disc(G,cx,cy,r,tone,edge){
    for(var y=-r;y<=r;y++)for(var x=-r;x<=r;x++){
      var d=Math.hypot(x,y)/r; if(d>1.02) continue;
      put(G,cx+x,cy+y, d>0.66? mix(tone,edge,0.5) : tone);
    }
  }
  function figure(G,cx,topY,h,tone,shade2){
    disc(G,cx,topY+1,1.4,tone,shade2);                 /* head */
    for(var y=topY+3;y<=topY+h;y++){                   /* shoulders widening down */
      var w=Math.min(2, 0.6+(y-(topY+3))*0.75);
      for(var x=-w;x<=w;x++) put(G,cx+x,y, x<0?tone:mix(tone,shade2,0.35));
    }
  }
  function stepMotif(G, kind, W,H, rnd){
    /* 10x10 at cell 3. Few, chunky stitches and flat tones: at marker size the
       renderer's per-cell shading is most of the mark, so shading is what has to go. */
    var L=P.creamLt, M=P.cream, A=P.wheat, R=P.rust, S=P.sage;
    function px(x,y,t){ put(G,x,y,t); }
    function box(x0,y0,x1,y1,t){ for(var y=y0;y<=y1;y++)for(var x=x0;x<=x1;x++) put(G,x,y,t); }
    switch(kind){
      case 'ui-flag':
        box(1,0,1,8,M);                       /* pole */
        box(2,0,6,1,R); box(2,2,5,2,R); box(2,3,4,3,R);
        box(0,8,3,8,M);                       /* footing */
        break;
      case 'ui-people':
        box(1,0,2,1,S); box(7,0,8,1,S);       /* two behind */
        box(0,3,3,5,S); box(6,3,9,5,S);
        box(4,0,5,1,L);                       /* one in front */
        box(3,2,6,6,L);
        box(2,7,7,7,L);
        break;
      case 'ui-medal':
        box(2,0,3,3,R); box(6,0,7,3,R);       /* ribbon tails */
        box(3,4,6,4,A);
        box(2,5,7,8,A);                       /* disc */
        box(1,6,8,7,A);
        box(4,6,5,7,L);                       /* face */
        break;
      case 'ui-cart':
        box(0,0,1,0,M); box(1,1,1,2,M);       /* handle */
        box(2,2,9,2,L);                       /* rim */
        box(2,3,9,4,A);
        box(3,5,8,5,A);                       /* tapered basket */
        box(2,7,3,8,M); box(7,7,8,8,M);       /* wheels */
        break;
      case 'ui-tick':
        box(0,4,1,5,S);
        box(1,5,2,6,L); box(2,6,3,7,L);
        box(3,6,4,7,L); box(4,4,5,6,L);
        box(5,3,6,5,L); box(6,2,7,4,L); box(7,1,8,3,L);
        break;
      default:
        box(3,3,6,6,L);
    }
  }

  /* ================= THE FLIGHT =============================================
     Six perched birds drawn at 56-72 columns so anatomy survives: a four-step
     shade ramp from a fixed upper-left light, real feather groups, an eye with a
     catchlight, and a stippled ground shadow. At ~30 columns none of that reads
     and every bird collapses to a silhouette. */
  function bird(G, kind, W, H, rnd){
    function mu(t){ return mix(t, P.umber, 0.10); }
    function dk(t){ return darken(t, 0.22); }

    function mass(x,y,rx,ry,tilt,lit,body,shade,rim){
      tilt=tilt||0;
      var ct=Math.cos(tilt), st=Math.sin(tilt), m=Math.ceil(Math.max(rx,ry))+2;
      for(var j=-m;j<=m;j++) for(var i=-m;i<=m;i++){
        var u=(i*ct+j*st)/rx, v=(j*ct-i*st)/ry, d=u*u+v*v;
        if(d>1.0) continue;
        var l=(-u*0.62-v*0.78);
        put(G,x+i,y+j, d>0.86? rim : (l>0.46? lit : (l>-0.02? body : (l>-0.52? shade : dk(shade)))));
      }
    }
    function quills(x,y,n,len,a0,a1,w,t1,t2,grow){
      grow=(grow==null)?0.16:grow;
      for(var i=0;i<n;i++){
        var f=n===1?0:i/(n-1), a=a0+(a1-a0)*f, L=len*(1+f*grow);
        sbar(G,x,y,x+Math.cos(a)*L,y+Math.sin(a)*L,w,(i%2)?t1:t2);
      }
    }
    function coverts(x,y,rows2,cols2,dx,dy,r,t1,t2){
      for(var rr=0;rr<rows2;rr++) for(var cc=0;cc<cols2;cc++){
        var px=x+cc*dx+(rr%2)*dx*0.5, py=y+rr*dy;
        sarc(G,px,py,r,3.34,6.08,1.0,((rr+cc)%2)?t1:t2);
      }
    }
    function eye(x,y,r,ring){
      mass(x,y,r,r,0,P.umberDk,P.umberDk,P.umberDk,P.umberDk);
      if(ring) sarc(G,x,y,r+1.2,0,6.28,1.0,ring);
      put(G,x-r*0.4,y-r*0.4,P.creamLt);
    }
    function bill(x,y,len,ang,thick,t,td){
      sspike(G,x,y,x+Math.cos(ang)*len,y+Math.sin(ang)*len,thick,0.8,t);
      sbar(G,x,y+thick*0.22,x+Math.cos(ang)*len*0.86,y+Math.sin(ang)*len*0.86+thick*0.18,0.9,td);
    }
    function foot(x,y,h2,t){
      sbar(G,x,y,x,y+h2,1.2,t);
      sbar(G,x,y+h2,x-2.2,y+h2+1.6,1.0,t);
      sbar(G,x,y+h2,x+2.4,y+h2+1.4,1.0,t);
      sbar(G,x,y+h2,x+0.6,y+h2+2.4,1.0,t);
    }
    function perch(x0,x1,y,t){ sbar(G,x0,y,x1,y,1.6,t); }
    function cast(x,y,rx,ry){
      var m=Math.ceil(Math.max(rx,ry))+1;
      for(var j=-m;j<=m;j++) for(var i=-m;i<=m;i++){
        var u=i/rx, v=j/ry; if(u*u+v*v>1) continue;
        if(rnd()<0.42) continue;
        put(G,x+i,y+j,mix(P.creamSh,P.umber,0.30));
      }
    }

    var cx=W/2;
    var cw=mu(P.crow), cwd=mu(P.crowDk), cwl=mu(P.crowLt), cws=mu(P.crowSheen),
        bn=mu(P.barn), bnd=mu(P.barnDk), bf=P.barnFace,
        jy=mu(P.jay), jyd=mu(P.jayDk), jyl=mu(P.jayLt),
        rb=mu(P.robin), rbd=mu(P.robinDk), br=mu(P.breast), brd=mu(P.breastDk),
        sf=mu(P.slateF), sfd=mu(P.slateFDk), sfl=mu(P.slateFLt),
        cr=P.creamLt, aw=mu(P.awn), awd=mu(P.awnDk), ink=P.umberDk, ms=mu(P.moss||P.olive);

    switch(kind){
      case 'bd-crow':
        cast(cx+W*0.02,H*0.93,W*0.24,H*0.022);
        mass(cx+W*0.02,H*0.58,W*0.25,H*0.20,-0.22,cwl,cw,cwd,cwd);
        quills(cx-W*0.02,H*0.50,7,H*0.30,0.16,0.62,2.1,cw,cwd,0.24);
        coverts(cx-W*0.10,H*0.48,3,4,W*0.055,H*0.045,2.0,cwl,cw);
        for(var g=0;g<9;g++) put(G,cx-W*0.06+g*(W*0.03),H*0.46+((g%2)?1:0),cws);
        quills(cx+W*0.14,H*0.62,4,H*0.34,0.30,0.52,2.4,cw,cwd,0.10);
        mass(cx-W*0.22,H*0.34,W*0.14,H*0.115,-0.12,cwl,cw,cwd,cwd);
        bill(cx-W*0.34,H*0.345,W*0.24,3.05,3.4,cwd,ink);
        sbar(G,cx-W*0.34,H*0.335,cx-W*0.24,H*0.325,1.0,cws);
        for(var n=0;n<4;n++) put(G,cx-W*0.30+n,H*0.325,cwd);
        eye(cx-W*0.20,H*0.325,1.6,cws);
        foot(cx-W*0.02,H*0.76,H*0.10,ink); foot(cx+W*0.08,H*0.76,H*0.10,ink);
        perch(cx-W*0.20,cx+W*0.24,H*0.885,mu(P.bark));
        break;
      case 'bd-owl':
        cast(cx,H*0.95,W*0.22,H*0.020);
        mass(cx,H*0.62,W*0.28,H*0.24,0,mix(bn,cr,0.35),bn,bnd,bnd);
        mass(cx,H*0.30,W*0.24,H*0.19,0,bf,mix(bf,bn,0.25),bnd,bnd);
        sarc(G,cx-W*0.09,H*0.27,H*0.115,2.5,5.9,1.6,bnd);
        sarc(G,cx+W*0.09,H*0.27,H*0.115,3.5,6.9,1.6,bnd);
        sbar(G,cx,H*0.40,cx-W*0.05,H*0.30,1.3,bnd);
        sbar(G,cx,H*0.40,cx+W*0.05,H*0.30,1.3,bnd);
        eye(cx-W*0.085,H*0.285,2.1,bf); eye(cx+W*0.085,H*0.285,2.1,bf);
        bill(cx,H*0.33,H*0.075,1.57,2.2,bf,bnd);
        quills(cx+W*0.13,H*0.48,6,H*0.30,0.42,0.86,2.0,bn,bnd,0.18);
        for(var b2=0;b2<5;b2++)
          quills(cx-W*0.16,H*0.46+b2*(H*0.055),4,W*0.20,-0.12,0.12,1.0,bnd,mix(bn,cr,0.2),0);
        for(var sp=0;sp<16;sp++){
          var sx=cx-W*0.16+(sp%4)*(W*0.105), sy=H*0.56+Math.floor(sp/4)*(H*0.065);
          put(G,sx,sy,bnd); put(G,sx+1,sy+1,mix(bn,cr,0.4));
        }
        foot(cx-W*0.07,H*0.84,H*0.07,aw); foot(cx+W*0.07,H*0.84,H*0.07,aw);
        perch(cx-W*0.22,cx+W*0.22,H*0.925,mu(P.bark));
        break;
      case 'bd-wren':
        cast(cx-W*0.02,H*0.92,W*0.17,H*0.020);
        mass(cx-W*0.02,H*0.60,W*0.24,H*0.20,0.06,mix(rb,cr,0.42),rb,rbd,rbd);
        mass(cx-W*0.17,H*0.44,W*0.135,H*0.105,-0.08,mix(rb,cr,0.5),rb,rbd,rbd);
        bill(cx-W*0.29,H*0.455,W*0.10,3.10,1.9,aw,awd);
        eye(cx-W*0.175,H*0.425,1.5,mix(rb,cr,0.6));
        sbar(G,cx-W*0.27,H*0.40,cx-W*0.10,H*0.375,1.3,mix(rb,cr,0.62));
        for(var bw=0;bw<6;bw++)
          quills(cx+W*0.02,H*0.50+bw*(H*0.052),4,W*0.17,-0.18,0.18,1.0,rbd,mix(rb,cr,0.25),0);
        quills(cx-W*0.06,H*0.54,5,H*0.24,0.30,0.78,1.7,rb,rbd,0.16);
        quills(cx+W*0.16,H*0.56,5,H*0.30,-1.42,-1.06,1.9,rbd,rb,0.14);
        foot(cx-W*0.04,H*0.78,H*0.07,aw); foot(cx+W*0.05,H*0.78,H*0.07,aw);
        perch(cx-W*0.20,cx+W*0.20,H*0.875,mu(P.bark));
        break;
      case 'bd-robin':
        cast(cx,H*0.93,W*0.19,H*0.020);
        mass(cx+W*0.02,H*0.60,W*0.25,H*0.21,0.04,mix(ms,cr,0.30),ms,dk(ms),dk(ms));
        mass(cx-W*0.10,H*0.56,W*0.155,H*0.145,0,mix(br,cr,0.34),br,brd,brd);
        mass(cx-W*0.16,H*0.40,W*0.135,H*0.115,-0.06,mix(br,cr,0.42),br,brd,brd);
        mass(cx-W*0.09,H*0.36,W*0.085,H*0.075,0,mix(ms,cr,0.34),ms,dk(ms),dk(ms));
        bill(cx-W*0.28,H*0.415,W*0.085,3.08,1.9,ink,ink);
        eye(cx-W*0.175,H*0.385,1.6,mix(br,cr,0.5));
        quills(cx+W*0.06,H*0.52,6,H*0.26,0.34,0.80,1.9,ms,dk(ms),0.18);
        coverts(cx-W*0.02,H*0.50,2,3,W*0.060,H*0.045,1.9,mix(ms,cr,0.28),ms);
        quills(cx+W*0.16,H*0.66,4,H*0.22,0.42,0.66,1.8,dk(ms),ms,0.10);
        foot(cx-W*0.02,H*0.79,H*0.07,aw); foot(cx+W*0.07,H*0.79,H*0.07,aw);
        perch(cx-W*0.20,cx+W*0.22,H*0.885,mu(P.bark));
        break;
      case 'bd-heron':
        sbar(G,cx-W*0.03,H*0.62,cx-W*0.07,H*0.90,1.6,aw);
        sbar(G,cx+W*0.06,H*0.62,cx+W*0.11,H*0.90,1.6,aw);
        sbar(G,cx-W*0.11,H*0.74,cx-W*0.05,H*0.74,1.1,awd);
        sbar(G,cx+W*0.10,H*0.74,cx+W*0.16,H*0.74,1.1,awd);
        foot(cx-W*0.07,H*0.90,H*0.012,awd); foot(cx+W*0.11,H*0.90,H*0.012,awd);
        mass(cx+W*0.05,H*0.53,W*0.21,H*0.105,0.10,sfl,sf,sfd,sfd);
        quills(cx+W*0.12,H*0.50,7,H*0.20,0.24,0.74,1.7,sf,sfd,0.22);
        coverts(cx-W*0.02,H*0.48,2,4,W*0.055,H*0.032,1.7,sfl,sf);
        quills(cx+W*0.22,H*0.58,3,H*0.14,0.30,0.50,1.6,sfd,sf,0.08);
        sbar(G,cx-W*0.02,H*0.47,cx-W*0.10,H*0.34,3.4,sf,sfd);
        sbar(G,cx-W*0.10,H*0.34,cx-W*0.03,H*0.22,3.0,sf,sfd);
        sbar(G,cx-W*0.09,H*0.35,cx-W*0.03,H*0.24,1.3,sfl);
        mass(cx-W*0.05,H*0.175,W*0.085,H*0.048,-0.10,sfl,sf,sfd,sfd);
        bill(cx-W*0.11,H*0.185,W*0.28,3.22,2.4,aw,awd);
        eye(cx-W*0.055,H*0.170,1.3,sfl);
        sbar(G,cx-W*0.02,H*0.155,cx+W*0.14,H*0.125,1.5,sfd);
        sbar(G,cx-W*0.01,H*0.168,cx+W*0.11,H*0.148,1.0,sfl);
        for(var lp=0;lp<4;lp++)
          sbar(G,cx-W*0.05,H*0.42+lp*(H*0.028),cx+W*0.04,H*0.43+lp*(H*0.028),1.1,sfd);
        break;
      default:
        mass(cx,H*0.5,W*0.25,H*0.18,0,cr,mu(P.dove),mu(P.doveDk),mu(P.doveDk));
    }
  }

  /* ================= PERCHED POSES ==========================================
     Rebuilt as a SILHOUETTE, not a stack of solids. The previous version drew an
     ellipse for the body and a circle for the head, which is a snowman: there is
     always a seam where the two solids meet, and no amount of shading hides it.
     Here the crown, nape, back, rump, tail, belly, breast and throat are control
     points on ONE closed contour. It is splined, scanline-filled to a mask, and
     shaded from a distance transform, so the bird has a continuous outline and a
     rim that darkens the way a feathered edge actually does.

     Poses deform the landmarks rather than swapping sprites: the head group
     rotates about the neck joint, the tail group about the rump, and the body
     inflates about its centroid. That is why a preen buries the bill in the
     flank instead of tilting the whole bird.

     bp-<plumage>-<pose>   plumage a|b|c, pose 0..6
       0 rest  1 alert  2 look-back  3 preen  4 peck  5 fluff  6 stretch        */
  function perchPose(G, kind, W, H, rnd){
    function mu(t){ return mix(t, P.umber, 0.10); }
    var kp=kind.split('-'), sp=kp[1], pose=parseInt(kp[2],10)||0;

    /* ---- ANATOMY. Landmarks run clockwise from the forehead, around the crown
       and back, out along the tail, and home under the belly and breast. Facing
       left. Units are fractions of the tile. g=group: 0 body, 1 head, 2 tail. --- */
    var SPEC={
      /* WREN — a fist with a tail pointing at the sky. Barely any neck, the
         crown runs straight into the mantle, and the tail cocks past vertical. */
      a:{ scale:0.74, neck:[0.30,0.40], rump:[0.66,0.47], eye:[0.175,0.355],
          billLen:0.15, billW:0.052, billDrop:0.10, billCurve:0.22,
          legLen:0.13, legX:[-0.055,0.045], tailFeath:4,
          wing:{x:0.44,y:0.50,rx:0.20,ry:0.115,rot:0.16,prim:4,primLen:0.20,primAng:0.30},
          brow:true, bars:true, sheen:false, breast:false, capDark:false,
          lit:mix(mu(P.robin),P.creamLt,0.50), body:mu(P.robin), dark:mu(P.robinDk),
          bill:mu(P.awn), billDk:P.awnDk, foot:mu(P.awn),
          accent:mix(mu(P.robin),P.creamLt,0.80),
          pts:[[0.115,0.325,1],[0.185,0.268,1],[0.275,0.253,1],[0.360,0.290,3],
               [0.455,0.352,0],[0.570,0.400,0],[0.665,0.442,0],
               [0.700,0.415,2],[0.752,0.220,2],[0.828,0.048,2],[0.900,0.092,2],[0.836,0.286,2],[0.778,0.474,2],
               [0.720,0.610,0],[0.615,0.712,0],[0.470,0.762,0],[0.330,0.745,0],
               [0.205,0.660,0],[0.138,0.545,3],[0.098,0.430,3]] },
      /* ROBIN — upright and plump. A real neck notch behind the head, a deep
         round breast carried high, and a modest tail angled down and back. */
      b:{ scale:0.86, neck:[0.315,0.360], rump:[0.700,0.480], eye:[0.165,0.310],
          billLen:0.115, billW:0.060, billDrop:0.02, billCurve:0.06,
          legLen:0.17, legX:[-0.050,0.050], tailFeath:5,
          wing:{x:0.455,y:0.470,rx:0.215,ry:0.130,rot:0.20,prim:5,primLen:0.235,primAng:0.26},
          brow:false, bars:false, sheen:false, breast:true, capDark:true,
          lit:mix(mu(P.olive),P.creamLt,0.38), body:mu(P.olive), dark:darken(mu(P.olive),0.30),
          bill:P.awnDk, billDk:P.umberDk, foot:mu(P.awn), accent:mu(P.breast),
          pts:[[0.098,0.292,1],[0.160,0.212,1],[0.258,0.178,1],[0.350,0.212,1],
               [0.398,0.300,3],[0.428,0.372,0],[0.560,0.408,0],[0.700,0.470,0],
               [0.836,0.516,2],[0.958,0.566,2],[0.988,0.622,2],[0.940,0.652,2],[0.812,0.628,2],
               [0.710,0.640,0],[0.610,0.742,0],[0.470,0.822,0],[0.315,0.820,0],
               [0.183,0.720,0],[0.108,0.560,3],[0.072,0.395,3]] },
      /* CROW — long, low and level. Flat crown, heavy dagger bill with a visible
         gonys, a long wedge tail, and legs set well back under a deep body. */
      c:{ scale:0.95, neck:[0.330,0.345], rump:[0.735,0.430], eye:[0.205,0.318],
          billLen:0.220,billW:0.070, billDrop:0.05, billCurve:0.09,
          legLen:0.185, legX:[-0.045,0.055], tailFeath:6,
          wing:{x:0.480,y:0.430,rx:0.255,ry:0.115,rot:0.11,prim:6,primLen:0.300,primAng:0.18},
          brow:false, bars:false, sheen:true, breast:false, capDark:false,
          lit:mu(P.crowLt), body:mu(P.crow), dark:mu(P.crowDk),
          bill:P.crowDk, billDk:'#0F0D0B', foot:P.umberDk, accent:mu(P.crowSheen),
          pts:[[0.128,0.288,1],[0.198,0.246,1],[0.300,0.238,1],[0.392,0.262,3],
               [0.452,0.315,0],[0.585,0.358,0],[0.735,0.415,0],
               [0.868,0.440,2],[0.984,0.470,2],[1.000,0.536,2],[0.962,0.582,2],[0.862,0.568,2],
               [0.755,0.585,0],[0.640,0.665,0],[0.490,0.712,0],[0.335,0.700,0],
               [0.212,0.618,0],[0.146,0.492,3],[0.108,0.372,3]] }
    };
    var A=SPEC[sp]||SPEC.a, cr=P.creamLt;

    /* Pose deltas: headRot, headDX, headDY, puff, tailRot, wingOut, crouch, flip.
       Screen y runs down, and rot() ADDS to the angle, so a POSITIVE headRot
       raises the bill and a negative one drives it down. Getting that backwards
       is what made the preen point at the sky.
       "Look" is a hard upward cock of the head, not a turn over the shoulder:
       reversing the head in profile either tears the neck joint open or buries
       the bill in the bird's own shoulder, and a cocked head is what these birds
       actually do all day anyway. */
    var POSE=[
      [ 0.00, 0.000, 0.000, 1.00,  0.00, 0.00, 0.00, 0],  /* rest    */
      [ 0.26,-0.030,-0.080, 0.94,  0.16, 0.00,-0.03, 0],  /* alert   */
      [ 0.66, 0.030,-0.055, 1.00,  0.06, 0.00, 0.00, 0],  /* look    */
      [-1.95, 0.050, 0.120, 1.06, -0.10, 0.16, 0.02, 0],  /* preen   */
      [-0.88,-0.020, 0.150, 0.98, -0.16, 0.00, 0.05, 0],  /* peck    */
      [ 0.05,-0.005,-0.020, 1.22,  0.20, 0.06, 0.04, 0],  /* fluff   */
      [ 0.10, 0.000,-0.025, 1.01,  0.26, 1.00,-0.02, 0]   /* stretch */
    ][Math.max(0,Math.min(6,pose))];
    var hRot=POSE[0], hDX=POSE[1], hDY=POSE[2], puff=POSE[3],
        tRot=POSE[4], wingOut=POSE[5], crouch=POSE[6];

    /* ---- place the bird in the tile ---- */
    var S=Math.min(W,H)*A.scale, ox=W*0.5-S*0.50, oy=H*0.50-S*0.46+H*crouch;
    function TX(p){ return ox+p[0]*S; }
    function TY(p){ return oy+p[1]*S; }

    var neckP=[ox+A.neck[0]*S, oy+A.neck[1]*S],
        rumpP=[ox+A.rump[0]*S, oy+A.rump[1]*S];
    var bodyC=[ox+0.46*S, oy+0.50*S];

    function rot(x,y,px,py,a){
      var c=Math.cos(a), s=Math.sin(a), dx=x-px, dy=y-py;
      return [px+dx*c-dy*s, py+dx*s+dy*c];
    }
    /* Every head feature goes through this one transform. The bill used to carry
       its own hand-derived angle, which is how it ended up pointing away from the
       head it was attached to. */
    function headPt(nx,ny){
      var r=rot(ox+nx*S, oy+ny*S, neckP[0], neckP[1], hRot);
      return [r[0]+hDX*S, r[1]+hDY*S];
    }

    /* deform the landmarks by group */
    var pts=A.pts.map(function(p){
      var x=TX(p), y=TY(p), g=p[2];
      if(g===1||g===3){        /* head + neck rotate together about the neck joint */
        var hp=headPt(p[0],p[1]);
        x=hp[0]; y=hp[1];
      } else if(g===2){                            /* tail rotates about the rump */
        var t=rot(x,y,rumpP[0],rumpP[1],-tRot);
        x=t[0]; y=t[1];
      } else {                                     /* body inflates about centroid */
        x=bodyC[0]+(x-bodyC[0])*puff;
        y=bodyC[1]+(y-bodyC[1])*puff;
      }
      return [x,y];
    });
    /* the head follows the body when it puffs, or it detaches */
    if(puff!==1){
      var hc=rot(neckP[0],neckP[1],bodyC[0],bodyC[1],0);
      var shiftX=(hc[0]-bodyC[0])*(puff-1), shiftY=(hc[1]-bodyC[1])*(puff-1);
      A.pts.forEach(function(p,i){ if(p[2]===1||p[2]===2||p[2]===3){ pts[i][0]+=shiftX; pts[i][1]+=shiftY; } });
      neckP=[neckP[0]+shiftX, neckP[1]+shiftY];
    }

    /* ---- Catmull-Rom through the landmarks: an organic closed contour ---- */
    function spline(P0, samples){
      /* cardinal spline at a tension below Catmull-Rom's 0.5 — at full tension
         the curve overshoots the sharp corner at a tail tip and ties a small
         loop, which then punches holes through the fill */
      var out=[], n=P0.length, TEN=0.34;
      for(var i=0;i<n;i++){
        var p0=P0[(i-1+n)%n], p1=P0[i], p2=P0[(i+1)%n], p3=P0[(i+2)%n];
        var m1x=TEN*(p2[0]-p0[0]), m1y=TEN*(p2[1]-p0[1]),
            m2x=TEN*(p3[0]-p1[0]), m2y=TEN*(p3[1]-p1[1]);
        for(var k=0;k<samples;k++){
          var t=k/samples, t2=t*t, t3=t2*t;
          var h00=2*t3-3*t2+1, h10=t3-2*t2+t, h01=-2*t3+3*t2, h11=t3-t2;
          out.push([ h00*p1[0]+h10*m1x+h01*p2[0]+h11*m2x,
                     h00*p1[1]+h10*m1y+h01*p2[1]+h11*m2y ]);
        }
      }
      return out;
    }
    var poly=spline(pts, 12);

    /* ---- scanline fill to a mask, then a chamfer distance transform so the
       edge can be darkened. A feathered bird has no hard outline, it has a rim
       that falls off, and this is what produces that. ---- */
    var mask=new Uint8Array(W*H), dist=new Float32Array(W*H);
    var yMin=H, yMax=0;
    for(var pi=0;pi<poly.length;pi++){
      if(poly[pi][1]<yMin) yMin=poly[pi][1];
      if(poly[pi][1]>yMax) yMax=poly[pi][1];
    }
    yMin=Math.max(0,Math.floor(yMin)); yMax=Math.min(H-1,Math.ceil(yMax));
    for(var y=yMin;y<=yMax;y++){
      var xs=[];
      for(var e=0;e<poly.length;e++){
        var a1=poly[e], b1=poly[(e+1)%poly.length];
        if(a1[1]<=y&&b1[1]>y)      xs.push([a1[0]+(y-a1[1])/(b1[1]-a1[1])*(b1[0]-a1[0]), 1]);
        else if(b1[1]<=y&&a1[1]>y) xs.push([a1[0]+(y-a1[1])/(b1[1]-a1[1])*(b1[0]-a1[0]),-1]);
      }
      xs.sort(function(u,v){return u[0]-v[0];});
      var wind=0;                       /* nonzero winding: survives self-overlap */
      for(var s2=0;s2+1<xs.length;s2++){
        wind+=xs[s2][1];
        if(wind===0) continue;
        var x0=Math.max(0,Math.ceil(xs[s2][0])), x1=Math.min(W-1,Math.floor(xs[s2+1][0]));
        for(var x=x0;x<=x1;x++) mask[y*W+x]=1;
      }
    }
    var BIG=1e6;
    for(var i2=0;i2<W*H;i2++) dist[i2]=mask[i2]?BIG:0;
    for(var yy=0;yy<H;yy++) for(var xx=0;xx<W;xx++){
      var o=yy*W+xx; if(!mask[o]) continue;
      var m1=dist[o];
      if(xx>0) m1=Math.min(m1,dist[o-1]+1);
      if(yy>0) m1=Math.min(m1,dist[o-W]+1);
      if(xx>0&&yy>0) m1=Math.min(m1,dist[o-W-1]+1.414);
      if(xx<W-1&&yy>0) m1=Math.min(m1,dist[o-W+1]+1.414);
      dist[o]=m1;
    }
    for(var yb=H-1;yb>=0;yb--) for(var xb=W-1;xb>=0;xb--){
      var ob=yb*W+xb; if(!mask[ob]) continue;
      var m2=dist[ob];
      if(xb<W-1) m2=Math.min(m2,dist[ob+1]+1);
      if(yb<H-1) m2=Math.min(m2,dist[ob+W]+1);
      if(xb<W-1&&yb<H-1) m2=Math.min(m2,dist[ob+W+1]+1.414);
      if(xb>0&&yb<H-1) m2=Math.min(m2,dist[ob+W-1]+1.414);
      dist[ob]=m2;
    }

    /* head centre — the shading pass needs it for the cap */
    var hd0=headPt(A.eye[0], A.eye[1]);
    var hcx=hd0[0], hcy=hd0[1];

    /* ---- shade: directional light from upper-left plus the rim falloff ---- */
    var rimD=Math.max(2.0, S*0.055);
    for(var sy=0;sy<H;sy++) for(var sx=0;sx<W;sx++){
      var so=sy*W+sx; if(!mask[so]) continue;
      var u=(sx-bodyC[0])/(S*0.30), v=(sy-bodyC[1])/(S*0.26);
      var l=(-u*0.55-v*0.72);
      var d=dist[so], t3;
      if(d<rimD*0.55) t3=A.dark;
      else if(d<rimD) t3=(l>0.30? A.body : A.dark);
      else t3=(l>0.62? A.lit : (l>-0.10? A.body : A.dark));

      /* Plumage as soft REGIONS blended into the shading, not ovals stamped on
         top. A hard-edged disc of colour reads as a hood or a sticker; fading
         across the outer fifth of the radius, and letting the rim keep winning,
         reads as a bird that is that colour there. */
      if(A.breast){
        var bd=Math.hypot((sx-(bodyC[0]-S*0.225))/(S*0.205),(sy-(bodyC[1]+S*0.105))/(S*0.240));
        if(bd<1.06){
          var ac=(d<rimD*0.55)? darken(A.accent,0.34)
               : (l>0.52? mix(A.accent,cr,0.30) : (l>-0.05? A.accent : darken(A.accent,0.20)));
          t3 = bd>0.84 ? mix(t3, ac, (1.06-bd)/0.22) : ac;
        }
      }
      if(A.capDark){
        var cd=Math.hypot((sx-hcx)/(S*0.150),(sy-(hcy-S*0.030))/(S*0.135));
        if(cd<1.04) t3 = cd>0.80 ? mix(t3, A.dark, (1.04-cd)/0.24) : A.dark;
      }
      if(A.sheen && d>rimD*0.70){
        var sd=Math.hypot((sx-(bodyC[0]+S*0.045))/(S*0.280),(sy-(bodyC[1]-S*0.115))/(S*0.135));
        if(sd<1.0 && l>0.10) t3 = mix(t3, A.accent, 0.52*(1-sd));
      }
      put(G,sx,sy,t3);
    }
    function inMask(x,y){ x=Math.round(x); y=Math.round(y);
      return x>=0&&y>=0&&x<W&&y<H&&mask[y*W+x]; }
    function putIn(x,y,t){ if(inMask(x,y)) put(G,x,y,t); }

    /* ---- tail feather separations, drawn along the tail's own axis ---- */
    var tAng=Math.atan2(pts[9][1]-rumpP[1], pts[9][0]-rumpP[0]);
    for(var tf=1;tf<A.tailFeath;tf++){
      var spread=(tf/A.tailFeath-0.5)*0.42;
      var aT=tAng+spread;
      for(var q=0.34;q<1.14;q+=0.022){
        var qx=rumpP[0]+Math.cos(aT)*S*0.42*q, qy=rumpP[1]+Math.sin(aT)*S*0.42*q;
        putIn(qx,qy, tf%2? A.dark : darken(A.body,0.12));
      }
    }

    /* ---- the folded wing: a lens lying on the flank with primaries that run
       back past the rump. This is the shape that most says "bird" after the
       silhouette itself, and the old version only hinted at it. ---- */
    var Wg=A.wing, wcx=ox+Wg.x*S, wcy=oy+Wg.y*S;
    if(puff!==1){ wcx=bodyC[0]+(wcx-bodyC[0])*puff; wcy=bodyC[1]+(wcy-bodyC[1])*puff; }
    var wRot=Wg.rot - wingOut*0.62;
    var wRx=S*Wg.rx*(1+wingOut*0.42), wRy=S*Wg.ry*(1+wingOut*0.30);
    var cw=Math.cos(wRot), sw=Math.sin(wRot);
    for(var wj=-Math.ceil(wRy)-2;wj<=Math.ceil(wRy)+2;wj++)
      for(var wi=-Math.ceil(wRx)-2;wi<=Math.ceil(wRx)+2;wi++){
        var wu=(wi*cw+wj*sw)/wRx, wv=(wj*cw-wi*sw)/wRy;
        var wd=wu*wu+wv*wv; if(wd>1) continue;
        var wt=(wd>0.80)? A.dark : ((wv<-0.30)? A.lit : A.body);
        if(A.bars && ((wi+wj*2)%7===0)) wt=A.dark;                 /* barred wing */
        if(A.sheen && wv<-0.42 && wu>-0.30 && wu<0.45) wt=A.accent; /* gloss band */
        putIn(wcx+wi, wcy+wj, wt);
      }
    /* primaries */
    for(var pr=0;pr<Wg.prim;pr++){
      var pa=wRot+Wg.primAng*(pr/(Wg.prim-1)-0.15)+wingOut*0.30;
      var plen=S*Wg.primLen*(1-pr*0.055)*(1+wingOut*0.55);
      var px0=wcx+Math.cos(wRot)*wRx*0.42, py0=wcy+Math.sin(wRot)*wRy*0.30+pr*(S*0.017);
      /* folded, the primaries are separation lines inside the silhouette. Spread,
         they are the wing itself, so they need width and a filled web between
         them or the stretch pose reads as three loose threads. */
      var half = wingOut>0 ? Math.max(1.2, S*0.021*(1-pr*0.06)) : 0.5;
      for(var pq=0;pq<plen;pq+=0.5){
        var pxx=px0+Math.cos(pa)*pq, pyy=py0+Math.sin(pa)*pq;
        var fade=1-(pq/plen)*0.35;
        for(var pw=-half;pw<=half;pw+=0.5){
          var qx2=pxx-Math.sin(pa)*pw, qy2=pyy+Math.cos(pa)*pw;
          if(wingOut>0){
            put(G,qx2,qy2, (Math.abs(pw)>half*0.62)? A.dark
                          : (fade>0.82? mix(A.body,A.lit,0.30) : darken(A.body,0.14)));
          } else if(inMask(qx2,qy2)) put(G,qx2,qy2, pr%2? A.dark : darken(A.body,0.18));
        }
      }
    }
    /* wing coverts: a few short strokes so the shoulder is not a blank field */
    for(var cvr=0;cvr<3;cvr++)
      for(var cvq=0;cvq<S*0.11;cvq+=0.6)
        putIn(wcx-wRx*0.45+cvq*Math.cos(wRot+0.5), wcy-wRy*0.30+cvr*(S*0.045)+cvq*Math.sin(wRot+0.5),
              darken(A.body,0.10));

    /* ---- brow stripe: the wren's supercilium, the one mark that identifies it ---- */
    var hx=hcx, hy=hcy;
    if(A.brow){
      var bw0=headPt(A.eye[0]-0.085, A.eye[1]-0.048), bw1=headPt(A.eye[0]+0.105, A.eye[1]-0.068);
      var bwA=Math.atan2(bw1[1]-bw0[1], bw1[0]-bw0[0]), bwL=Math.hypot(bw1[0]-bw0[0],bw1[1]-bw0[1]);
      for(var bq=0;bq<bwL;bq+=0.5){
        putIn(bw0[0]+Math.cos(bwA)*bq, bw0[1]+Math.sin(bwA)*bq, A.accent);
        putIn(bw0[0]+Math.cos(bwA)*bq+Math.sin(bwA)*1.2,
              bw0[1]+Math.sin(bwA)*bq-Math.cos(bwA)*1.2, mix(A.accent,A.dark,0.35));
      }
    }

    /* ---- bill: a wedge with a real gape line, hung off the head landmarks so
       it swings with the pose. Needle on the wren, dagger on the crow. ---- */
    var gape=headPt(A.eye[0]-0.055, A.eye[1]+0.028);
    var btip=headPt(A.eye[0]-0.055-A.billLen, A.eye[1]+0.028+A.billDrop*0.55);
    var gx=gape[0], gy=gape[1];
    var bAng=Math.atan2(btip[1]-gy, btip[0]-gx);
    var bLen=Math.hypot(btip[0]-gx, btip[1]-gy), bHalf=S*A.billW*0.5;
    var cbA=Math.cos(bAng), sbA=Math.sin(bAng);
    for(var q2=0;q2<=bLen;q2+=0.42){
      var f2=q2/bLen, taper=(1-f2*0.80);   /* linear: a wedge, not a tube with a point */
      var curve=Math.sin(f2*3.14159)*A.billCurve*S*0.10;
      var bx=gx+cbA*q2 - sbA*curve, byy=gy+sbA*q2 + cbA*curve;
      var hh=bHalf*taper;
      for(var w2=-hh;w2<=hh;w2+=0.5){
        var t4=(w2<-hh*0.25)? A.bill : (w2>hh*0.30? A.billDk : mix(A.bill,A.billDk,0.30));
        put(G, bx - sbA*w2, byy + cbA*w2, t4);
      }
      if(f2>0.10) put(G, bx, byy, A.billDk);                 /* the gape line */
    }
    if(A.sheen){                                              /* nasal bristles */
      for(var nb=0;nb<5;nb++)
        for(var nq=0;nq<S*0.055;nq+=0.5)
          put(G, gx+cbA*nq*1.1, gy+sbA*nq+nb*0.9-1.8, A.billDk);
    }

    /* ---- eye: a dark bead with a lit catch, ringed so it does not vanish ---- */
    var eR=Math.max(1.5, S*0.026);
    var ring=A.sheen? mix(A.lit,cr,0.72) : mix(A.lit,cr,0.50);   /* dark birds need a lighter orbital */
    for(var ej=-Math.ceil(eR)-2;ej<=Math.ceil(eR)+2;ej++)
      for(var ei=-Math.ceil(eR)-2;ei<=Math.ceil(eR)+2;ei++){
        var ed=(ei*ei+ej*ej)/(eR*eR);
        if(ed>1.62) continue;
        put(G, hx+ei, hy+ej, ed>1.18? ring : (ed>0.94? P.umberDk : '#141210'));
      }
    put(G, hx-Math.max(1,eR*0.34), hy-Math.max(1,eR*0.34), cr);   /* catchlight */

    /* ---- legs: a feathered thigh, a scaled tarsus and three forward toes.
       No perch bar: these birds sit on real page elements, and drawing a stand
       under them made every one look like a museum mount. ---- */
    var footY=oy+S*(0.78+A.legLen);
    [0,1].forEach(function(li){
      var lx=bodyC[0]+S*A.legX[li];
      var thighY=oy+S*0.70;
      sbar(G, lx, thighY, lx+S*0.012, footY-S*0.02, Math.max(1.6,S*0.026), A.foot);
      for(var sc=0;sc<4;sc++)                                   /* tarsus scales */
        put(G, lx+S*0.006, thighY+S*0.03+sc*(S*0.030), darken(A.foot,0.30));
      var fx=lx+S*0.012;
      sbar(G, fx, footY-S*0.02, fx-S*0.055, footY+S*0.010, Math.max(1.2,S*0.017), A.foot);
      sbar(G, fx, footY-S*0.02, fx-S*0.020, footY+S*0.022, Math.max(1.2,S*0.017), A.foot);
      sbar(G, fx, footY-S*0.02, fx+S*0.048, footY+S*0.014, Math.max(1.2,S*0.017), darken(A.foot,0.18));
    });
  }

  /* ================= WINGS — twelve phases ==================================
     Five held poses read as a slideshow; twelve at ~40-70ms fuse into motion.
     The attitude is a continuous function of phase, and deliberately asymmetric:
     the downstroke is fast and powerful, the recovery slower and folded, and the
     camber flips sign with direction. */
  function wingBird(G, kind, W, H, rnd){
    function mu(t){ return mix(t, P.umber, 0.10); }
    var parts=kind.split('-'), species=parts[1], phase=parseInt(parts[2],10)||0;
    var PLS={
      a:{ lit:mu(P.jayLt), body:mu(P.jay),   dark:mu(P.jayDk),  bill:P.umberDk, throat:mu(P.robin) },
      b:{ lit:mix(mu(P.breast),P.creamLt,0.34), body:mu(P.breast), dark:mu(P.breastDk), bill:P.umberDk, throat:mu(P.olive) },
      c:{ lit:mu(P.crowLt), body:mu(P.crow),  dark:mu(P.crowDk), bill:P.crowDk,  throat:mu(P.crowSheen) }
    };
    var PL=PLS[species]||PLS.a;
    var lit=PL.lit, body=PL.body, dark=PL.dark, bill=PL.bill, thr=PL.throat, cr=P.creamLt;

    function mass(x,y,rx,ry,tilt){
      var ct=Math.cos(tilt||0), st=Math.sin(tilt||0), m=Math.ceil(Math.max(rx,ry))+2;
      for(var j=-m;j<=m;j++) for(var i=-m;i<=m;i++){
        var u=(i*ct+j*st)/rx, v=(j*ct-i*st)/ry, d=u*u+v*v;
        if(d>1) continue;
        var l=(-u*0.62-v*0.78);
        put(G,x+i,y+j, d>0.84? dark : (l>0.42? lit : (l>-0.14? body : dark)));
      }
    }
    var cx=W*0.44, cy=H*0.54;
    var TOTAL=12, ph=(phase%TOTAL)/TOTAL;
    var rise=Math.cos(ph*6.2832), down=Math.sin(ph*6.2832)<0;
    var skew=down? Math.pow(Math.abs(rise),0.72)*(rise<0?-1:1) : rise;
    var A=[skew, 0.06+Math.abs(rise)*0.13, (down?0.34:-0.26)*Math.abs(rise)];

    mass(cx,cy,W*0.155,H*0.098,0.10);
    mass(cx-W*0.17,cy-H*0.075,W*0.082,H*0.062,0.04);
    sspike(G,cx-W*0.245,cy-H*0.062,cx-W*0.325,cy-H*0.045,1.9,0.7,bill);
    for(var t=0;t<5;t++) put(G,cx-W*0.19+t*1.3,cy+H*0.02,thr);
    mass(cx-W*0.165,cy-H*0.088,1.4,1.4,0);
    put(G,cx-W*0.168,cy-H*0.094,P.umberDk);
    put(G,cx-W*0.185,cy-H*0.105,cr);

    var farLift=-A[0]*H*0.20;
    sspike(G,cx-W*0.02,cy-H*0.02, cx+W*0.14, cy-H*0.02+farLift*0.55, 4.0,1.0, dark);
    var tipx=cx-W*0.05+A[1]*W*0.10, tipy=cy-H*0.03+A[0]*H*0.46;
    sspike(G,cx-W*0.02,cy-H*0.03, tipx, tipy, 7.2,1.6, body);
    sspike(G,cx-W*0.02,cy-H*0.05, tipx-W*0.01, tipy+A[2]*H*0.06, 3.4,0.9, lit);
    for(var pf=0;pf<3;pf++){
      var sp=(pf-1)*0.16;
      sbar(G, cx+W*0.02, cy-H*0.03+A[0]*H*0.20,
              tipx+sp*W*0.09, tipy+sp*H*0.10 + (A[0]>0? H*0.05 : -H*0.05), 1.3, pf%2?dark:body);
    }
    for(var tf=-1;tf<=1;tf++)
      sbar(G,cx+W*0.13,cy+H*0.02, cx+W*0.30+tf*W*0.02, cy+H*0.02+tf*H*0.11 - A[0]*H*0.05, 1.9, tf?dark:body);
  }

  /* ================= THE WALL BRANCH =========================================
     A limb entering from the page edge: thick where it leaves frame, tapering as
     it reaches inward, forking into finer twigs each carrying small alternating
     leaves. The butt end runs off the canvas at full width so there is no visible
     origin. Drawn entering from the RIGHT; mirror in CSS for the other side.

     Everything is bounds-guarded. Anything drawn outside W x H is simply lost and
     renders as a straight slice, which is what made the first version look cut. */
  function wallBranch(G, kind, W, H, rnd){
    function mu(t){ return mix(t, P.umber, 0.03); }
    var tkA=mu(P.trunkA), tkB=mu(P.trunkB), tkC=P.trunkC;
    /* No umber mute on the foliage. mu() pulls every tone toward umber, and
       across twelve autumn colours that reads as a layer of dust over all of
       them. The wood still gets it - that is where it belongs. */
    var PAL=[P.blA,P.blB,P.blC,P.blD,P.blE,P.blF,
             P.blH,P.blI,P.blJ,P.blK,P.blL,mix(P.leafA,P.creamLt,0.12)];

    /* A leaf is ASYMMETRIC along its length: rounded at the base where it meets
       the stalk, pointed at the tip. The old one was an ellipse tapered equally
       at both ends with a highlight stripe down the middle, which at nine pixels
       is a banana. Half-width is now a beta curve peaking about 45% along, so
       the base is full and the tip comes to a point, and there is a midrib.
       Three profiles for variety: ovate, lanceolate, obovate. */
    var LSHAPE=[[0.42,0.52],[0.62,0.38],[0.34,0.72]];
    /* SUNLIGHT. Brightening every tone equally just washes the canopy out - what
       reads as sun is DIRECTION and WARMTH: a hot golden face turned toward the
       light, a rim where the light comes through the leaf from behind, and
       shadow that stays deep on the other side. Contrast is the effect, not
       lift. `sun` (0..1) is how exposed this particular leaf is, so the canopy
       has light falling across it rather than glowing uniformly. */
    var SUNW=mix(P.creamLt, P.yolk, 0.42);       /* the colour of the light */
    function leaf(x,y,sz,ang,tone,shp,sun){
      if(x < sz+2 || x > W-sz-2 || y < sz+3 || y > H-sz-3) return;
      var ca=Math.cos(ang), sa=Math.sin(ang);
      var S2=LSHAPE[(shp||0)%3], A2=S2[0], B2=S2[1];
      var peak=Math.pow(A2/(A2+B2),A2)*Math.pow(B2/(A2+B2),B2);
      var LEN=sz*1.85, WID=sz*0.44/peak;
      var u=(sun===undefined? 0.5 : sun);
      var lit  = mix(tone, SUNW, 0.30+0.36*u);   /* the face turned to the sun  */
      var hot  = mix(tone, SUNW, 0.56+0.34*u);   /* where it burns out          */
      var glow = mix(tone, SUNW, 0.44+0.30*u);   /* light coming through it     */
      var shd  = darken(tone, 0.24-0.05*u);      /* and the side that does not  */
      var rib  = darken(tone, 0.34);
      for(var q=0;q<=LEN;q+=0.5){
        var t=q/LEN;
        var hw=WID*Math.pow(t,A2)*Math.pow(1-t,B2);
        if(hw<0.3) continue;
        var bx=x+ca*(q-LEN*0.5), by=y+sa*(q-LEN*0.5);
        for(var w=-hw;w<=hw;w+=0.5){
          var side=w*(sa*0.60-ca*0.80);          /* light from the upper left */
          var edge=Math.abs(w)>hw-0.7;
          var t2;
          if(side>0){                            /* sunward half */
            t2 = edge ? glow                     /* translucent rim           */
               : (u>0.62 && t>0.30 && t<0.86 && Math.abs(w)<hw*0.55 ? hot : lit);
          } else {
            t2 = edge ? shd : darken(tone, 0.08);
          }
          put(G, bx-sa*w, by+ca*w, t2);
        }
      }
      for(var r2=LEN*0.06;r2<=LEN*0.94;r2+=0.5)  /* the midrib */
        put(G, x+ca*(r2-LEN*0.5), y+sa*(r2-LEN*0.5), rib);
      var sx=x-ca*LEN*0.56, sy=y-sa*LEN*0.56;    /* the stalk */
      put(G,sx,sy,tkC); put(G,sx-ca*0.9,sy-sa*0.9,tkC);
    }
    /* How much sun a leaf catches: high and outboard is exposed, low and inside
       the canopy is shaded, plus jitter so it is dappled rather than a gradient. */
    function sunAt(px,py,r){
      return Math.max(0, Math.min(1, 1.18 - (py/H)*1.30 + (r-0.5)*0.30));
    }

    var kp=kind.split('-');
    var isLeafPass = kp[1]==='leaf';
    /* The money gets its OWN pass. The leaf layer is a separate element stacked
       above the limb, so money drawn on the limb sits underneath the foliage and
       is never seen. Same geometry, same seed, drawn alone, mounted on top. */
    var isCashPass = kp[1]==='cash';
    var form = kp[2]||'a';
    var frame = isLeafPass ? (parseInt(kp[3],10)||0) : 0;
    var FR=4, ph0=(frame%FR)/FR*6.2832;
    var R=rngFrom(form==='b'? 811 : 409);
    var leafIdx=0;
    /* leaf size derived from the grid, so foliage keeps its proportion whatever
       size the branch is drawn at */
    /* leaf area scales with the square of this, so it drives ink far harder than
       the leaf COUNT does — halving the count only took 12% off, dropping the size
       is what actually thins the canopy */
    var LS=Math.max(2.4, Math.min(W,H)*0.0175);

    function branch(x,y,ang,len,wid,depth){
      var ex=x+Math.cos(ang)*len, ey=y+Math.sin(ang)*len;
      if(ex< -2 || ex> W+2 || ey< 6 || ey> H-4) return;
      var midA=ang+(R()-0.5)*0.34;
      var mx=x+Math.cos(midA)*len*0.52, my=y+Math.sin(midA)*len*0.52;
      var x2=mx+Math.cos(ang)*len*0.52,  y2=my+Math.sin(ang)*len*0.52;
      if(!isLeafPass && !isCashPass) swood(G,[[x,y],[mx,my],[x2,y2]], wid, Math.max(0.9,wid*0.46), tkB, tkA, tkC);

      if(isLeafPass){
        /* fewer on the thick members, dense on the fine ones — but never zero,
           so foliage runs the whole length of the branch instead of clumping at
           the tip */
        /* thinned: dense enough to read as a leafy branch, sparse enough that the
           wood still shows through it */
        var n=(depth<=1? 3 : (depth===2? 2 : 1))+((R()*2)|0);
        for(var k=0;k<n;k++){
          var f=(k+1)/(n+1);
          var lx=x+(x2-x)*f, ly=y+(y2-y)*f;
          var side=(k%2)?1:-1, la=ang+side*(0.85+R()*0.5);
          var sway=Math.sin(ph0+leafIdx*0.97); leafIdx++;
          var off=LS*1.15+R()*LS*0.8;
          /* the displacement has to be big enough to SEE between frames. At 1.5px
             the leaves technically moved and read as perfectly still. */
          leaf(lx+Math.cos(la)*off+sway*4.2, ly+Math.sin(la)*off+Math.cos(ph0+leafIdx*0.7)*3.0,
               LS*(0.80+R()*0.55), la+sway*0.62, PAL[(R()*PAL.length)|0], (R()*3)|0,
               sunAt(lx, ly, R()));
        }
        leaf(x2+Math.cos(ang)*2.4+Math.sin(ph0+leafIdx)*3.6,
             y2+Math.sin(ang)*2.4+Math.cos(ph0+leafIdx*1.2)*2.6, LS*(0.85+R()*0.45),
             ang+Math.sin(ph0+leafIdx)*0.55, PAL[(R()*PAL.length)|0], (R()*3)|0,
             sunAt(x2, y2, R()));
        leafIdx++;
      }
      if(depth<=0) return;
      var spread=0.42+R()*0.40;
      branch(x2,y2, ang-spread,               len*(0.62+R()*0.16), wid*0.56, depth-1);
      branch(x2,y2, ang+spread*(0.6+R()*0.8), len*(0.58+R()*0.18), wid*0.52, depth-1);
      if(depth>1 && R()<0.66) branch(mx,my, ang+(R()-0.5)*1.7, len*0.46, wid*0.44, depth-2);
    }

    /* reach is scaled to the SHORTER axis, so a wide grid cannot stretch a fork
       out of frame vertically */
    var S=Math.min(W*0.5, H*0.86);
    var yIn = form==='b' ? H*0.80 : H*0.74;
    var main = form==='b'
      ? [[W+10,yIn],[W*0.78,H*0.72],[W*0.58,H*0.70],[W*0.42,H*0.60],[W*0.30,H*0.55]]
      : [[W+10,yIn],[W*0.80,H*0.66],[W*0.60,H*0.66],[W*0.44,H*0.56],[W*0.32,H*0.51]];
    if(!isLeafPass && !isCashPass) swood(G, main, 20.0, 3.2, tkB, tkA, tkC);

    var forks = form==='b'
      ? [[0.16,-0.95,0.34],[0.34,0.72,0.20],[0.50,-1.05,0.30],[0.66,0.55,0.16],[0.80,-0.85,0.22],[0.90,0.42,0.11]]
      : [[0.14,-0.85,0.36],[0.30,0.80,0.19],[0.46,-1.10,0.30],[0.62,0.62,0.15],[0.78,-0.80,0.22],[0.92,-0.45,0.14]];
    for(var i2=0; i2<forks.length && !isCashPass; i2++){
      var t=forks[i2][0];
      var seg=Math.min(main.length-2, Math.floor(t*(main.length-1)));
      var lf=(t*(main.length-1))-seg;
      var fx=main[seg][0]+(main[seg+1][0]-main[seg][0])*lf;
      var fy=main[seg][1]+(main[seg+1][1]-main[seg][1])*lf;
      branch(fx,fy, Math.PI+forks[i2][1], S*forks[i2][2], 7.0*(1-t*0.55), 3);
    }
    if(!isCashPass) branch(main[main.length-1][0], main[main.length-1][1], Math.PI-0.16, S*0.20, 4.2, 3);

    /* ================= MONEY ON THE TREE ===============================
       Seven ways a note can hang. Seven of one shape is wallpaper, so each
       formation has its own geometry: a note is flat, folded, rolled, banded,
       curled; a coin is round; a card is hard-edged. They hang off the wood
       pass rather than the leaf pass, so they stay put while the leaves move,
       which is also what money does on a branch. */
    function moneyPal(){
      return { paper:mu(P.notePaper), field:mu(P.noteField), ink:P.noteInk,
               deep:P.noteDeep, hi:P.noteHi, seal:mu(P.noteSeal),
               cm:mu(P.coin), cd:P.coinDk, cl:mu(P.coinLt), cr:P.coinRim,
               ka:P.cardA, kb:P.cardB, kc:P.cardChip, kn:P.cardBand };
    }
    var M=moneyPal();

    /* A banknote is not a green rectangle: at any size it reads as LIGHT paper
       carrying DARK print. Margin, border rule, engraved field, a portrait oval
       and corner denominations - that grammar is what says "cash", and a flat
       mid-tone slab says "leaf". */
    function noteBody(x,y,w2,h2,tilt,curlFn){
      var ca=Math.cos(tilt), sa=Math.sin(tilt);
      function P2(i,j,t){ put(G, x+i*ca-j*sa, y+i*sa+j*ca, t); }
      for(var i=-w2;i<=w2;i++){
        var top=-h2, bot=h2;
        if(curlFn){ var cf=curlFn((i+w2)/(2*w2)); top+=cf[0]; bot+=cf[1]; }
        var mid=(top+bot)/2, hh=Math.max(0.8,(bot-top)/2);
        for(var j=top;j<=bot;j++){
          var di=w2-Math.abs(i), dj=hh-Math.abs(j-mid);   /* inset from each edge */
          var t;
          if(di<0.75 || dj<0.75)      t=M.paper;          /* the cut white margin */
          else if(di<1.9 || dj<1.7)   t=M.deep;           /* the printed border   */
          else if(di<2.7 || dj<2.4)   t=M.paper;
          else t=(((i+j)%3)? M.field : M.paper);          /* engraved field       */
          P2(i,j,t);
        }
      }
      var rx=w2*0.30, ry=h2*0.56;
      if(rx>=1.6 && ry>=1.6){
        for(var oj=-ry;oj<=ry;oj++) for(var oi=-rx;oi<=rx;oi++){
          var u=oi/rx, v=oj/ry, d=u*u+v*v; if(d>1) continue;
          P2(oi,oj, d>0.80? M.ink : (d>0.42? M.field : M.paper));   /* portrait */
        }
        for(var hj=-ry*0.52;hj<=ry*0.18;hj++)                        /* the head  */
          for(var hi=-rx*0.34;hi<=rx*0.34;hi++){
            var hu=hi/(rx*0.34), hv=(hj+ry*0.17)/(ry*0.40);
            if(hu*hu+hv*hv>1) continue; P2(hi,hj,M.ink);
          }
      }
      var cx2=w2-2.6, cy2=h2-2.2;                                    /* denominations */
      if(cx2>1 && cy2>0.6) [[-cx2,-cy2],[cx2,-cy2],[-cx2,cy2],[cx2,cy2]].forEach(function(k){
        P2(k[0],k[1],M.ink); P2(k[0]+(k[0]<0?1:-1),k[1],M.ink);
        if(h2>4) P2(k[0],k[1]+(k[1]<0?1:-1),M.ink);
      });
      if(w2>6) for(var gy=-h2+3.4;gy<=h2-3.4;gy+=3)                  /* guilloche */
        for(var gx=-w2+3.6;gx<=w2-3.6;gx+=1)
          if(Math.abs(gx)>rx+1.2) P2(gx,gy,M.paper);
      if(w2>7){ P2(w2-4.2,0,M.seal); P2(w2-4.2,1,M.seal); P2(w2-3.6,0,M.seal); }
    }
    function mFlat(x,y,sc,r2){ noteBody(x,y+sc*0.95, sc*2.05, sc*1.12, (r2()-0.5)*0.42); }
    function mFolded(x,y,sc){
      /* folded over the twig: TWO clean panels meeting at a crease. The organic
         drape it used to draw read as a hanging rag, not as paper. */
      noteBody(x-sc*0.60, y+sc*1.35, sc*1.05, sc*1.42,  0.30);
      noteBody(x+sc*0.66, y+sc*1.15, sc*0.95, sc*1.24, -0.24);
      for(var s3=0;s3<=sc*2.6;s3++) put(G,x,y+s3,M.deep);            /* the crease */
    }
    function mRolled(x,y,sc,r2){
      var len=sc*3.4, rr=Math.max(1.8,sc*0.72), tilt=(r2()-0.5)*0.55;
      var ct=Math.cos(tilt), st=Math.sin(tilt);
      for(var i=0;i<=len;i++) for(var j=-rr;j<=rr;j++){
        var edge=(Math.abs(j)>rr-0.9);
        put(G, x+i*ct-j*st, y+i*st+j*ct, edge? M.deep : ((i%5<2)? M.field : M.paper));
      }
      for(var a3=0;a3<6.28;a3+=0.26)                                 /* the rolled end */
        put(G, x+Math.cos(a3)*rr*0.60*ct-Math.sin(a3)*rr*0.60*st,
               y+Math.cos(a3)*rr*0.60*st+Math.sin(a3)*rr*0.60*ct, M.ink);
      put(G,x,y,M.deep);
    }
    function mBundle(x,y,sc){
      for(var s4=2;s4>=0;s4--) noteBody(x+s4*1.2, y+s4*1.9, sc*1.85, sc*0.92, 0.02);
      var bw=sc*0.42;                                                /* the paper band */
      for(var b4=-sc*1.3;b4<=sc*3.4;b4++) for(var bi=-bw;bi<=bw;bi++)
        put(G, x-sc*0.30+bi, y+b4, Math.abs(bi)>bw-0.7? M.deep : M.seal);
    }
    function mCurled(x,y,sc){
      noteBody(x,y+sc*0.95, sc*2.10, sc*1.02, 0.03, function(u){
        var w=Math.sin(u*3.14159*1.25-0.35)*sc*0.30;
        return [w,w];
      });
    }
    /* A coin is not a gold disc. What identifies one at any size is the RIM: a
       raised ring inset from the edge, milled reeding around the circumference,
       and a device struck in the middle. A flat filled circle reads as a berry,
       which is what these were doing. Two builds - struck face-on, and a short
       stack seen edge-on, because a stack is unmistakable. */
    function coinFace(x,y,r){
      for(var j=-r-1;j<=r+1;j++) for(var i=-r-1;i<=r+1;i++){
        var d=Math.sqrt(i*i+j*j)/r; if(d>1.0) continue;
        var lit=(-i-j)/(r*1.42);                       /* light from upper left */
        var t;
        if(d>0.90){                                     /* milled edge: the ticks
              live INSIDE a thin annulus and are found per pixel from the angle.
              Drawn as a separate ring of stamps they stuck out past the disc and
              the coin came out looking like a gear. */
          var ang=Math.atan2(j,i);
          t = ((Math.floor(ang/0.20)&1)? M.cr : M.cd);
        }
        else if(d>0.74) t=(lit>0.05? M.cl : M.cd);     /* the raised rim        */
        else if(d>0.66) t=M.cr;                        /* the groove inside it  */
        else            t=(lit>0.36? M.cl : (lit>-0.20? M.cm : M.cd));
        put(G,x+i,y+j,t);
      }
      if(r>=3.2){                                       /* the struck device     */
        var hr=Math.max(1.2, r*0.26);
        for(var hj=-hr;hj<=hr*0.5;hj++) for(var hi=-hr;hi<=hr;hi++){
          var hu=hi/hr, hv=hj/hr; if(hu*hu+hv*hv>1) continue;
          put(G,x+hi,y+hj-hr*0.25,M.cr);
        }
        for(var nj=hr*0.25;nj<=hr*1.15;nj++)
          for(var ni=-hr*0.66;ni<=hr*0.38;ni++) put(G,x+ni,y+nj,M.cr);
        put(G, x-hr*0.42, y-hr*0.72, M.cl);
      }
    }
    function coinStack(x,y,r){
      var n=3, th=Math.max(1.6, r*0.42);
      for(var k=n-1;k>=0;k--){
        var oy=y+k*(th+0.9);
        for(var i=-r;i<=r;i++){                        /* the cylinder wall     */
          var e=Math.sqrt(Math.max(0,1-(i/r)*(i/r)));
          for(var j=0;j<=th;j++){
            var lit=(-i)/(r*1.2);
            put(G, x+i, oy+j+e*0.9-0.9,
                (j>=th-0.7)? M.cr : (lit>0.28? M.cl : (lit>-0.30? M.cm : M.cd)));
          }
        }
        for(var i2=-r;i2<=r;i2++){                     /* the milled edge       */
          if(((i2+k)&1)===0) continue;
          var e2=Math.sqrt(Math.max(0,1-(i2/r)*(i2/r)));
          put(G, x+i2, oy+e2*0.9-0.9, M.cr);
        }
      }
      var ty=y-(th*0.55);                              /* the top face, elliptic */
      for(var tj=-r*0.42;tj<=r*0.42;tj++) for(var ti=-r;ti<=r;ti++){
        var u=ti/r, v=tj/(r*0.42), d=u*u+v*v; if(d>1) continue;
        put(G, x+ti, ty+tj, d>0.90? M.cr : (d>0.62? M.cl : ((-u-v)>0.15? M.cl : M.cm)));
      }
    }
    function mCoin(x,y,sc,r2){
      var r=Math.max(3.0, sc*1.32);
      if(r2 && r2()<0.42) coinStack(x,y,r*0.92); else coinFace(x,y,r);
    }
    function mCard(x,y,sc,r2){                      /* the black card */
      var w2=sc*1.6, h2=sc*1.02, tilt=(r2()-0.5)*0.42;
      var ca=Math.cos(tilt), sa=Math.sin(tilt);
      for(var i=-w2;i<=w2;i++) for(var j=-h2;j<=h2;j++){
        if((Math.abs(i)>w2-1.2)&&(Math.abs(j)>h2-1.2)) continue;   /* rounded corners */
        var edge=(Math.abs(i)>=w2-0.6||Math.abs(j)>=h2-0.6);
        put(G, x+i*ca-j*sa, y+i*sa+j*ca, edge? M.kn : (((i-j)&3)===0? M.kb : M.ka));
      }
      for(var ci=-w2*0.62;ci<=-w2*0.18;ci++)        /* the chip */
        for(var cj=-h2*0.30;cj<=h2*0.22;cj++)
          put(G, x+ci*ca-cj*sa, y+ci*sa+cj*ca, ((ci+cj)&1)? M.kc : M.cd);
      for(var ni=-w2*0.55;ni<=w2*0.66;ni+=1)        /* embossed number row */
        put(G, x+ni*ca-(h2*0.56)*sa, y+ni*sa+(h2*0.56)*ca, M.kn);
    }

    if(isCashPass){
      var MR=rngFrom(form==='b'? 907 : 421);
      var anchors=[];
      for(var ma=0;ma<7;ma++){                      /* along the main limb */
        var tm=0.04+ma*0.140+(MR()-0.5)*0.05;
        var sgm=Math.min(main.length-2, Math.floor(tm*(main.length-1)));
        var fm=(tm*(main.length-1))-sgm;
        anchors.push([ main[sgm][0]+(main[sgm+1][0]-main[sgm][0])*fm,
                       main[sgm][1]+(main[sgm+1][1]-main[sgm][1])*fm, 1.0 ]);
      }
      for(var mf=0;mf<forks.length;mf++){           /* and out on the twigs */
        var tf2=forks[mf][0];
        var sf2=Math.min(main.length-2, Math.floor(tf2*(main.length-1)));
        var lf2=(tf2*(main.length-1))-sf2;
        var bx2=main[sf2][0]+(main[sf2+1][0]-main[sf2][0])*lf2;
        var by2=main[sf2][1]+(main[sf2+1][1]-main[sf2][1])*lf2;
        var aa=Math.PI+forks[mf][1], rr2=S*forks[mf][2]*(0.48+MR()*0.34);
        anchors.push([ bx2+Math.cos(aa)*rr2, by2+Math.sin(aa)*rr2, 0.80 ]);
      }
      var lastForm=-1, hung=0;
      for(var mi=0;mi<anchors.length;mi++){
        if(MR()<0.30) continue;                     /* gaps, so it is not a row */
        var ax=anchors[mi][0], ay=anchors[mi][1], asz=anchors[mi][2];
        var fmr; do { fmr=(MR()*7)|0; } while(fmr===lastForm);
        lastForm=fmr;
        var sc=Math.min(W,H)*(0.030+MR()*0.013)*asz;
        var drop=Math.round(Math.min(W,H)*(0.030+MR()*0.045));
        if(ax<sc*2.2 || ax>W-sc*2.2 || ay<4 || ay+drop+sc*3.4>H-3) continue;
        for(var dq=0;dq<drop;dq++){                 /* the thread it hangs on */
          var jx=ax+Math.round(Math.sin(dq*0.30)*0.6);
          put(G, jx, ay+dq, tkC);
          if(sc>4.2) put(G, jx+1, ay+dq, tkB);       /* two ply on the heavy ones */
        }
        var my3=ay+drop;
        if(fmr===0) mFlat(ax,my3,sc,MR);
        else if(fmr===1) mFolded(ax,my3-drop*0.10,sc);
        else if(fmr===2) mRolled(ax-sc*1.5,my3+sc*0.6,sc,MR);
        else if(fmr===3) mBundle(ax,my3+sc*0.8,sc);
        else if(fmr===4) mCoin(ax,my3+sc,sc,MR);
        else if(fmr===5) mCurled(ax,my3,sc);
        else mCard(ax,my3+sc,sc,MR);
        hung++;
      }
    }

    /* leaves growing directly off the main limb. Without these the thick two
       thirds of the branch is bare wood no matter how dense the twigs are. */
    if(isLeafPass){
      var LR=rngFrom(form==='b'? 553 : 241);
      var count=Math.round(W*0.07);
      for(var q=0;q<count;q++){
        var tq=0.06+LR()*0.90;
        var sg=Math.min(main.length-2, Math.floor(tq*(main.length-1)));
        var ff=(tq*(main.length-1))-sg;
        var mx2=main[sg][0]+(main[sg+1][0]-main[sg][0])*ff;
        var my2=main[sg][1]+(main[sg+1][1]-main[sg][1])*ff;
        var dxm=main[sg+1][0]-main[sg][0], dym=main[sg+1][1]-main[sg][1];
        var am=Math.atan2(dym,dxm)+(LR()-0.5)*2.5;
        var rad=LS*(0.9+LR()*1.5);
        var swy=Math.sin(ph0+q*0.83);
        leaf(mx2+Math.cos(am)*rad+swy*3.6, my2+Math.sin(am)*rad+Math.cos(ph0+q*0.6)*2.6,
             LS*(0.75+LR()*0.5), am+swy*0.5, PAL[(LR()*PAL.length)|0], (LR()*3)|0,
             sunAt(mx2, my2, LR()));
      }
    }
  }

  /* ================= BLOOMS AND DRIFT ======================================= */
  function petalBloom(G, kind, W, H, rnd){
    function mu(t){ return mix(t, P.umber, 0.03); }
    var cx=W/2, cy=H/2, R=Math.min(W,H)*0.42;
    var SET={
      'fb-daisy': {p:mu(P.blH), q:mu(P.blD), eye:mu(P.blG), n:8,  form:'round'},
      'fb-aster': {p:mu(P.blJ), q:mu(P.blA), eye:mu(P.blK), n:12, form:'thin'},
      'fb-rose':  {p:mu(P.blB), q:mu(P.blI), eye:mu(P.blE), n:0,  form:'spiral'},
      'fb-bell':  {p:mu(P.blF), q:mu(P.blL), eye:mu(P.blG), n:5,  form:'bell'},
      'fb-pom':   {p:mu(P.blC), q:mu(P.blD), eye:mu(P.blK), n:0,  form:'pom'}
    };
    var S=SET[kind]||SET['fb-daisy'];
    function petal(a,len,wide,t1,t2){
      var ca=Math.cos(a), sa=Math.sin(a);
      for(var d=0;d<=len;d+=0.5){
        var w=wide*Math.sin((d/len)*3.14159)+0.5;
        for(var o=-w;o<=w;o+=0.5)
          put(G, cx+ca*d - sa*o, cy+sa*d + ca*o, (d>len*0.62)? t2 : t1);
      }
    }
    if(S.form==='round'){ for(var i=0;i<S.n;i++) petal(i*(6.2832/S.n)+0.3, R*0.94, R*0.30, S.p, S.q); }
    else if(S.form==='thin'){ for(var j=0;j<S.n;j++) petal(j*(6.2832/S.n), R*1.0, R*0.15, S.p, S.q); }
    else if(S.form==='spiral'){
      for(var k=0;k<5;k++){
        var rr=R*(1-k*0.17);
        for(var a2=0;a2<6.2832;a2+=0.22){
          var x=cx+Math.cos(a2+k*0.7)*rr, y=cy+Math.sin(a2+k*0.7)*rr*0.92;
          put(G,x,y,(k%2)?S.p:S.q); put(G,x,y+1,S.q);
        }
      }
    } else if(S.form==='bell'){
      for(var b=0;b<S.n;b++) petal(b*(6.2832/S.n)-1.57, R*0.85, R*0.34, S.p, S.q);
      for(var yy=0;yy<R*0.7;yy++) put(G,cx,cy+yy,S.eye);
    } else {
      for(var ring=0;ring<4;ring++){
        var rr2=R*(0.28+ring*0.24), n2=6+ring*5;
        for(var m=0;m<n2;m++){
          var am=m*(6.2832/n2)+ring*0.4;
          var px=cx+Math.cos(am)*rr2, py=cy+Math.sin(am)*rr2*0.94;
          for(var q=-1;q<=1;q++) for(var r3=-1;r3<=1;r3++){
            if(q*q+r3*r3>2) continue;
            put(G,px+q,py+r3,(ring%2)?S.p:S.q);
          }
        }
      }
    }
    for(var ej=-2;ej<=2;ej++) for(var ei=-2;ei<=2;ei++){
      if(ei*ei+ej*ej>5) continue;
      put(G,cx+ei,cy+ej,(ei+ej<0)? mix(S.eye,P.creamLt,0.35) : S.eye);
    }
  }

  function driftLeaf(G, kind, W, H, rnd){
    function mu(t){ return mix(t, P.umber, 0.03); }
    var TONES=[mu(P.blA),mu(P.blB),mu(P.blC),mu(P.blE),mu(P.blJ),mu(P.blG)];
    var v=parseInt(kind.split('-')[1],10)||0;
    var t1=TONES[v%TONES.length], t2=TONES[(v+3)%TONES.length];
    var cx=W/2, cy=H/2, R=Math.min(W,H)*0.44;
    if(v===0||v===3){
      for(var j=-R;j<=R;j++) for(var i=-R*1.4;i<=R*1.4;i++){
        var u=i/(R*1.4), w=j/R;
        if(u*u+w*w>1) continue;
        if(Math.abs(w)>1-Math.abs(u)*0.62) continue;
        put(G,cx+i,cy+j,(i<0)?t1:t2);
      }
      for(var m2=-R*1.2;m2<=R*1.2;m2++) put(G,cx+m2,cy, mix(t1,P.umberDk,0.4));
    } else if(v===1||v===4){
      for(var a=0;a<5;a++){
        var an=-1.57+(a-2)*0.62;
        for(var d=0;d<=R*1.15;d+=0.5){
          var wd=R*0.24*Math.sin((d/(R*1.15))*3.14159)+0.6;
          for(var o=-wd;o<=wd;o+=0.5)
            put(G, cx+Math.cos(an)*d-Math.sin(an)*o, cy+Math.sin(an)*d+Math.cos(an)*o, (a%2)?t1:t2);
        }
      }
      for(var s2=0;s2<R*0.6;s2++) put(G,cx,cy+s2, mix(t2,P.umberDk,0.35));
    } else {
      for(var j2=-R;j2<=R;j2++) for(var i2=-R*1.1;i2<=R*1.1;i2++){
        var u2=i2/(R*1.1), w2=j2/R;
        if(u2*u2+w2*w2>1) continue;
        put(G,cx+i2,cy+j2, ((-u2-w2)>0.2)?t2:t1);
      }
    }
  }

  /* the stitched section seam: a sampler border row */
  function seamRow(G, kind, W, H, rnd){
    var ink=P.umberDk, mid=mix(P.umberDk,P.creamLt,0.45), soft=mix(P.umberDk,P.creamLt,0.72),
        gold=mix(P.wheat,P.umber,0.18), my=Math.floor(H/2);
    tH(G,0,W-1,my-4,mid); tH(G,0,W-1,my+4,mid);
    var period=8, amp=2;
    for(var x=0;x<W;x++){
      var ph=x%period, up=(ph<period/2)? ph : (period-ph);
      put(G,x,my-amp+up,ink); put(G,x,my-amp+up+1,ink); put(G,x,my-amp+up+2,mid);
    }
    for(var k=2;k<W;k+=period*3){ put(G,k,my-4,gold); put(G,k,my+4,gold); }
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
      case 'teasel':
        stem(G,cx,H*0.98,cx,cy+H*0.18,cx-1,cy+H*0.5,P.oliveDk,0.8);
        teasel(G,cx,cy-H*0.06,Math.round(H*0.24),rnd); break;
      case 'pine':
        pineSprig(G,cx,H*0.96,Math.round(H*0.82),-1.5708,rnd); break;
      case 'twig':
        twig(G,cx,H*0.96,Math.round(H*0.84),-1.5708,rnd); break;
      case 'grasshead':
        stem(G,cx,H*0.98,cx,cy,cx+1,cy+H*0.4,P.olive,0.8);
        grassHead(G,cx,cy,Math.round(H*0.44),-1.35,P.wheat,rnd); break;
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
      case 'ui-pay': case 'ui-card': techPay(G,W,H,rnd); break;
      case 'ui-stripe': techStripe(G,W,H,rnd); break;
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
      case 'ui-flag': case 'ui-people': case 'ui-medal': case 'ui-cart': case 'ui-tick':
        stepMotif(G, kind, W, H, rnd); break;
      case 'cosmos': case 'thistle': case 'clover': case 'chamomile': case 'tulip':
      case 'cut-brilliant': case 'cut-emerald': case 'cut-marquise': case 'cut-rose':
      case 'cut-baguette': case 'cut-trillion': case 'cut-shard': case 'cut-kite':
      case 'cut-drop': case 'cut-step': case 'cut-raw':
        chapterStone(G, kind, W, H, rnd); break;
      case 'seed-grain': case 'seed-sunflower': case 'seed-acorn': case 'seed-pinecone':
      case 'seed-bean': case 'seed-pod': case 'seed-poppy': case 'seed-burr':
      case 'seed-kernel': case 'seed-chestnut': case 'seed-husk':
        chapterSeed(G, kind, W, H, rnd); break;
      case 'sunflower': case 'bluebell': case 'flax': case 'marigold':
      case 'cornflower': case 'yarrow':
        chapterBloom(G, kind, W, H, rnd); break;
      case 'bp-a-0': case 'bp-a-1': case 'bp-a-2': case 'bp-a-3': case 'bp-a-4': case 'bp-a-5': case 'bp-a-6':
      case 'bp-b-0': case 'bp-b-1': case 'bp-b-2': case 'bp-b-3': case 'bp-b-4': case 'bp-b-5': case 'bp-b-6':
      case 'bp-c-0': case 'bp-c-1': case 'bp-c-2': case 'bp-c-3': case 'bp-c-4': case 'bp-c-5': case 'bp-c-6':
        perchPose(G, kind, W, H, rnd); break;
      case 'bd-crow': case 'bd-owl': case 'bd-wren': case 'bd-robin': case 'bd-heron':
        bird(G, kind, W, H, rnd); break;
      case 'fw-a-0': case 'fw-a-1': case 'fw-a-2': case 'fw-a-3': case 'fw-a-4': case 'fw-a-5':
      case 'fw-a-6': case 'fw-a-7': case 'fw-a-8': case 'fw-a-9': case 'fw-a-10': case 'fw-a-11':
      case 'fw-b-0': case 'fw-b-1': case 'fw-b-2': case 'fw-b-3': case 'fw-b-4': case 'fw-b-5':
      case 'fw-b-6': case 'fw-b-7': case 'fw-b-8': case 'fw-b-9': case 'fw-b-10': case 'fw-b-11':
      case 'fw-c-0': case 'fw-c-1': case 'fw-c-2': case 'fw-c-3': case 'fw-c-4': case 'fw-c-5':
      case 'fw-c-6': case 'fw-c-7': case 'fw-c-8': case 'fw-c-9': case 'fw-c-10': case 'fw-c-11':
        wingBird(G, kind, W, H, rnd); break;
      case 'wb-limb-a': case 'wb-limb-b':
      case 'wb-leaf-a-0': case 'wb-leaf-a-1': case 'wb-leaf-a-2': case 'wb-leaf-a-3':
      case 'wb-leaf-b-0': case 'wb-leaf-b-1': case 'wb-leaf-b-2': case 'wb-leaf-b-3':
        wallBranch(G, kind, W, H, rnd); break;
      case 'fb-daisy': case 'fb-aster': case 'fb-rose': case 'fb-bell': case 'fb-pom':
        petalBloom(G, kind, W, H, rnd); break;
      case 'wb-cash-a': case 'wb-cash-b':
        wallBranch(G, kind, W, H, rnd); break;
      case 'dl-0': case 'dl-1': case 'dl-2': case 'dl-3': case 'dl-4':
        driftLeaf(G, kind, W, H, rnd); break;
      case 'seam-chevron': seamRow(G, kind, W, H, rnd); break;
      default: wheatSheaf(G,cx,cy,H*0.78,rnd);
    }
    return collect(G, cols, rows, rnd,
      /^(bp-|bd-|fl-|wb-cash)/.test(kind) ? 'solid' : /^(ui-|launch)/.test(kind));
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
      // upright forms rising just above the heads (contained in frame)
      twig(G, X(0.030), H*0.52, H*0.44, -1.42, rnd);
      grassHead(G, X(0.092), H*0.44, H*0.40, dir>0?-1.16:-1.98, P.wheat, rnd);
      wheatSprig(G, X(0.128), H*0.4, H*0.36, rnd);
      // the heads themselves: seed and needle, layered largest at the outer corner
      teasel(G, X(0.050), H*0.42, Math.round(H*0.17), rnd);
      pineSprig(G, X(0.012), H*0.62, Math.round(H*0.40), dir>0?-1.25:-1.89, rnd);
      pineSprig(G, X(0.100), H*0.34, Math.round(H*0.30), dir>0?-0.85:-2.29, rnd);
      seedpod(G, X(0.115), H*0.52, Math.round(H*0.22), rnd);
      // berry / seed filler tucked between them
      berries(G, X(0.078), H*0.6, 6, P.rust,  rnd);
      berries(G, X(0.006), H*0.4, 5, P.olive, rnd);
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
      /* quantised so identical stitches share a colour key and can be drawn in
         one path. 1/64 steps on a +-0.06 jitter is a 1.5% lightness increment,
         below the visible threshold, and it collapses thousands of colour
         changes into a few dozen. */
      cc.jit=Math.round((rnd()-0.5)*0.12*64)/64;
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
    /* Batched paint. drawStitch sets strokeStyle and opens a path three times
       per stitch; at 5k stitches that is 15k state changes and 15k paths for one
       canvas. Grouping by (tone, jit) issues three per GROUP instead - same
       geometry, same colours, same result. */
    function paintBuffer(){
      bctx.clearRect(0,0,Wc,Hc);
      var groups={}, order=[];
      for(var k=0;k<total;k++){
        var c=cells[k], key=c.tone+'|'+c.jit, g=groups[key];
        if(!g){ g=groups[key]=[]; order.push(key); }
        g.push(c);
      }
      var i=cell*0.14, w=cell*0.42;
      bctx.globalAlpha=1; bctx.lineCap='round';
      for(var gi=0; gi<order.length; gi++){
        var list=groups[order[gi]], c0=list[0];
        var base=c0.jit ? (c0.jit>0? lighten(c0.tone,c0.jit) : darken(c0.tone,-c0.jit)) : c0.tone;
        var n=list.length, m, x, y;
        bctx.lineWidth=w; bctx.strokeStyle=darken(base,0.26);
        bctx.beginPath();
        for(m=0;m<n;m++){ x=list[m].c*cell; y=list[m].r*cell;
          bctx.moveTo(x+i,y+i); bctx.lineTo(x+cell-i,y+cell-i); }
        bctx.stroke();
        bctx.strokeStyle=base;
        bctx.beginPath();
        for(m=0;m<n;m++){ x=list[m].c*cell; y=list[m].r*cell;
          bctx.moveTo(x+cell-i,y+i); bctx.lineTo(x+i,y+cell-i); }
        bctx.stroke();
        bctx.lineWidth=w*0.30; bctx.strokeStyle=lighten(base,0.42);
        bctx.beginPath();
        for(m=0;m<n;m++){ x=list[m].c*cell; y=list[m].r*cell;
          bctx.moveTo(x+cell-i*1.3,y+i*1.5); bctx.lineTo(x+i*1.5,y+cell-i*1.3); }
        bctx.stroke();
      }
    }

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
