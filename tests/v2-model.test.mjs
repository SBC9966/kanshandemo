import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {MOUNTAINS} from '../src/data/content.mjs';
const port=18879,upPort=18991;let mode='valid';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await test('HTTP server and model adapter integration (mock transport, not live AI)',async t=>{
 const upstream=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  if(mode==='unavailable'){res.writeHead(429);return res.end('{}');}
  assert.equal(req.headers.authorization,'Bearer test-fixture-only');
  const parsed=JSON.parse(body);assert.equal(parsed.model,'test-model');assert.equal(parsed.messages.length,2);
  res.setHeader('Content-Type','application/json');
  const plan=structuredClone(MOUNTAINS[0]);if(mode==='invalid')plan.nodes.pop();if(mode==='cited')plan.nodes[0].sourceIds=['anthropic-agents','invented-id','sep-camus'];
  res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(plan)}}]}));
 });
 await new Promise(r=>upstream.listen(upPort,'127.0.0.1',r));
 const server=spawn(process.execPath,['server/index.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),MODEL_API_URL:`http://127.0.0.1:${upPort}`,MODEL_API_KEY:'test-fixture-only',MODEL_NAME:'test-model'},stdio:'ignore'});
 const base=`http://127.0.0.1:${port}`;
 try {
  let ready=false;for(let i=0;i<60;i++){try{await fetch(base+'/api/status');ready=true;break;}catch{await wait(50);}}assert.ok(ready);
  await t.test('status declares configuration without exposing a credential',async()=>{const s=await(await fetch(base+'/api/status')).json();assert.equal(s.configured,true);assert.equal(s.privateNotesUploaded,false);assert.equal(JSON.stringify(s).includes('test-fixture-only'),false);});
  await t.test('serves a single-file HTML with no bundled credential',async()=>{const r=await fetch(base);assert.equal(r.status,200);const h=await r.text();assert.ok(h.includes('traveler-svg'));assert.ok(!h.includes('test-fixture-only'));});
  await t.test('private dotfiles cannot be downloaded',async()=>{assert.equal((await fetch(base+'/.env')).status,404);assert.equal((await fetch(base+'/package.json')).status,404);});
  await t.test('source modules have JavaScript MIME',async()=>{const r=await fetch(base+'/src/domain.mjs');assert.equal(r.status,200);assert.ok(r.headers.get('content-type').includes('javascript'));});
  await t.test('cross-origin generation is denied',async()=>{const r=await fetch(base+'/api/generate',{method:'POST',headers:{origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);});
  await t.test('empty topic is rejected',async()=>{const r=await fetch(base+'/api/generate',{method:'POST',body:'{"topic":""}'});assert.equal(r.status,400);});
  await t.test('valid structured response produces 5 nodes and no fabricated sources',async()=>{const r=await fetch(base+'/api/generate',{method:'POST',body:JSON.stringify({topic:'测试主题',preferences:{pace:'轻装 · 5 分钟'}})});assert.equal(r.status,200);const j=await r.json();assert.equal(j.plan.nodes.length,5);assert.ok(j.plan.id.startsWith('custom_'));assert.equal(j.verified,false);assert.deepEqual(j.plan.sources,[]);assert.equal(j.plan.nodes[4].prerequisite,3);});
  await t.test('model citations are limited to supplied matching local source IDs',async()=>{mode='cited';const r=await fetch(base+'/api/generate',{method:'POST',body:JSON.stringify({topic:'Agent 工作流'})});assert.equal(r.status,200);const j=await r.json();assert.deepEqual(j.plan.nodes[0].sourceIds,['anthropic-agents']);assert.ok(j.plan.sources.every(s=>s.id==='anthropic-agents'));});
  await t.test('invalid upstream structure is an error, not fake success',async()=>{mode='invalid';const r=await fetch(base+'/api/generate',{method:'POST',body:'{"topic":"test"}'});assert.equal(r.status,502);assert.ok((await r.json()).error);});
  await t.test('provider failure is surfaced as an error',async()=>{mode='unavailable';const r=await fetch(base+'/api/generate',{method:'POST',body:'{"topic":"test"}'});assert.equal(r.status,502);});
  await t.test('malformed URL receives 400 rather than crashing server',async()=>{const r=await fetch(base+'/src/%ZZ');assert.equal(r.status,400);assert.equal((await fetch(base+'/api/status')).status,200);});
 } finally {server.kill('SIGTERM');await new Promise(r=>upstream.close(r));}
});
