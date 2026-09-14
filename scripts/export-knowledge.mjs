import fs from 'node:fs';
import path from 'node:path';
import {RESEARCH_DATE,KNOWLEDGE_SOURCES,NODE_SOURCES,RESEARCH_REFERENCES} from '../src/data/knowledge.mjs';
import {MOUNTAINS} from '../src/data/content.mjs';
import {ACTIVITIES} from '../src/data/activities.mjs';
import {KNOWLEDGE_UNITS,QA_CARDS,CONCEPT_LABELS,CROSS_PATHS,validateKnowledge} from '../src/knowledge-engine.mjs';
const root=path.resolve(import.meta.dirname,'..');
const folder=path.join(root,'knowledge-base');fs.mkdirSync(folder,{recursive:true});
const audit=validateKnowledge();if(!audit.ok)throw new Error(audit.errors.join('\n'));
const bundle={version:'2.0.0',researchedAt:RESEARCH_DATE,description:'可离线使用的策展型学习知识库。24个知乎条目为搜索索引及部分摘要，不包含完整回答；12个公开参考页读取了相关段落。所有导读和练习是本项目编写，不是原文转载。',retrieval:'本地分词与关键词匹配，不是实时联网或向量RAG',audit,sources:KNOWLEDGE_SOURCES,units:KNOWLEDGE_UNITS,questions:QA_CARDS,concepts:CONCEPT_LABELS,crossPaths:CROSS_PATHS,mountains:MOUNTAINS,activities:ACTIVITIES};
const write=(name,data)=>fs.writeFileSync(path.join(folder,name),JSON.stringify(data,null,2)+'\n');
write('knowledge-base.json',bundle);write('sources.json',KNOWLEDGE_SOURCES);write('lessons.json',MOUNTAINS);write('questions.json',QA_CARDS);write('activities.json',ACTIVITIES);write('concepts.json',{concepts:CONCEPT_LABELS,crossPaths:CROSS_PATHS});
const lines=['# 资料逐条核查表 · v2.0','','检索日期：'+RESEARCH_DATE,'','这里的“已读相关页面”只表示读取了与该知识点有关的公开段落，不等于逐句核验整页。知乎的“仅检索摘要”明确不包含全文；原文可能需要登录。问题页中的不同回答不是一个统一作者立场。',''];
for(const s of KNOWLEDGE_SOURCES){const camps=Object.entries(NODE_SOURCES).flatMap(([topic,nodes])=>nodes.map((ids,i)=>ids.includes(s.id)?topic+' / '+(i+1):null).filter(Boolean));lines.push('## '+s.id+' · '+s.title,'','- 地址：'+s.url,'- 发布方：'+s.publisher+(s.author?'；索引可见作者：'+s.author:''),'- 访问范围：'+s.access+'；'+s.scope,'- 内容属性：'+s.summaryKind,'- 本项目阅读提示：'+s.guide,'- 对应营地：'+camps.join('、'),'');}
lines.push('## 交互实现参考','');for(const r of RESEARCH_REFERENCES)lines.push('- '+r.title+'：'+r.url+' — '+r.use);
fs.writeFileSync(path.join(root,'docs/SOURCEBOOK.md'),lines.join('\n')+'\n');
console.log('Exported '+audit.sources+' sources, '+audit.units+' camps, '+audit.questions+' local questions.');
