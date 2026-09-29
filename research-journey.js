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
    {id:'discover',label:'Discover',copy:'Explore the field broadly, plan the search and build a literature base before narrowing too early.',view:'searchscreen'},
    {id:'understand',label:'Understand',copy:'Read across several papers, capture what they contribute and critically appraise their strengths and limitations.',view:'library'},
    {id:'organise',label:'Organise',copy:'Compare studies, identify recurring themes and disagreement, and test possible gaps against more literature.',view:'synthesis'},
    {id:'write',label:'Write',copy:'Develop an argument only after the evidence has been organised enough to support synthesis.',view:'chapters'},
    {id:'review',label:'Review',copy:'Check meaning, language, claims, evidence and readiness before finalising.',view:'review'}
  ];

  function state(){
    const s=window.QuireStore?.getState?.()||{};
    const projectId=window.QuireStore?.getActiveProjectId?.();
    const project=(s.projects||[]).find(p=>p.id===projectId)||{};
    const articles=(s.articles||[]).filter(a=>!projectId||a.projectId===projectId);
    const highlights=(s.highlights||[]).filter(h=>!projectId||h.projectId===projectId);
    const notes=(s.notes||[]).filter(n=>!projectId||n.projectId===projectId);
    const sections=(s.sections||[]).filter(x=>!projectId||x.projectId===projectId);
    const evidence=(s.evidenceLinks||[]).filter(x=>!projectId||x.projectId===projectId);
    const analysis=(s.analysisItems||[]).filter(x=>!projectId||x.projectId===projectId);
    const reviewed=articles.filter(a=>a.readingStatus==='reviewed');
    const compared=articles.filter(article=>{
      const d=article.citationData?.synthesis||{};
      return ['design','sample','methods','findings','limitations','relevance'].some(key=>String(d[key]||'').trim());
    });
    const gaps=analysis.filter(x=>x.kind==='gap_signal');
    const viableGaps=gaps.filter(x=>!['set_aside','challenged'].includes(String(x.payload?.gapStatus||'emerging')));
    const words=sections.reduce((n,x)=>n+(Number(x.currentWordCount)||0),0);
    const review=window.QuireResearchFoundation?.reviewProgress?.(projectId)||{score:0};
    const maturity=window.QuireResearchFoundation?.maturity?.(projectId)||{key:'broad',label:'Needs broader searching'};
    return {projectId,project,articles,highlights,notes,sections,evidence,analysis,reviewed,compared,gaps,viableGaps,words,review,maturity};
  }

  function recommendation(view){
    const s=state();
    if(window.QuireStore?.isStarterProject?.(s.projectId)){
      return {stage:'discover',title:'Start with the area you want to explore',copy:'You do not need a final research question yet. Define the broad area first, then let the literature help you narrow it.',action:'Define research area',view:'dashboard'};
    }
    if(!s.articles.length){
      return {stage:'discover',title:'Plan the search before narrowing the question',copy:'Develop the main concepts, keywords and sources you need to explore the field broadly.',action:'Plan literature search',view:'searchscreen'};
    }
    if(s.articles.length<5){
      return {stage:'discover',title:'Keep building the literature base',copy:'A few papers are a starting point, not a basis for defining the gap. Keep collecting relevant work from across the field.',action:'Continue research',view:'searchscreen'};
    }
    if(s.reviewed.length<3){
      return {stage:'understand',title:'Read across several papers',copy:'Compare what different studies actually found, how they were designed and what limitations they report before drawing conclusions.',action:'Open Research',view:'library'};
    }
    if(s.compared.length<2){
      return {stage:'organise',title:'Start comparing papers side by side',copy:'Pull findings, methods and limitations together so recurring patterns and disagreements become visible.',action:'Compare papers',view:'synthesis'};
    }
    if(!s.viableGaps.length){
      if(s.gaps.length){
        return {stage:'organise',title:'Your previous gap direction was challenged or set aside',copy:'Return to cross-paper comparison and search for a better-supported direction rather than forcing the earlier gap.',action:'Reassess the literature gap',view:'synthesis'};
      }
      return {stage:'organise',title:'Look for possible gaps—but do not confirm one yet',copy:'Use cross-paper comparison to identify unanswered issues, under-studied populations, inconsistent findings or repeated limitations, then test them with further searching.',action:'Explore the literature gap',view:'synthesis'};
    }
    if(!String(s.project.researchQuestion||'').trim()){
      return {stage:'organise',title:'Refine the working question from the literature',copy:'You now have possible gap signals. Shape the working question around what the literature appears to leave unanswered, while continuing to test that gap.',action:'Refine research direction',view:'setup'};
    }
    if(s.review.score<65||s.maturity.key!=='stabilising'){
      return {stage:'organise',title:'Strengthen the case for the emerging gap',copy:'Keep searching, appraising and comparing. Quire will not treat the gap as established while the evidence base is still developing.',action:'Continue literature review',view:'searchscreen'};
    }
    if(!s.evidence.length){
      return {stage:'organise',title:'Turn the literature into an evidence map',copy:'Connect the strongest findings, counter-evidence and possible gap to the objectives, themes and argument you are beginning to develop.',action:'Open Thesis Map',view:'map'};
    }
    if(!s.words){
      return {stage:'write',title:'The evidence is organised enough to begin a cautious draft',copy:'Start with one synthesised section, keeping supporting and conflicting evidence visible. Research can still continue as the draft develops.',action:'Start an evidence-grounded draft',view:'chapters'};
    }
    if(view==='chapters'){
      return {stage:'review',title:'Check the section against the evidence base',copy:'Confirm the argument reflects the literature fairly, including limitations and counter-evidence, then continue researching any weak spots.',action:'Review writing',view:'review'};
    }
    return {stage:'write',title:'Keep research and writing iterative',copy:'Develop the next evidence-grounded point, then return to the literature whenever a claim exposes a gap in coverage.',action:'Continue writing',view:'chapters'};
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