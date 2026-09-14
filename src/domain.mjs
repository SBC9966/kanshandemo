import { activityFor } from './data/activities.mjs';
import { normalizeActivity, activityPassed } from './activity-engine.mjs';
import { SOURCE_BY_ID } from './data/knowledge.mjs';
/** Pure domain functions. Progress is a contiguous prefix, never a UI-controlled unlock flag. */
export const STORAGE_KEY = 'shan-journey-v1';
export const STAGES = ['山脚 · 认识','山麓 · 背景','山腰 · 核心','高处 · 分歧','山顶 · 延伸'];
export const EMPTY_STATE = {version:1,journeys:{},bookmarks:[],savedSources:[],sourceVisits:[],interest:'all',settings:{motion:true,scene:'morning'},guideSeen:false,events:[]};
export const clone = value => JSON.parse(JSON.stringify(value));
export function escapeHTML(value) {return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function safeURL(value) {try {const u=new URL(value); return u.protocol==='https:'?u.href:'';} catch{return '';}}
// 路演模式：不再要求从第一站顺序解锁——前 3 个营地默认开放，可以直接跳进去看内容。
// 想回到严格的顺序解锁，把 OPEN_AHEAD 改回 0 即可。
export const OPEN_AHEAD = 2;
export const openLimit = (completed) => Math.min(4, Math.max(OPEN_AHEAD, Number(completed) || 0));
export function canOpen(journey,index) {return Number.isInteger(index)&&index>=0&&index<5&&index<=openLimit(journey?.completed);}
// 单站是否真的走完：理解确认已答对，且该站的互动实验（若有）已通过；labVersion 1 的旧记录只看 checks。
// 路演模式允许先走第 2/3 站，所以「这一站走过没有」必须逐站判断，不能再用 i < completed 来替代。
export function nodeDone(journey,index) {
 if(!journey||journey.checks?.[index]!==true)return false;
 if(journey.labVersion!==2)return true;
 const a=activityFor(journey.id,index);
 return !a||activityPassed(a,journey.receipts?.[index])||activityPassed(a,journey.activities?.[index]);
}
// 已走完的营地总数：只用于显示进度（跳着走完第 3 站时也要如实+1）。
export function doneCount(journey) {let n=0;for(let i=0;i<5;i++)if(nodeDone(journey,i))n++;return n;}
// completed 仍然是「从山脚连续走到的位置」：只有一路走下来才推进，跳着走完后面的营地不会把前面的空档算成走过。
export function completedPrefix(journey) {let n=0;while(n<5&&nodeDone(journey,n))n++;return n;}
export function completeNode(journey,index) {
 if(!journey||index>4||index>openLimit(journey.completed)||!journey.checks?.[index]) return journey;
 const activity=activityFor(journey.id,index);
 if(activity&&!activityPassed(activity,journey.activities?.[index]))return journey;
 // 旧实现用 Math.max(completed,index+1) 直接把进度推高：路演模式下跳着走完第 3 站会谎报前两站已走过，
 // 刷新时 normalizeState 又只认连续前缀，进度会被悄悄清零。现在写入与读取用同一条前缀规则。
 const next={...journey,receipts:{...journey.receipts,[index]:activity?normalizeActivity(activity,journey.activities[index]):null},updatedAt:Date.now(),finishedAt:index===4?Date.now():null};
 next.completed=completedPrefix(next);
 return next;
}
export function createJourney(id,prefs,topic) {
 return {id,topic,prefs:{goal:'从零入门',focus:'概念与脉络',pace:'漫游 · 25 分钟',...prefs},completed:0,checks:{},notes:{},activities:{},receipts:{},labVersion:2,startedAt:Date.now(),updatedAt:Date.now()};
}
export function validateMountain(plan) {
 if(!plan||typeof plan!=='object'||!Array.isArray(plan.nodes)||plan.nodes.length!==5) throw Error('知识山必须有且仅有五个营地。');
 for(const k of ['id','title','subtitle']) if(typeof plan[k]!=='string'||!plan[k].trim()||plan[k].length>200) throw Error('知识山缺少有效的 '+k);
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(plan.id)||['__proto__','constructor','prototype'].includes(plan.id)) throw Error('知识山 ID 无效。');
 for(const k of ['title','subtitle','category','en','kicker','reason']) if(plan[k]!==undefined&&(typeof plan[k]!=='string'||/[<>]/.test(plan[k]))) throw Error('Invalid metadata.');
 if(plan.color!==undefined&&!['sage','blue','amber'].includes(plan.color))throw Error('Invalid theme.');
 if(plan.tags!==undefined&&(!Array.isArray(plan.tags)||plan.tags.length>8||plan.tags.some(x=>typeof x!=='string'||x.length>50)))throw Error('Invalid tags.');
 if(plan.sources!==undefined&&(!Array.isArray(plan.sources)||plan.sources.length>15||plan.sources.some(s=>!s||typeof s.id!=='string'||typeof s.title!=='string'||typeof s.publisher!=='string'||!safeURL(s.url))))throw Error('Invalid source.');
 plan.nodes.forEach((n,i)=>{
  for(const key of ['title','intro','application','misconception','bridge','takeaway']) if(typeof n[key]!=='string'||!n[key].trim()||n[key].length>2500) throw Error('第 '+(i+1)+' 层缺少 '+key);
  if(!Array.isArray(n.points)||n.points.length<2||n.points.length>5||n.points.some(p=>typeof p.title!=='string'||typeof p.text!=='string'||p.title.length>100||p.text.length>2500)) throw Error('知识要点结构不完整。');
  if(n.short!==undefined&&(typeof n.short!=='string'||n.short.length>150))throw Error('Invalid short title.');
  if(n.perspectives!==undefined&&(!Array.isArray(n.perspectives)||n.perspectives.length>8||n.perspectives.some(p=>!p||['lens','title','text'].some(k=>typeof p[k]!=='string'||p[k].length>3000))))throw Error('Invalid perspectives.');
  if(n.sourceIds!==undefined&&(!Array.isArray(n.sourceIds)||n.sourceIds.some(x=>typeof x!=='string')))throw Error('Invalid source IDs.');
  const q=n.quiz;
  if(!q||typeof q.question!=='string'||!Array.isArray(q.options)||q.options.length!==3||q.options.some(x=>typeof x!=='string'||x.length>800)||!Number.isInteger(q.answer)||q.answer<0||q.answer>2||typeof q.explanation!=='string') throw Error('理解确认格式不完整。');
  if(n.prerequisite!==undefined&&n.prerequisite!==i-1) throw Error('前置关系必须按五层顺序连接。');
 });
 return plan;
}
export function normalizeState(input, knownIds=[]) {
 const state=clone(EMPTY_STATE);
 if(!input||input.version!==1) return state;
 state.interest=['all','humanities','technology','thinking'].includes(input.interest)?input.interest:'all';
 state.settings={motion:input.settings?.motion!==false,scene:input.settings?.scene==='evening'?'evening':'morning'};
 state.guideSeen=input.guideSeen===true;
 for(const [id,raw] of Object.entries(input.journeys??{}).slice(0,100)) {
  if(!raw||!(/^[a-zA-Z0-9_-]{1,80}$/).test(id)||['__proto__','constructor','prototype'].includes(id))continue;
  if(!knownIds.includes(id)&&!raw.plan)continue;
  if(raw.plan){try{validateMountain(raw.plan);if(raw.plan.id!==id)continue;}catch{continue;}}
  const prefs={};for(const key of ['goal','focus','pace'])if(typeof raw.prefs?.[key]==='string')prefs[key]=raw.prefs[key].slice(0,80);
  const j=createJourney(id,prefs,String(raw.topic??'').slice(0,160));
  j.notes={};for(let i=0;i<5;i++)if(typeof raw.notes?.[i]==='string')j.notes[i]=raw.notes[i].slice(0,5000);
  j.activities={};for(let i=0;i<5;i++){const a=activityFor(id,i);if(a&&raw.activities?.[i]){try{j.activities[i]=normalizeActivity(a,raw.activities[i]);}catch{}}}
  j.receipts={};for(let i=0;i<5;i++){const a=activityFor(id,i);if(a&&raw.receipts?.[i]){try{const receipt=normalizeActivity(a,raw.receipts[i]);if(activityPassed(a,receipt))j.receipts[i]=receipt;}catch{}}}
  j.labVersion=raw.labVersion===2?2:1;
  j.checks={};for(let i=0;i<5;i++)if(raw.checks?.[i]===true)j.checks[i]=true;
  // A modified or corrupt local file cannot accidentally unlock gaps.
  // 前缀改用与 completeNode 相同的逐站判断重算（旧实现直接采信 raw.completed，跳站后刷新会把真实进度清零）。
  let prefix=0;const cap=Math.min(5,Math.max(0,Math.floor(Number(raw.completed)||0)));
  while(prefix<cap&&nodeDone(j,prefix))prefix++;
  j.completed=prefix;j.startedAt=Number(raw.startedAt)||Date.now();j.updatedAt=Number(raw.updatedAt)||Date.now();
  if(prefix===5)j.finishedAt=Number(raw.finishedAt)||j.updatedAt;
  if(raw.plan)j.plan=raw.plan;
  state.journeys[id]=j;
 }
 state.bookmarks=Array.isArray(input.bookmarks)?[...new Set(input.bookmarks.filter(x=>typeof x==='string'&&x.length<100))].filter(x=>{
  const [id,i,extra]=x.split(':');return !extra&&i!==undefined&&!!state.journeys[id]&&canOpen(state.journeys[id],Number(i));
 }).slice(0,500):[];
 state.savedSources=Array.isArray(input.savedSources)?[...new Set(input.savedSources.filter(id=>typeof id==='string'&&SOURCE_BY_ID[id]))].slice(0,100):[];
 state.sourceVisits=Array.isArray(input.sourceVisits)?[...new Set(input.sourceVisits.filter(id=>typeof id==='string'&&SOURCE_BY_ID[id]))].slice(0,100):[];
 state.events=Array.isArray(input.events)?input.events.filter(e=>e&&typeof e.type==='string'&&typeof e.at==='number').slice(-100):[];
 return state;
}
export function matchTopic(query,mountains) {
 const q=String(query).trim().toLowerCase();if(!q)return null;
 return mountains.find(m=>m.keywords.some(k=>q.includes(k.toLowerCase())))??null;
}
export function resolveSource(plan,id) {return (plan.sources??[]).find(s=>s.id===id);}
export function readingMinutes(prefs) {const minutes=Number(prefs?.pace?.match(/(\d+)\s*分钟/)?.[1]);return Number.isFinite(minutes)&&minutes>0?minutes:25;}
