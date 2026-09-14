/** Research snapshot. No full Zhihu answer is copied or claimed to have been read. */
export const RESEARCH_DATE = '2026-09-13';
const Z = (id,topic,title,url,author,tags,guide) => ({id,topic,title,url,author,publisher:'知乎',kind:url.includes('zhuanlan')?'专栏':'问题讨论',access:'index-only',checkedAt:RESEARCH_DATE,tags,guide,summaryKind:'本项目阅读提示，非原文摘要',scope:'检索结果可见标题与部分摘要；未取得完整正文。链接可能需要登录。不可据此推断全部回答的立场。'});
const P = (id,topic,title,url,publisher,tags,guide) => ({id,topic,title,url,publisher,author:null,kind:'参考原始页面',access:'page-read',checkedAt:RESEARCH_DATE,tags,guide,summaryKind:'本项目导读，非原文转载',scope:'本次读取公开网页的相关段落；只对所引用的具体概念提供参考，不代表整篇材料已逐条核验。'});
export const KNOWLEDGE_SOURCES = [
 Z('zh-ex-01','existentialism','如何理解「存在先于本质」、「他人即地狱」、「人即自由」？','https://www.zhihu.com/question/20457436',null,['存在','本质','萨特','自由'],'带着三个命题进入讨论。先辨认它们分别回应什么问题，不把它们拼成一句生活口号。'),
 Z('zh-ex-02','existentialism','究竟什么是存在主义？','https://www.zhihu.com/question/269967823?sort=created',null,['存在主义','入门','定义'],'适合寻找日常语言的解释。对照学术导论，分开作者自己的比喻与对哲学概念的解释。'),
 Z('zh-ex-03','existentialism','加缪和萨特的区别在于哪些方面？','https://www.zhihu.com/question/20078096',null,['加缪','萨特','比较'],'先做比较表：各自在问什么、给出了什么回应。文学关系、个人关系与哲学分歧并不是同一件事。'),
 Z('zh-ex-04','existentialism','存在主义和荒诞主义有什么关系？加缪的荒诞和萨特的荒诞有什么区别？','https://www.zhihu.com/question/359313449',null,['荒诞','加缪','分歧'],'留意同一个词在不同作者那里是否含义相同。别把相邻的思想直接归为一个没有分歧的派别。'),
 Z('zh-ex-05','existentialism','"存在先于本质"中的"存在"和"本质"指的是什么？','https://www.zhihu.com/question/306958528',null,['存在','本质','概念'],'把命题拆成术语来读，比只记住结论更有用。检查回答讨论的是物的用途，还是人的生活。'),
 Z('zh-ex-06','existentialism','该如何理解：“存在先于本质”？','https://www.zhihu.com/question/23248223',null,['选择','萨特','本质'],'尝试把某条解释放进具体情境，再说明这个例子能说明什么、不能说明什么。'),
 Z('zh-ex-07','existentialism','如何理解存在主义，如何阅读荒诞文学，例如加缪的文学作品？','https://www.zhihu.com/question/638494690',null,['加缪','文学','阅读'],'把小说人物的处境与作者的论证区分开。文学阅读可以打开问题，但不是概念的唯一证据。'),
 Z('zh-ex-08','existentialism','如何理解存在主义的存在？','https://www.zhihu.com/question/267071624',null,['前史','存在','哲学史'],'适合追问不同思想家究竟是否在谈同一个问题。把历史背景与某个作者的具体立场分开。'),
 Z('zh-ai-01','ai-agents','如何通俗的介绍什么是AI agent？','https://www.zhihu.com/question/1915789507632011097',null,['agent','定义','工具'],'从任务目标、可调用工具、反馈与停止条件四个角度比较回答，而不是只比较定义的长短。'),
 Z('zh-ai-02','ai-agents','一文彻底搞懂什么是AI Agent','https://zhuanlan.zhihu.com/p/32539830815','数字梦想家',['agent','入门','应用'],'这是概念入门的讨论入口。阅读时核对：文字中说能做的事，是否真的有工具和执行记录支持。'),
 Z('zh-ai-03','ai-agents','Workflow 与 Agent 的区别：从原理到实践的完整指南','https://zhuanlan.zhihu.com/p/2035484715608700220',null,['workflow','工作流','动态规划'],'用它提出选型问题，再与 Anthropic 的官方架构说明对读：谁决定下一步，流程由什么约束？'),
 Z('zh-ai-04','ai-agents','AI Agent 入门指南（一）：综述','https://zhuanlan.zhihu.com/p/1991985667622840199','VoidOc',['agent','架构','工具','入门'],'适合建立术语清单。不要把综述中涉及的每项技术都当成首版应用的必要组件。'),
 Z('zh-ai-05','ai-agents','ReAct：AI Agent 的推理与行动融合框架','https://zhuanlan.zhihu.com/p/1935762059888419552','Deductionist',['react','行动','观察'],'结合论文作者项目页阅读，重点看行动和观察如何交替，而不是把解释文本当成真实工具执行。'),
 Z('zh-ai-06','ai-agents','手把手带你写一个 ReAct 智能体：从架构拆解到工程避坑（附源码）','https://zhuanlan.zhihu.com/p/1990507103245333960','melon的算法日记',['react','工程','失败'],'用工程问题检查自己的实现：失败结果是否回到下一次决策？重试是否有次数上限？'),
 Z('zh-ai-07','ai-agents','大模型的幻觉 (Hallucination) 因何而来？如何解决幻觉问题？','https://zhuanlan.zhihu.com/p/662550362','Baihai',['幻觉','检索','可靠性'],'阅读时区分语言答案错误、工具执行失败与无依据的成功声明。本 Demo 不把检索等同于事实保证。'),
 Z('zh-ai-08','ai-agents','Agent系统如何约束大模型幻觉？约束后还幻觉怎么办？','https://zhuanlan.zhihu.com/p/2040835109855749610',null,['约束','校验','幻觉'],'带着权限、证据、校验、停止四个问题读。源内容属于工程讨论入口，不作为安全保证。'),
 Z('zh-th-01','critical-thinking','如何培养批判性思维？','https://www.zhihu.com/question/21206479?sort=created',null,['批判性思维','训练'],'尝试将建议转成可操作的检查：主张是什么，证据是什么，还缺什么？不同回答不是一套统一课程。'),
 Z('zh-th-02','critical-thinking','如何区分事实（fact）和观点（view）？','https://www.zhihu.com/question/326831974',null,['事实','观点','判断'],'先问陈述能否核查，再问它实际上有没有证据支持。可以核查的陈述也可能是错误的。'),
 Z('zh-th-03','critical-thinking','区分“事实”与“观点” Fact VS Opinion','https://zhuanlan.zhihu.com/p/267927580','HAHAPPYPPY',['事实','观点','分类'],'使用生活例子做区分练习，但不要把“事实型陈述”误解为“已证明为真”。'),
 Z('zh-th-04','critical-thinking','相关性和因果性有什么区别？','https://www.zhihu.com/question/24029893',null,['相关','因果','干预'],'关键追问是：如果主动改变 A，B 会怎样？一起变化的观察不足以独自回答这个问题。'),
 Z('zh-th-05','critical-thinking','我们如何区分相关性和因果关系？','https://www.zhihu.com/question/413769450',null,['因果','混杂','研究'],'比较不同回答依赖的研究设计和假设。避免另一个极端：把所有观察性证据都说成完全无用。'),
 Z('zh-th-06','critical-thinking','幸存者偏差对于统计来说影响大吗？','https://www.zhihu.com/question/1909258859383621450',null,['样本','幸存者偏差','统计'],'先画出谁进入了样本、谁被排除，再讨论推论。返航飞机只是比喻，真正问题是选择机制。'),
 Z('zh-th-07','critical-thinking','确认偏误是什么？如何系统地克服确认偏误？','https://www.zhihu.com/question/25345397',null,['确认偏误','反例','证据'],'写出一条能使自己改主意的证据，再去找它，而不是只收集让自己安心的材料。'),
 Z('zh-th-08','critical-thinking','[读书笔记] [深入浅出数据分析] [第六章] [第二节]贝叶斯推断','https://zhuanlan.zhihu.com/p/420691371','兰胖子',['贝叶斯','先验','更新'],'与概率教材对照，区分先验、似然和后验。本 Demo 的数值练习使用公开标注的虚构数据。'),
 P('sep-existentialism','existentialism','Existentialism','https://plato.stanford.edu/entries/existentialism/','Stanford Encyclopedia of Philosophy',['存在主义','前史','概念'],'用于核对存在主义并非单一教义，以及它的问题范围和思想背景。'),
 P('sep-sartre','existentialism','Jean-Paul Sartre','https://plato.stanford.edu/entries/sartre/','Stanford Encyclopedia of Philosophy',['萨特','自由','责任'],'用于核对萨特的自由、处境与自欺概念；阅读相关章节，而非截取一句口号。'),
 P('sep-beauvoir','existentialism','Simone de Beauvoir','https://plato.stanford.edu/entries/beauvoir/','Stanford Encyclopedia of Philosophy',['波伏瓦','处境','他人'],'用于理解处境中的自由和对他人的责任。波伏瓦在此被作为独立思想家对待。'),
 P('sep-camus','existentialism','Albert Camus','https://plato.stanford.edu/entries/camus/','Stanford Encyclopedia of Philosophy',['加缪','荒诞','反抗'],'用于区分加缪与存在主义标签的关系，以及其对荒诞问题的回应。'),
 P('sep-authenticity','existentialism','Authenticity','https://plato.stanford.edu/entries/authenticity/','Stanford Encyclopedia of Philosophy',['本真','真实性','自我'],'用于理解真实性概念的不同历史含义，防止将其直接等同于“只要做自己”。'),
 P('anthropic-agents','ai-agents','Building effective agents','https://www.anthropic.com/engineering/building-effective-agents','Anthropic · Engineering',['agent','workflow','工作流','停止'],'官方工程说明：按预定代码路径组织的工作流，与模型动态决定过程的智能体有区别。'),
 P('react-paper','ai-agents','ReAct: Synergizing Reasoning and Acting in Language Models','https://react-lm.github.io/','ReAct · 论文作者项目页',['react','反馈','观察','行动'],'介绍推理与外部行动交替的研究方法。Demo 展示的是公开的工具事件，不是模型的内部思考。'),
 P('anthropic-tools','ai-agents','Introducing advanced tool use on the Claude Developer Platform','https://www.anthropic.com/engineering/advanced-tool-use','Anthropic · Engineering',['工具','输入','工具搜索','执行'],'作为工具使用机制的官方补充。Demo 工具在本地执行，不把模拟结果冒充真实联网调用。'),
 P('sep-critical','critical-thinking','Critical Thinking','https://plato.stanford.edu/entries/critical-thinking/','Stanford Encyclopedia of Philosophy',['批判','判断','证据'],'以反思、理由和自我修正理解批判性思维，而不是把怀疑一切当成目标。'),
 P('sep-science','critical-thinking','Scientific Method','https://plato.stanford.edu/entries/scientific-method/','Stanford Encyclopedia of Philosophy',['科学','证据','假设','因果'],'用于讨论假设、观察与检验。方法需要具体条件，并不是一张万能的检查表。'),
 P('brown-bayes','critical-thinking','Seeing Theory · Bayesian Inference','https://seeing-theory.brown.edu/bayesian-inference/index.html','Brown University · Seeing Theory',['贝叶斯','先验','后验','概率'],'概率更新练习的参考。界面里每个概率都来自写明的教学假设，而不是对现实用户的评估。'),
 P('brown-regression','critical-thinking','Seeing Theory · Regression Analysis','https://seeing-theory.brown.edu/regression-analysis/index.html','Brown University · Seeing Theory',['相关','回归','样本'],'以可交互的统计图理解变量关系。这里只借鉴操作后观察变化的教学方式，不复制其实现。'),
 Z('zh-cb-01','cognitive-biases','确认偏误是什么？如何系统地克服确认偏误？','https://www.zhihu.com/question/25345397',null,['确认偏误','反例','证据'],'先写出一条能让自己改主意的证据，再去找它，而不是只收集安心材料。'),
 Z('zh-cb-02','cognitive-biases','如何区分事实（fact）和观点（view）？','https://www.zhihu.com/question/326831974',null,['事实','观点','判断'],'先问陈述能否核查，再问它有没有证据支持。可核查也可能错。'),
 Z('zh-cb-03','cognitive-biases','幸存者偏差对于统计来说影响大吗？','https://www.zhihu.com/question/1909258859383621450',null,['样本','幸存者偏差','统计'],'先画谁进入样本、谁被排除，再谈推论。返航飞机只是比喻。'),
 Z('zh-et-01','ethics-intro','如何通俗地理解伦理学中的电车难题？','https://www.zhihu.com/question/20162951',null,['电车难题','伦理','思想实验'],'电车难题是压力测试，不是标准答案机。先分清后果论与义务论在问什么。'),
 Z('zh-et-02','ethics-intro','道德相对主义和道德绝对主义有什么区别？','https://www.zhihu.com/question/20663594',null,['相对主义','绝对主义','道德'],'比较时先固定问题：是在谈描述事实，还是在谈规范判断？'),
 Z('zh-et-03','ethics-intro','什么是功利主义？它有哪些常见的批评？','https://www.zhihu.com/question/19773127',null,['功利主义','后果','批评'],'把「最大幸福」拆成可测量的后果，再检验它是否牺牲了个体权利。'),
 Z('zh-mm-01','meme-culture','网络流行语/梗是如何产生和传播的？','https://www.zhihu.com/question/20541048',null,['梗','传播','迷因'],'梗会脱离原语境被再创作。跟踪一次变形，比背定义更有用。'),
 Z('zh-mm-02','meme-culture','如何评价网络梗的泛化使用？','https://www.zhihu.com/question/359281126',null,['泛化','语境','文化'],'泛化会让符号失去指向。问一句：这个梗原本在替谁说话？'),
 Z('zh-mm-03','meme-culture','为什么有些梗会突然火起来又很快过气？','https://www.zhihu.com/question/303129736',null,['热度','生命周期','传播'],'热度来自可复制的情绪模板；过气常因语境耗尽或被过度消费。'),
 P('sep-consequentialism','ethics-intro','Consequentialism','https://plato.stanford.edu/entries/consequentialism/','Stanford Encyclopedia of Philosophy',['功利主义','后果','伦理'],'后果论导论页。用于对照「看结果」这一原则的结构与常见反驳。'),
 P('sep-deontology','ethics-intro','Deontological Ethics','https://plato.stanford.edu/entries/ethics-deontological/','Stanford Encyclopedia of Philosophy',['义务','原则','伦理'],'义务论条目。帮助区分「行为本身是否可允许」与后果计算。'),
 P('wiki-meme','meme-culture','Internet meme','https://en.wikipedia.org/wiki/Internet_meme','Wikipedia',['迷因','传播','网络文化'],'公开百科条目，梳理网络迷因的定义、传播与变体。仅作概念入口，不替代具体案例分析。'),
 P('knowyourmeme','meme-culture','Know Your Meme','https://knowyourmeme.com/','Know Your Meme',['梗','考据','案例'],'迷因考据库入口。适合追踪单个梗的起源与变形，注意条目质量参差。'),
];
export const SOURCE_BY_ID=Object.fromEntries(KNOWLEDGE_SOURCES.map(s=>[s.id,s]));
export const SOURCE_COUNTS={total:KNOWLEDGE_SOURCES.length,zhihu:KNOWLEDGE_SOURCES.filter(s=>s.publisher==='知乎').length,read:KNOWLEDGE_SOURCES.filter(s=>s.access==='page-read').length};
export const NODE_SOURCES={
 'existentialism':[
 ['sep-existentialism','sep-sartre','zh-ex-01','zh-ex-02','zh-ex-05'],
 ['sep-existentialism','sep-sartre','zh-ex-08','zh-ex-06'],
 ['sep-sartre','sep-beauvoir','sep-camus','zh-ex-03','zh-ex-04'],
 ['sep-beauvoir','sep-authenticity','zh-ex-01','zh-ex-04'],
 ['sep-authenticity','sep-beauvoir','zh-ex-07','zh-ex-06']],
 'ai-agents':[
 ['anthropic-agents','zh-ai-01','zh-ai-02'],
 ['anthropic-agents','zh-ai-03','zh-ai-04'],
 ['react-paper','anthropic-tools','zh-ai-05','zh-ai-06'],
 ['anthropic-agents','anthropic-tools','zh-ai-07','zh-ai-08'],
 ['anthropic-agents','react-paper','zh-ai-04','zh-ai-08']],
 'critical-thinking':[
 ['sep-critical','zh-th-01','zh-th-02','zh-th-03'],
 ['brown-regression','sep-science','zh-th-06'],
 ['sep-science','brown-regression','zh-th-04','zh-th-05'],
 ['sep-critical','zh-th-07','zh-th-01'],
 ['brown-bayes','sep-critical','zh-th-08','zh-th-07']],
 'cognitive-biases':[
 ['zh-cb-01','zh-cb-02','sep-critical','zh-th-02'],
 ['sep-science','zh-cb-03','zh-th-06'],
 ['zh-cb-01','zh-th-07','zh-cb-02','sep-critical'],
 ['zh-cb-03','zh-th-06','brown-regression','zh-cb-01'],
 ['sep-critical','zh-th-07','brown-bayes','zh-cb-01']],
 'ethics-intro':[
 ['sep-consequentialism','zh-et-01','zh-et-02','zh-et-03'],
 ['sep-consequentialism','zh-et-03','zh-et-01'],
 ['sep-deontology','zh-et-01','zh-et-03','zh-et-02'],
 ['sep-deontology','zh-et-02','zh-et-01'],
 ['sep-consequentialism','sep-deontology','zh-et-02','zh-et-03']],
 'meme-culture':[
 ['wiki-meme','zh-mm-01','zh-mm-02','zh-mm-03'],
 ['wiki-meme','zh-mm-01','zh-mm-02'],
 ['knowyourmeme','zh-mm-01','zh-mm-03'],
 ['wiki-meme','zh-mm-02','zh-mm-01'],
 ['knowyourmeme','zh-mm-03','zh-mm-02']]
};
export const TOPIC_LABELS={'existentialism':'存在主义','ai-agents':'AI Agent','critical-thinking':'独立思考','cognitive-biases':'认知偏差','ethics-intro':'伦理入门','meme-culture':'迷因文化'};
export const RESEARCH_REFERENCES=[
 {title:'SVG getPointAtLength',url:'https://developer.mozilla.org/en-US/docs/Web/API/SVGGeometryElement/getPointAtLength',use:'角色、交通工具与路径共用几何坐标。'},
 {title:'prefers-reduced-motion',url:'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion',use:'减少动画时保留全部信息和操作。'},
 {title:'Seeing Theory',url:'https://seeing-theory.brown.edu/',use:'借鉴“改变一个条件，观察结果，再解释”的教学结构。'}
];