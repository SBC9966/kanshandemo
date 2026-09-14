import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const assets={};
for(const file of fs.readdirSync(path.join(root,'src/assets')).filter(x=>x.endsWith('.webp'))){assets[path.basename(file,'.webp')]='data:image/webp;base64,'+fs.readFileSync(path.join(root,'src/assets',file)).toString('base64');}
const assetModule='export const ASSETS = '+JSON.stringify(assets)+';';
fs.writeFileSync(path.join(root,'src/assets.mjs'),assetModule);
// The source files remain native ES modules. Distribution packs the known module graph
// into one closure for file:// support, with no runtime loader or network dependencies.
const modules=['vendor/three.module.js','vendor/OrbitControls.js','assets.mjs','data/knowledge.mjs','data/activities.mjs','domain.mjs','data/content.mjs','data/mountains.mjs','knowledge-engine.mjs','activity-engine.mjs','ui.mjs','worlds.mjs','diorama/core.mjs','diorama/camera.mjs','diorama/engine.mjs','diorama/mountains/field.mjs','diorama/mountains/shell.mjs','diorama/mountains/stations.mjs','diorama/mountains/peakScene.mjs','diorama/registry.mjs','scene3d.mjs','activities-ui.mjs','scenes.mjs','pages.mjs','pages-v2.mjs','mind-map.mjs','rag-guide.mjs','main.mjs'];
// 沙盘模块以 `import * as T from './vendor/three.module.js'` + `T.Xxx` 访问 three。
// 打包时 import 会被剥掉，所以 three 要包成 IIFE 并回传命名空间 T；这样 three 的内部名
// （clamp/lerp/_ray 等）留在 IIFE 内，也不会与沙盘模块的顶层同名声明冲突。
const bound=new Map();
function pack(file){
  let src=fs.readFileSync(path.join(root,'src',file),'utf8');  if(file==='vendor/three.module.js'){
    const list=src.match(/export\s*\{([^}]*)\}\s*;?\s*$/);
    const names=list[1].split(',').map(x=>x.trim()).filter(Boolean);
    return `const T=(()=>{\n${src.slice(0,list.index)}\nreturn { ${names.join(', ')} };\n})();`;
  }
  if(file==='vendor/OrbitControls.js'){
    const imp=src.match(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*['"];?/);
    const names=imp[1].split(',').map(x=>x.trim()).filter(Boolean);
    const body=src.replace(imp[0],'').replace(/export\s*\{[^}]*\}\s*;?/,'');
    return `const { ${names.join(', ')} } = T;\n${body}`;
  }
  // 打包后所有模块共享同一作用域，import 的名字按原名解析；只有 `X as Y` 别名需要补一条绑定。
  // 别名全局只发一次（多个模块可能各自 `palette as C`），映射冲突说明会静默串味，构建期直接报错。
  const aliases=[];
  src=src.replace(/^import\s*\{([^}]*)\}\s*from\s*['"][^'"]*['"];?\s*$/gm,(full,clause)=>{
    for(const part of clause.split(',').map(x=>x.trim()).filter(Boolean)){
      const alias=part.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
      if(!alias)continue;
      const [local,source]=[alias[2],alias[1]];
      if(bound.has(local)){
        if(bound.get(local)!==source)throw new Error(`别名冲突：${local} 同时指向 ${bound.get(local)} 与 ${source}`);
        continue;
      }
      bound.set(local,source);
      aliases.push(`const ${local} = ${source};`);
    }
    return '';
  });
  const body=src.replace(/^export\s*\{[^}]*\}\s*from\s*['"][^'"]*['"];?\s*$/gm,'').replace(/^export\s*\*\s*from\s*['"][^'"]*['"];?\s*$/gm,'').replace(/^import[\s\S]*?;\s*$/gm,'').replace(/export\s*\{[\s\S]*?\};\s*$/m,'').replace(/^export /gm,'');
  return aliases.length?aliases.join('\n')+'\n'+body:body;
}
const script=modules.map(pack).join('\n\n');
// 单闭包打包的代价：所有模块共享一个作用域，顶层 const/let/class 重名就是语法错误。
// 早年间这里踩过 _ray / clamp / lerp 三次，所以构建期直接查一遍，报错时给出冲突双方。
{
  const owner=new Map(), dup=[];
  for(const file of modules){
    if(file==='vendor/three.module.js')continue;   // three 被包进 IIFE，内部名不在共享作用域里
    const src=fs.readFileSync(path.join(root,'src',file),'utf8');
    const re=/^(?:export\s+)?(?:const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
    let m;
    while((m=re.exec(src))){
      const name=m[1], prev=owner.get(name);
      if(prev&&prev!==file)dup.push(`${name}（${prev} ↔ ${file}）`);
      else if(!prev)owner.set(name,file);
    }
  }
  if(dup.length)throw new Error(`顶层声明重名，单闭包打包会语法错误：\n  ${[...new Set(dup)].join('\n  ')}`);
}
const css=['styles.css','styles-v2.css','styles-type-pass.css','styles-component-pass.css'].map(x=>fs.readFileSync(path.join(root,'src',x),'utf8')).join('\n');
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f8f6ef"><meta name="description" content="看山不是山：让信息找人，让知识有路径。一个完整可离线使用的知识登山 Demo。"><title>看山不是山 · 让知识有路径</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' rx='12' fill='%232c5755'/%3E%3Cpath d='M7 36 20 9l8 19 6-12 9 20Z' fill='%23f8f6ef'/%3E%3C/svg%3E"><style>${css}</style></head><body><a class="skip-link" href="#main">跳到主要内容</a><div id="app"></div><div id="toast" class="toast" role="status" aria-live="polite"></div><dialog id="dialog" aria-labelledby="dialog-title"></dialog><input type="file" id="import-file" accept="application/json,.json" hidden><script>(()=>{'use strict';\n${script.replace(/<\/script/gi,'<\\/script')}\n})();</script></body></html>`;
fs.mkdirSync(path.join(root,'dist'),{recursive:true});fs.writeFileSync(path.join(root,'dist/index.html'),html);
fs.writeFileSync(path.join(root,'index.html'),html);
console.log(`Built dist/index.html (${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MB). All images and scripts are embedded.`);
