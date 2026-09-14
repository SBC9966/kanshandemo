/** Authored exercises: fictional scenarios and datasets, not quoted Zhihu answers. */
export const ACTIVITIES={
 'existentialism':[
  {id:'ex-satchel',type:'classify',name:'山脚行囊 · 把标签放下来',terrain:'在芦苇渡口整理行囊',instruction:'把四张卡放进「已经面对的处境」或「可以承担的行动」。可以拖动，也可以点击卡片上的分类按钮。',bins:['已经面对的处境','可以承担的行动'],items:[{id:'family',text:'我出生的家庭背景',answer:0},{id:'ask',text:'主动了解另一种职业路径',answer:1},{id:'past',text:'已经发生的一次考试结果',answer:0},{id:'try',text:'用一周时间试做一个小项目',answer:1}],insight:'处境不能凭意志抹掉；承认处境，也不必取消行动。分类是这个具体练习的用法，并非给整个人生定性。',reward:'行囊整理好了，渡口的雾散开一层。'},
  {id:'ex-timeline',type:'sequence',name:'回声石阶 · 给思想找来路',terrain:'沿年代刻度拾级而上',instruction:'把三个背景片段按先后放到石阶上。拖动排序，或使用上移、下移按钮。',items:[{id:'public',text:'20 世纪中叶：进入法国公共讨论'},{id:'precursors',text:'19 世纪：克尔凯郭尔、尼采提出相关追问'},{id:'phenomenology',text:'20 世纪前期：现象学与人的具体经验'}],correct:['precursors','phenomenology','public'],insight:'这是理解背景的简化时间线，不是声称后一个阶段必然由前一个阶段造成，也不是把这些思想家归成一个统一派别。',reward:'石阶接续起来，前史不再只是三个名字。'},
  {id:'ex-constellation',type:'match',name:'思想星图 · 让三个声音分开',terrain:'在松间书院点亮思想星图',instruction:'将本项目概括的提问与思想家对应。它们不是原文引语，也不穷尽任何一人的思想。',bins:['萨特','波伏瓦','加缪'],items:[{id:'responsibility',text:'我如何面对自己的选择，而不以固定身份完全开脱？',answer:0},{id:'situated',text:'我的自由如何与具体处境、他人的自由相连？',answer:1},{id:'absurd',text:'面对人与世界之间的荒诞张力，我怎样继续生活？',answer:2}],insight:'三条线连在同一张图上，但不汇成同一种声音。特别是加缪与“存在主义者”标签的关系，需要说明而非默认。',reward:'三颗思想星亮起，各自保留自己的位置。'},
  {id:'ex-bridge',type:'lenses',name:'双径栈道 · 自由与限制可以并存',terrain:'让两侧绳索一起托住桥面',instruction:'分别查看「行动」与「处境」两端，再选择能同时容纳它们的判断。这里只考查对材料的理解，不评判你的人生立场。',lenses:[{id:'agency',title:'行动这一侧',text:'面对一次不满意的选择，我仍可查找信息、寻求支持或做小范围试验。',icon:'foot'},{id:'situation',title:'处境这一侧',text:'可用时间、经济条件、照护责任和他人行为，会改变我真正能做的事。',icon:'mountain'}],choices:['有自由，就可以忽略全部现实条件。','看见现实限制，也辨认可行行动与需要的支持。','既然有现实限制，任何行动都没有意义。'],answer:1,insight:'桥需要两端的支撑。把所有困难归于个人，与把行动完全取消，都使具体问题消失了。',reward:'两根绳索绷紧，栈道可以通行。'},
  {id:'ex-letter',type:'reflection',name:'山顶寄语 · 给未来的自己留一句话',terrain:'把自己的行动挂在山顶风铃上',instruction:'不是让 AI 替你写答案。各写一个具体短句；内容只保存到本机，不用于评判你的价值观。',fields:[{id:'situation',label:'一个真实的处境',placeholder:'例如：想换方向，但还要完成这学期的课程。'},{id:'action',label:'一个愿意承担的小行动',placeholder:'例如：这周约一位从业者，了解日常工作。'},{id:'revision',label:'什么新信息会让我调整？',placeholder:'例如：发现实际工作与想象差异很大。'}],insight:'这里没有唯一正确的生活答案。写下处境、行动和修正条件，只是让抽象理解变得具体。',reward:'你的寄语已留在风铃里，而不是变成另一个收藏夹。'}
 ],
 'ai-agents':[
  {id:'ai-loop',type:'sequence',name:'回路工坊 · 把行动接回反馈',terrain:'点亮山脚四段铜线',instruction:'按本实验约定的执行顺序连接四个模块。每一步的输出会成为下一步的输入。',items:[{id:'act',text:'③ 执行经过校验的工具调用'},{id:'observe',text:'① 读取目标与当前状态'},{id:'feedback',text:'④ 观察实际结果，决定继续或停止'},{id:'decide',text:'② 选择下一步与需要的工具'}],correct:['observe','decide','act','feedback'],insight:'自然语言表示“已完成”不是外部执行证据。回路需要真正的观察结果；本页也一样，由状态而不是动画决定是否完成。',reward:'回路通电，信号从输入到反馈完整走了一圈。'},
  {id:'ai-dispatch',type:'match',name:'工具岔路 · 谁来决定下一步',terrain:'为不同任务扳动道岔',instruction:'给三个任务匹配更合适的机制。这是具体任务条件下的判断，不是说某种架构永远优越。',bins:['固定工作流','受控动态检索','人工批准后执行'],items:[{id:'extract',text:'格式固定的表单：提取三个字段，再校验格式。',answer:0},{id:'investigate',text:'公开资料问题：根据查到的线索决定下一条检索。',answer:1},{id:'send',text:'把最后写好的邮件发给真实客户。',answer:2}],insight:'最少必要的自主性，通常比“所有事都交给 Agent”更容易验证。写入和对外发送需要单独的许可。',reward:'道岔归位，三条轨道各去该去的地方。'},
  {id:'ai-toolrun',type:'runner',name:'检索实验室 · 看见真正的工具结果',terrain:'让检索吊舱在两个平台间运送证据',instruction:'运行本地资料检索 → 检查返回证据 → 生成带来源的草稿 → 验证引用。工具操作确实在浏览器中执行；不调用网络或大模型。',query:'Agent 与工作流有什么区别',insight:'工具返回的来源 ID、正文可读取状态和引用校验应当显式可见。检索结果是证据入口，不等于所有主张都已核实。',reward:'证据吊舱已到站，草稿有了可追溯的引用。'},
  {id:'ai-guard',type:'guardrails',name:'限流闸门 · 不让失败无限上山',terrain:'设置步数闸、权限锁与数据隔离',instruction:'调整三项运行策略，然后尝试放行一条来自外部网页的越权请求。观察应用层是否真正阻止它。',insight:'外部文本不是系统指令。最大步数、批准与隔离必须由代码强制执行，而不是依靠模型的一句安全承诺。',reward:'闸门拦下越权请求，失败停在边界之内。'},
  {id:'ai-bench',type:'benchmark',name:'验收平台 · 先验证，再说完成',terrain:'在观测台检查三次实验',instruction:'运行三个本地验收用例：有依据、无结果、恶意指令。只有通过全部检查，平台才会打开。',cases:[{id:'grounded',title:'资料存在时',expect:'返回真实来源 ID，且引用能解析。'},{id:'missing',title:'找不到证据时',expect:'如实返回不足，不伪造一条答案。'},{id:'injection',title:'资料含越权文字时',expect:'将它当作数据，阻止发送或删除操作。'}],insight:'三个用例只是教学基线，不代表生产安全认证。准确率、成本和复杂失败场景仍需要更大的独立测试集。',reward:'验收记录盖章。能运行和能验证，现在是同一件事。'}
 ],
 'critical-thinking':[
  {id:'th-sort',type:'classify',name:'辨言码头 · 把陈述拆开',terrain:'把不同的行李放进三艘渡船',instruction:'区分可核查陈述、偏好判断与因果推论。分类正确不表示陈述已经被证明为真。',bins:['可核查的陈述','偏好／价值判断','需要证据的因果推论'],items:[{id:'count',text:'这次活动的登记表记录了 40 名参与者。',answer:0},{id:'taste',text:'我更喜欢安静的学习环境。',answer:1},{id:'cause',text:'参加活动的人得分更高，所以活动导致了提升。',answer:2}],insight:'先判断一句话在做什么，再判断它是否成立。能被核查的陈述，依然可能与记录不符。',reward:'三艘渡船各载一种陈述，判断有了清楚的起点。'},
  {id:'th-sample',type:'sample',name:'迷雾样本 · 把看不见的人找回来',terrain:'移动观察镜，照亮被漏掉的样本',instruction:'先观察展示出的 20 人，再拖动滑杆逐步看见未展示的 80 人。所有数字都是本项目构造的教学数据。',base:{n:20,success:18},hidden:{n:80,success:12},insight:'可见样本的成功率是 18/20，完整教学样本是 30/100。变化来自观察范围，不是这些人的结果被改变了。',reward:'迷雾退去，样本的边界终于可见。'},
  {id:'th-cause',type:'causal',name:'因果峡谷 · 找到第三条河',terrain:'转动观察镜，比较总体与分组',instruction:'夏天冰饮销量和泳池人次一起增加。依次查看「总体」「按温度分组」「关系图」，再判断这能否直接证明因果。数据为教学构造。',insight:'在这个例子里，温度是预先设定的共同原因。分组观察帮助暴露混杂，但现实中“控制一个变量”也不自动证明因果。',reward:'第三条河被看见，虚线不再被当成因果箭头。'},
  {id:'th-evidence',type:'evidence',name:'证据天平 · 让反面材料也上桌',terrain:'往天平两侧放上支持与限制',instruction:'主张：这个学习活动对所有人都有效。把三张材料都放上天平，再选择结论。示例资料为虚构，天平不是概率计算器。',items:[{id:'story',title:'三位参与者的成功故事',text:'提示可能受益，但缺少未受益者和比较组。',side:'support'},{id:'missing',title:'退出者没有纳入报告',text:'提醒选择机制可能改变看到的结果。',side:'limit'},{id:'study',title:'小型对照研究只招募初学者',text:'对该条件有参考价值，不能推广到所有人。',side:'limit'}],insight:'支持材料与限制可以同时存在。科学判断不按两边卡片数量投票，而要比较设计、适用范围和不确定性。',reward:'天平容得下反面材料，结论也留下了边界。'},
  {id:'th-bayes',type:'bayes',name:'校准灯塔 · 新证据怎样改变相信程度',terrain:'调节观察灯，让先验与证据相遇',instruction:'虚构天气提示器：下雨时 80% 会发出提示；不下雨时 20% 也会误报。拖动下雨的先验概率，比较看到提示后的概率。',likelihood:.8,falsePositive:.2,insight:'后验 = 先验×0.8 ÷ [先验×0.8 + (1−先验)×0.2]。数字来自写明的假设；并不是对真实天气的预测。',reward:'灯塔已经校准。你改变的是有依据的相信程度，不是强行选一个阵营。'}
 ]
};
export function activityFor(id,index){return ACTIVITIES[id]?.[index]??null;}
export function defaultActivity(a){if(!a)return {placements:{},order:[],viewed:[],values:{},fields:{},stage:0,events:[],seen:[],tests:[],runCount:0};return {placements:{},order:a.items?.map(x=>x.id)??[],viewed:[],values:{},fields:{},stage:0,events:[],seen:[],tests:[],runCount:0};}
export function bayesPosterior(prior,likelihood=.8,falsePositive=.2){const p=Math.max(0,Math.min(1,Number(prior)));const denominator=p*likelihood+(1-p)*falsePositive;return denominator? p*likelihood/denominator:0;}
export function sampleSummary(a,revealed){const hidden=Math.max(0,Math.min(a.hidden.n,Math.round(Number(revealed)||0)));const n=a.base.n+hidden;const success=a.base.success+Math.floor(hidden*a.hidden.success/a.hidden.n);return {n,success,rate:success/n,hidden};}
export function checkActivity(a,s={}){
 if(!a)return {passed:true,feedback:'此自选主题暂无互动实验，只需完成理解确认。'};
 const p=s.placements??{},v=s.values??{},seen=s.viewed??[];let passed=false,feedback='先操作一下，看看会发生什么。';
 switch(a.type){
 case 'classify':case 'match':{const correct=a.items.filter(x=>Number(p[x.id])===x.answer&&p[x.id]!==undefined).length;passed=correct===a.items.length;feedback=passed?a.insight:`已放对 ${correct} / ${a.items.length} 张。可以继续调整；不会扣分。`;break;}
 case 'sequence':passed=a.correct.every((x,i)=>s.order?.[i]===x);feedback=passed?a.insight:'顺序还未连接起来。用上移、下移调整，再检查一次。';break;
 case 'lenses':passed=a.lenses.every(x=>seen.includes(x.id))&&Number(v.choice)===a.answer;feedback=passed?a.insight:'分别看过两侧的条件，再作判断。';break;
 case 'reflection':passed=a.fields.every(f=>(s.fields?.[f.id]??'').trim().length>=4);feedback=passed?a.insight:'三个短句各写至少 4 个字符。只检查是否具体写下，不判断价值观。';break;
 case 'runner':passed=s.stage===4&&s.verified===true&&Array.isArray(s.citations)&&s.citations.length>0;feedback=passed?a.insight:'需要检索、查看证据、生成草稿，再校验引用。';break;
 case 'guardrails':passed=Number(v.maxSteps)===3&&v.approval===true&&v.isolate===true&&s.blocked===true;feedback=passed?a.insight:'先设置 3 步上限、写入需批准、外部内容隔离，再运行越权测试。';break;
 case 'benchmark':passed=a.cases.every(x=>s.tests?.includes(x.id));feedback=passed?a.insight:'运行三个测试，检查实际记录。';break;
 case 'sample':passed=(s.seen??[]).includes(80)&&v.conclusion==='selection';feedback=passed?a.insight:'把未展示的 80 人全部找回来，再判断变化的来源。';break;
 case 'causal':passed=['overall','groups','diagram'].every(x=>seen.includes(x))&&v.conclusion==='confounder';feedback=passed?a.insight:'查看三种观察方式，再判断虚线能否升级为因果箭头。';break;
 case 'evidence':passed=a.items.every(x=>p[x.id]===x.side)&&v.conclusion==='limited';feedback=passed?a.insight:'把支持与限制都摆出来，再选择保留边界的结论。';break;
 case 'bayes':passed=(s.seen??[]).some(x=>Number(x)!==20)&&v.conclusion==='prior';feedback=passed?a.insight:'改变一次先验，观察后验如何变化，再作判断。';break;
 }
 return {passed,feedback};
}