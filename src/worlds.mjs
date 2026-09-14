import { escapeHTML, STAGES, openLimit } from './domain.mjs';
import { icon } from './ui.mjs';
import { ACTIVITIES } from './data/activities.mjs';
export const WORLD_DEFINITIONS={
 existentialism:{key:'existentialism',name:'青岚问心径',tag:'溪谷 · 松林 · 双径栈道',verb:'沿溪而行，越过思想的分岔',colors:['#e9eee2','#91ac94','#385f51','#d3bf91'],points:[[158,646],[351,511],[276,321],[616,294],[748,123]],segments:['M158 646 C203 611 312 649 336 603 S264 550 351 511','M351 511 C411 459 475 460 426 415 S211 397 276 321','M276 321 C353 281 443 323 492 321 C537 319 560 304 616 294','M616 294 C672 245 818 262 787 216 S679 180 748 123'],travel:['walk','stairs','bridge','ridge'],stops:['芦苇渡口','回声石阶','松间书院','双径栈道','问心峰'],weather:'流云与松风',altitudes:[128,320,560,810,1080]},
 'ai-agents':{key:'ai-agents',name:'云端造物工坊',tag:'阶台 · 轨道 · 证据吊舱',verb:'先接通回路，再验证每一次行动',colors:['#e4eef0','#89adba','#355f74','#c49965'],points:[[170,638],[412,526],[404,308],[702,366],[764,130]],segments:['M170 638 L280 638 Q302 638 302 615 L302 554 Q302 526 332 526 L412 526','M412 526 L440 526 L440 355 Q440 308 404 308','M404 308 Q551 415 702 366','M702 366 L796 366 Q820 366 820 342 L820 165 Q820 130 764 130'],travel:['rail','lift','cable','lift'],stops:['回路工坊','工具道岔','检索平台','权限闸门','验收观测台'],weather:'铜线与云海',altitudes:[120,350,680,735,1120]},
 'critical-thinking':{key:'critical-thinking',name:'明证峡谷',tag:'样本湖 · 因果河 · 校准灯塔',verb:'让看不见的样本，也走进视野',colors:['#f0eade','#bead85','#766749','#769ca1'],points:[[157,655],[396,592],[623,422],[324,267],[713,144]],segments:['M157 655 C186 692 312 689 396 592','M396 592 C422 546 540 578 586 539 S555 465 623 422','M623 422 C708 373 563 328 502 326 S335 347 324 267','M324 267 C374 219 492 256 519 207 S652 212 713 144'],travel:['boat','switchback','bridge','stairs'],stops:['辨言码头','迷雾样本湖','因果观测镜','证据天平台','校准灯塔'],weather:'湖光与层岩',altitudes:[96,270,540,760,1040]},
 'cognitive-biases':{key:'cognitive-biases',name:'雾林辨径',tag:'苔径 · 雾桥 · 校准灯',verb:'先看见雾，再辨认路',colors:['#e7ece8','#8fa39a','#3d564c','#b7a06a'],points:[[150,660],[320,560],[480,430],[560,300],[720,150]],segments:['M150 660 C210 640 260 620 320 560','M320 560 C380 520 420 500 480 430','M480 430 C510 400 530 360 560 300','M560 300 C620 250 660 220 720 150'],travel:['walk','bridge','switchback','stairs'],stops:['雾口','样本浅滩','归因岔林','偏差观测台','校准灯'],weather:'苔雾与林隙',altitudes:[110,290,520,740,1060]},
 'ethics-intro':{key:'ethics-intro',name:'岔路盘山',tag:'石门 · 权衡桥 · 原则台',verb:'每条岔路，都在检验一条原则',colors:['#efe8dc','#b7a88a','#6b5a3e','#7d9aa0'],points:[[160,650],[300,540],[450,500],[520,340],[700,160]],segments:['M160 650 C210 620 250 600 300 540','M300 540 C360 520 400 520 450 500','M450 500 C500 470 500 400 520 340','M520 340 C580 300 640 240 700 160'],travel:['walk','fork','bridge','ridge'],stops:['困境石门','后果称量台','义务关隘','原则瞭望台','回望亭'],weather:'石径与远峰',altitudes:[100,280,510,760,1080]},
 'meme-culture':{key:'meme-culture',name:'迷因群岛',tag:'潮间带 · 分叉水道 · 漂流语库',verb:'从一点漂开，而不是爬到顶',colors:['#e4eef1','#8eb6c2','#356a7d','#c9a86a'],points:[[130,600],[300,520],[470,560],[640,470],[800,390]],segments:['M130 600 C180 580 240 540 300 520','M300 520 C360 500 420 540 470 560','M470 560 C540 540 590 500 640 470','M640 470 C700 450 750 420 800 390'],travel:['boat','boat','boat','boat'],stops:['源点小岛','脱水浅滩','变体礁群','泛化洋流','沉底语库'],weather:'潮汐与洋流',altitudes:[80,160,240,320,400]}
};
export function worldFor(id){return WORLD_DEFINITIONS[id]??WORLD_DEFINITIONS.existentialism;}
let sceneSerial=0;
function worldPine(x,y,s=1,tone='#456857'){return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 1 1-66M0-38-19-49M1-51 19-59M0-22-25-30M0-30 24-40" fill="none" stroke="#77785b" stroke-width="4"/><path d="m-23-48 10-12 21 8-3 8Zm21-12 14-14 18 14-4 6Zm-35 29 15-14 22 8-2 11Zm28-10 17-13 23 11-3 8Z" fill="${tone}"/><path d="m-5 4 13 0" stroke="#8b896e" stroke-width="3"/></g>`;}
function worldReed(x,y,s=1){return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="#9f9d70" stroke-width="2"><path d="M0 0Q3-14-4-27M6 0Q5-22 13-31M-6 1Q-4-13-14-21"/><path d="M-4-29l-2-10M13-31l3-10" stroke-width="5" stroke-linecap="round"/></g>`;}
function worldRock(x,y,s=1){return `<g transform="translate(${x} ${y}) scale(${s})"><path d="m-17 3-4-14 11-19 15-5 20 25-8 15Z" fill="#c1c5b7" stroke="#8f9d8d"/><path d="M-10-30-2-7 17 5 0 4-13-12Z" fill="#e0e0cd"/><path d="M4-35-2-7 25-10" stroke="#9baba0" fill="none"/></g>`;}
function worldPavilion(x,y,s=1,type='pavilion'){
 if(type==='tower')return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="7" rx="33" ry="9" fill="#465553" opacity=".12"/><path d="M-16 0-10-81H11L18 0Z" fill="#ebe6d3" stroke="#9c937e" stroke-width="2"/><path d="M-10-79-19-90 0-105 21-90 12-79Z" fill="#526a65"/><path d="M-25-80h48M-20-39h41" stroke="#967a54" stroke-width="4"/><path d="M-5-6v-19h11v19M-3-51v-14h7v14" fill="#658380"/><path d="M0-102v-19l28 7-28 9" fill="#bc8b58" stroke="#95704b"/></g>`;
 if(type==='observatory')return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="7" rx="47" ry="12" fill="#365b6c" opacity=".13"/><path d="M-38 0v-40h76V0Z" fill="#edf1e7" stroke="#7e9caa" stroke-width="2"/><path d="M-37-41a37 37 0 0 1 74 0Z" fill="#96b9c1" stroke="#527d8c" stroke-width="2"/><path d="M0-76v34M-35-30h72" stroke="#dde8e3" stroke-width="3"/><path d="m-7-59 24-27 21 3-28 31Z" fill="#58778a"/><path d="M-26-25h11v19h-11m26-19h11v19H0m26-19h9v19h-9" fill="#dae9e6" stroke="#7e9caa"/><path d="M-47 3h94" stroke="#a49376" stroke-width="5"/></g>`;
 if(type==='workshop')return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-38 4v-37h72V4Z" fill="#e0e9e6" stroke="#6f929a" stroke-width="2"/><path d="M-48-34-12-62 46-33Z" fill="#6f93a1"/><path d="M-22 4v-30h27V4M16-20h10v11H16" fill="#bdd8d8" stroke="#607d85"/><path d="M27-48v-35h11v40" fill="#c5d7d4" stroke="#708c91"/><path d="M-44 6h87" stroke="#a88b62" stroke-width="5"/><circle cx="-8" cy="-13" r="6" fill="#e1c68b"/></g>`;
 return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="7" rx="49" ry="11" fill="#465553" opacity=".13"/><path d="M-35 0v-50M-17 0v-47M18 0v-47M36 0v-50" stroke="#93794f" stroke-width="5"/><path d="M-42-48Q-13-55 0-80Q11-55 43-48L53-46Q28-37 0-40Q-25-37-52-46Z" fill="#416963" stroke="#35554d" stroke-width="1.5"/><path d="M-44-44Q0-35 44-44M0-77v-13" stroke="#bcb38b" stroke-width="2"/><path d="M-43 1h85M-48 7h96" stroke="#b6aa8a" stroke-width="5"/><path d="M-33-19h67" stroke="#b1976d" stroke-width="3"/><rect x="-14" y="-44" width="28" height="10" rx="2" fill="#e1cd9b"/></g>`;
}
function worldLantern(x,y){return `<g transform="translate(${x} ${y})"><path d="M0 0v-44h15" stroke="#877955" stroke-width="2"/><rect x="9" y="-42" width="13" height="19" rx="5" fill="#e0be73" stroke="#a3844d"/><circle cx="15" cy="-32" r="13" fill="#f3d38b" opacity=".17"/></g>`;}
function terrace(x,y,w=170,h=70,color='#d1d6c1',depth=90){return `<g><path d="M${x-w/2} ${y}Q${x} ${y+h} ${x+w/2} ${y}L${x+w*.29} ${y+depth}Q${x} ${y+depth+30} ${x-w*.25} ${y+depth-12}Z" fill="${color}" stroke="#60766b" stroke-opacity=".22"/><ellipse cx="${x}" cy="${y}" rx="${w/2}" ry="${h/2}" fill="#eef0df" stroke="#97a58d" stroke-width="1.5"/><path d="M${x-w*.35} ${y+20}L${x-w*.20} ${y+depth-5}M${x-w*.05} ${y+26}L${x+w*.05} ${y+depth+15}M${x+w*.32} ${y+17}L${x+w*.23} ${y+depth-2}" stroke="#899a89" stroke-opacity=".3" fill="none"/></g>`;}
function contours(d,id,color){return `<g clip-path="url(#${id})" fill="none" stroke="${color}" stroke-width="1" opacity=".26">${Array.from({length:15},(_,i)=>`<path d="${d}" transform="translate(${i*3} ${i*15}) scale(${1-i*.014})"/>`).join('')}</g>`;}
function travelerVector(){return `<g class="vector-traveler"><ellipse cy="1" rx="18" ry="5" fill="#253e3c" opacity=".16"/><g class="traveler-body"><path d="M-12-8-16-37q-7-9-2-14 4-5 8 0 7-5 11 0 6-3 10 4 6 4 5 14L11-8Z" fill="#fff9e6" stroke="#344744" stroke-width="2.6"/><path d="M-12-9h24M13-26l7 7 6-10" fill="none" stroke="#344744" stroke-width="2.6" stroke-linecap="round"/><circle cx="6" cy="-35" r="1.7" fill="#283c39"/><path d="m12-32 3 2-3 1" stroke="#283c39" fill="none" stroke-width="1.4"/><rect x="-23" y="-32" width="14" height="22" rx="5" fill="#ae9266" stroke="#695c46" stroke-width="2"/><path d="M-17-29v14M-11-39l-1 30" stroke="#756447" fill="none" stroke-width="2"/></g><path class="traveler-leg leg-a" d="M-7-8v9h-5" stroke="#344744" stroke-width="3" fill="none" stroke-linecap="round"/><path class="traveler-leg leg-b" d="M5-8v9h5" stroke="#344744" stroke-width="3" fill="none" stroke-linecap="round"/><g class="traveler-boat"><path d="M-43 1Q0 23 43 1l-12 17h-54Z" fill="#b6905b" stroke="#775d3e" stroke-width="2"/><path d="M-46 23 37-12" stroke="#886e47" stroke-width="3"/></g><g class="traveler-cabin"><path d="M-31-54H31V3H-31Z" rx="7" fill="#edf4ed" fill-opacity=".4" stroke="#476f7b" stroke-width="3"/><path d="M-36-55H36M-9-55v-17H9v17M-24-5h48" stroke="#476f7b" stroke-width="4"/><path d="M-31-52v-6h62v6" stroke="#cba677" stroke-width="6"/></g></g>`;}
function worldTerrain(w,prefix){
 const ex=w.key==='existentialism',ai=w.key==='ai-agents';const c=w.colors;
 const far='<path d="M-30 448 42 337 88 359 166 230 206 281 250 210 307 320 352 263 406 346 472 222 525 282 601 168 670 278 745 202 837 264 907 117 1034 360V790H-30Z" fill="'+c[1]+'" opacity=".14"/>';
 const overall=ex?'M55 678Q59 534 182 487L226 283 287 223 345 356 468 252 562 228 658 110 745 58 823 147 835 307 922 419 914 647Q715 751 521 754Q296 812 55 678Z':ai?'M85 709 111 611 224 536 230 416 365 219 437 243 497 479 601 496 623 234 711 88 773 64 859 171 881 391 960 522 931 701Z':'M65 705 99 620 220 491 220 294 286 207 361 183 443 352 524 313 582 168 724 90 799 200 816 391 910 481 943 659 788 733 553 714 371 783Z';
 let h=`${far}<defs><linearGradient id="${prefix}-rock" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="${c[1]}"/><stop offset=".6" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}" stop-opacity=".58"/></linearGradient><clipPath id="${prefix}-clip"><path d="${overall}"/></clipPath></defs><path d="${overall}" fill="url(#${prefix}-rock)" stroke="${c[2]}" stroke-opacity=".25" stroke-width="2"/>${contours(overall,prefix+'-clip',c[2])}`;
 if(ex){h+=`<path d="M690 163 663 258 736 342 689 448 762 606 877 674 746 746 529 798 336 796 440 729 615 683 636 596 568 481 611 413 564 328 616 246Z" fill="#c8dcda" opacity=".95"/><path d="M669 243Q668 280 694 324T641 418Q609 447 665 549T703 663Q686 700 578 724T445 799" class="flow-line" stroke="#f5f5e9" stroke-width="6" fill="none"/><path d="M218 311 284 232 279 348 369 449 291 552 307 655 177 691 121 640 200 493Z" fill="#637d67" opacity=".25"/><path d="M749 72 708 213 804 317 774 352 825 265 803 149Z" fill="#325d53" opacity=".17"/>${terrace(162,654,175,57,'#b2c4a9',57)}${terrace(345,519,192,65,'#b9c7ab',90)}${terrace(276,330,200,66,'#bbcab2',88)}${terrace(620,302,166,62,'#afc3aa',85)}${terrace(747,139,154,55,'#adc0a8',69)}`;
 h+=`<g class="suspension-bridge" fill="none" stroke="#aa8a54"><path d="M447 311Q522 377 596 302" stroke-width="7"/><path d="M447 283Q522 330 596 274" stroke-width="2"/>${Array.from({length:12},(_,i)=>{const x=451+i*12;const t=i/11;const y=312+25*Math.sin(t*Math.PI)-10*t;return `<path d="M${x} ${y}v-26" stroke-width="1.4"/>`;}).join('')}<path d="M447 282v45M596 272v44" stroke-width="4"/></g>`;
 [[210,610,.8],[235,567,.66],[321,427,.72],[481,458,.95],[516,387,.62],[184,379,.7],[352,303,.76],[630,215,.74],[810,280,.72],[789,593,.76],[127,687,.8],[780,101,.47],[84,646,.56]].forEach(p=>h+=worldPine(...p));
 h+=worldPavilion(291,308,.74)+worldPavilion(750,117,.7,'tower')+worldPavilion(378,502,.54)+worldLantern(651,300)+worldReed(130,681,1)+worldReed(493,749,.8)+worldRock(231,608,.8);
 } else if(ai){h+=`<path d="M443 276 479 392 468 701 549 743 626 686 642 464 596 417 563 581 529 662Z" fill="#8eacb6" opacity=".35"/><path d="M718 100 710 240 797 321 772 526 840 582 879 468 843 193Z" fill="#577c90" opacity=".23"/>${terrace(175,646,218,65,'#b7ccd0',79)}${terrace(415,535,222,62,'#b4c9ce',122)}${terrace(407,319,227,66,'#b7cbd0',142)}${terrace(706,376,228,76,'#b3c7cd',186)}${terrace(764,146,204,60,'#a4bfc8',131)}<path d="M170 659H293Q319 659 319 630V562H403M433 526V316M705 382H836V151H767" fill="none" stroke="#82989a" stroke-width="10"/><path d="M170 659H293Q319 659 319 630V562H403M433 526V316M705 382H836V151H767" fill="none" stroke="#cfad71" stroke-width="3" stroke-dasharray="3 10"/><path d="M390 269Q548 365 718 324" fill="none" stroke="#42697d" stroke-width="3"/><path d="M398 317v-58M712 369v-54" stroke="#71909b" stroke-width="7"/>`;
 h+=worldPavilion(178,627,.75,'workshop')+worldPavilion(407,302,.68,'observatory')+worldPavilion(765,126,.78,'observatory')+worldPavilion(714,356,.6,'workshop');
 h+=`<g transform="translate(350 519)"><rect x="-18" y="-47" width="36" height="44" rx="4" fill="#e2ecde" stroke="#6e8d91" stroke-width="2"/><circle cy="-26" r="11" fill="#b6d6c9" stroke="#779d92"/><path d="M-25 0h50M0-50v-17" stroke="#997957" stroke-width="4"/></g><g class="world-wheel" transform="translate(735 361)"><circle r="28" fill="#cbdcdb" stroke="#6c939c" stroke-width="4"/><g class="wheel-rotor">${[0,45,90,135].map(a=>`<path d="M-23 0H23" stroke="#658590" stroke-width="3" transform="rotate(${a})"/>`).join('')}</g><circle r="6" fill="#b58e52"/></g>`;
 [[260,669,.6],[262,465,.66],[570,656,.8],[879,459,.73],[821,127,.44],[506,312,.58]].forEach(p=>h+=worldPine(...p,'#6e9290'));h+=worldRock(926,627,.9)+worldLantern(262,640);
 }else{h+=`<path d="M621 235Q519 255 596 345T584 456Q414 421 453 503T345 621Q246 643 99 721L344 764Q493 708 512 636T600 549Q687 537 658 453T687 317Z" fill="#accccd"/><path class="flow-line" d="M616 270Q583 300 620 371T580 480Q460 474 488 543T344 688Q245 704 187 733" fill="none" stroke="#eef0df" stroke-width="5"/><path d="M272 225 306 245 274 326 343 410 293 505 178 594 227 352Z" fill="#8e8265" opacity=".2"/><path d="M711 104 676 226 731 342 681 449 752 492 805 405 781 223Z" fill="#958260" opacity=".2"/>${terrace(166,666,208,64,'#d8c8a6',50)}${terrace(396,605,188,68,'#c9bd9b',58)}${terrace(625,433,194,60,'#c8bb98',116)}${terrace(323,278,203,63,'#c9bc9a',131)}${terrace(715,154,207,58,'#c6b892',94)}<path d="M327 630Q360 645 400 618" stroke="#a88752" stroke-width="14" fill="none"/><path d="M327 619Q360 632 400 607" stroke="#9c8154" stroke-width="2" fill="none"/>`;
 h+=worldPavilion(165,650,.63)+worldPavilion(715,139,.82,'tower')+worldPavilion(326,265,.62);
 h+=`<g transform="translate(626 414)"><path d="M-16 0 0-38 19 0M0-34l21-27" stroke="#9a835d" stroke-width="5" fill="none"/><path d="M4-46 27-75 42-64 18-36Z" fill="#88abae" stroke="#597d83" stroke-width="2"/><ellipse cx="33" cy="-70" rx="9" ry="4" fill="#456570" transform="rotate(33 33 -70)"/></g><g transform="translate(352 263)" fill="none" stroke="#9b8254" stroke-width="2"><path d="M0 0v-55M-37-37H37M-32-35l-9 23h19ZM31-35 20-12h23ZM-19 1h38"/><circle cy="-39" r="4" fill="#b29152"/></g>`;
 [[228,635,.55],[296,658,.6],[344,550,.62],[479,398,.57],[271,241,.69],[756,570,.77],[877,597,.7],[769,125,.46]].forEach(p=>h+=worldPine(...p,'#7c876b'));[[112,695,1],[470,663,.9],[587,481,.7]].forEach(p=>h+=worldReed(...p));h+=worldRock(775,474,1);
 }
 return h;
}

/* Procedural scenery: seeded scatter + contours + weather. Deterministic per world key. */
function seedFrom(key){
  let h=2166136261;for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619);}
  return ()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return ((h>>>0)%10000)/10000;};
}
function catmullPoint(pts,t){
  const n=pts.length-1,s=Math.min(n-1,Math.floor(t*n)),u=t*n-s;
  const p0=pts[Math.max(0,s-1)],p1=pts[s],p2=pts[Math.min(n,s+1)],p3=pts[Math.min(n,s+2)];
  const u2=u*u,u3=u2*u;
  return [
    0.5*((2*p1[0])+(-p0[0]+p2[0])*u+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*u2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*u3),
    0.5*((2*p1[1])+(-p0[1]+p2[1])*u+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*u2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*u3)
  ];
}
function contourPath(pts,offsetY,amp,rnd){
  const steps=28;let d='';
  for(let i=0;i<=steps;i++){
    const t=i/steps,p=catmullPoint(pts,t);
    const wob=Math.sin(t*9+rnd()*6)*amp+Math.sin(t*17)*amp*.35;
    const x=p[0]+ (t-.5)*40, y=p[1]+offsetY+wob;
    d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);
  }
  return d;
}
function scatterDecor(w,prefix,rnd){
  const tone=w.colors[1],dark=w.colors[2],parts=[];
  const n=18+Math.floor(rnd()*10);
  for(let i=0;i<n;i++){
    const t=rnd(),base=catmullPoint(w.points,t);
    const x=base[0]+(rnd()-.5)*220;
    const y=base[1]+40+rnd()*160;
    if(x<20||x>980||y<80||y>760)continue;
    const s=.45+rnd()*.75;
    const kind=rnd();
    if(kind<.42){
      // pine cluster
      const h=28*s, wdt=16*s;
      parts.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})" opacity="${(.35+rnd()*.35).toFixed(2)}"><path d="M0 0v-10" stroke="#7a7a5e" stroke-width="2"/><path d="M0-10l-${wdt.toFixed(0)} 12h${(wdt*2).toFixed(0)}Z" fill="${tone}"/><path d="M0-22l-${(wdt*.7).toFixed(0)} 12h${(wdt*1.4).toFixed(0)}Z" fill="${dark}" opacity=".75"/></g>`);
    }else if(kind<.7){
      // rock
      const rx=8+rnd()*10,ry=5+rnd()*6;
      parts.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${tone}" opacity="${(.2+rnd()*.25).toFixed(2)}"/>`);
    }else{
      // reed / marker post
      const h=14+rnd()*22;
      parts.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" opacity="${(.3+rnd()*.3).toFixed(2)}" stroke="${dark}" stroke-width="1.2" fill="none"><path d="M0 0q3-${h*.5} -2-${h}"/><path d="M4 0q2-${h*.6} 6-${h}"/><path d="M-4 1q-1-${h*.4} -8-${h*.8}"/></g>`);
    }
  }
  return parts.join('');
}
function contourLayer(w,prefix){
  const rnd=seedFrom(w.key+'-contour');
  const paths=[];
  for(let i=0;i<7;i++){
    const off=18+i*22;
    const amp=4+i*1.4;
    const op=(0.14-i*0.012).toFixed(3);
    paths.push(`<path d="${contourPath(w.points,off,amp,rnd)}" fill="none" stroke="${w.colors[2]}" stroke-opacity="${op}" stroke-width="1"/>`);
  }
  return `<g class="proc-contours" aria-hidden="true">${paths.join('')}</g>`;
}
function weatherLayer(w,prefix){
  const kind=w.key;
  if(kind==='cognitive-biases'){
    // drifting fog banks + motes
    let motes='';
    const rnd=seedFrom(w.key+'-motes');
    for(let i=0;i<28;i++){
      const x=40+rnd()*920,y=80+rnd()*650,r=1+rnd()*2.4,d=(6+rnd()*10).toFixed(1),delay=(rnd()*8).toFixed(1);
      motes+=`<circle class="proc-mote" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${w.colors[2]}" opacity=".2" style="animation-duration:${d}s;animation-delay:-${delay}s"/>`;
    }
    return `<g class="proc-weather proc-fog" aria-hidden="true">
      <ellipse class="proc-fog-bank" cx="280" cy="420" rx="220" ry="40" fill="#fff" opacity=".18"/>
      <ellipse class="proc-fog-bank b2" cx="620" cy="300" rx="260" ry="36" fill="#fff" opacity=".14"/>
      <ellipse class="proc-fog-bank b3" cx="480" cy="560" rx="300" ry="48" fill="#fff" opacity=".2"/>
      ${motes}
    </g>`;
  }
  if(kind==='ethics-intro'){
    // dust motes + fork glyphs
    let motes='';
    const rnd=seedFrom(w.key+'-dust');
    for(let i=0;i<18;i++){
      const x=60+rnd()*880,y=100+rnd()*600;
      motes+=`<circle class="proc-mote" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.8+rnd()*1.6).toFixed(1)}" fill="${w.colors[2]}" opacity=".18" style="animation-duration:${(8+rnd()*10).toFixed(1)}s;animation-delay:-${(rnd()*6).toFixed(1)}s"/>`;
    }
    const forks=w.points.slice(0,4).map((p,i)=>{
      const x=p[0]+((i%2)?48:-52), y=p[1]-10;
      return `<g class="proc-fork" transform="translate(${x} ${y})" opacity=".35" fill="none" stroke="${w.colors[2]}" stroke-width="1.4"><path d="M0 12V0M0 0l-10-12M0 0l10-12"/><circle cy="-18" r="3"/></g>`;
    }).join('');
    return `<g class="proc-weather proc-dust" aria-hidden="true">${motes}${forks}</g>`;
  }
  if(kind==='meme-culture'){
    // tide rings + drifting buoys
    let buoys='';
    const rnd=seedFrom(w.key+'-buoy');
    for(let i=0;i<10;i++){
      const x=80+rnd()*840,y=200+rnd()*420,d=(5+rnd()*7).toFixed(1);
      buoys+=`<g class="proc-buoy" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" style="animation-duration:${d}s;animation-delay:-${(rnd()*5).toFixed(1)}s"><circle r="3.5" fill="${w.colors[3]}" opacity=".55"/><circle r="7" fill="none" stroke="${w.colors[2]}" stroke-opacity=".25" stroke-width="1"/></g>`;
    }
    let rings='';
    w.points.forEach((p,i)=>{
      rings+=`<ellipse class="proc-tide" cx="${p[0]}" cy="${p[1]+8}" rx="${30+i*8}" ry="${10+i*2}" fill="none" stroke="${w.colors[2]}" stroke-opacity=".18" stroke-width="1" style="animation-delay:${(i*0.4).toFixed(1)}s"/>`;
    });
    return `<g class="proc-weather proc-tide-wrap" aria-hidden="true">${rings}${buoys}</g>`;
  }
  // default: soft birds / pollen
  let pollen='';
  const rnd=seedFrom(w.key+'-pollen');
  for(let i=0;i<14;i++){
    pollen+=`<circle class="proc-mote" cx="${(60+rnd()*880).toFixed(1)}" cy="${(120+rnd()*520).toFixed(1)}" r="${(1+rnd()*1.5).toFixed(1)}" fill="${w.colors[3]}" opacity=".3" style="animation-duration:${(7+rnd()*8).toFixed(1)}s;animation-delay:-${(rnd()*5).toFixed(1)}s"/>`;
  }
  return `<g class="proc-weather" aria-hidden="true">${pollen}</g>`;
}
function ridgeSilhouettes(w,prefix){
  const rnd=seedFrom(w.key+'-ridge');
  const layers=[];
  for(let L=0;L<3;L++){
    const depth=1-L*0.28;
    let d=`M-40 ${720-L*30}`;
    for(let i=0;i<=12;i++){
      const x=-40+i*90;
      const peak=220+L*80+rnd()*120;
      const y=720-L*40-peak*depth*(0.55+rnd()*0.45);
      d+=` L${x.toFixed(0)} ${y.toFixed(0)}`;
    }
    d+=` L1040 ${760-L*20} Z`;
    layers.push(`<path d="${d}" fill="${w.colors[1]}" opacity="${(0.08+L*0.04).toFixed(2)}"/>`);
  }
  return `<g class="proc-ridges" aria-hidden="true">${layers.join('')}</g>`;
}
function proceduralScenery(w,prefix,seed=''){
  const salt=String(seed||'');
  const rnd=seedFrom(w.key+'-scatter-'+salt);
  return ridgeSilhouettes(w,prefix+salt)+contourLayer(w,prefix)+`<g class="proc-scatter" aria-hidden="true">${scatterDecor(w,prefix,rnd)}</g>`+weatherLayer(w,prefix);
}
export function terrainScene(plan,completed=0,{interactive=true,small=false,walking=false,seed='',done:doneNodes}={}){const __open=openLimit(completed);
  // done 是逐站布尔数组（下标=站点），不是索引集合
  const __doneArr=Array.isArray(doneNodes)?doneNodes:[];
  const __isDone=(i)=>__doneArr[i]===true;
 const w=worldFor(plan.id),prefix='world-'+w.key+'-'+(++sceneSerial),c=Math.min(completed,4),pos=w.points[c];
 const mistOpacity=completed===5?.13:Math.max(.18,.48-completed*.07);
 const seedVal=String(seed||'').slice(0,16);
 return `<div class="mountain-scene terrain-scene theme-${w.key} proc-seed-${seedVal||'base'} ${small?'is-small':''} ${walking?'is-walking':''}" data-scene="mountain" data-world="${w.key}" data-seed="${seedVal}" data-travel="walk" style="--world-ink:${w.colors[2]};--world-tint:${w.colors[0]};--world-accent:${w.colors[3]}"><svg class="terrain-svg" viewBox="0 0 1000 800" role="img" aria-label="${escapeHTML(w.name)}：五个按顺序开放的营地"><defs><radialGradient id="${prefix}-sun"><stop stop-color="#eed3a5" stop-opacity=".7"/><stop offset="1" stop-color="#f2dcb0" stop-opacity=".03"/></radialGradient><linearGradient id="${prefix}-mist" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#fbf9ef" stop-opacity="0"/><stop offset=".5" stop-color="#fbf9ef" stop-opacity=".85"/><stop offset="1" stop-color="#fbf9ef" stop-opacity="0"/></linearGradient></defs><circle cx="827" cy="128" r="105" fill="url(#${prefix}-sun)"/><g class="terrain-land">${worldTerrain(w,prefix)}</g><g class="proc-layer">${proceduralScenery(w,prefix,seedVal)}</g><g class="terrain-trails">${w.segments.map((d,i)=>`<path class="terrain-trail-shadow" d="${d}"/><path id="${small?prefix+'-':''}trail-${i}" class="trail-base" d="${d}"/><path class="trail-done ${i<completed?'is-complete':''}" data-trail="${i}" d="${d}" pathLength="1" style="--path:${i<completed?0:1}"/>${i<completed?`<path class="trail-signal" d="${d}"/>`:''}`).join('')}${w.points.map((p,i)=>`<g transform="translate(${p[0]} ${p[1]})"><ellipse cy="5" rx="23" ry="9" fill="${i<=completed?w.colors[2]:'#87908b'}" opacity=".13"/><circle r="${i===completed?12:8}" fill="${i<=completed?w.colors[2]:'#f8f6ed'}" stroke="${w.colors[2]}" stroke-width="2"/><circle class="current-ring ${i===completed?'active':''}" r="22" fill="none" stroke="${w.colors[2]}" stroke-opacity=".35"/><text y="3.5" text-anchor="middle" fill="${i<=completed?'#fff':'#78877a'}" font-size="10" font-family="sans-serif">${i<completed?'✓':i+1}</text></g>`).join('')}</g><g class="world-mist" style="opacity:${mistOpacity}"><path d="M-130 420Q118 354 265 410T658 411T1130 398V449Q837 415 690 465T280 446T-130 466Z" fill="url(#${prefix}-mist)"/><path d="M-190 655Q105 583 353 636T790 645T1180 650V733H-190Z" fill="url(#${prefix}-mist)"/></g><g class="terrain-birds" fill="none" stroke="${w.colors[2]}" stroke-width="2" opacity=".55"><path d="M164 165q8-11 18 0 9-11 17 0M203 140q5-7 11 0 7-7 12 0M555 127q5-7 11 0 7-7 12 0"/></g><g id="${small?prefix+'-':''}traveler-position" transform="translate(${pos[0]} ${pos[1]-8})">${travelerVector()}</g><text class="map-coordinate" x="59" y="759">${w.name} / 知识地形</text><g transform="translate(913 692)" class="map-compass"><circle r="30" fill="none" stroke="${w.colors[2]}" opacity=".35"/><path d="M0-25 7 11 0 5-7 11Z" fill="${w.colors[2]}"/><text y="-39" text-anchor="middle" fill="${w.colors[2]}" font-size="11">N</text></g></svg>${w.points.map((p,i)=>`<${interactive?'button':'div'} class="station terrain-station ${__isDone(i)?'done':i===completed?'current':i<=__open?'open':'locked'}" ${interactive?`data-action="station" data-index="${i}" aria-label="${i<=__open?(__isDone(i)?'重访':'进入'):'预览'}${escapeHTML(w.stops[i])}"`:''} style="left:${p[0]/10}%;top:${p[1]/8}%"><span class="terrain-station-top"><span class="station-index">${__isDone(i)?icon('check'):i<=__open?i+1:icon('lock')}</span><strong>${w.stops[i]}</strong><small>${String(i+1).padStart(2,'0')}</small></span><span class="terrain-station-desc">${escapeHTML(plan.nodes[i]?.short??STAGES[i])}</span></${interactive?'button':'div'}>`).join('')}${interactive?`<button class="world-specimen" data-action="open-activity" data-index="${c}">${icon('compass')}<span>本营地的探索装置</span>${icon('arrow')}</button>`:''}<span class="world-height">${w.altitudes[c]} <small>m · 示意海拔</small></span></div>`;
}
export function terrainThumbnail(plan){const w=worldFor(plan?.id),p='thumb-'+(++sceneSerial);return `<div class="little-mountain terrain-thumb theme-${w.key}" aria-hidden="true"><svg viewBox="0 0 1000 800">${worldTerrain(w,p)}<path d="${w.segments.join(' ')}" fill="none" stroke="${w.colors[2]}" stroke-width="8" stroke-opacity=".7"/>${w.points.map((v,i)=>`<circle cx="${v[0]}" cy="${v[1]}" r="12" fill="${i===0?w.colors[2]:'#fbf7e9'}" stroke="${w.colors[2]}" stroke-width="4"/>`).join('')}</svg></div>`;}