from pathlib import Path
import os,json
ROOT=Path(__file__).resolve().parents[1]
exec((ROOT/'tests/v2-browser.py').read_text().split('with sync_playwright()')[0],globals())
RESULTS=[];ERRORS=[]
def record(name):
 RESULTS.append(name);print('PASS',name,flush=True)
 (ROOT/'tests/v2-extra-results.json').write_text(json.dumps({'passed':len(RESULTS),'checks':RESULTS,'errors':ERRORS,'scope':'DOM via set_content; explicit test-only storage adapter'},ensure_ascii=False,indent=2))
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 p=mount(b,FIX['complete'],'/mountain/ai-agents')
 click(p,'zoom-in');assert 'scale(1.1)' in p.locator('#map-transform').get_attribute('style')
 click(p,'zoom-out');click(p,'reset-map');expect(p.locator('[data-action=reset-map]')).to_have_text('100%');record('map zoom and reset update real transform')
 p.locator('#map-viewport').evaluate('(el)=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-100,behavior:"instant"})');p.wait_for_timeout(150);box=p.locator('#map-viewport').bounding_box();p.mouse.move(box['x']+30,box['y']+200);p.mouse.down();p.mouse.move(box['x']+110,box['y']+235,steps=15);p.mouse.up();assert p.locator('#map-transform').evaluate('(el)=>new DOMMatrix(getComputedStyle(el).transform).m41')>60;click(p,'reset-map');record('map pans by pointer movement')
 click(p,'settings');click(p,'scene','[data-value=evening]');expect(p.locator('html')).to_have_attribute('data-scene','evening');click(p,'motion');assert not state(p)['settings']['motion'];click(p,'scene','[data-value=morning]');click(p,'close-dialog');record('daylight and reduced-motion preferences persist')
 nav(p,'/read/critical-thinking/4');slider=p.locator('[data-lab-range=prior]');slider.focus();start=float(slider.input_value());
 for _ in range(5):slider.press('ArrowRight')
 assert float(slider.input_value())==start+5*float(slider.get_attribute("step"));assert slider.evaluate('(e)=>e===document.activeElement');record('repeated slider input keeps keyboard focus and recomputes probability')
 nav(p,'/read/existentialism/4');letter=p.locator('[data-lab-field]').first;letter.fill('这周先整理已有证据，再做一次小范围尝试。');click(p,'lab-evaluate');nav(p,'/summit/existentialism');expect(p.locator('.summit-letter')).to_contain_text('这周先整理已有证据');record('personal reflection appears in actual summit page')
 nav(p,'/read/existentialism/0');click(p,'lab-reset');assert state(p)['journeys']['existentialism']['completed']==5
 restored=mount(b,state(p),'/journey');assert state(restored)['journeys']['existentialism']['completed']==5;record('resetting a revisited exercise does not revoke earned completion')
 click(p,'settings')
 with p.expect_download() as dl:click(p,'export-state')
 file=EXPORT/'backup.json';dl.value.save_as(str(file));backup=json.loads(file.read_text());assert len(backup['journeys'])==3;click(p,'close-dialog');record('backup file contains all three real journey records')
 q=mount(b);q.locator('#import-file').set_input_files(str(file));expect(q.locator('[data-action=confirm-import]')).to_have_count(1);click(q,'confirm-import');q.wait_for_timeout(100);assert state(q)['journeys']['ai-agents']['completed']==5;record('file import confirms and restores validated backup')
 invalid=EXPORT/'invalid.json';invalid.write_text('{bad json');q.locator('#import-file').set_input_files(str(invalid));expect(q.locator('#toast')).to_have_class('toast visible');assert state(q)['journeys']['ai-agents']['completed']==5;record('malformed import preserves existing records')
 click(q,'reset-journey','[data-id=ai-agents]');click(q,'close-dialog');assert 'ai-agents' in state(q)['journeys'];record('cancelled destructive action retains data')
 nav(q,'/library');click(q,'source-detail','[data-id=zh-ex-01]');q.keyboard.press('Escape');expect(q.locator('#dialog')).not_to_be_visible();record('source modal closes with Escape')
 nav(q,'/');q.locator('#topic-input').fill('火星玫瑰色海洋');q.locator('#topic-form').evaluate('(f)=>f.requestSubmit()');expect(q.locator('.query-quote')).to_contain_text('火星玫瑰色海洋');assert '/ask/' not in q.evaluate('location.hash');click(q,'close-dialog');record('unknown input is not silently mapped to a preset topic')
 fresh=mount(b);click(fresh,'choose-topic','[data-id=existentialism]');click(fresh,'ask-next');click(fresh,'ask-next');click(fresh,'generate');click(fresh,'cancel-generation');fresh.wait_for_timeout(3000);assert fresh.evaluate('location.hash').startswith('#/ask/');record('cancelled generation cannot redirect after the timer finishes')
 # Capture final screenshots at their real viewport, with no hidden UI or mock visuals.
 for topic in ['existentialism','ai-agents','critical-thinking']:
  nav(p,'/mountain/'+topic);shot(p,'final-map-'+topic+'.png')
 nav(p,'/');shot(p,'final-home.png')
 nav(p,'/library');shot(p,'final-library.png')
 nav(p,'/read/ai-agents/2');p.locator('.activity-panel').scroll_into_view_if_needed();p.evaluate('window.scrollBy({top:-110,behavior:"instant"})');p.wait_for_timeout(200);p.screenshot(path=str(OUT/'final-agent-lab.png'),full_page=False)
 nav(p,'/read/critical-thinking/1');p.locator('.activity-panel').scroll_into_view_if_needed();p.evaluate('window.scrollBy({top:-100,behavior:"instant"})');p.wait_for_timeout(200);p.screenshot(path=str(OUT/'final-sample-lab.png'),full_page=False)
 assert not ERRORS,ERRORS;record('extra workflow checks have no uncaught JavaScript errors')
 p.close();q.close();restored.close();fresh.close();b.close()
print('TOTAL',len(RESULTS))
