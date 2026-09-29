/* Quire guided research journey — Step 32 */
(function(){
  const VIEW_STAGE={
    dashboard:'discover',searchscreen:'discover',library:'discover',projects:'discover',setup:'discover',
    reader:'understand',appraisal:'understand',analysis:'understand',methodology:'understand',
    brainstorm:'organise',map:'organise',synthesis:'organise',
    chapters:'write',
    review:'review',supervision:'review',readiness:'review',export:'review',overview:'review'
  };
  const STAGES=[
    {id:'discover',label:'Discover',copy:'Find useful research and bring the right papers into your project.',view:'library'},
    {id:'understand',label:'Understand',copy:'Read, highlight and decide what each source actually contributes.',view:'reader'},
    {id:'organise',label:'Organise',copy:'Turn evidence and your own thinking into themes, arguments and destinations.',view:'brainstorm'},
    {id:'write',label:'Write',copy:'Develop the thesis with your evidence and writing companion beside you.',view:'chapters'},
    {id:'review',label:'Review',copy:'Check meaning, language, claims, evidence and readiness before finalising.',view:'review'}
  ];

  function state(){
    const s=window.QuireStore?.getState?.()||{};
    const projectId=window.QuireStore?.getActiveProjectId?.();
    const articles=(s.articles||[]).filter(a=>!projectId||a.projectId===projectId);
    const highlights=(s.highlights||[]).filter(h=>!projectId||h.projectId===projectId);
    const notes=(s.notes||[]).filter(n=>!projectId||n.projectId===projectId);
    const sections=(s.sections||[]).filter(x=>!projectId||x.projectId===projectId);
    const evidence=(s.evidenceLinks||[]).filter(x=>!projectId||x.projectId===projectId);
    const words=sections.reduce((n,x)=>n+(Number(x.currentWordCount)||0),0);
    return {articles,highlights,notes,sections,evidence,words};
  }

  function recommendation(view){
    const s=state();
    if(!s.articles.length)return {stage:'discover',title:'Start with one useful paper',copy:'Add or find a paper connected to your research question. You do not need to organise the whole thesis first.',action:'Open Research',view:'library'};
    if(!s.highlights.length&&!s.notes.length)return {stage:'understand',title:'Understand a paper before collecting more',copy:'Open one paper, highlight the exact passages that matter and capture what they mean for your question.',action:'Read a paper',view:'reader'};
    if(!s.evidence.length)return {stage:'organise',title:'Give the evidence a destination',copy:'Connect a useful passage or note to a theme, claim or thesis section so it does not become an isolated highlight.',action:'Organise evidence',view:'map'};
    if(!s.words)return {stage:'write',title:'Turn one organised idea into a paragraph',copy:'Start small. Write the point in your own words with the linked evidence beside you.',action:'Start writing',view:'chapters'};
    if(view==='chapters')return {stage:'review',title:'Check the paragraph you just developed',copy:'Confirm Quire understood your meaning, improve the English only where useful, then verify the evidence behind factual claims.',action:'Review writing',view:'review'};
    return {stage:'write',title:'Keep the research and writing connected',copy:'Return to the thesis and develop the next evidence-backed point. Review it when the idea is complete.',action:'Continue writing',view:'chapters'};
  }

  function render(view){
    const stage=VIEW_STAGE[view]||'discover';
    document.querySelectorAll('[data-flow-stage]').forEach(btn=>{
      const active=btn.dataset.flowStage===stage;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-current',active?'step':'false');
    });
    const current=STAGES.find(x=>x.id===stage);
    const label=document.getElementById('flowCurrentStage');
    if(label)label.textContent=current?.label||'Discover';
    const prompt=document.getElementById('journeyPrompt');
    if(prompt)prompt.textContent=current?.copy||'';
    const rec=recommendation(view);
    const title=document.getElementById('flowNextTitle');
    const copy=document.getElementById('flowNextCopy');
    const action=document.getElementById('flowNextAction');
    if(title)title.textContent=rec.title;
    if(copy)copy.textContent=rec.copy;
    if(action){action.textContent=rec.action+' →';action.dataset.flowTarget=rec.view;action.setAttribute('aria-label',rec.action+': '+rec.copy);}
  }

  function showHandoff(detail={}){
    const card=document.querySelector('.flow-next-card');
    const title=document.getElementById('flowNextTitle');
    const copy=document.getElementById('flowNextCopy');
    const action=document.getElementById('flowNextAction');
    if(!card||!title||!copy||!action)return;
    title.textContent=detail.title||'A sensible next step is ready';
    copy.textContent=detail.copy||'Continue when you are ready.';
    action.textContent=(detail.action||'Continue')+' →';
    action.dataset.flowTarget=detail.view||'dashboard';
    action.setAttribute('aria-label',(detail.action||'Continue')+': '+(detail.copy||'Continue when you are ready.'));
    card.classList.add('handoff-ready');
    setTimeout(()=>card.classList.remove('handoff-ready'),1800);
  }

  function bind(){
    const stageButtons=[...document.querySelectorAll('[data-flow-stage]')];
    stageButtons.forEach((btn,index)=>{
      btn.setAttribute('aria-label',STAGES[index]?.label+': '+(STAGES[index]?.copy||''));
      btn.addEventListener('click',()=>{
        const target=STAGES.find(x=>x.id===btn.dataset.flowStage)?.view;
        if(target)window.showView?.(target);
      });
      btn.addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
        e.preventDefault();
        let next=index;
        if(e.key==='ArrowRight')next=(index+1)%stageButtons.length;
        if(e.key==='ArrowLeft')next=(index-1+stageButtons.length)%stageButtons.length;
        if(e.key==='Home')next=0;
        if(e.key==='End')next=stageButtons.length-1;
        stageButtons[next]?.focus();
      });
    });
    document.getElementById('flowNextAction')?.addEventListener('click',e=>{
      const target=e.currentTarget.dataset.flowTarget;
      if(target)window.showView?.(target);
    });
    window.addEventListener('quire:view-changed',e=>render(e.detail?.viewId||'dashboard'));
    window.addEventListener('quire:store-changed',()=>render(document.querySelector('.view.active')?.id||'dashboard'));
    window.addEventListener('quire:workflow-handoff',e=>showHandoff(e.detail||{}));
    render(document.querySelector('.view.active')?.id||'dashboard');
  }
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireJourney={render,recommendation,showHandoff};
})();