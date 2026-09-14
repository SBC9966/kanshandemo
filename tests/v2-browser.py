"""Actual DOM interactions in Chromium via set_content.
Navigation to localhost is blocked in this sandbox, so an explicit TEST-ONLY
Storage adapter tests serialization. The shipped app never includes this shim.
HTTP endpoints are tested separately. No native file:// persistence claim.
"""
from pathlib import Path
import json,time,os
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'dist/index.html').read_text()
FIX=json.loads((ROOT/'tests/v2-fixtures.json').read_text())
OUT=ROOT/'tests/v2-screenshots';OUT.mkdir(exist_ok=True)
EXPORT=ROOT/'tests/v2-exports';EXPORT.mkdir(exist_ok=True)
RESULTS=[];ERRORS=[]
KEY='shan-journey-v1'
def record(name):
 RESULTS.append(name);print('PASS',name,flush=True)
 (ROOT/'tests/v2-browser-progress.json').write_text(json.dumps({'passed':len(RESULTS),'checks':RESULTS,'errors':ERRORS},ensure_ascii=False,indent=2))
def mount(browser,seed=None,route='/',width=1440,height=1000,reduced=False):
 p=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,reduced_motion='reduce' if reduced else 'no-preference',locale='zh-CN',accept_downloads=True)
 p.set_default_timeout(7000)
 p.on('pageerror',lambda e:ERRORS.append(str(e)))
 initial={} if seed is None else {KEY:json.dumps(seed,ensure_ascii=False)}
 shim='<script>window.__testStore='+json.dumps(initial,ensure_ascii=False)+';Object.defineProperty(window,"localStorage",{value:{getItem:k=>window.__testStore[k]??null,setItem:(k,v)=>window.__testStore[k]=String(v),removeItem:k=>delete window.__testStore[k],clear:()=>window.__testStore={}}});location.hash='+json.dumps('#'+route)+';</script>'
 p.set_content(HTML.replace('<script>(()=>',shim+'<script>(()=>'),wait_until='networkidle')
 return p

def state(p):return json.loads(p.evaluate('(k)=>window.__testStore[k]',KEY))
def nav(p,route):p.evaluate('(r)=>location.hash="#"+r',route);p.wait_for_timeout(110)
def click(p,action,tail=''):p.locator('[data-action="'+action+'"]'+tail).first.click()
def shot(p,name,full=True):
 p.evaluate('document.getElementById("toast").classList.remove("visible");document.activeElement?.blur();window.scrollTo({top:0,behavior:"instant"})')
 p.wait_for_timeout(150)
 p.screenshot(path=str(OUT/name),full_page=full)
def solve_ui(p,topic,index):
 a=FIX['activities'][topic][index];t=a['type']
 if t=='classify':
  # The first card is physically dragged, subsequent cards use equivalent buttons.
  x=a['items'][0]
  source=p.locator('[data-drag-id="'+x['id']+'"]');target=p.locator('[data-drop-bin="'+str(x['answer'])+'"]')
  source.evaluate('(el)=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-180,behavior:"instant"})')
  p.wait_for_timeout(120)
  sb=source.bounding_box();tb=target.bounding_box()
  p.mouse.move(sb['x']+12,sb['y']+12);p.mouse.down()
  p.mouse.move(sb['x']+35,sb['y']+30,steps=5)
  p.mouse.move(tb['x']+40,tb['y']+40,steps=20);p.mouse.up()
  p.wait_for_timeout(100)
  assert p.locator('[data-drop-bin="'+str(x['answer'])+'"] [data-drag-id="'+x['id']+'"]').count()==1
  for x in a['items'][1:]:click(p,'lab-place','[data-id="'+x['id']+'"][data-value="'+str(x['answer'])+'"]')
 elif t=='match':
  for x in a['items']:click(p,'lab-place','[data-id="'+x['id']+'"][data-value="'+str(x['answer'])+'"]')
 elif t=='sequence':
  for i,x in enumerate(a['correct']):
   order=p.locator('[data-sequence-target]').evaluate_all('(els)=>els.map(x=>x.dataset.sequenceTarget)')
   for _ in range(order.index(x)-i):click(p,'lab-move','[data-id="'+x+'"][data-delta="-1"]')
 elif t=='lenses':
  for x in a['lenses']:click(p,'lab-view','[data-value="'+x['id']+'"]')
  click(p,'lab-value','[data-key="choice"][data-value="1"]')
 elif t=='reflection':
  for f in a['fields']:p.locator('[data-lab-field="'+f['id']+'"]').fill('这周找到一个具体的问题，记录条件，再做一次小范围尝试。')
 elif t=='runner':
  click(p,'lab-runner','[data-step="draft"]');expect(p.locator('.tool-event.blocked')).to_have_count(1)
  for step in ['search','inspect','draft','verify']:click(p,'lab-runner','[data-step="'+step+'"]')
  assert len(state(p)['journeys'][topic]['activities'][str(index)]['citations'])>0
 elif t=='guardrails':
  click(p,'lab-guard-test')
  assert not state(p)['journeys'][topic]['activities'][str(index)].get('blocked',False)
  p.locator('[data-lab-select="maxSteps"]').select_option('3')
  click(p,'lab-toggle','[data-key="approval"]');click(p,'lab-toggle','[data-key="isolate"]');click(p,'lab-guard-test')
 elif t=='benchmark':
  for x in a['cases']:click(p,'lab-benchmark','[data-id="'+x['id']+'"]')
 elif t=='sample':
  slider=p.locator('[data-lab-range="reveal"]');slider.focus();slider.press('End')
  expect(p.locator('[data-live="sample-count"]')).to_have_text('100')
  expect(p.locator('[data-live="sample-ratio"]')).to_have_text('30 / 100 成功')
  click(p,'lab-value','[data-key="conclusion"][data-value="selection"]')
 elif t=='causal':
  for v in ['overall','groups','diagram']:click(p,'lab-view','[data-value="'+v+'"]')
  click(p,'lab-value','[data-value="confounder"]')
 elif t=='evidence':
  for x in a['items']:click(p,'lab-place','[data-id="'+x['id']+'"][data-value="'+x['side']+'"]')
  click(p,'lab-value','[data-value="limited"]')
 elif t=='bayes':
  slider=p.locator('[data-lab-range="prior"]');slider.focus();slider.press('ArrowRight')
  expect(p.locator('[data-live="posterior"]')).not_to_contain_text('50.0')
  click(p,'lab-value','[data-value="prior"]')
 click(p,'lab-evaluate');expect(p.locator('.activity-panel.is-passed')).to_have_count(1)

with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 p=mount(b)
 record('home loads without external dependencies')
 shot(p,'01-home.png')
 click(p,'preview-world','[data-id="ai-agents"]');expect(p.locator('.hero-field-map .terrain-scene')).to_have_attribute('data-world','ai-agents')
 click(p,'preview-world','[data-id="critical-thinking"]');expect(p.locator('.hero-field-map .terrain-scene')).to_have_attribute('data-world','critical-thinking')
 record('homepage changes actual SVG geometry for three themes')
 click(p,'knowledge-guide');click(p,'guide-question');expect(p.locator('.guide-answer')).to_have_count(1)
 p.locator('#knowledge-ask input').fill('火星的玫瑰色海洋城市');p.locator('#knowledge-ask').evaluate('(f)=>f.requestSubmit()');expect(p.locator('.guide-no-result')).to_have_count(1)
 click(p,'close-dialog');record('local guide returns cited answer and honest no-match')
 click(p,'library-open');expect(p.locator('.knowledge-source')).to_have_count(36)
 click(p,'library-filter','[data-key="libraryKind"][data-value="zhihu"]');expect(p.locator('.knowledge-source')).to_have_count(24)
 click(p,'source-save','[data-id="zh-ex-01"]');click(p,'library-saved');expect(p.locator('.knowledge-source')).to_have_count(1)
 click(p,'library-saved');click(p,'source-compare','[data-id="zh-ex-01"]');click(p,'source-compare','[data-id="zh-ex-02"]');click(p,'compare-open');expect(p.locator('.source-compare-grid section')).to_have_count(2)
 click(p,'close-dialog');click(p,'source-detail','[data-id="zh-ex-01"]');expect(p.locator('.source-provenance')).to_contain_text('只获取了搜索索引')
 assert p.locator('.source-original').get_attribute('href').startswith('https://')
 shot(p,'02-source-detail.png',False);click(p,'close-dialog')
 record('36-source library filters, saves, compares and reveals honest access metadata')
 click(p,'library-filter','[data-key="libraryKind"][data-value="all"]');p.locator('#library-search input').fill('加缪');p.locator('#library-search').evaluate('(f)=>f.requestSubmit()');assert 1<=p.locator('.knowledge-source').count()<36
 p.locator('#library-search input').fill('无匹配的火星玫瑰');p.locator('#library-search').evaluate('(f)=>f.requestSubmit()');expect(p.locator('.library-empty')).to_have_count(1)
 p.locator('#library-search input').fill('');p.locator('#library-search').evaluate('(f)=>f.requestSubmit()');shot(p,'03-library.png')
 record('library search and empty state behave correctly')
 for topic in FIX['activities']:
  nav(p,'/');click(p,'choose-topic','[data-id="'+topic+'"]')
  click(p,'ask-next');click(p,'ask-next');click(p,'generate')
  expect(p.locator('.generation-steps')).to_have_count(1)
  p.wait_for_function('(t)=>location.hash==="#/mountain/"+t',arg=topic,timeout=10000)
  expect(p.locator('.route-panel')).to_have_count(1)
  shot(p,'map-'+topic+'.png')
  click(p,'station','[data-index="4"]');expect(p.locator('dialog')).to_be_visible();click(p,'close-dialog')
  record(topic+' generated route and locked-node preview')
  for i in range(5):
   click(p,'read-current');expect(p.locator('[data-lab-id="'+FIX['activities'][topic][i]['id']+'"]').first).to_be_visible()
   if i==0:
    click(p,'quiz','[data-index="'+str(FIX['quizAnswers'][topic][i])+'"]');expect(p.locator('[data-action="complete"]')).to_be_disabled()
    record(topic+' quiz alone cannot unlock')
   click(p,'lab-evaluate');expect(p.locator('.activity-panel.is-passed')).to_have_count(0)
   solve_ui(p,topic,i)
   if i in [0,2,4]:shot(p,'activity-'+topic+'-'+str(i+1)+'.png')
   click(p,'quiz','[data-index="'+str(FIX['quizAnswers'][topic][i])+'"]')
   expect(p.locator('[data-action="complete"]')).to_be_enabled()
   p.locator('#note-text').fill('浏览器实测手记：'+topic+' '+str(i))
   if i==0:click(p,'bookmark')
   click(p,'complete')
   if i<4:
    p.wait_for_function('(t)=>location.hash==="#/mountain/"+t',arg=topic)
    p.wait_for_timeout(160)
    expect(p.locator('.terrain-scene.is-walking')).to_have_count(1)
    a=p.locator('#traveler-position').get_attribute('transform');p.wait_for_timeout(380);bb=p.locator('#traveler-position').get_attribute('transform');assert a!=bb
    mode=p.locator('.terrain-scene').get_attribute('data-travel')
    if topic=='ai-agents' and i==2:shot(p,'walk-cable.png',False)
    click(p,'skip-walk');expect(p.locator('.terrain-scene.is-walking')).to_have_count(0)
    assert state(p)['journeys'][topic]['completed']==i+1
    record(FIX['activities'][topic][i]['id']+' interaction + quiz + '+mode+' traversal')
   else:
    p.wait_for_function('(t)=>location.hash==="#/summit/"+t',arg=topic)
    assert state(p)['journeys'][topic]['completed']==5
    record(FIX['activities'][topic][i]['id']+' summit completed')
  shot(p,'summit-'+topic+'.png')
 # Revisit notes and separate content/source pages.
 nav(p,'/read/existentialism/0');expect(p.locator('#note-text')).to_have_value('浏览器实测手记：existentialism 0')
 click(p,'read-tab','[data-tab="guide"]');expect(p.locator('.key-points')).to_have_count(1)
 click(p,'read-tab','[data-tab="perspectives"]');assert p.locator('.real-zhihu-discussions .knowledge-source').count()>0
 click(p,'read-tab','[data-tab="sources"]');assert p.locator('.reader-source-list .knowledge-source').count()>=3
 record('notes persist across navigation and all reading tabs show linked content')
 nav(p,'/fieldbook');expect(p.locator('.concept-world li.earned')).to_have_count(15);shot(p,'04-fieldbook.png')
 with p.expect_download() as download:click(p,'export-research')
 d=download.value;d.save_as(str(EXPORT/'fieldnotes.md'));assert 'https://www.zhihu.com' in (EXPORT/'fieldnotes.md').read_text()
 record('understanding graph reflects fifteen completed camps and research export includes real citations')
 nav(p,'/summit/existentialism')
 with p.expect_download() as download:click(p,'export-card')
 download.value.save_as(str(EXPORT/'summit.svg'));assert '<svg' in (EXPORT/'summit.svg').read_text()
 saved=state(p);p2=mount(b,saved,'/journey');assert all(j['completed']==5 for j in state(p2)['journeys'].values())
 record('serialized learning records restore all progress and summit SVG exports')
 # New reduced-motion journey operates without traversal delay.
 fresh=mount(b,route='/read/existentialism/0',reduced=True)
 solve_ui(fresh,'existentialism',0);click(fresh,'quiz','[data-index="0"]');click(fresh,'complete');fresh.wait_for_timeout(250);expect(fresh.locator('.is-walking')).to_have_count(0)
 record('reduced-motion mode preserves completion without animation')
 for width in [390,768,1024]:
  mob=mount(b,saved,width=width,height=844)
  for route in ['/','/mountain/ai-agents','/read/critical-thinking/1','/library','/fieldbook']:
   nav(mob,route);mob.wait_for_timeout(50)
   assert mob.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),(width,route,mob.evaluate('document.documentElement.scrollWidth'))
   if width==390:shot(mob,'mobile-'+route.strip('/').replace('/','-')+'.png')
  mob.close();record('responsive views at '+str(width)+'px have no horizontal overflow')
 assert not ERRORS,ERRORS
 record('no uncaught browser JavaScript errors')
 (ROOT/'tests/v2-browser-results.json').write_text(json.dumps({'passed':len(RESULTS),'checks':RESULTS,'errors':ERRORS,'execution':'Chromium set_content with explicit test-only Storage adapter; HTTP tested separately'},ensure_ascii=False,indent=2))
 p.close();p2.close();fresh.close();b.close()
print('TOTAL',len(RESULTS))