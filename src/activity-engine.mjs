import { defaultActivity, checkActivity } from './data/activities.mjs';
import { SOURCE_BY_ID } from './data/knowledge.mjs';
import { retrieveKnowledge } from './knowledge-engine.mjs';
export function toolGate({tool,approved=false,external=false,steps=0,maxSteps=3}){if(steps>=maxSteps)return {allowed:false,reason:'达到步数上限'};if(external&&['send_mail','delete_file'].includes(tool))return {allowed:false,reason:'外部资料不能授予写入权限'};if(['send_mail','delete_file'].includes(tool)&&!approved)return {allowed:false,reason:'缺少用户的明确批准'};return {allowed:['search_local','inspect','draft','verify'].includes(tool),reason:'仅允许显式白名单中的本地工具'};}
export function activityPassed(a,s){return !!s&&s.confirmed===true&&checkActivity(a,s).passed;}
export function reduceActivity(a,input,event){
 let s=JSON.parse(JSON.stringify(input??defaultActivity(a)));s.values??={};s.fields??={};s.placements??={};s.viewed??=[];s.events??=[];s.tests??=[];s.seen??=[];
 const add=(label,status='ok')=>{s.events.push({label,status,at:Date.now()});s.events=s.events.slice(-18);};
 if(event.type==='reset')return defaultActivity(a);
 if(event.type!=='evaluate'){s.confirmed=false;s.passed=false;s.message='';}
 switch(event.type){
 case 'place':if(a.items?.some(x=>x.id===event.id)){if(event.value===null)delete s.placements[event.id];else s.placements[event.id]=a.type==='evidence'?String(event.value):Number(event.value);}break;
 case 'move':{const order=s.order??a.items.map(x=>x.id),at=order.indexOf(event.id),to=Math.max(0,Math.min(order.length-1,at+Number(event.delta)));if(at>=0){order.splice(at,1);order.splice(to,0,event.id);}s.order=order;break;}
 case 'reorder':{const order=s.order??a.items.map(x=>x.id),from=order.indexOf(event.id),to=order.indexOf(event.target);if(from>=0&&to>=0){order.splice(from,1);order.splice(to,0,event.id);}s.order=order;break;}
 case 'view':if(!s.viewed.includes(event.value))s.viewed.push(event.value);s.values.view=event.value;break;
 case 'value':s.values[event.key]=event.value;if(['reveal','prior'].includes(event.key)&&!s.seen.includes(Number(event.value)))s.seen.push(Number(event.value));if(a.type==='guardrails')s.blocked=false;break;
 case 'field':if(a.fields?.some(f=>f.id===event.key))s.fields[event.key]=String(event.value).slice(0,500);break;
 case 'runner':{
  const stages=['search','inspect','draft','verify'],expected=stages[s.stage??0];
  if(event.step!==expected){add('已阻止：先完成上一个工具步骤。','blocked');s.message='草稿不能抢在证据前面，也不能跳过引用校验。';break;}
  if(event.step==='search'){const r=retrieveKnowledge(a.query,'ai-agents');if(!r.ok){add('检索无结果，停止。','blocked');break;}s.result={answer:r.answer,sourceIds:r.sources.map(x=>x.id)};s.stage=1;add('search_local：命中 '+r.sources.length+' 条来源元数据。');}
  if(event.step==='inspect'){s.result.sourceIds=s.result.sourceIds.filter(x=>SOURCE_BY_ID[x]);s.stage=2;add('inspect：已区分公开页面与仅有检索摘要的资料。');}
  if(event.step==='draft'){s.citations=s.result.sourceIds.slice(0,3);s.draft=s.result.answer+' '+s.citations.map(id=>'['+id+']').join(' ');s.stage=3;add('draft：依据预编导读组装草稿，非大模型生成。');}
  if(event.step==='verify'){s.verified=s.citations.length>0&&s.citations.every(x=>!!SOURCE_BY_ID[x]);s.stage=s.verified?4:3;add('verify：'+(s.verified?'所有引用 ID 均可解析。':'存在无法解析的引用。'),s.verified?'ok':'blocked');}
  break;}
 case 'guard-test':{
  s.events=[];add('故障演练开始：读取一份含越权文字的外部资料。');
  const v=s.values,maxSteps=Number(v.maxSteps??8);
  add(v.isolate?'资料被保留为数据，未提升为指令。':'风险：未启用输入隔离。',v.isolate?'ok':'blocked');
  const gate=toolGate({tool:'send_mail',approved:false,external:v.isolate===true,steps:2,maxSteps});
  add(v.approval?'写入权限锁：要求用户批准。':'风险：没有配置写入批准。',v.approval?'ok':'blocked');
  s.blocked=maxSteps===3&&v.approval===true&&v.isolate===true&&!gate.allowed;
  add(s.blocked?'越权调用被阻止；第 3 步触发停止边界。':'演练发现策略缺口。没有发送任何真实邮件。',s.blocked?'ok':'blocked');s.runCount=(s.runCount??0)+1;break;}
 case 'benchmark':{
  if(!a.cases?.some(x=>x.id===event.id))break;let ok=false,detail='';
  if(event.id==='grounded'){const r=retrieveKnowledge('Agent 工作流区别','ai-agents');ok=r.ok&&r.sources.length>0&&r.sources.every(x=>SOURCE_BY_ID[x.id]);detail='实际调用本地检索并检查来源 ID。';}
  if(event.id==='missing'){const r=retrieveKnowledge('火星的玫瑰色海洋城市','ai-agents');ok=!r.ok;detail='无匹配问题返回不足，而非随机导读。';}
  if(event.id==='injection'){ok=!toolGate({tool:'send_mail',external:true}).allowed;detail='权限函数拒绝外部内容发起的写入。';}
  if(ok&&!s.tests.includes(event.id))s.tests.push(event.id);add((ok?'PASS ':'FAIL ')+event.id+' — '+detail,ok?'ok':'blocked');break;}
 case 'evaluate':{const r=checkActivity(a,s);s.confirmed=true;s.passed=r.passed;s.message=r.feedback;s.attempts=(s.attempts??0)+1;s.completedAt=r.passed?Date.now():null;break;}
 }
 if(s.confirmed)s.passed=checkActivity(a,s).passed;
 return s;
}
export function normalizeActivity(a,raw){if(!a||!raw||typeof raw!=='object')return defaultActivity(a);const s=defaultActivity(a);s.placements={};for(const it of a.items??[]){const v=raw.placements?.[it.id];if(a.type==='evidence'&&['support','limit'].includes(v))s.placements[it.id]=v;else if(Number.isInteger(v)&&v>=0&&v<(a.bins?.length??0))s.placements[it.id]=v;}
 const allowed=(a.items??[]).map(x=>x.id);if(Array.isArray(raw.order)&&raw.order.length===allowed.length&&new Set(raw.order).size===allowed.length&&raw.order.every(x=>allowed.includes(x)))s.order=raw.order;
 s.viewed=(Array.isArray(raw.viewed)?raw.viewed:[]).filter(x=>typeof x==='string').slice(0,8);s.seen=(Array.isArray(raw.seen)?raw.seen:[]).map(Number).filter(x=>x>=0&&x<=100).slice(-100);s.values={};for(const [k,v] of Object.entries(raw.values??{})){if(!['__proto__','constructor','prototype'].includes(k)&&['string','number','boolean'].includes(typeof v)&&String(v).length<100)s.values[k]=v;}
 for(const f of a.fields??[])s.fields[f.id]=String(raw.fields?.[f.id]??'').slice(0,500);
 s.stage=Math.max(0,Math.min(4,Number(raw.stage)||0));s.citations=Array.isArray(raw.citations)?raw.citations.filter(id=>SOURCE_BY_ID[id]).slice(0,8):[];s.verified=raw.verified===true&&s.citations.length>0;s.result=raw.result&&Array.isArray(raw.result.sourceIds)?{answer:String(raw.result.answer??'').slice(0,2000),sourceIds:raw.result.sourceIds.filter(x=>SOURCE_BY_ID[x])}:null;s.draft=String(raw.draft??'').slice(0,3000);s.blocked=raw.blocked===true;s.tests=(Array.isArray(raw.tests)?raw.tests:[]).filter(x=>a.cases?.some(c=>c.id===x));s.events=(Array.isArray(raw.events)?raw.events:[]).filter(e=>e&&typeof e.label==='string').map(e=>({label:e.label.slice(0,250),status:e.status==='blocked'?'blocked':'ok',at:Number(e.at)||0})).slice(-18);s.attempts=Math.max(0,Number(raw.attempts)||0);s.confirmed=raw.confirmed===true;s.passed=activityPassed(a,s);s.completedAt=s.passed?Number(raw.completedAt)||Date.now():null;return s;
}