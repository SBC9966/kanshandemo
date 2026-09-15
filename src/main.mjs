// 由打包产物恢复到的一次性修复：main.mjs 曾被误清空（源内容取自上一版 index.html 的内联脚本，
// 打包只剥掉 import/export，因此函数体与原文件逐字节一致；这里按各模块导出与使用情况重建了 import 行）。
import { ASSETS } from './assets.mjs';
import { SOURCE_BY_ID } from './data/knowledge.mjs';
import { activityFor } from './data/activities.mjs';
import { STORAGE_KEY,STAGES,EMPTY_STATE,clone,escapeHTML,canOpen,nodeDone,doneCount,completeNode,createJourney,validateMountain,normalizeState,matchTopic } from './domain.mjs';
import { MOUNTAINS } from './data/content.mjs';
import { retrieveKnowledge,validateKnowledge } from './knowledge-engine.mjs';
import { activityPassed,reduceActivity } from './activity-engine.mjs';
import { icon,art,button,tag,dialogHTML } from './ui.mjs';
import { worldFor } from './worlds.mjs';
import { box,label,ease } from './diorama/core.mjs';
import { MOUNTAIN } from './diorama/mountains/field.mjs';
import { mountScene3D } from './scene3d.mjs';
import { guideShellHTML, guideAnswer, guideContextLine, guideQuickAsks, guideTip, zhihuDirectHTML, ZHIDA_MODEL_NAME, ZHIDA_MODEL_WAIT } from './rag-guide.mjs';
import { ZHIHU_SNAPSHOT } from './data/zhihu-snapshot.mjs';
import { activityHTML,updateLiveActivity } from './activities-ui.mjs';
import { navHTML,footerHTML,askHTML,generateHTML,journeyHTML,collectionHTML } from './pages.mjs';
import { sourceDetailsHTML,compareSourcesHTML,libraryHTML,localGuideHTML,homeHTMLV2,mountainHTMLV2,readHTMLV2,fieldbookHTML,summitHTMLV2 } from './pages-v2.mjs';
const app=document.getElementById('app'),dialog=document.getElementById('dialog'),toastEl=document.getElementById('toast');
let state=clone(EMPTY_STATE),storageWarned=false,stateLoadFailed=false;
// 记录读取失败（损坏 JSON / 浏览器禁用本地存储）以前是静默 catch：用户会以为进度被清空。这里留着如实说明。
try{state=normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)),MOUNTAINS.map(m=>m.id));}catch(err){stateLoadFailed=true;console.warn('本地学习记录读取失败',err);}
const ctx={state,view:'home',mountain:MOUNTAINS[0],journey:null,node:0,api:false,sound:false,ask:{id:'existentialism',step:0,prefs:{goal:'从零入门',focus:'概念与脉络',pace:'漫游 · 25 分钟'}},generation:null,ui:{zoom:1,panX:0,panY:0,readTab:'experience',zhihuLive:null,zhihuConfigured:null,sceneSeed:''}};
let lastRoute='',generationToken=0,generationAbort=null,walkingFrame=0,toastTimer,previousFocus,pendingImport=null,audio=null,noteTimer,railTimer=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function currentPlan(id){return MOUNTAINS.find(m=>m.id===id)??state.journeys[id]?.plan;}
function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{if(!storageWarned){storageWarned=true;toast('浏览器未允许本地保存。本次仍可体验，请用「导出学习记录」备份。','info');}}}
function track(type,id){state.events.push({type,id,at:Date.now()});state.events=state.events.slice(-100);}
function toast(message,type='check'){clearTimeout(toastTimer);toastEl.innerHTML=icon(type)+`<span>${escapeHTML(message)}</span>`;toastEl.classList.add('visible');toastTimer=setTimeout(()=>toastEl.classList.remove('visible'),3600);}
function openDialog(title,body,footer='',cls=''){previousFocus=document.activeElement;dialog.className=cls;dialog.innerHTML=dialogHTML(title,body,footer);if(!dialog.open)dialog.showModal();ensureZhihuSource();}
function closeDialog(){if(dialog.open)dialog.close();try{previousFocus?.focus({preventScroll:true});}catch{}}
function go(path){closeDialog();if(location.hash==='#'+path)render();else location.hash=path;}
function ensureJourney(id){if(!state.journeys[id]){state.journeys[id]=createJourney(id,ctx.ask.prefs,id);saveState();}return state.journeys[id];}
function prepareAsk(id,topic=''){ctx.ask={id,step:0,topic,prefs:{goal:'从零入门',focus:'概念与脉络',pace:'漫游 · 25 分钟'}};go('/ask/'+id);}
function route(){let parts;try{parts=decodeURIComponent(location.hash.slice(1)||'/').split('/').filter(Boolean);}catch{parts=[];}
 let view=parts[0]??'home',id=parts[1];if(view==='')view='home';if(!['home','ask','generate','mountain','read','journey','collection','summit','library','fieldbook'].includes(view))view='home';
 if(view==='generate'&&!ctx.generation){go('/');return null;}
 if(['ask','mountain','read','summit','generate'].includes(view)){
  let plan=currentPlan(id);
  if(id==='custom'&&(view==='ask'||view==='generate')&&ctx.ask.topic){plan={id:'custom',title:ctx.ask.topic,subtitle:'让你的好奇长成一条路径',color:'sage',nodes:STAGES.map(s=>({short:s,title:s})),tags:[],category:'自选主题'};}
  if(!plan){go('/');toast('这座山暂时不在本机。先从一座已开放的山开始。','info');return null;}
  ctx.mountain=plan;
  if(view==='mountain'&&parts[2]==='3d')ctx.ui.scene3d=true;
  if(view==='ask'&&ctx.ask.id!==id){ctx.ask={id,step:0,prefs:{goal:'从零入门',focus:'概念与脉络',pace:'漫游 · 25 分钟'}};}
  if(['mountain','read','summit'].includes(view)){
   ctx.journey=ensureJourney(id);
   if(view==='read'){
    const n=Number(parts[2]);if(!Number.isInteger(n)||!canOpen(ctx.journey,n)){go('/mountain/'+id);toast('先完成前一个营地，就能走到这里。','lock');return null;}ctx.node=n;
   }
   if(view==='summit'&&ctx.journey.completed<5){go('/mountain/'+id);toast('再走几步，山顶就在前面。','flag');return null;}
  }
 }
 return view;
}
function render(preserveScroll=false){const scroll=window.scrollY;const newRoute=location.hash;const changed=lastRoute!==newRoute;
 if(changed){if(ctx.generation&&!newRoute.startsWith('#/generate/')){generationToken++;generationAbort?.abort();ctx.generation=null;}if(ctx.ui.walking&&!newRoute.startsWith('#/mountain/'))stopWalk();ctx.ui.readTab='experience';ctx.ui.quizSelected=undefined;ctx.ui.expanded={};ctx.ui.zoom=1;ctx.ui.panX=0;ctx.ui.panY=0;}
 const view=route();if(!view)return;ctx.view=view;lastRoute=newRoute;
 document.documentElement.classList.toggle('reduce-motion',!state.settings.motion);
 document.documentElement.dataset.scene=state.settings.scene;
 const pages={home:homeHTMLV2,ask:askHTML,generate:generateHTML,mountain:mountainHTMLV2,read:readHTMLV2,journey:journeyHTML,collection:collectionHTML,summit:summitHTMLV2,library:libraryHTML,fieldbook:fieldbookHTML};
 app.innerHTML=navHTML(ctx)+pages[view](ctx)+(view==='read'||view==='generate'?'':footerHTML())+`<button class="floating-guide" data-action="knowledge-guide" aria-label="向本地知识库提问">${icon('help')}<span>问问向导</span></button>`;
 if(changed)app.querySelector('main')?.classList.add('page-enter');
 document.title=(view==='home'?'看山不是山 · 让知识有路径':view==='read'?ctx.mountain.nodes[ctx.node].title:view==='journey'?'我的山途':view==='collection'?'我的收藏':view==='library'?'山间资料馆':view==='fieldbook'?'理解图谱':ctx.mountain.title+' · 看山不是山');
 if(!preserveScroll&&changed)window.scrollTo({top:0,behavior:'instant'});else if(preserveScroll)window.scrollTo({top:scroll,behavior:'instant'});
 if(changed&&view!=='home'){const h=app.querySelector('h1');if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true});}}
 bindScene();
}
function refreshSoundButton(){document.querySelectorAll('.sound-button').forEach(b=>{b.innerHTML=icon(ctx.sound?'volume':'mute');b.classList.toggle('on',ctx.sound);b.setAttribute('aria-pressed',String(ctx.sound));b.setAttribute('aria-label',(ctx.sound?'关闭':'开启')+'山间环境音');});}
async function toggleSound(){try{
 if(ctx.sound){await audio?.context.suspend();ctx.sound=false;refreshSoundButton();toast('山间安静了下来。','mute');return;}
 if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('unsupported');const ac=new Audio();const buffer=ac.createBuffer(1,ac.sampleRate*3,ac.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+0.025*(Math.random()*2-1))/1.025;data[i]=last*2.7;}const noise=ac.createBufferSource();noise.buffer=buffer;noise.loop=true;const low=ac.createBiquadFilter();low.type='lowpass';low.frequency.value=530;const gain=ac.createGain();gain.gain.value=.085;noise.connect(low).connect(gain).connect(ac.destination);noise.start();audio={context:ac,gain};}
 await audio.context.resume();ctx.sound=true;refreshSoundButton();toast('山间的风，来了。再次点击可关闭。','volume');
 }catch{toast('当前浏览器暂时无法播放环境音。','info');}}
function guide(step=0){ctx.ui.guideStep=step;const entries=[['从好奇出发','选择一座为你推荐的山，或在首页写下想弄明白的事。当前内置三座完整知识山。','compass'],['看见全貌，再向上走','所有营地的标题都能预览。知识内容按五层解锁：认识、背景、核心、分歧、延伸。','layers'],['停一小步，确认理解','每个营地都有自己的互动实验、短导读与来源。先亲手试一试，再完成理解确认，旅行者才会走向下一站。','foot'],['留下你自己的声音','笔记自动保存，收藏可以重访。走完五层还能导出山顶卡片。所有进度默认只保存在这台设备。','pen']];const e=entries[step];openDialog(e[0],`<div class="guide-dialog-art">${art(step===3?'traveler-flag':'traveler-point')}${icon(e[2])}</div><p class="dialog-description">${e[1]}</p><div class="guide-dots">${entries.map((_,i)=>`<span class="${i===step?'active':''}"></span>`).join('')}</div><div class="notice-box">演示内容不会伪装成知乎真实帖子。未接入接口时，生成过程只处理本地主题与偏好。</div>`,`${step>0?button('上一步','guide-prev','secondary','','back'):button('稍后再看','close-dialog','secondary','','')}${button(step===3?'出发吧':'继续看看',step===3?'guide-finish':'guide-next','primary')}`);}
function showSettings(){openDialog('按你的节奏，慢慢走。',`<div class="settings-list"><div><span><strong>山间时光</strong><small>只改变光色，不影响学习进度</small></span><div class="segmented"><button data-action="scene" data-value="morning" class="${state.settings.scene==='morning'?'selected':''}">${icon('sun')} 晨光</button><button data-action="scene" data-value="evening" class="${state.settings.scene==='evening'?'selected':''}">${icon('moon')} 暮色</button></div></div><div><span><strong>云雾与行走动画</strong><small>同时尊重系统「减少动态效果」偏好</small></span><button class="switch ${state.settings.motion?'on':''}" data-action="motion" role="switch" aria-checked="${state.settings.motion}" aria-label="云雾与行走动画"><i></i></button></div></div><section class="settings-backup"><h3>${icon('shield')} 你的脚印，属于你</h3><p>默认只保存在当前浏览器。清理浏览器数据或更换设备前，建议先导出。</p><div>${button('导出学习记录','export-state','secondary','','download')}${button('导入记录','import-state','secondary','','upload')}</div></section><section class="settings-backup"><h3>${icon('spark')} AI 接入状态</h3><p>${ctx.api?'服务端已检测到模型配置。你可以在首页输入新的主题，真实生成五层内容。':'目前是离线策展模式：三座山均可完整登顶。不需要 API Key，也不会上传学习记录。工程中附有可选的服务端接口。'}</p>${button('重新检测接口','check-api','text-button','','refresh')}</section><button class="danger-link" data-action="reset-all">清除本机全部学习记录</button>`);}
function showAbout(){openDialog('风景不是终点，理解才是。',`<p class="dialog-description">「看山不是山」v2 将五层知识路径、真实资料索引与可操作的学习实验连接起来。三座山有各自的地形、路线与任务，而不是同一张地图的三个标题。</p><div class="about-grid"><div>${icon('compass')}<strong>三种地形</strong><small>问心径 / 造物工坊 / 明证峡谷</small></div><div>${icon('layers')}<strong>十五个真实交互</strong><small>分类、排序、样本、工具、校准</small></div><div>${icon('book')}<strong>三十六条资料</strong><small>逐条说明来源与实际访问范围</small></div></div><div class="notice-box">知乎黑客松独立作品，不代表知乎官方产品。24 条知乎资料为检索索引与讨论入口；12 条公开参考读取了相关页面。没有登录知乎、复制回答全文或读取私人画像。</div>`,button('打开山间资料馆','library-open','primary','','book'));}

function showSources(){go('/library');}

function showMode(){openDialog(ctx.api?'本地知识库 + 可选模型接口':'当前：本地知识库与互动实验',`<div class="notice-box">36 条可追溯资料、24 条预编问答、15 个营地实验。检索、分类、概率计算、工具调用和权限校验都在本机执行，不将它们伪装成实时大模型。</div><p class="dialog-description">知乎内容只取得了检索标题与部分摘要；每条卡片都能查看访问范围。公开资料用于核对概念。本项目的导读与教学数据是另行编写，不是原文复制。</p><p class="dialog-description">${ctx.api?'服务端已配置模型，新主题可发起实际请求。':'工程可选择配置服务端模型来生成新主题；默认无需 API Key。'}未知主题不会被替换成已存在的山，个人手记不会发送给模型。</p>`,button('看看资料','library-open','primary','','book'));}

function lockedPreview(i){const m=ctx.mountain,c=ctx.journey.completed,node=m?.nodes?.[i];if(!node)return;openDialog('更高处的风景，先看一眼。',`<div class="locked-preview-icon">${icon('lock')}</div><span class="tag">${STAGES[i]}</span><h3 class="preview-title">${escapeHTML(node.title)}</h3><p class="dialog-description">这个营地将在完成前面的路径后开放。你能预览标题，但不需要越过尚未理解的概念。</p><div class="notice-box">${icon('foot')} 当前可以前往：${escapeHTML(m.nodes[Math.min(c,4)].title)}</div>`,button('回到当前营地','read-current','primary'));}
async function handleTopic(value){const q=String(value??'').trim();if(!q){toast('写下一个好奇，或选一座推荐的山。','compass');document.getElementById('topic-input')?.focus();return;}const m=matchTopic(q,MOUNTAINS);if(m){prepareAsk(m.id,q);return;}
 openDialog('这份好奇，值得认真对待。',`<blockquote class="query-quote">${escapeHTML(q)}</blockquote><p class="dialog-description">${ctx.api?'当前已连接真实模型，可以为这个新主题创建五层内容。生成的材料会标明「AI 生成 · 未外部核验」。':'离线版目前开放三座完整知识山。我们不会把任意输入悄悄替换成「存在主义」，也不会假装已搜索知乎。你可以先选择一个主题体验。'}</p><div class="available-topics">${MOUNTAINS.map(m=>button(m.title,'choose-topic','secondary',`data-id="${m.id}"`,'mountain')).join('')}</div>`,ctx.api?button('为这个问题生成新山','custom-topic','primary',`data-topic="${escapeHTML(q)}"`):button('回去调整问题','close-dialog','secondary','','back'));
}
async function checkAPI(silent=false){if(location.protocol==='file:'){ctx.api=false;if(!silent)toast('单文件离线版不连接服务端。使用工程中的启动脚本可开启接口。','info');return;}try{const res=await fetch('./api/status',{signal:AbortSignal.timeout(2200)});if(!res.ok)throw Error();const json=await res.json();ctx.api=json.configured===true;}catch{ctx.api=false;}if(!silent){showSettings();toast(ctx.api?'已检测到服务端模型配置；实际调用将在生成新主题时进行。':'未检测到模型配置，离线功能不受影响。',ctx.api?'check':'info');}document.querySelectorAll('.mode-pill').forEach(b=>b.innerHTML='<span></span>'+(ctx.api?'AI 接口可用':'本地知识库 · 互动版'));}
async function preloadAssets(){await Promise.all(['mountain','panorama','traveler-walk','traveler-stand','traveler-flag'].map(name=>new Promise(resolve=>{const img=new Image();img.onload=resolve;img.onerror=resolve;img.src=ASSETS[name];if(img.complete)resolve();})));}
function paintGenerationStage(stage){
 if(!ctx.generation)return;ctx.generation.stage=stage;
 const nodes=document.querySelectorAll('.generation-steps>div');nodes.forEach((el,i)=>{el.className=i<stage?'done':i===stage?'active':'';el.querySelector('span').innerHTML=i<stage?icon('check'):i===stage?'<i class="spinner"></i>':i+1;});
 document.querySelector('.generation-art')?.classList.toggle('formed',stage>1);
 const meter=document.querySelector('.generation-meter>i');if(meter)meter.style.width=Math.min(98,stage*25+12)+'%';
}
async function startGeneration(){if(ctx.generation)return;const token=++generationToken,live=ctx.ask.id==='custom';ctx.generation={stage:0,live,topic:ctx.ask.topic};go('/generate/'+ctx.ask.id);let result=currentPlan(ctx.ask.id);
 try{
  await sleep(480);if(token!==generationToken)return;paintGenerationStage(1);
  if(live){generationAbort=new AbortController();const timer=setTimeout(()=>generationAbort.abort(),45000);try{const res=await fetch('./api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:ctx.ask.topic,preferences:ctx.ask.prefs}),signal:generationAbort.signal});const data=await res.json();if(!res.ok)throw Error(data.error??'接口没有返回有效内容');result=validateMountain(data.plan);}finally{clearTimeout(timer);}}
  else {await sleep(650);result=validateMountain(result);const audit=validateKnowledge();if(!audit.ok)throw Error('本地知识库验证失败：'+audit.errors.join('；'));}
  if(token!==generationToken)return;paintGenerationStage(2);await sleep(560);if(token!==generationToken)return;
  paintGenerationStage(3);await Promise.all([preloadAssets(),sleep(640)]);if(token!==generationToken)return;
  const id=result.id,existing=state.journeys[id];state.journeys[id]=existing?{...existing,prefs:{...ctx.ask.prefs},updatedAt:Date.now()}:createJourney(id,ctx.ask.prefs,ctx.ask.topic||result.title);
  if(live)state.journeys[id].plan=result;track('journey_started',id);saveState();ctx.generation=null;go('/mountain/'+id);toast('你的路线已经准备好。从第一小步开始吧。','mountain');
 }catch(err){if(token!==generationToken)return;ctx.generation=null;go('/ask/'+ctx.ask.id);setTimeout(()=>openDialog('山路还没有准备好。',`<p class="dialog-description">${escapeHTML(err.name==='AbortError'?'生成等待超时。没有使用虚构内容替代接口结果，请稍后重试。':err.message||'接口暂时无法使用，请重试。')}</p><div class="notice-box">你的偏好已保留。也可以返回首页体验三座无需联网的知识山。</div>`,button('重新生成','generate','primary')+button('体验离线主题','home','secondary')),100);}}
function stopWalk(){cancelAnimationFrame(walkingFrame);ctx.ui.walking=false;}
function finishWalk(notify=true){stopWalk();if(ctx.view==='mountain'){render(true);if(notify)toast('新营地已开放。继续往上看看。','unlock');}}
function startWalk(from){
 stopWalk();ctx.ui.walking=true;render(true);
 const path=document.getElementById('trail-'+from),traveler=document.getElementById('traveler-position'),scene=document.querySelector('.terrain-scene:not(.is-small)');
 if(!path||!traveler){finishWalk();return;}
 const w=worldFor(ctx.mountain.id),mode=w.travel[from]??'walk';if(scene)scene.dataset.travel=mode;
 const duration=mode==='lift'?2900:mode==='boat'?3400:2600,start=performance.now(),length=path.getTotalLength();
 const segment=document.querySelector(`[data-trail="${from}"]`);if(segment){segment.style.transition='none';segment.style.strokeDashoffset='1';}
 const first=path.getPointAtLength(0);traveler.setAttribute('transform',`translate(${first.x} ${first.y})`);
 function frame(now){if(!ctx.ui.walking||ctx.view!=='mountain')return;const t=Math.min(1,(now-start)/duration),ease=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;const point=path.getPointAtLength(ease*length);const bob=['lift','cable','rail'].includes(mode)?0:Math.sin(t*35)*1.4;traveler.setAttribute('transform',`translate(${point.x} ${point.y+bob})`);if(segment)segment.style.strokeDashoffset=String(1-ease);if(t<1)walkingFrame=requestAnimationFrame(frame);else finishWalk();}
 walkingFrame=requestAnimationFrame(frame);
}

function doComplete(){const id=ctx.mountain.id,j=state.journeys[id],i=ctx.node;const next=completeNode(j,i);if(next===j){toast('先完成互动实验与理解确认，再向前走。','info');return;}state.journeys[id]=next;ctx.journey=next;track('node_completed',id+':'+i);saveState();if(i===4){go('/summit/'+id);return;}
 // 路演模式下可以跳着走前三个营地：只有「连续进度」真的往前推进，后面的营地才可能新开放。
 // 否则不播走路动画（旅人不该朝还没开放的方向走），也别说「新营地已开放」这种不成立的话。
 const advanced=next.completed>j.completed;
 // 能进就进下一站：完成后停在原地、或弹回地图，都是"没有下一关按钮"的别扭来源
 if(canOpen(next,i+1)){ctx.node=i+1;toast('已进入下一站：'+STAGES[i+1],'arrow');go('/read/'+id+'/'+(i+1));return;}
 go('/mountain/'+id);
 if(!advanced){toast('这一步已记下。把前面的营地走完，下一段路才会开放。','info');return;}
 if(state.settings.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches){setTimeout(()=>{if(ctx.view==='mountain'&&ctx.mountain.id===id)startWalk(i);},45);}else toast('下一营地已经开放。','unlock');}
function downloadFile(name,content,type='text/plain;charset=utf-8'){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function exportNotes(){let text='# 看山不是山 · 我的山间手记\n\n导出时间：'+new Date().toLocaleString('zh-CN')+'\n\n';for(const j of Object.values(state.journeys)){const m=currentPlan(j.id);text+='## '+m.title+'\n\n进度：'+doneCount(j)+' / 5 营地\n\n';m.nodes.forEach((n,i)=>{if(j.notes[i]?.trim())text+='### '+STAGES[i]+'｜'+n.title+'\n\n'+j.notes[i]+'\n\n';});}if(!Object.keys(state.journeys).length)text+='还没有开始山途。\n';text+='---\n本文件由你的本地学习记录整理，不会自动上传。\n';downloadFile('看山不是山_山间手记.md',text,'text/markdown;charset=utf-8');toast('山间手记已导出。','download');}
function exportCard(){const m=ctx.mountain,j=ctx.journey;if(j.completed!==5)return;const title=escapeHTML(m.title.length>18?m.title.slice(0,18)+'…':m.title);const points=m.nodes.map((n,i)=>`<g transform="translate(80 ${610+i*70})"><circle cx="16" cy="5" r="15" fill="#e3ebe6"/><text x="16" y="11" text-anchor="middle" font-size="18" fill="#2c5755">${i+1}</text><text x="53" y="-2" font-size="14" fill="#89918a">${STAGES[i]}</text><text x="53" y="24" font-size="21" fill="#263e3b">${escapeHTML(n.takeaway.length>32?n.takeaway.slice(0,32)+'…':n.takeaway)}</text></g>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="960" height="1200" viewBox="0 0 960 1200"><rect width="960" height="1200" fill="#f8f6ef"/><rect x="30" y="30" width="900" height="1140" rx="8" fill="none" stroke="#d9d8cb"/><g font-family="Songti SC,SimSun,serif"><text x="70" y="94" font-size="27" fill="#254b48">看山不是山</text><text x="884" y="92" text-anchor="end" font-family="sans-serif" font-size="13" letter-spacing="3" fill="#859088">MY MOUNTAIN NOTES</text><text x="480" y="180" text-anchor="middle" font-size="17" fill="#9b7c52">5 / 5 营地 · 已抵达山顶</text><text x="480" y="244" text-anchor="middle" font-size="52" fill="#263e3b">${title}</text><image xlink:href="${ASSETS.panorama}" x="70" y="266" width="820" height="280"/><text x="480" y="555" text-anchor="middle" font-size="23" fill="#3f5e57">不是掌握一切，而是有了自己的脉络。</text>${points}<path d="M80 1000H880" stroke="#dbded5"/><text x="480" y="1050" text-anchor="middle" font-size="23" fill="#3d5e55">山外还有山。带着新的问题，再出发。</text><text x="480" y="1093" text-anchor="middle" font-size="14" fill="#8e968c">${new Date(j.finishedAt||Date.now()).toLocaleDateString('zh-CN')} · 一份学习足迹，不是能力认证</text></g></svg>`;downloadFile('看山不是山_'+m.title.replace(/[\\/:*?"<>|]/g,'')+'_山顶卡片.svg',svg,'image/svg+xml;charset=utf-8');toast('山顶卡片已保存为可缩放的 SVG。','download');}
function shareText(){const m=ctx.mountain;return `我正在「看山不是山」探索 ${m.title}。\n从认识、背景、核心、分歧，走向应用与延伸。\n${location.protocol==='file:'?'这是可离线运行的网页 Demo。':location.origin+location.pathname+'#/mountain/'+m.id}`;}
function share(){openDialog('把这座山，分享给同行的人。',`<p class="dialog-description">分享主题与路线入口，不包含你的私人笔记或学习记录。</p><textarea class="share-text" readonly>${escapeHTML(shareText())}</textarea><p class="tiny muted">离线文件无法生成公共访问链接；可以分享网页文件或部署后的地址。</p>`,button('复制分享文字','copy-share','primary','','share')+button('保存为文本','download-share','secondary','','download'));}
function resetJourney(id){const m=currentPlan(id);openDialog('重新出发，也是一种选择。',`<p class="dialog-description">将清除「${escapeHTML(m.title)}」的进度、理解确认、笔记与相关收藏。其他山途不受影响。</p><p class="notice-box">这个操作不能撤回。需要保留笔记的话，先导出记录。</p>`,button('保留我的脚印','close-dialog','secondary','','')+button('确认重新出发','confirm-reset-journey','danger',`data-id="${id}"`,'refresh'));}
function ensureScene3D(){
  const host=document.getElementById('scene3d-host');
  document.body.classList.toggle('scene3d-on',!!ctx.ui.scene3d);
  if(!host)return;
  ctx.ui.scene3dHandle?.destroy?.();
  ctx.ui.scene3dHandle=null;
  if(!ctx.ui.scene3d)return;
  const wantDirector=ctx.ui.scene3dDirector!==false;
  try{
   ctx.ui.scene3dHandle=mountScene3D(host,ctx.mountain,{seed:ctx.ui.sceneSeed||'',completed:ctx.journey?.completed||0,auto:true,camera:wantDirector?'director':'free'});
  }catch(err){
   // WebGL 不可用（远程演示机禁用硬件加速、虚拟机等）时 three 会直接抛错；以前这个异常会连带 render() 一起失败，
   // 页面看起来就是「点了 3D 没反应」。这里退回等高线平面图，并如实说明，不留一个空白视口。
   console.error('3D 场景挂载失败',err);
   ctx.ui.scene3d=false;ctx.ui.scene3dHandle=null;host.innerHTML='';
   document.body.classList.remove('scene3d-on');
   toast('这台设备暂时无法启动 3D 场景（WebGL 不可用），已切回等高线平面图。','info');
   setTimeout(()=>{if(!ctx.ui.scene3d)render(true);},0);
   return;
  }
  const ctl=ctx.ui.scene3dHandle?.engine?.cameraCtl;
  // 用户拖动/滚轮接手时只做本地状态切换 + 视图内提示：之前弹全局 toast，
  // 结果人还在别的页面（甚至首页）也会看到"已切到自由观察"，还会被录进截图。
  if(ctl)ctl.onUserTakeover=()=>{
    ctx.ui.scene3dDirector=false;
    document.querySelectorAll('[data-action="scene3d-director"]').forEach(b=>{b.classList.remove('is-on');b.setAttribute('aria-pressed','false');b.title='回到自动导览';b.setAttribute('aria-label','回到自动导览');});
  };
}
// ── 向导「山犬 · 阿山」：浮动小狗 + 抽屉，答案全部来自本地检索并带出处 ──────
function guideAvatar(){return '<span class="guide-avatar" aria-hidden="true">犬</span>';}
function pushGuideMessage(role,html){
  const log=document.getElementById('guide-log');
  if(!log)return null;
  const el=document.createElement('div');
  el.className='guide-msg '+role;
  el.innerHTML=role==='dog'?(guideAvatar()+'<div class="guide-bubble">'+html+'</div>'):('<div class="guide-bubble">'+escapeHTML(html)+'</div>');
  log.appendChild(el);
  log.scrollTop=log.scrollHeight;
  return el;
}
function guideGreeting(){
  return '<p class="guide-lead">我是阿山，随身的向导。你现在的位置：'+escapeHTML(guideContextLine(ctx).replace('现在在：',''))+'。</p>'
    +'<p class="tiny muted">问一句就行：我先去本地资料里找（带出处），再补一条知乎直答大模型的回答；找不到就说没有。</p>';
}
// 把本地检索到的材料整理成"参考资料"，和问题一起交给知乎直答：
// 这样模型是在本站材料上回答，而不是凭空生成；引用仍然回到上面的卡片。
function guideGrounding(question){
  const node=ctx.mountain?.nodes?.[ctx.node||0];
  const lines=[];
  if(ctx.view==='read'&&node){
    lines.push('当前营地：'+ctx.mountain.title+' · '+(STAGES[ctx.node||0]||'')+'「'+node.title+'」');
    if(node.intro)lines.push('导读：'+String(node.intro).slice(0,110));
    (node.points||[]).slice(0,2).forEach(p=>lines.push('要点·'+p.title+'：'+String(p.text).slice(0,80)));
  }
  try{
    const r=retrieveKnowledge(question,ctx.mountain?.id||null);
    if(r.ok&&r.answer)lines.push('本站策展问答：'+String(r.answer).slice(0,150));
    const s=(r.sources||[]).slice(0,2).map(x=>x.title).join('；');
    if(s)lines.push('可引用的来源：'+s);
  }catch{}
  return lines.slice(0,6);
}
// 每次提问都自动补一条"知乎直答·快答"的回答（有材料就带上材料）。取不到就悄悄撤掉，不打扰用户。
async function askGuideAI(question){
  const q=String(question||'').trim();
  if(q.length<4)return;
  const log=document.getElementById('guide-log');if(!log)return;
  const facts=guideGrounding(q);
  const prompt='你是知乎社区的伴学向导「阿山」。下面是本站已有的材料，请优先依据它们，用中文、2 到 3 段、250 字以内回答用户的问题；材料里没提到的不要编造具体事实。\n'
    +(facts.length?'【材料】\n'+facts.map((t,i)=>(i+1)+'. '+t).join('\n')+'\n':'')
    +'【用户问题】'+q;
  const el=pushGuideMessage('dog','<span class="guide-typing"><span class="guide-dots"><i></i><i></i><i></i></span>同时问一次知乎直答 · 快答（约 3 秒）</span>');
  try{
    const r=await fetch('/api/zhihu/answer?q='+encodeURIComponent(prompt)+'&model=zhida-fast-1p5');
    const d=await r.json().catch(()=>null);
    if(!r.ok||!d||d.ok===false||!d.answer){el?.remove();return;}
    if(el){el.classList.add('is-answer');el.innerHTML=guideAvatar()+'<div class="guide-bubble">'+zhihuDirectHTML({...d,question:q,grounded:facts.length>0})+'</div>';}
    const l=document.getElementById('guide-log');if(l)l.scrollTop=l.scrollHeight;
    track&&track('guide_ai',d.cached?'cached':'live');
  }catch{el?.remove();}
}
function askGuide(question){
  const q=String(question||'').trim();
  const log=document.getElementById('guide-log');
  if(!log)return;
  if(!log.childElementCount)pushGuideMessage('dog',guideGreeting());
  if(!q)return;
  pushGuideMessage('user',q);
  const dock=document.getElementById('guide-dock');
  dock?.classList.add('is-thinking');
  const thinking=pushGuideMessage('dog','<span class="guide-typing"><span class="guide-dots"><i></i><i></i><i></i></span>正在本地资料里找…</span><span class="guide-progress"></span>');
  // 本地检索是同步的，这里留出一小段可见的加载过程，别让答案"啪"地跳出来
  setTimeout(()=>{
    const res=guideAnswer(ctx,q);
    if(thinking){thinking.classList.add('is-answer');thinking.innerHTML=guideAvatar()+'<div class="guide-bubble">'+res.html+'</div>';}
    dock?.classList.remove('is-thinking');
    const log2=document.getElementById('guide-log');
    if(log2)log2.scrollTop=log2.scrollHeight;
    // 就在本地答案之后，再补一条知乎直答的回答（"作品说明"类问题除外，那些不需要模型）
    if(!res.faq&&ctx.ui.guideAI!==false)askGuideAI(q);
  },520);
}
// 知乎直答：只有用户自己点「知乎直答」才会调大模型（额度有限，同一问题+模型的结果落盘 30 天）。
// 这一路不是本地检索，回答必须带"由模型生成"的标注，不能和策展材料混为一谈。
async function askGuideDirect(question){
  const raw=String(question||'').trim();
  const log=document.getElementById('guide-log');
  if(!log)return;
  if(!log.childElementCount)pushGuideMessage('dog',guideGreeting());
  // 空输入不报错：按当前位置生成一个像样的默认问题，演示时一键就能出效果
  const node=ctx.mountain?.nodes?.[ctx.node||0];
  const fallback=ctx.view==='read'&&node
    ? '关于「'+String(node.title).slice(0,20)+'」这一站，知乎上最值得先了解的一种说法是什么？'
    : ctx.mountain?('「'+ctx.mountain.title+'」这条路里，最容易被忽略的一点是什么？'):'这个作品想解决什么问题？';
  const q=raw||fallback;
  const sel=document.getElementById('guide-model');
  const model=(sel&&sel.value)||'zhida-fast-1p5';
  pushGuideMessage('user',q);
  const dock=document.getElementById('guide-dock');
  dock?.classList.add('is-thinking');
  const el=pushGuideMessage('dog','<span class="guide-typing"><span class="guide-dots"><i></i><i></i><i></i></span>正在问知乎直答 · '+escapeHTML(ZHIDA_MODEL_NAME(model))+'（'+escapeHTML(ZHIDA_MODEL_WAIT(model))+'）</span><span class="guide-progress"></span>');
  const token=(ctx.ui.directToken=(ctx.ui.directToken||0)+1);
  const done=(res)=>{
    if(token!==ctx.ui.directToken)return;
    dock?.classList.remove('is-thinking');
    if(el){el.classList.add('is-answer');el.innerHTML=guideAvatar()+'<div class="guide-bubble">'+res+'</div>';}
    const l=document.getElementById('guide-log');if(l)l.scrollTop=l.scrollHeight;
  };
  try{
    const r=await fetch('/api/zhihu/answer?q='+encodeURIComponent(q)+'&model='+encodeURIComponent(model));
    const d=await r.json().catch(()=>null);
    if(!r.ok||!d||d.ok===false){
      const reason=d?.error||('HTTP '+r.status);
      const quota=/额度|quota|次数|rate|限流|429/i.test(reason+r.status);
      done('<p class="guide-lead">这次没问成知乎直答。</p><p class="tiny muted">'+escapeHTML(reason)+
        (quota?'（直答每日额度很少，本演示只在必要时调用；可以先看下面的本地材料与知乎讨论。）':'')+'</p>'+
        '<div class="guide-actions"><button class="btn secondary" data-action="guide-chip" data-q="这一站有哪些材料？">先看本地材料 '+icon('arrow')+'</button>'+
        '<a class="btn secondary" href="https://www.zhihu.com/question/'+encodeURIComponent(q.slice(0,40))+'" target="_blank" rel="noopener">去知乎自己搜 '+icon('external')+'</a></div>');
      return;
    }
    done(zhihuDirectHTML(d));
    track&&track('guide_direct',model+(d.cached?':cached':':live'));
  }catch(err){
    done('<p class="guide-lead">知乎直答这条路暂时不通。</p><p class="tiny muted">'+escapeHTML(fetchFailNote(err))+'：离线打开、代理未启动或额度用尽时会这样。本地检索不受影响。</p>');
  }
}
function ensureGuideDog(){
  let dock=document.getElementById('guide-dock');
  if(!dock){
    const host=document.createElement('div');
    host.innerHTML=guideShellHTML(ctx);
    dock=host.firstElementChild;
    document.body.appendChild(dock);
    const form=document.getElementById('guide-form');
    if(form)form.addEventListener('submit',e=>{e.preventDefault();const inp=document.getElementById('guide-input');const v=inp?inp.value:'';if(inp)inp.value='';askGuide(v);});
  }
  const key=ctx.view+'|'+(ctx.mountain?ctx.mountain.id:'')+'|'+(ctx.node||0);
  if(ctx.ui.guideKey===key)return;
  const first=!ctx.ui.guideKey;
  ctx.ui.guideKey=key;
  const ctxLine=document.getElementById('guide-ctx');
  if(ctxLine)ctxLine.textContent=guideContextLine(ctx);
  const quick=document.getElementById('guide-quick');
  if(quick)quick.innerHTML=guideQuickAsks(ctx).map(q=>'<button class="guide-chip" data-action="guide-chip" data-q="'+escapeHTML(q)+'">'+escapeHTML(q)+'</button>').join('');
  const panel=document.getElementById('guide-panel');
  if(!first&&panel&&!panel.hidden)pushGuideMessage('dog','<p class="guide-lead">换到这里了：'+escapeHTML(guideContextLine(ctx).replace('现在在：',''))+'。</p>');
  // 气泡提示只在本次打开页面时出现一次：以前每换一站就弹一次、还要等 9 秒自己消失，
  // 挡住内容又关不掉。现在任何一次点击/按键/滚动都会立刻收起它，点气泡本身直接开面板。
  const tip=document.getElementById('guide-tip');
  if(tip&&panel&&panel.hidden&&!guideTipShown){guideTipShown=true;showGuideTip(tip);}
}
let guideTipShown=false;
function hideGuideTip(){const tip=document.getElementById('guide-tip');if(tip&&!tip.hidden)tip.hidden=true;clearTimeout(guideTipTimer);}
let guideTipTimer=0;
function showGuideTip(tip){
  tip.textContent=guideTip(ctx);tip.hidden=false;
  clearTimeout(guideTipTimer);
  guideTipTimer=setTimeout(()=>{tip.hidden=true;},6000);
}
['pointerdown','keydown','wheel','touchstart'].forEach(ev=>document.addEventListener(ev,()=>hideGuideTip(),{passive:true,capture:true}));
function bindExploreRail(){
  const rail=document.querySelector('.recommend-grid');
  // 每次渲染都会换掉 .recommend-grid 节点：先清掉上一轮的巡游定时器，
  // 否则旧定时器会一直挂在已被移除的节点上，一次演示下来越积越多。
  clearInterval(railTimer);
  if(!rail)return;
  rail.classList.add('rail');
  // 慢速巡游：13 px/s。用定时器而不是 rAF——侧栏/后台标签里 rAF 会被节流到几乎不动。
  const SPEED=13;
  let paused=false,dir=1,acc=0,last=performance.now();
  const step=()=>{
    const now=performance.now();
    const dt=Math.min(0.4,(now-last)/1000);last=now;
    if(paused||rail.scrollWidth<=rail.clientWidth+4)return;
    acc+=SPEED*dt;
    if(acc<1)return;
    const move=Math.floor(acc);acc-=move;
    const max=rail.scrollWidth-rail.clientWidth;
    if(rail.scrollLeft>=max-2)dir=-1;else if(rail.scrollLeft<=2)dir=1;
    rail.scrollLeft=rail.scrollLeft+dir*move;
  };
  railTimer=setInterval(step,50);
  const stop=()=>{paused=true;},go=()=>{paused=false;};
  rail.addEventListener('pointerenter',stop);
  rail.addEventListener('pointerleave',go);
  rail.addEventListener('focusin',stop);
  rail.addEventListener('focusout',go);
  rail.addEventListener('touchstart',stop,{passive:true});
  rail.addEventListener('wheel',()=>{paused=true;clearTimeout(rail.__resume);rail.__resume=setTimeout(()=>{paused=false;},1400);},{passive:true});
  document.querySelectorAll('[data-action="rail-prev"],[data-action="rail-next"]').forEach(btn=>{
    btn.onclick=()=>{paused=true;rail.scrollBy({left:(btn.dataset.action==='rail-next'?1:-1)*rail.clientWidth*0.8,behavior:'smooth'});clearTimeout(rail.__resume);rail.__resume=setTimeout(()=>{paused=false;},1600);};});
}
function bindScene(){ensureScene3D();ensureZhihuNode();ensureZhihuWorks();ensureZhihuSource();ensureZhihuHot();ensureGuideDog();bindExploreRail();syncLabDock();const viewport=document.getElementById('map-viewport'),transform=document.getElementById('map-transform');if(!viewport||!transform||ctx.ui.scene3d)return;let drag=null;viewport.addEventListener('pointerdown',e=>{if(e.target.closest('button')||ctx.ui.walking)return;drag={x:e.clientX,y:e.clientY,px:ctx.ui.panX||0,py:ctx.ui.panY||0};viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');});viewport.addEventListener('pointermove',e=>{if(!drag)return;ctx.ui.panX=Math.max(-130,Math.min(130,drag.px+e.clientX-drag.x));ctx.ui.panY=Math.max(-130,Math.min(130,drag.py+e.clientY-drag.y));transform.style.transform=`translate(${ctx.ui.panX}px,${ctx.ui.panY}px) scale(${ctx.ui.zoom??1})`;});const end=()=>{drag=null;viewport.classList.remove('dragging');};viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);}
function updateMapTransform(){const el=document.getElementById('map-transform');if(el)el.style.transform=`translate(${ctx.ui.panX??0}px,${ctx.ui.panY??0}px) scale(${ctx.ui.zoom})`;const reset=document.querySelector('[data-action="reset-map"]');if(reset)reset.textContent=Math.round(ctx.ui.zoom*100)+'%';}
// One delegated action surface keeps all controls functional across page transitions.
function closeGuidePanel(){const panel=document.getElementById('guide-panel');if(!panel||panel.hidden)return false;panel.hidden=true;const btn=document.querySelector('[data-action="guide-toggle"]');if(btn)btn.setAttribute('aria-expanded','false');return true;}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&closeGuidePanel())e.stopPropagation();});
document.addEventListener('pointerdown',e=>{const panel=document.getElementById('guide-panel');if(!panel||panel.hidden)return;if(e.target.closest('.guide-panel')||e.target.closest('.guide-dock'))return;closeGuidePanel();});
document.addEventListener('click',async event=>{if(event.target.closest('.skip-link')){event.preventDefault();const main=document.getElementById('main');main?.setAttribute('tabindex','-1');main?.focus();main?.scrollIntoView();return;}const el=event.target.closest('[data-action]');if(!el||el.disabled)return;const a=el.dataset.action,id=el.dataset.id,i=Number(el.dataset.index);
 try{if(a.startsWith('lab-')){handleLabAction(a,el);return;}switch(a){

 case 'preview-world':ctx.ui.heroTopic=id;render(true);break;
 case 'library-open':go('/library');break;
 case 'library-topic':ctx.ui.libraryTopic=id;ctx.ui.libraryQuery='';ctx.ui.libraryKind='all';ctx.ui.librarySaved=false;go('/library');break;
 case 'library-filter':if(['libraryTopic','libraryKind'].includes(el.dataset.key)){ctx.ui[el.dataset.key]=el.dataset.value;render(true);}break;
 case 'library-saved':ctx.ui.librarySaved=!ctx.ui.librarySaved;render(true);break;
 // 3D 视图没有平面图那层「雾/林/浪」，seed 也传不进沙盘：改用沙盘自己的 reseed，别报一条假成功。
 case 'proc-reseed':{const seed=Math.random().toString(36).slice(2,8);ctx.ui.sceneSeed=seed;if(ctx.ui.scene3d&&ctx.ui.scene3dHandle){const next=ctx.ui.scene3dHandle.reseed?.(Math.floor(Math.random()*999983));toast(next===null||next===undefined?'当前场景不支持重新散布，山形保持不变。':'已换一批山林与落石（山形不变）。','compass');break;}render(true);toast('场景已重新散布：雾、林与浪换了位置。','compass');break;}
 case 'scene3d-toggle':{ctx.ui.scene3d=!ctx.ui.scene3d;render(true);toast(ctx.ui.scene3d?'已切换到 3D 山体。拖动旋转，五站自动循环导览。':'已回到等高线平面图。','mountain');break;}
 case 'focus-activity':{const h=document.getElementById('activity-host')||document.querySelector('.activity-panel');if(h){h.scrollIntoView({behavior:'smooth',block:'center'});h.classList.add('is-flash');setTimeout(()=>h.classList.remove('is-flash'),1600);}break;}
 case 'quiz-focus':{const u=document.getElementById('understanding');if(u){u.scrollIntoView({behavior:'smooth',block:'center'});u.classList.add('is-flash');setTimeout(()=>u.classList.remove('is-flash'),1600);}break;}
 case 'next-station':{const nid=ctx.mountain.id,ni=Math.min(4,(ctx.node||0)+1);ctx.node=ni;track&&track('next_station',nid+':'+ni);go('/read/'+nid+'/'+ni);break;}
 case 'guide-toggle':{const panel=document.getElementById('guide-panel'),btn=document.querySelector('[data-action="guide-toggle"]');const willOpen=!!(panel&&panel.hidden);if(panel)panel.hidden=!willOpen;if(btn)btn.setAttribute('aria-expanded',String(willOpen));if(willOpen){const tip=document.getElementById('guide-tip');if(tip)tip.hidden=true;askGuide('');}break;}
 case 'guide-close':{const panel=document.getElementById('guide-panel');if(panel)panel.hidden=true;const btn=document.querySelector('[data-action="guide-toggle"]');if(btn)btn.setAttribute('aria-expanded','false');break;}
 case 'guide-chip':{askGuide(el.dataset.q||'');break;}
 // 直答按钮：带 data-q 的（检索没命中时的兜底入口）用那句话问，否则读输入框
 case 'guide-direct':{const inline=el.dataset.q||'';const inp=document.getElementById('guide-input');const fromInput=inp?String(inp.value||'').trim():'';const q=inline||fromInput;if(inp&&!inline)inp.value='';askGuideDirect(q);break;}
 case 'excerpt-toggle':{
  // 回答卡（.zhihu-answer）和片段卡（.zhihu-excerpt）里按钮的父容器不同，旧代码只认 .zhihu-excerpt，
  // 于是节点页「先看材料」里的展开按钮点了没反应。这里按父容器找，并同步 aria-expanded。
  const body=(el.closest('.zhihu-excerpt,.zhihu-answer')??el.parentElement)?.querySelector('.excerpt-body');
  if(!body){toast('这段摘要暂时无法展开，可以直接点下面的原始链接查看。','info');break;}
  const clamped=body.classList.toggle('is-clamped');
  el.setAttribute('aria-expanded',String(!clamped));
  el.innerHTML=clamped?'展开全文 '+icon('down'):'收起 '+icon('chevron');break;}
 case 'scene3d-zoom-in':{ctx.ui.scene3dHandle?.engine?.cameraCtl?.zoomBy(0.85);break;}
 case 'scene3d-zoom-out':{ctx.ui.scene3dHandle?.engine?.cameraCtl?.zoomBy(1.18);break;}
 case 'scene3d-director':{const on=ctx.ui.scene3dDirector===false;ctx.ui.scene3dDirector=on;ctx.ui.scene3dHandle?.engine?.cameraCtl?.setDirector(on);document.querySelectorAll('[data-action="scene3d-director"]').forEach(b=>{b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',String(on));});toast(on?'已回到自动导览：五站依次点亮。':'已切到自由观察：拖动旋转、滚轮缩放。','compass');break;}
 case 'scene3d-reseed':{const s=Math.floor(Math.random()*999983);ctx.ui.sceneSeed=String(s);const next=ctx.ui.scene3dHandle?.reseed?.(s);toast(next===null||next===undefined?'当前场景不支持重新散布，山形保持不变。':'已换一批山林与落石（山形不变）。','compass');break;}
 case 'zhihu-live-search':runZhihuLiveSearch(el.dataset.query||ctx.ui.libraryQuery||'');break;
 case 'source-detail':showSourceDetail(id);break;
 case 'source-save':{if(!SOURCE_BY_ID[id])break;state.savedSources??=[];const exists=state.savedSources.includes(id);state.savedSources=exists?state.savedSources.filter(x=>x!==id):[id,...state.savedSources];saveState();render(true);toast(exists?'已取消资料收藏。':'已收藏资料卡，保留了来源与使用边界。','bookmark');break;}
 case 'source-compare':{ctx.ui.compareSources??=[];const ids=ctx.ui.compareSources;if(ids.includes(id))ctx.ui.compareSources=ids.filter(x=>x!==id);else if(ids.length<2&&SOURCE_BY_ID[id])ids.push(id);else toast('一次对读两份资料，先移除一份再加入。','info');render(true);break;}
 case 'compare-open':if(ctx.ui.compareSources?.length===2)openDialog('把两份材料，放在一起。',compareSourcesHTML(ctx.ui.compareSources),'','wide-dialog');break;
 case 'source-to-node':{const m=currentPlan(id);if(!m){toast('这条资料关联的知识山不在本机。','info');break;}if(!Number.isInteger(i)||!m.nodes?.[i]){toast('这条资料没有对应的营地。','info');break;}if(canOpen(state.journeys[id],i)){ensureJourney(id);go('/read/'+id+'/'+i);}else{ensureJourney(id);go('/mountain/'+id);toast('该资料对应较高营地。先沿前置路线走，标题与资料仍可自由预览。','lock');}break;}
 case 'research-guide':openDialog('来源不只是一个链接。',`<div class="source-provenance page-read"><strong>已读相关页面</strong><p>本次查阅了公开网页中与知识节点相关的段落，导读用自己的话编写。不能因此假定全部延伸判断都已被证明。</p></div><div class="source-provenance index-only"><strong>仅检索摘要</strong><p>知乎直达页面在当前研究环境不可读取全文，只获得搜索索引的标题与部分摘要。只用作讨论入口，不冒充作者完整观点。</p></div><p class="dialog-description">卡片中的「带着什么问题读」是本项目的阅读提示，不是原文摘要或引语。作者仅在搜索索引明确署名时记录；不编造赞数、访问量或检索总量。</p>`,button('明白了','close-dialog','primary','','check'));break;
 case 'knowledge-guide':showKnowledgeGuide();break;
 case 'guide-question':showKnowledgeGuide(el.dataset.question);break;
 case 'open-activity':if(Number.isInteger(i)&&canOpen(ctx.journey,i)){ctx.ui.readTab='experience';go('/read/'+ctx.mountain.id+'/'+i);}else lockedPreview(i);break;
 case 'go-quiz':document.getElementById('understanding')?.scrollIntoView({behavior:state.settings.motion?'smooth':'instant',block:'center'});break;
 case 'export-research':exportResearch();break;
 case 'home':go('/');break;
 case 'choose-topic':prepareAsk(id);break;
 case 'open-topic':case 'continue':if(state.journeys[id])go('/mountain/'+id);else prepareAsk(id);break;
 case 'custom-topic':prepareAsk('custom',el.dataset.topic);break;
 case 'interest':state.interest=el.dataset.value;ctx.ui.shuffle=0;saveState();render(true);break;
 case 'shuffle':ctx.ui.shuffle=(ctx.ui.shuffle??0)+1;render(true);break;
 case 'answer':ctx.ask.prefs[el.dataset.key]=el.dataset.value;render(true);break;
 case 'ask-next':ctx.ask.step=Math.min(2,ctx.ask.step+1);render(true);break;
 case 'ask-prev':ctx.ask.step=Math.max(0,ctx.ask.step-1);render(true);break;
 case 'generate':closeDialog();await startGeneration();break;
 case 'cancel-generation':generationToken++;generationAbort?.abort();ctx.generation=null;go('/ask/'+ctx.ask.id);break;
 case 'station':case 'reader-station':if(ctx.ui.walking){toast('旅人还在路上：先点「跳过动画」，或等它走到下一站。','foot');break;}if(!Number.isInteger(i)||!ctx.mountain?.nodes?.[i]){toast('这个营地暂时打不开。','info');break;}if(canOpen(ctx.journey,i))go('/read/'+ctx.mountain.id+'/'+i);else lockedPreview(i);break;
 case 'read-current':go('/read/'+ctx.mountain.id+'/'+Math.min(4,ctx.journey.completed));break;
 case 'return-map':go('/mountain/'+ctx.mountain.id);break;
 case 'summit':go('/summit/'+ctx.mountain.id);break;
 case 'read-tab':ctx.ui.readTab=el.dataset.tab;render(true);break;
 case 'expand-point':ctx.ui.expanded??={};ctx.ui.expanded[el.dataset.point]=!ctx.ui.expanded[el.dataset.point];render(true);break;
 case 'quiz':{const n=ctx.mountain.nodes[ctx.node];ctx.ui.quizSelected=i;if(i===n.quiz.answer){state.journeys[ctx.mountain.id].checks[ctx.node]=true;state.journeys[ctx.mountain.id].updatedAt=Date.now();saveState();}render(true);break;}
 case 'complete':doComplete();break;
 case 'skip-walk':finishWalk();break;
 case 'bookmark':{const key=ctx.mountain.id+':'+ctx.node,exists=state.bookmarks.includes(key);state.bookmarks=exists?state.bookmarks.filter(x=>x!==key):[key,...state.bookmarks];saveState();render(true);toast(exists?'已从收藏中移除。':'这个营地，已为你留好。',exists?'info':'bookmark');break;}
 case 'remove-bookmark':state.bookmarks=state.bookmarks.filter(x=>x!==el.dataset.key);saveState();render(true);toast('已取消收藏。','bookmark');break;
 case 'open-saved':go('/read/'+id+'/'+i);break;
 case 'journey-tab':ctx.ui.journeyTab=el.dataset.tab;render(true);break;
 // 平面图控件在 3D 视图里被 CSS 收起（body.scene3d-on .map-tools{display:none}）；若将来改成长得出来，
 // 或从别的入口触发，这里至少说清该用哪里的按钮，不再静默改一个当前看不见的缩放值。
 case 'zoom-in':if(ctx.ui.scene3d){toast('现在是 3D 视图，请用场景内的 ＋ 缩放。','mountain');break;}ctx.ui.zoom=Math.min(1.35,(ctx.ui.zoom??1)+.1);updateMapTransform();break;
 case 'zoom-out':if(ctx.ui.scene3d){toast('现在是 3D 视图，请用场景内的 − 缩放。','mountain');break;}ctx.ui.zoom=Math.max(.8,(ctx.ui.zoom??1)-.1);updateMapTransform();break;
 case 'reset-map':if(ctx.ui.scene3d){toast('现在是 3D 视图：点罗盘可回到自动导览的标准机位。','mountain');break;}ctx.ui.zoom=1;ctx.ui.panX=ctx.ui.panY=0;updateMapTransform();break;
 case 'guide':guide(0);break;
 case 'guide-next':guide(Math.min(3,ctx.ui.guideStep+1));break;
 case 'guide-prev':guide(Math.max(0,ctx.ui.guideStep-1));break;
 case 'guide-finish':state.guideSeen=true;saveState();closeDialog();break;
 case 'about':showAbout();break;
 case 'mode-info':showMode();break;
 case 'sources':showSources();break;
 case 'privacy':openDialog('你的好奇，不需要被偷偷记录。',`<p class="dialog-description">学习进度、个人笔记、收藏与所选兴趣保存在当前浏览器的 localStorage 中。没有账户、跟踪脚本或广告统计服务。</p><p class="dialog-description">仅在你配置并启用服务端 AI 接口、主动生成新主题时，主题与三项学习偏好会发送给你配置的模型服务。私人手记不包含在请求中。</p><div class="notice-box">导出文件包含本地笔记与进度，请自行保管；不要把含私人内容的备份发布到公共仓库。</div>`,button('管理我的记录','settings','primary','','settings'));break;
 case 'settings':showSettings();break;
 case 'scene':state.settings.scene=el.dataset.value;saveState();render(true);showSettings();break;
 case 'motion':state.settings.motion=!state.settings.motion;saveState();if(ctx.ui.walking)finishWalk(false);render(true);showSettings();break;
 case 'sound':await toggleSound();break;
 case 'close-dialog':closeDialog();break;
 case 'check-api':await checkAPI();break;
 case 'share':share();break;
 case 'copy-share':try{await navigator.clipboard.writeText(shareText());toast('分享文字已复制。','share');}catch{dialog.querySelector('.share-text')?.select();toast('浏览器限制了自动复制，文字已选中，可按 Ctrl+C 复制。','info');}break;
 case 'download-share':downloadFile('看山不是山_分享.txt',shareText());break;
 case 'export-card':if(!ctx.journey||ctx.journey.completed!==5){toast('走完全部五个营地后，才可以导出山顶卡片。','flag');break;}exportCard();break;
 case 'export-notes':exportNotes();break;
 case 'export-state':downloadFile('看山不是山_学习记录_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(state,null,2),'application/json');toast('学习记录已导出，请妥善保管。','download');break;
 case 'import-state':document.getElementById('import-file').click();break;
 case 'confirm-import':if(pendingImport){state=pendingImport;ctx.state=state;pendingImport=null;saveState();go('/journey');toast('学习记录已恢复。','check');}break;
 case 'reset-journey':resetJourney(id);break;
 case 'confirm-reset-journey':delete state.journeys[id];state.bookmarks=state.bookmarks.filter(k=>!k.startsWith(id+':'));saveState();closeDialog();go('/journey');toast('已清除这座山的记录。','refresh');break;
 case 'reset-all':openDialog('确认清除本机全部记录？','<p class="dialog-description">所有山途、笔记、收藏与偏好将被清除。此操作不能撤回，建议先导出备份。</p>',button('先保留','close-dialog','secondary','','')+button('确认清除','confirm-reset-all','danger','','trash'));break;
 case 'confirm-reset-all':state=clone(EMPTY_STATE);ctx.state=state;saveState();go('/');toast('本机记录已清除，可以重新出发。','refresh');break;
 default:break;
 }}catch(err){console.error('Interaction error',err);toast('这个操作暂时没有完成。你的已保存进度仍然保留。','info');}
});

// ── 知乎真实内容：节点页的「先看材料」与资料馆的知识作品货架 ──────────────
// 取回失败时把原因压成一句可诊断的短标签（HTTP 状态 / 网络错误名）；不回显响应体，也不涉及任何密钥。
function fetchFailNote(err){const m=String(err?.message||'');const hit=m.match(/HTTP\s+\d{3}/);if(hit)return hit[0];if(err?.name==='AbortError')return '请求已取消';if(err?.name==='TypeError')return '网络不可达';return '未知错误';}
// ── 片段排版：把服务端摘要切成句子、组成短段落，长文默认折起可展开 ────────
function splitExcerpt(text){
  const t=String(text||"").replace(/\s+/g," ").trim();
  if(!t)return [];
  const parts=t.split(/(?<=[。！？!?；;])/).map(x=>x.trim()).filter(Boolean);
  const paras=[];
  for(let i=0;i<parts.length;i+=2)paras.push(parts.slice(i,i+2).join(""));
  return paras.length?paras:[t];
}
function excerptHTML(text,{clampAt=260}={}){
  const paras=splitExcerpt(text);
  const long=(text||"").length>clampAt;
  return '<div class="excerpt-body'+(long?' is-clamped':'')+'">'+paras.map(p=>'<p>'+escapeHTML(p)+'</p>').join("")+'</div>'
    +(long?'<button class="excerpt-toggle" data-action="excerpt-toggle" aria-expanded="false">展开全文 '+icon("down")+'</button>':"");
}
function zhihuAnswerHTML(a){
  return '<article class="zhihu-answer">'
    +'<header><span class="zhihu-badge">知乎摘要</span><a href="'+escapeHTML(a.questionUrl)+'" target="_blank" rel="noopener">'+escapeHTML(a.question)+'</a></header>'
    +excerptHTML(a.excerpt)
    +'<footer><a href="'+escapeHTML(a.answerUrl||a.questionUrl)+'" target="_blank" rel="noopener">看原回答 '+icon("external")+'</a>'
    +'<span class="tiny muted">'+(a.mode==="cached"?"缓存快照":"实时取回")+' · 摘要来自知乎服务端</span></footer></article>';
}
function zhihuQuestionsHTML(list){
  if(!list.length)return "";
  return '<div class="zhihu-questions"><span class="zhihu-badge">知乎推荐问题</span><ul>'+list.map(q=>'<li><a href="'+escapeHTML(q.url)+'" target="_blank" rel="noopener">'+escapeHTML(q.title)+'</a></li>').join("")+'</ul><p class="tiny muted">这些是知乎按主题推荐的真实问题，点开即到知乎。</p></div>';
}
function zhihuHotHTML(hot){
  if(!hot||!(hot.items||[]).length)return "";
  return '<div class="zhihu-hot"><span class="zhihu-badge">此刻热榜里的相邻讨论</span><ul>'
    +hot.items.map(it=>'<li><a href="'+escapeHTML(it.url)+'" target="_blank" rel="noopener">'+escapeHTML(it.title)+'</a>'
      +'<span class="hot-why">命中「'+(it.matched||[]).join("／")+'」</span></li>').join("")
    +'</ul><p class="tiny muted">'+escapeHTML(hot.note||"按关键词把当日热榜匹配到这座山，只说明话题相邻。")+'</p></div>';
}
// 静态托管（如 GitHub Pages）没有服务端代理，fetch /api/zhihu/* 会 404。
// 这时用仓库里固化的离线快照展示真实内容，并如实标注取回时间——比一片"暂时取不到"有用，也不假装是实时的。
function zhihuFallback(kind,key){
  const snap=ZHIHU_SNAPSHOT||null;
  if(!snap)return null;
  if(kind==='topic'){
    const t=snap.topics?.[key];
    if(!t)return null;
    return {answers:t.answers||[],questions:t.questions||{items:[],mode:'snapshot'},hot:t.hot||null,
      fetchedAt:t.snapshotAt,note:snap.note,snapshot:true};
  }
  if(kind==='works'){
    if(!snap.works||!(snap.works.items||[]).length)return null;
    return {...snap.works,snapshot:true};
  }
  if(kind==='hot'){
    if(!snap.hotList||!(snap.hotList.items||[]).length)return null;
    return {...snap.hotList,snapshot:true};
  }
  return null;
}
function zhihuNodeHTML(d){
  if(!d)return '<p class="tiny muted">知乎内容暂时取不到，下面的本地资料仍可阅读。</p>';
  const answers=(d.answers||[]).filter(a=>a.excerpt).slice(0,2);
  const qs=(d.questions&&d.questions.items||[]).slice(0,5);
  const hot=d.hot||null;
  const head='<div class="zhihu-live-head"><span class="zhihu-mark">知</span><div><strong>知乎上正在讨论</strong><small>'
    +(d.snapshot?'离线快照 · 取回于 ':'')+escapeHTML((d.fetchedAt||"").slice(0,16).replace("T"," "))+(d.snapshot?'（实时内容需服务端在线）':'')+'</small></div></div>';
  if(!answers.length&&!qs.length&&!(hot&&hot.items&&hot.items.length))return head+'<p class="tiny muted">这座山今天还没有取到知乎内容，可以先读本地策展资料。</p>';
  return head+answers.map(zhihuAnswerHTML).join("")+zhihuQuestionsHTML(qs)+zhihuHotHTML(hot)
    +'<p class="tiny muted">内容来自知乎开放平台：回答为服务端摘要，不代表全文；本项目只标注出处，不改写原文。</p>';
}
function zhihuExcerptHTML(d){
  if(!d)return '<p class="tiny muted">这条问题的回答暂时取不到，仍可点下面的原始链接打开知乎。</p>';
  const items=(d.items||[]).filter(x=>x.excerpt).slice(0,3);
  const head='<div class="zhihu-excerpt-head"><span class="zhihu-mark">知</span><div><strong>这条问题下的真实回答片段</strong><small>'
    +(items.length?items.length+" 条 · 摘要由知乎服务端返回":"暂无摘要")+(d.cached?" · 缓存":"")+'</small></div></div>';
  if(!items.length)return head+'<p class="tiny muted">这条问题暂时没有可用的回答摘要（可能被过滤或已失效），可以直接打开知乎原页查看。</p>';
  return head+items.map(a=>'<article class="zhihu-excerpt">'+excerptHTML(a.excerpt,{clampAt:200})
    +'<footer><a href="'+escapeHTML(a.url||d.questionUrl)+'" target="_blank" rel="noopener">看原回答 '+icon("external")+'</a>'
    +'<span class="tiny muted">'+(a.type||"回答")+' · 片段截取自服务端摘要</span></footer></article>').join("")
    +'<p class="lab-small">片段来自知乎开放平台的服务端摘要，不是全文；本项目不改写、不补写，也不代表作者完整观点。</p>';
}
function ensureZhihuSource(){
  const host=document.getElementById("zhihu-source");
  if(!host)return;
  const key=host.dataset.source,url=host.dataset.url;
  const cached=(ctx.ui.zhihuAnswers||{})[key];
  if(cached){host.innerHTML=zhihuExcerptHTML(cached);host.classList.add("loaded");return;}
  fetch("/api/zhihu/answers?question="+encodeURIComponent(url)+"&limit=3").then(r=>r.ok?r.json():Promise.reject(Error("HTTP "+r.status))).then(d=>{
    ctx.ui.zhihuAnswers={...(ctx.ui.zhihuAnswers||{}),[key]:d};
    const el=document.getElementById("zhihu-source");
    if(el&&el.dataset.source===key){el.innerHTML=zhihuExcerptHTML(d);el.classList.add("loaded");}
  }).catch(err=>{
    const el=document.getElementById("zhihu-source");
    if(el&&el.dataset.source===key)el.innerHTML='<p class="tiny muted">知乎回答片段暂时取不到（'+escapeHTML(fetchFailNote(err))+'，离线或额度受限），仍可点下面的原始链接到知乎查看。</p>';
  });
}
function zhihuHotListHTML(d){
  if(!d||!(d.items||[]).length)return '<p class="tiny muted">此刻热榜暂时取不到（离线或额度受限）。</p>';
  return '<ol class="hot-rail">'+d.items.map((it,i)=>'<li><span class="hot-rank">'+(i+1)+'</span><div><a href="'+escapeHTML(it.url)+'" target="_blank" rel="noopener">'+escapeHTML(it.title)+'</a>'
    +(it.summary?'<p>'+escapeHTML(it.summary.slice(0,96))+(it.summary.length>96?"…":"")+'</p>':"")+'</div></li>').join("")+'</ol>'
    +'<p class="tiny muted">'+escapeHTML(d.note||"")+' · '+escapeHTML((d.fetchedAt||"").slice(0,16).replace("T"," "))+'</p>';
}
function ensureZhihuHot(){
  const host=document.getElementById("zhihu-hot");
  if(!host)return;
  if(ctx.ui.zhihuHot){host.innerHTML=zhihuHotListHTML(ctx.ui.zhihuHot);host.classList.add("loaded");return;}
  host.innerHTML='<span class="zhihu-loading">'+icon("spark")+' 正在取回此刻热榜…</span>';
  fetch("/api/zhihu/hot?limit=12").then(r=>r.ok?r.json():Promise.reject(Error("HTTP "+r.status))).then(d=>{
    ctx.ui.zhihuHot=d;
    const el=document.getElementById("zhihu-hot");
    if(el){el.innerHTML=zhihuHotListHTML(d);el.classList.add("loaded");}
  }).catch(err=>{
    const el=document.getElementById("zhihu-hot");
    if(!el)return;
    const snap=zhihuFallback('hot');
    if(snap){el.innerHTML=zhihuHotListHTML(snap);el.classList.add("loaded");return;}
    el.innerHTML='<p class="tiny muted">此刻热榜暂时取不到（'+escapeHTML(fetchFailNote(err))+'，离线打开时会这样）。</p>';
  });
}
function zhihuWorksHTML(d){
  if(!d||!(d.items||[]).length)return '<p class="tiny muted">知乎作品货架暂时取不到（离线打开时会这样）。</p>';
  return `<div class="works-shelf">${d.items.slice(0,8).map((w,i)=>`<article class="work-card" style="--i:${i}">${w.artwork?`<img src="${escapeHTML(w.artwork)}" alt="" loading="lazy">`:'<div class="work-cover"></div>'}<div class="work-body"><h3>${escapeHTML(w.title)}</h3><p>${escapeHTML((w.description||'').slice(0,88))}${(w.description||'').length>88?'…':''}</p>${(w.labels||[]).length?`<div class="work-labels">${w.labels.map(l=>`<span>${escapeHTML(l)}</span>`).join('')}</div>`:''}</div></article>`).join('')}</div><p class="tiny muted">${escapeHTML(d.note||'')}</p>`;
}
function ensureZhihuNode(){
  const host=document.getElementById("zhihu-node");
  if(!host)return;
  const id=host.dataset.mountain;
  const cached=(ctx.ui.zhihuTopics||{})[id];
  if(cached){host.innerHTML=zhihuNodeHTML(cached);host.classList.add("loaded");return;}
  host.innerHTML='<span class="zhihu-loading">'+icon("spark")+' 正在取回知乎上的真实讨论…</span>';
  fetch("/api/zhihu/topic/"+encodeURIComponent(id)).then(r=>r.ok?r.json():Promise.reject(Error("HTTP "+r.status))).then(d=>{
    ctx.ui.zhihuTopics={...(ctx.ui.zhihuTopics||{}),[id]:d};
    const el=document.getElementById("zhihu-node");
    if(el&&el.dataset.mountain===id){el.innerHTML=zhihuNodeHTML(d);el.classList.add("loaded");}
  }).catch(err=>{
    const el=document.getElementById("zhihu-node");
    if(!(el&&el.dataset.mountain===id))return;
    const snap=zhihuFallback('topic',id);
    if(snap){el.innerHTML=zhihuNodeHTML(snap);el.classList.add('loaded');return;}
    el.innerHTML='<p class="tiny muted">知乎内容暂时取不到（'+escapeHTML(fetchFailNote(err))+'，离线或额度受限），本地资料仍可阅读。</p>';
  });
}
function ensureZhihuWorks(){
  const host=document.getElementById('zhihu-works');
  if(!host)return;
  if(ctx.ui.zhihuWorks){host.innerHTML=zhihuWorksHTML(ctx.ui.zhihuWorks);host.classList.add('loaded');return;}
  host.innerHTML='<span class="zhihu-loading">'+icon('spark')+' 正在取回知乎知识作品…</span>';
  fetch('/api/zhihu/works?kind=knowledge&limit=8').then(r=>r.ok?r.json():Promise.reject(Error('HTTP '+r.status))).then(d=>{
    ctx.ui.zhihuWorks=d;
    const el=document.getElementById('zhihu-works');
    if(el){el.innerHTML=zhihuWorksHTML(d);el.classList.add('loaded');}
  }).catch(err=>{
    const el=document.getElementById('zhihu-works');
    if(!el)return;
    const snap=zhihuFallback('works');
    if(snap){el.innerHTML=zhihuWorksHTML(snap);el.classList.add('loaded');return;}
    el.innerHTML='<p class="tiny muted">知乎作品货架暂时取不到（'+escapeHTML(fetchFailNote(err))+'）。</p>';
  });
}
async function runZhihuLiveSearch(query){
 const q=String(query||'').trim();
 if(!q){toast('先在上面输入检索词，再点实时搜知乎。','search');return;}
 ctx.ui.zhihuLive={loading:true,query:q,items:[],error:null,note:''};
 render(true);
 try{
  const res=await fetch('/api/zhihu/search?q='+encodeURIComponent(q)+'&count=6');
  const data=await res.json().catch(()=>null);
  if(!res.ok||!data||data.ok===false){throw new Error(data?.error||('实时检索失败（HTTP '+res.status+'）'));}
  ctx.ui.zhihuLive={loading:false,query:q,items:data.items||[],error:null,note:data.note||'',fetchedAt:data.fetchedAt};
  // 竞态守卫：等待期间用户可能已经离开资料馆。ctx 里的结果照常留着（回来还能看到），
  // 但不要再对当前页面 render(true)——那会重建 3D 场景、抢走阅读页的焦点。
  if(ctx.view==='library'){render(true);document.getElementById('live-zhihu')?.scrollIntoView({behavior:'smooth',block:'nearest'});}
 }catch(err){
  ctx.ui.zhihuLive={loading:false,query:q,items:[],error:err.message||'实时检索不可用。可继续使用本地资料卡。',note:''};
  if(ctx.view==='library')render(true);
 }
}

document.addEventListener('submit',event=>{if(event.target.id==='topic-form'){event.preventDefault();handleTopic(new FormData(event.target).get('topic'));}else if(event.target.id==='library-search'){event.preventDefault();ctx.ui.libraryQuery=String(new FormData(event.target).get('q')??'').trim();render(true);}else if(event.target.id==='knowledge-ask'){event.preventDefault();showKnowledgeGuide(String(new FormData(event.target).get('q')??''));}});
document.addEventListener('input',event=>{if(event.target.id==='note-text'){const value=event.target.value.slice(0,2000);state.journeys[ctx.mountain.id].notes[ctx.node]=value;state.journeys[ctx.mountain.id].updatedAt=Date.now();document.getElementById('note-count').textContent=value.length+' / 2000';document.getElementById('note-status').textContent='正在保存…';saveState();clearTimeout(noteTimer);noteTimer=setTimeout(()=>{const el=document.getElementById('note-status');if(el)el.textContent=storageWarned?'请导出备份':'已保存在本机';},400);}});
document.getElementById('import-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>2000000)throw Error('文件超过 2 MB，请选择本 Demo 导出的记录。');const raw=JSON.parse(await file.text());if(raw.version!==1||!raw.journeys||typeof raw.journeys!=='object')throw Error('这不是兼容的学习记录文件。');pendingImport=normalizeState(raw,MOUNTAINS.map(m=>m.id));const count=Object.keys(pendingImport.journeys).length;if(Object.keys(raw.journeys).length&&count===0)throw Error('记录中的知识山未通过结构验证。');openDialog('找回你走过的路。',`<p class="dialog-description">已验证 ${count} 座知识山的记录。导入后会替换当前设备的记录，而不是合并。</p><div class="notice-box">没有通过验证的数据会被忽略。你也可以先取消并备份本机记录。</div>`,button('取消','close-dialog','secondary','','')+button('确认恢复','confirm-import','primary','','upload'));}catch(err){toast(err.message||'文件无法读取，请检查格式。','info');}});
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();});
let parallaxFrame=0;document.addEventListener('pointermove',e=>{if(ctx.view!=='home'||!state.settings.motion||matchMedia('(prefers-reduced-motion: reduce)').matches)return;cancelAnimationFrame(parallaxFrame);parallaxFrame=requestAnimationFrame(()=>{const hero=app.querySelector('.hero');if(!hero)return;const r=hero.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom)return;hero.style.setProperty('--mx',((e.clientX-r.left)/r.width-.5)*8+'px');hero.style.setProperty('--my',((e.clientY-r.top)/r.height-.5)*5+'px');});},{passive:true});
document.addEventListener('visibilitychange',()=>{if(ctx.sound&&audio){if(document.hidden)audio.context.suspend();else audio.context.resume().catch(err=>console.warn('环境音恢复失败',err));}});
window.addEventListener('hashchange',()=>render());
window.addEventListener('pagehide',()=>{saveState();generationAbort?.abort();cancelAnimationFrame(walkingFrame);});
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY&&event.newValue){try{state=normalizeState(JSON.parse(event.newValue),MOUNTAINS.map(m=>m.id));ctx.state=state;render(true);toast('另一个标签页的脚印已同步。','refresh');}catch(err){console.warn('另一个标签页的学习记录无法解析',err);toast('另一个标签页的学习记录格式不兼容，本次没有同步。','info');}}});
// V2: explicit local knowledge and experiment interactions.
function showSourceDetail(id){const source=SOURCE_BY_ID[id];if(!source)return;state.sourceVisits??=[];if(!state.sourceVisits.includes(id))state.sourceVisits.push(id);saveState();openDialog(escapeHTML(source.title),sourceDetailsHTML(source,state),'','source-dialog');}
function showKnowledgeGuide(query=''){const topic=['read','mountain','summit'].includes(ctx.view)?ctx.mountain.id:null;const result=query.trim()?retrieveKnowledge(query,topic):null;openDialog('带着疑问，问问来路。',localGuideHTML(ctx,result,query),'','knowledge-dialog');}
function updateLab(event,{live=false,field=false}={}){
 if(ctx.view!=='read')return;const a=activityFor(ctx.mountain.id,ctx.node);if(!a)return;
 const j=state.journeys[ctx.mountain.id];j.activities??={};j.activities[ctx.node]=reduceActivity(a,j.activities[ctx.node],event);j.updatedAt=Date.now();ctx.journey=j;saveState();
 if(live){const panel=document.querySelector('.activity-panel');updateLiveActivity(panel,a,j.activities[ctx.node],event.key);resetLiveConfirmation(panel,a);syncLabDock();return;}
 if(field){resetLiveConfirmation(document.querySelector('.activity-panel'),a);syncLabDock();return;}
 const host=document.getElementById('activity-host');if(host){const rect=host.getBoundingClientRect();const oldHeight=host.offsetHeight;host.innerHTML=activityHTML(ctx.mountain,ctx.node,j);if(event.type==='place'&&rect.top<100){window.scrollBy(0,Math.min(0,host.offsetHeight-oldHeight));}}syncLabDock();
 if(event.type==='evaluate'&&activityPassed(a,j.activities[ctx.node]))toast('实验完成。再做一次理解确认，就能继续向前。','check');
}
function resetLiveConfirmation(panel,a){if(!panel)return;panel.classList.remove('is-passed');panel.querySelector('.lab-feedback')?.remove();const c=panel.querySelector('[data-action="go-quiz"]');if(c){c.dataset.action='lab-evaluate';c.textContent='观察结果 · 检查这一步';}const stamp=panel.querySelector('.lab-stamp');if(stamp)stamp.textContent='0'+(ctx.node+1);}
function syncLabDock(){if(ctx.view!=='read')return;const j=state.journeys[ctx.mountain.id],a=activityFor(ctx.mountain.id,ctx.node),passed=!a||activityPassed(a,j.activities?.[ctx.node]),checked=!!j.checks[ctx.node],done=nodeDone(j,ctx.node);const c=document.querySelector('[data-action="complete"]');if(c)c.disabled=!(passed&&checked)&&!done;
 const item=document.querySelector('.node-checklist span');if(item){item.classList.toggle('done',passed);item.innerHTML=icon(passed?'check':'compass')+' 亲手探索';}
 const label=document.querySelector('.reading-dock strong');if(label&&!done)label.textContent=passed&&checked?'这一步，准备好了':!passed?'先完成一次亲手探索':'还差一次理解确认';
 // 「下一步」引导：走完给下一站；只差一半就指到还缺的那一步（别让人对着按钮发呆）
 const und=document.getElementById('understanding');
 if(und){const old=und.querySelector('.next-cta');if(old)old.remove();
  const nx=ctx.mountain.nodes[ctx.node+1];
  const cta=(label,title,sub,actions,cls)=>und.insertAdjacentHTML('beforeend',
   '<div class="next-cta '+(cls||'')+'"><span class="next-cta-label">'+label+'</span><div><strong>'+title+'</strong><small>'+sub+'</small></div>'+actions+'</div>');
  if(done&&ctx.node<4)cta('这一站走完了','下一站：'+escapeHTML(STAGES[ctx.node+1]),escapeHTML(nx.short??nx.title),
    '<button class="btn primary" data-action="next-station">进入下一站 '+icon('arrow')+'</button><button class="btn secondary" data-action="return-map">回到地图</button>');
  else if(done&&ctx.node===4)cta('五站都走完了','去山顶看看整条脉络','一览众山小 · 你的判断连成了一条路',
    '<button class="btn primary" data-action="summit">到山顶 '+icon('flag')+'</button>','is-final');
  else if(checked&&!passed)cta('理解确认已完成','还差一次亲手探索','到上面把这一站的实验做完，这一站就算走完',
    '<button class="btn secondary" data-action="focus-activity">去做实验 '+icon('arrow')+'</button>','is-half');
  else if(passed&&!checked)cta('实验已完成','还差一次理解确认','选一个更贴近内容的说法，就能继续',
    '<button class="btn secondary" data-action="quiz-focus">去理解确认 '+icon('arrow')+'</button>','is-half');
 }
}
function handleLabAction(action,el){const a=activityFor(ctx.mountain.id,ctx.node);if(!a||ctx.view!=='read')return;const id=el.dataset.id;let event;
 switch(action){
 case 'lab-place':event={type:'place',id,value:el.dataset.value==='none'?null:el.dataset.value};break;
 case 'lab-move':event={type:'move',id,delta:Number(el.dataset.delta)};break;
 case 'lab-view':event={type:'view',value:el.dataset.value};break;
 case 'lab-value':event={type:'value',key:el.dataset.key,value:el.dataset.value};break;
 case 'lab-runner':event={type:'runner',step:el.dataset.step};break;
 case 'lab-toggle':event={type:'value',key:el.dataset.key,value:!state.journeys[ctx.mountain.id].activities?.[ctx.node]?.values?.[el.dataset.key]};break;
 case 'lab-guard-test':event={type:'guard-test'};break;
 case 'lab-benchmark':event={type:'benchmark',id};break;
 case 'lab-reset':event={type:'reset'};break;
 case 'lab-evaluate':event={type:'evaluate'};break;
 default:return;}
 updateLab(event);
}
function exportResearch(){const lines=['# 看山不是山 · 实地考察手记','','导出时间：'+new Date().toLocaleString('zh-CN'),'','以下记录包含你保存到本机的内容，请自行保管。',''];for(const m of MOUNTAINS){const j=state.journeys[m.id];if(!j)continue;lines.push('## '+m.title,'已走过 '+doneCount(j)+' / 5 营地','');m.nodes.forEach((n,i)=>{const a=activityFor(m.id,i),s=j.activities?.[i];if(!nodeDone(j,i)&&i>j.completed)return;lines.push('### '+(i+1)+'. '+n.title,'');if(a){lines.push('实验：'+a.name,'状态：'+(activityPassed(a,s)?'已通过':'尚未通过'));if(a.type==='reflection')for(const f of a.fields)lines.push(f.label+'：'+(s?.fields?.[f.id]??'未填写'));if(s?.values&&Object.keys(s.values).length)lines.push('观察参数：'+JSON.stringify(s.values));if(s?.events?.length)lines.push('工具记录：',...s.events.map(e=>'- '+e.label));}if(j.notes[i])lines.push('我的手记：'+j.notes[i]);lines.push('资料：',...n.sourceIds.map(id=>SOURCE_BY_ID[id]).filter(Boolean).map(source=>'- ['+source.title+']('+source.url+') · '+(source.access==='page-read'?'已读相关页面':'仅检索摘要，非全文')),'');});}
 if(state.savedSources?.length)lines.push('## 收藏的资料',...state.savedSources.map(id=>SOURCE_BY_ID[id]).filter(Boolean).map(source=>'- ['+source.title+']('+source.url+')'));
 downloadFile('看山不是山_考察手记.md',lines.join('\n'),'text/markdown;charset=utf-8');toast('已导出实验、出处与自己的手记。','download');}
let draggedLab=null;
document.addEventListener('dragstart',event=>{const card=event.target.closest('[data-drag-id]');if(!card)return;draggedLab={id:card.dataset.dragId,kind:card.dataset.dragKind};event.dataTransfer?.setData('text/plain',JSON.stringify(draggedLab));if(event.dataTransfer)event.dataTransfer.effectAllowed='move';card.classList.add('is-dragging');});
document.addEventListener('dragover',event=>{const target=event.target.closest('[data-drop-bin],[data-sequence-target]');if(target&&draggedLab){event.preventDefault();target.classList.add('drag-over');if(event.dataTransfer)event.dataTransfer.dropEffect='move';}});
document.addEventListener('dragleave',event=>event.target.closest('[data-drop-bin],[data-sequence-target]')?.classList.remove('drag-over'));
document.addEventListener('drop',event=>{const target=event.target.closest('[data-drop-bin],[data-sequence-target]');if(!target||!draggedLab)return;event.preventDefault();target.classList.remove('drag-over');const drag=draggedLab;draggedLab=null;if(drag.kind==='place'&&target.dataset.dropBin!==undefined)updateLab({type:'place',id:drag.id,value:Number(target.dataset.dropBin)});else if(drag.kind==='sequence'&&target.dataset.sequenceTarget)updateLab({type:'reorder',id:drag.id,target:target.dataset.sequenceTarget});});
document.addEventListener('dragend',()=>{draggedLab=null;document.querySelectorAll('.drag-over,.is-dragging').forEach(x=>x.classList.remove('drag-over','is-dragging'));});
document.addEventListener('input',event=>{const t=event.target;if(t.dataset.labField)updateLab({type:'field',key:t.dataset.labField,value:t.value},{field:true});if(t.dataset.labRange)updateLab({type:'value',key:t.dataset.labRange,value:Number(t.value)},{live:true});});
document.addEventListener('change',event=>{const t=event.target;if(t.dataset.labSelect)updateLab({type:'value',key:t.dataset.labSelect,value:Number(t.value)});if(t.dataset.labRange)updateLab({type:'value',key:t.dataset.labRange,value:Number(t.value)},{live:true});});

// ── 自动演示模式（?tour=1）：录制演示视频用 ──────────────────────────────
// 页面自己按脚本走：换页 → 平滑滚动到指定区块 → 停留。这样录制时不需要一边点一边录，
// 画面稳定、节奏可控，字幕时间轴也就能和脚本一一对上。
// ?seed=1 会先把「存在主义」这座山标记为已走完（只为演示能走到山顶页），不写进仓库内容。
const TOUR_STEPS = [
  { route: '#/', dwell: 4200, caption: '看山不是山 · 让知识有路径' },
  { scroll: '.recommend-section', dwell: 4200, caption: '六座知识山，每座五层营地' },
  { route: '#/mountain/existentialism', dwell: 4000, caption: '山页：五站路径，前三站默认开放' },
  { route: '#/mountain/existentialism/3d', dwell: 9000, caption: '3D 微缩沙盘：镜头沿五站自动导览' },
  { route: '#/read/existentialism/0', scroll: '#node-materials', dwell: 7000, caption: '每一站第一步：材料与出处（含知乎真实回答）' },
  { scroll: '#understanding', dwell: 5000, caption: '然后是亲手探索与理解确认' },
  { quiz: 0, dwell: 3500, caption: '答完立刻给解释，并弹出「进入下一站」' },
  { route: '#/summit/existentialism', dwell: 10000, caption: '走完五层：一览众山小，判断连成脉络' },
  { route: '#/library', scroll: '#zhihu-hot', dwell: 5000, caption: '资料馆：知乎热榜、真实讨论与公开参考分开标注' },
  { route: '#/', dwell: 3600, caption: '看山不是山 · 知乎黑客松 2026' }
];
function tourSleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function runTour(){
  const seed=/(?:^|[?&])seed=1/.test(location.search);
  if(seed){
    const id='existentialism';
    // 演示用：把这座山标成已走完，好让脚本能走到山顶页；只写本地存储，不影响仓库内容
    const fake={version:1,journeys:{[id]:{id,topic:id,prefs:{goal:'从零入门',focus:'概念与脉络',pace:'漫游 · 25 分钟'},completed:5,
      checks:{0:true,1:true,2:true,3:true,4:true},notes:{},activities:{0:{confirmed:true},1:{confirmed:true},2:{confirmed:true},3:{confirmed:true},4:{confirmed:true}},receipts:{},labVersion:1,startedAt:Date.now(),updatedAt:Date.now()}},
      bookmarks:[],savedSources:[],sourceVisits:[],interest:'all'};
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(fake));state=normalizeState(fake,MOUNTAINS.map(m=>m.id));ctx.state=state;}catch{}
  }
  await tourSleep(1200);
  for(const step of TOUR_STEPS){
    if(step.route){ctx.view='';location.hash=step.route;}
    await tourSleep(step.scroll?900:520);
    if(step.scroll){
      const el=document.querySelector(step.scroll);
      if(el)el.scrollIntoView({behavior:'smooth',block:'center'});
      await tourSleep(900);
    }
    if(step.quiz!==undefined){
      const b=document.querySelector('[data-action="quiz"][data-index="'+step.quiz+'"]');
      if(b)b.click();
      await tourSleep(700);
    }
    const cap=step.caption||'';
    if(cap){
      let badge=document.getElementById('tour-caption');
      if(!badge){badge=document.createElement('div');badge.id='tour-caption';badge.className='tour-caption';document.body.appendChild(badge);}
      badge.textContent=cap;badge.classList.add('show');
    }
    await tourSleep(step.dwell||2000);
  }
  document.getElementById('tour-caption')?.classList.remove('show');
}
if(/[?&]tour=1/.test(location.search)){const d=Number((location.search.match(/[?&]delay=(\d+)/)||[])[1])||1200;setTimeout(()=>{runTour();},d);}
render();preloadAssets();checkAPI(true);
