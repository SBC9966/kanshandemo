import { KNOWLEDGE_SOURCES, SOURCE_BY_ID, NODE_SOURCES, TOPIC_LABELS } from './data/knowledge.mjs';
import { MOUNTAINS } from './data/content.mjs';
const qa=(id,topic,node,question,keywords,answer,sourceIds)=>({id,topic,node,question,keywords,answer,sourceIds});
export const QA_CARDS=[
 qa('q-ex-01','existentialism',0,'存在先于本质，等于人没有任何限制吗？',['存在','本质','限制','萨特','定义'],'不是。这里讨论的是人的生活不由一份预先写好的身份说明书完全规定；它不能抹去身体、历史与社会条件。先区分既有处境和可承担的行动。',['sep-sartre','zh-ex-01','zh-ex-05']),
 qa('q-ex-02','existentialism',0,'存在主义是什么，它等于虚无主义吗？',['存在主义','existentialism','定义','虚无','消极','意义'],'存在主义是一组围绕人的具体存在、选择、自由与责任展开的哲学探索，不是一套完全统一的教义。它不能直接等同于虚无主义：认真面对意义问题，不等于宣称一切都不值得做。读具体作者的主张，不要只依据标签。',['sep-existentialism','zh-ex-02']),
 qa('q-ex-03','existentialism',1,'存在主义是二战后才突然出现的吗？',['二战','历史','前史','战争','出现'],'不是。思想背景可以追溯到更早的作者和问题。20 世纪中叶的公共影响不等于这些思想从那时才开始；这条山路把前史、经验方法与公共传播分开。',['sep-existentialism','zh-ex-08']),
 qa('q-ex-04','existentialism',2,'加缪算不算存在主义者？',['加缪','存在主义者','归类','荒诞'],'不能不加说明地这样归类。加缪与存在主义有思想联系，但拒绝这一标签。比较他与萨特时，应保留对荒诞、自由与政治伦理问题的差异。',['sep-camus','zh-ex-03','zh-ex-04']),
 qa('q-ex-05','existentialism',2,'为什么这座山单独讨论波伏瓦？',['波伏瓦','女性','处境','他人'],'她对处境中的自由、他人和伦理作出了独立贡献。把她仅仅作为萨特思想的附属，会遗漏这里要理解的关系与社会条件。',['sep-beauvoir','zh-ex-03']),
 qa('q-ex-06','existentialism',3,'自由是不是想做什么就做什么？',['自由','责任','任性','想做'],'这不是本课程中自由的含义。行动需要在具体条件中被理解，也会影响他人。双径栈道要求同时看见行动与限制，而不是训练你选定某种人生立场。',['sep-beauvoir','sep-sartre','zh-ex-01']),
 qa('q-ex-07','existentialism',4,'做真实的自己就可以不考虑别人吗？',['真实','本真','自己','别人'],'真实性不是简单的任性口号。有关自我与社会关系的解释有分歧；可以先说明正在回应的处境、愿意承担的行动，以及什么信息会让自己修正。',['sep-authenticity','zh-ex-07']),
 qa('q-ex-08','existentialism',4,'读完五层，就等于掌握存在主义了吗？',['读完','掌握','五层','全部'],'这只是建立问题地图，不是完整课程。带着自己的问题回到原著、学术条目和多种解读，特别注意文学情境和哲学论证的区别。',['sep-existentialism','zh-ex-07']),
 qa('q-ai-01','ai-agents',0,'Agent 和聊天机器人究竟有什么区别？',['agent','智能体','聊天','区别','定义'],'本 Demo 采用一个可检查的工作定义：系统根据目标与反馈决定下一步，调用受控工具并观察结果。名字或拟人语气不是能力证据；有工具也不自动意味着高自主性。',['anthropic-agents','zh-ai-01','zh-ai-02']),
 qa('q-ai-02','ai-agents',1,'Agent 与工作流有什么区别，固定流程更低级吗？',['工作流','workflow','固定','低级','复杂'],'主要区别在于谁决定下一步：工作流按预先定义的路径组织执行，而 Agent 让模型动态决定部分过程与工具选择。它们不是高低等级。先建简单、可测量的基线，再用任务结果、成本和延迟判断要不要增加自主性。',['anthropic-agents','zh-ai-03']),
 qa('q-ai-03','ai-agents',2,'ReAct 的行动与观察是什么意思？',['react','行动','观察','反馈','循环'],'行动指与工具或环境交互，观察是返回的外部结果。它们和关于行动的解释文字不一样。实验室只显示实际工具事件，不展示或声称取得模型内部思考。',['react-paper','zh-ai-05','zh-ai-06']),
 qa('q-ai-04','ai-agents',2,'它说保存成功，能证明真的成功吗？',['成功','保存','文件','校验','引用'],'不能。成功应依据工具输出，并检查预期结果。本实验会检查引用 ID 是否真实存在于知识库；一段流畅的草稿不能代替这个检查。',['react-paper','anthropic-tools','zh-ai-06']),
 qa('q-ai-05','ai-agents',3,'检索和 RAG 能消除所有幻觉吗？',['rag','幻觉','消除','检索'],'不能据此保证正确。资料可能不相关、陈旧或只读到摘要，模型也可能误用资料。应该保留访问范围、引用、失败与不确定性，而不是把有链接当作已证明。',['anthropic-agents','zh-ai-07','zh-ai-08']),
 qa('q-ai-06','ai-agents',3,'为什么发邮件还要人工批准？',['邮件','批准','权限','发送','安全'],'本 Demo 将阅读和对外写入分开。真实发送会影响别人，因此必须由用户明确批准；网页中的“忽略权限”文字只是外部数据，不能授权系统。',['anthropic-agents','anthropic-tools','zh-ai-08']),
 qa('q-ai-07','ai-agents',3,'Agent 一直重试是不是更聪明？',['重试','循环','停止','预算'],'无界重试可能浪费资源并重复错误。应定义成功条件、最大步数、超时与需要人工介入的情形。实验里的闸门是代码约束，不是一句提示语。',['anthropic-agents','zh-ai-06']),
 qa('q-ai-08','ai-agents',4,'通过三个用例，能直接投入生产吗？',['测试','验收','生产','三个'],'不能。这三个确定性的本地用例只用于解释证据、拒绝和权限。生产系统还需要代表性测试集、故障评估、真实服务监测与更充分的安全审查。',['anthropic-agents','react-paper','zh-ai-04']),
 qa('q-th-01','critical-thinking',0,'可核查的陈述就一定是真话吗？',['事实','观点','陈述','真假','核查'],'不是。可核查描述的是陈述类型，是否真实仍要看记录与证据。把事实型陈述、价值判断和因果推论分开，是检查的开始而不是结束。',['sep-critical','zh-th-02','zh-th-03']),
 qa('q-th-02','critical-thinking',0,'批判性思维就是怀疑或反对一切吗？',['批判','思维','独立思考','critical thinking','怀疑','反对'],'不是。目标是给判断提供可检查的理由，并允许修正。对合理证据无条件否定，与无条件相信权威一样，都绕过了具体检验。',['sep-critical','zh-th-01']),
 qa('q-th-03','critical-thinking',1,'为什么补全样本后成功率变了？',['样本','幸存者','成功率','选择','看不见'],'本实验原先只展示 20 人，其中 18 人成功；补上 80 人后，完整样本是 100 人中 30 人成功。是观察范围发生变化，不是原来那些人的结果变了。所有数字都是教学构造。',['sep-science','zh-th-06']),
 qa('q-th-04','critical-thinking',2,'相关性为什么不等于因果性？',['相关','因果','混杂','温度'],'两个变量可以受共同因素影响，也可能存在其他方向的关系。冰饮实验预设温度为共同原因；观察到共同变化，不能直接证明主动改变其中之一会改变另一个。',['sep-science','brown-regression','zh-th-04']),
 qa('q-th-05','critical-thinking',2,'按温度分组，就一定证明因果了吗？',['分组','控制','温度','证明'],'没有。分组帮助检查这个教学模型中的混杂；真实研究仍依赖变量测量、研究设计和假设。也不应因此认为观察性研究毫无价值。',['sep-science','zh-th-05']),
 qa('q-th-06','critical-thinking',3,'证据天平两边的卡片可以直接投票吗？',['证据','天平','数量','投票','反例'],'不能。天平只是提醒同时看支持与限制，证据要看质量和适用范围。三条故事不能自动胜过一条研究，一条研究也不能自动推广到所有人。',['sep-critical','zh-th-07']),
 qa('q-th-07','critical-thinking',4,'贝叶斯更新为什么需要先验？',['贝叶斯','先验','后验','概率','更新'],'后验同时依赖原先的可能性和证据在不同条件下出现的概率。在本实验中，先验为 20%、真提示率 80%、误报率 20% 时，看到提示后的概率为 50%。这不是现实天气预测。',['brown-bayes','zh-th-08']),
 qa('q-th-08','critical-thinking',4,'新证据和我原来的想法冲突怎么办？',['冲突','改变','确认偏误','反面'],'先检查证据是否相关、可靠，再调整判断的范围或确信程度。主动写下什么证据会让自己改主意，有助于避免只挑选支持材料。',['sep-critical','brown-bayes','zh-th-07'])
];
export const CONCEPT_LABELS={
 'existentialism':[['本质','处境'],['前史','现象学'],['自由','荒诞'],['能动性','他人'],['本真','自我修正']],
 'ai-agents':[['目标','工具'],['工作流','自主性'],['观察','反馈'],['权限','停止条件'],['验收','证据']],
 'critical-thinking':[['陈述','推论'],['样本','选择机制'],['混杂','干预'],['反例','适用范围'],['先验','后验']]
};
export const CROSS_PATHS=[
 {from:['existentialism',3],to:['critical-thinking',3],name:'怎样对待一个不同意见？',relation:'从承认分歧，走向比较理由与证据。'},
 {from:['ai-agents',2],to:['critical-thinking',0],name:'工具返回了内容，就代表事实吗？',relation:'从执行记录，走向区分陈述与证据。'},
 {from:['critical-thinking',4],to:['ai-agents',3],name:'不确定时，系统应该怎么停？',relation:'从更新判断，走向可控的行动。'},
 {from:['existentialism',4],to:['critical-thinking',4],name:'什么会让我修改现在的选择？',relation:'从行动寄语，走向可修正的相信程度。'}
];
export const KNOWLEDGE_UNITS = MOUNTAINS.flatMap(m=>m.nodes.map((n,i)=>({id:m.id+':'+i,topic:m.id,node:i,title:n.title,concepts:CONCEPT_LABELS[m.id]?.[i]??[],summary:n.intro,sourceIds:NODE_SOURCES[m.id]?.[i]??n.sourceIds??[]})));
const RETRIEVAL_STOPWORDS=new Set(['是什么','为什么','怎么','如何','一个','什么','是不是','可以','这个','我们','的话','怎样','什么是']);
export function tokenizeKnowledge(text){const t=String(text??'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ');const out=new Set(t.match(/[a-z0-9]+/g)??[]);for(const run of t.match(/[\u3400-\u9fff]+/g)??[]){for(let i=0;i<run.length-1;i++){const pair=run.slice(i,i+2);if(!RETRIEVAL_STOPWORDS.has(pair))out.add(pair);}}return [...out];}
function kbRank(query,text,tags=[]){const words=tokenizeKnowledge(query);let score=0;const hay=String(text).toLowerCase();for(const term of words)if(hay.includes(term))score+=term.length>2?3:1;for(const tag of tags)if(String(query).toLowerCase().includes(tag.toLowerCase()))score+=4;return score;}
export function searchSources(query='',options={}){const {topic='all',kind='all'}=options;return KNOWLEDGE_SOURCES.filter(s=>(topic==='all'||s.topic===topic)&&(kind==='all'||(kind==='zhihu'?s.publisher==='知乎':s.access==='page-read'))).map(s=>({...s,score:query?kbRank(query,s.title+' '+s.guide+' '+s.tags.join(' '),s.tags):1})).filter(s=>s.score>0).sort((a,b)=>b.score-a.score);}
function rankKnowledgeAnswer(query,card){
 const text=(card.question+' '+card.keywords.join(' ')).toLowerCase();let score=0;
 for(const term of tokenizeKnowledge(query)){if(!text.includes(term))continue;const frequency=QA_CARDS.filter(c=>(c.question+' '+c.keywords.join(' ')).toLowerCase().includes(term)).length;score+=1+Math.log(1+QA_CARDS.length/(1+frequency));}
 for(const tag of card.keywords){if(!query.toLowerCase().includes(tag.toLowerCase()))continue;const frequency=QA_CARDS.filter(c=>(c.question+' '+c.keywords.join(' ')).toLowerCase().includes(tag.toLowerCase())).length;score+=2+Math.log(1+QA_CARDS.length/(1+frequency));}
 const compact=t=>t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');if(compact(query)===compact(card.question))score+=100;
 return score;
}
export function retrieveKnowledge(query,topic=null){const q=String(query??'').trim().slice(0,240);if(!q)return {ok:false,reason:'先写下你想追问的问题。',matches:[],sources:[]};const scored=QA_CARDS.filter(x=>!topic||x.topic===topic).map(x=>({...x,score:rankKnowledgeAnswer(q,x)})).sort((a,b)=>b.score-a.score);const hits=scored.filter(x=>x.score>=4).slice(0,3);if(!hits.length)return {ok:false,reason:'本地知识库没有足够匹配的导读。这里不会把不相关内容当成答案，也不会虚构搜索结果。',matches:[],sources:[]};const top=hits[0];return {ok:true,mode:'curated-retrieval',answer:top.answer,question:top.question,topic:top.topic,node:top.node,matches:hits,sources:top.sourceIds.map(id=>SOURCE_BY_ID[id]).filter(Boolean),terms:tokenizeKnowledge(q)};}
export function knowledgeStats(){return {sources:KNOWLEDGE_SOURCES.length,zhihu:KNOWLEDGE_SOURCES.filter(x=>x.publisher==='知乎').length,readable:KNOWLEDGE_SOURCES.filter(x=>x.access==='page-read').length,units:KNOWLEDGE_UNITS.length,questions:QA_CARDS.length,concepts:Object.values(CONCEPT_LABELS).flat(2).length};}
export function validateKnowledge(){const errors=[];const ids=new Set();for(const s of KNOWLEDGE_SOURCES){if(ids.has(s.id))errors.push('duplicate source '+s.id);ids.add(s.id);try{if(new URL(s.url).protocol!=='https:')errors.push('unsafe url '+s.id);}catch{errors.push('invalid url '+s.id);}if(!s.scope||!s.access||!s.guide)errors.push('provenance missing '+s.id);}
 for(const q of QA_CARDS)for(const id of q.sourceIds)if(!ids.has(id))errors.push(q.id+' missing '+id);
 for(const u of KNOWLEDGE_UNITS){if(!u.sourceIds.some(id=>SOURCE_BY_ID[id]?.access==='page-read'))errors.push(u.id+' has no readable reference');if(!u.sourceIds.some(id=>SOURCE_BY_ID[id]?.publisher==='知乎'))errors.push(u.id+' has no Zhihu discussion');for(const id of u.sourceIds)if(!ids.has(id))errors.push(u.id+' missing '+id);}
 return {ok:errors.length===0,errors,...knowledgeStats()};}