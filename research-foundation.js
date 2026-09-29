/* Quire Research Foundation & Literature Review Intelligence
 * Builds a transparent process-based review score and a non-numeric literature maturity signal.
 * It does NOT estimate the percentage of all literature in existence that has been read.
 */
(function(){
  const WEIGHTS={
    search:15,
    screening:15,
    reading:25,
    appraisal:15,
    synthesis:20,
    coverage:10
  };

  function clamp(value,min=0,max=100){return Math.max(min,Math.min(max,Number(value)||0));}
  function pct(value){return Math.round(clamp(value));}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function projectRows(state,key,projectId){return (state[key]||[]).filter(row=>row.projectId===projectId);}
  function hasText(value){return Boolean(String(value||'').trim());}
  function synthesisData(article){return article?.citationData?.synthesis||{};}
  function hasSynthesis(article){
    const data=synthesisData(article);
    return ['design','sample','methods','findings','limitations','relevance'].some(key=>hasText(data[key]));
  }

  function context(projectId){
    const store=window.QuireStore;
    const state=store?.getState?.()||{};
    projectId=projectId||store?.getActiveProjectId?.();
    const project=(state.projects||[]).find(row=>row.id===projectId)||{};
    const setup=(state.studySetups||[]).find(row=>row.projectId===projectId)||{};
    const articles=projectRows(state,'articles',projectId);
    const highlights=projectRows(state,'highlights',projectId);
    const notes=projectRows(state,'notes',projectId);
    const appraisals=projectRows(state,'appraisals',projectId);
    const screening=projectRows(state,'screeningRecords',projectId);
    const searchRuns=projectRows(state,'searchRuns',projectId);
    const plan=(state.searchPlans||[]).find(row=>row.projectId===projectId)||null;
    const evidence=projectRows(state,'evidenceLinks',projectId);
    const objectives=projectRows(state,'objectives',projectId).filter(row=>row.status!=='archived');
    const themes=projectRows(state,'themes',projectId);
    const analysis=projectRows(state,'analysisItems',projectId);
    const articleThemes=(state.articleThemes||[]).filter(link=>articles.some(article=>article.id===link.articleId));
    const sections=projectRows(state,'sections',projectId);
    const reviewed=articles.filter(article=>article.readingStatus==='reviewed');
    const gapSignals=analysis.filter(item=>item.kind==='gap_signal');
    const gapExplorations=gapSignals.filter(item=>String(item.payload?.gapStatus||'emerging')!=='set_aside');
    const viableGapSignals=gapSignals.filter(item=>!['set_aside','challenged'].includes(String(item.payload?.gapStatus||'emerging')));
    return {
      state,projectId,project,setup,articles,highlights,notes,appraisals,screening,
      searchRuns,plan,evidence,objectives,themes,analysis,articleThemes,sections,reviewed,
      gapSignals,gapExplorations,viableGapSignals
    };
  }

  function searchComponent(ctx){
    const plan=ctx.plan||{};
    const concepts=Array.isArray(plan.concepts)?plan.concepts:[];
    const checks=[
      concepts.some(concept=>Array.isArray(concept.terms)&&concept.terms.some(hasText)),
      Array.isArray(plan.databases)&&plan.databases.some(hasText),
      hasText(plan.inclusionCriteria)||hasText(plan.exclusionCriteria),
      ctx.searchRuns.length>0
    ];
    const done=checks.filter(Boolean).length;
    return {
      key:'search',label:'Search foundation',weight:WEIGHTS.search,
      score:pct(done/checks.length*100),
      detail:done+' of 4 search-planning elements in place',
      evidence:{
        concepts:checks[0],databases:checks[1],criteria:checks[2],loggedSearch:checks[3]
      }
    };
  }

  function screeningComponent(ctx){
    const total=ctx.articles.length;
    if(!total)return {
      key:'screening',label:'Collection & screening',weight:WEIGHTS.screening,score:0,
      detail:'No papers collected yet',
      evidence:{collected:0,titleAbstractDecisions:0,fullTextDecisions:0}
    };
    const records=new Map(ctx.screening.map(row=>[row.articleId,row]));
    const titleDone=ctx.articles.filter(article=>{
      const value=records.get(article.id)?.titleAbstractDecision;
      return value&&value!=='pending'&&value!=='not_started';
    }).length;
    const fullDone=ctx.articles.filter(article=>{
      const value=records.get(article.id)?.fullTextDecision;
      return value&&value!=='not_started';
    }).length;
    const score=20+(titleDone/total*40)+(fullDone/total*40);
    return {
      key:'screening',label:'Collection & screening',weight:WEIGHTS.screening,score:pct(score),
      detail:total+' collected · '+titleDone+' title/abstract decisions · '+fullDone+' full-text decisions',
      evidence:{collected:total,titleAbstractDecisions:titleDone,fullTextDecisions:fullDone}
    };
  }

  function readingComponent(ctx){
    const total=ctx.articles.length;
    if(!total)return {
      key:'reading',label:'Reading & extraction',weight:WEIGHTS.reading,score:0,
      detail:'No papers available to review',
      evidence:{reviewed:0,annotated:0,extracted:0,total:0}
    };
    const annotatedIds=new Set([
      ...ctx.highlights.map(row=>row.articleId),
      ...ctx.notes.map(row=>row.articleId)
    ].filter(Boolean));
    const extractedIds=new Set(ctx.articles.filter(hasSynthesis).map(row=>row.id));
    let depth=0;
    ctx.articles.forEach(article=>{
      if(article.readingStatus==='reviewed')depth+=0.45;
      if(annotatedIds.has(article.id))depth+=0.25;
      if(extractedIds.has(article.id))depth+=0.30;
    });
    return {
      key:'reading',label:'Reading & extraction',weight:WEIGHTS.reading,score:pct(depth/total*100),
      detail:ctx.reviewed.length+' reviewed · '+annotatedIds.size+' annotated · '+extractedIds.size+' with comparison fields',
      evidence:{reviewed:ctx.reviewed.length,annotated:annotatedIds.size,extracted:extractedIds.size,total}
    };
  }

  function appraisalComponent(ctx){
    const eligible=ctx.reviewed.length;
    const completed=new Set(ctx.appraisals.filter(row=>row.completedAt&&row.overallJudgement&&row.overallJudgement!=='not_started').map(row=>row.articleId));
    const completedReviewed=ctx.reviewed.filter(article=>completed.has(article.id)).length;
    return {
      key:'appraisal',label:'Critical appraisal',weight:WEIGHTS.appraisal,
      score:eligible?pct(completedReviewed/eligible*100):0,
      detail:eligible
        ? completedReviewed+' of '+eligible+' reviewed papers appraised'
        : 'Appraisal starts once papers are reviewed in depth',
      evidence:{eligible,completed:completedReviewed}
    };
  }

  function repeatedThemeCount(ctx){
    const perTheme=new Map();
    ctx.articleThemes.forEach(link=>{
      if(!link.themeId||!link.articleId)return;
      if(!perTheme.has(link.themeId))perTheme.set(link.themeId,new Set());
      perTheme.get(link.themeId).add(link.articleId);
    });
    return [...perTheme.values()].filter(set=>set.size>=2).length;
  }

  function synthesisComponent(ctx){
    const synthesized=ctx.articles.filter(hasSynthesis).length;
    const target=Math.max(2,Math.min(Math.max(ctx.reviewed.length,2),6));
    const comparisonScore=Math.min(50,synthesized/target*50);
    const multiThemes=repeatedThemeCount(ctx);
    const contradictory=ctx.highlights.filter(row=>row.category==='contradictory').length;
    const synthesisItems=ctx.analysis.filter(row=>['synthesis_finding','review_outcome'].includes(row.kind)).length;
    const score=comparisonScore+(multiThemes?25:0)+(contradictory?10:0)+(synthesisItems?15:0);
    return {
      key:'synthesis',label:'Comparison & synthesis',weight:WEIGHTS.synthesis,score:pct(score),
      detail:synthesized+' papers compared · '+multiThemes+' repeated cross-paper themes · '+contradictory+' counter-evidence marks',
      evidence:{synthesized,multiSourceThemes:multiThemes,contradictory,synthesisItems}
    };
  }

  function coverageComponent(ctx){
    const objectiveIds=new Set(ctx.objectives.map(row=>row.id));
    const themeIds=new Set(ctx.themes.map(row=>row.id));
    const coveredObjectives=new Set(ctx.evidence.filter(row=>row.objectiveId&&objectiveIds.has(row.objectiveId)).map(row=>row.objectiveId));
    const coveredThemes=new Set(ctx.evidence.filter(row=>row.themeId&&themeIds.has(row.themeId)).map(row=>row.themeId));
    let coverageBase=0;
    let coverageLabel='No objectives or themes mapped yet';
    if(ctx.objectives.length){
      coverageBase=coveredObjectives.size/ctx.objectives.length;
      coverageLabel=coveredObjectives.size+' of '+ctx.objectives.length+' objectives have evidence links';
    }else if(ctx.themes.length){
      coverageBase=coveredThemes.size/ctx.themes.length;
      coverageLabel=coveredThemes.size+' of '+ctx.themes.length+' themes have evidence links';
    }
    const gapFactor=Math.min(1,ctx.gapExplorations.length/2);
    const score=(coverageBase*60)+(gapFactor*40);
    return {
      key:'coverage',label:'Coverage & gap exploration',weight:WEIGHTS.coverage,score:pct(score),
      detail:coverageLabel+' · '+ctx.gapExplorations.length+' gap exploration'+(ctx.gapExplorations.length===1?'':'s')+', '+ctx.viableGapSignals.length+' currently viable',
      evidence:{
        objectives:ctx.objectives.length,coveredObjectives:coveredObjectives.size,
        themes:ctx.themes.length,coveredThemes:coveredThemes.size,
        gapSignals:ctx.viableGapSignals.length,
        gapExplorations:ctx.gapExplorations.length
      }
    };
  }

  function reviewProgress(projectId){
    const ctx=context(projectId);
    const components=[
      searchComponent(ctx),
      screeningComponent(ctx),
      readingComponent(ctx),
      appraisalComponent(ctx),
      synthesisComponent(ctx),
      coverageComponent(ctx)
    ];
    const score=Math.round(components.reduce((sum,row)=>sum+(row.score*row.weight/100),0));
    return {
      score,
      components,
      counts:{
        papers:ctx.articles.length,
        reviewed:ctx.reviewed.length,
        highlights:ctx.highlights.length,
        notes:ctx.notes.length,
        appraised:ctx.appraisals.filter(row=>row.completedAt&&row.overallJudgement!=='not_started').length,
        gapSignals:ctx.gapSignals.length
      },
      explanation:'This percentage measures progress through the review process recorded in Quire. It does not estimate how much of all existing literature has been read.'
    };
  }

  function maturity(projectId){
    const ctx=context(projectId);
    const explicit=window.QuirePaperContribution?.maturityEvidence?.(ctx.projectId);
    const synthesized=ctx.articles.filter(hasSynthesis).length;
    const multiThemes=repeatedThemeCount(ctx);
    const counterEvidence=ctx.highlights.filter(row=>row.category==='contradictory').length;
    const gaps=ctx.gapExplorations.length;
    const reviewed=ctx.reviewed.length;

    if(explicit?.classified>=3){
      if(explicit.key==='expanding'){
        return {
          key:'expanding',label:'Still expanding',
          copy:explicit.copy,
          evidence:{reviewed,synthesized,multiThemes,counterEvidence,gaps,readingCheckpoints:explicit.classified,newConceptSignals:explicit.counts.newConcept}
        };
      }
      if(explicit.key==='recurring'){
        return {
          key:'stabilising',label:'Beginning to stabilise',
          copy:explicit.copy,
          evidence:{reviewed,synthesized,multiThemes,counterEvidence,gaps,readingCheckpoints:explicit.classified,newConceptSignals:explicit.counts.newConcept}
        };
      }
      return {
        key:'developing',label:'Developing',
        copy:explicit.copy,
        evidence:{reviewed,synthesized,multiThemes,counterEvidence,gaps,readingCheckpoints:explicit.classified,newConceptSignals:explicit.counts.newConcept}
      };
    }

    if(ctx.articles.length<5||reviewed<3){
      return {
        key:'broad',label:'Needs broader searching',
        copy:'The literature base is still small. Keep searching and reading across the field before treating an apparent gap as meaningful.',
        evidence:{reviewed,synthesized,multiThemes,counterEvidence,gaps}
      };
    }
    if(reviewed<8||synthesized<3){
      return {
        key:'developing',label:'Developing',
        copy:'Several papers are now being read, but the cross-paper comparison is still developing. Keep looking for repeated themes, limitations and disagreement.',
        evidence:{reviewed,synthesized,multiThemes,counterEvidence,gaps}
      };
    }
    if(reviewed>=10&&synthesized>=5&&multiThemes>=2){
      return {
        key:'stabilising',label:'Beginning to stabilise',
        copy:'Recurring patterns are appearing across multiple reviewed papers. This is a signal to test with further searching—not a claim that literature saturation has been reached.',
        evidence:{reviewed,synthesized,multiThemes,counterEvidence,gaps}
      };
    }
    return {
      key:'developing',label:'Developing',
      copy:'The evidence base is growing. Continue comparing studies and deliberately search for papers that could challenge the patterns you are seeing.',
      evidence:{reviewed,synthesized,multiThemes,counterEvidence,gaps}
    };
  }

  function isStarter(ctx=context()){
    return Boolean(window.QuireStore?.isStarterProject?.(ctx.projectId));
  }

  function stage(ctx=context()){
    const review=reviewProgress(ctx.projectId);
    const mat=maturity(ctx.projectId);
    const synthesis=review.components.find(row=>row.key==='synthesis');
    if(isStarter(ctx))return 'define';
    if(!ctx.articles.length)return 'collect';
    if(ctx.reviewed.length<3)return 'read';
    if((synthesis?.evidence?.synthesized||0)<2)return 'read';
    if(!ctx.viableGapSignals.length)return 'gap';
    if(!hasText(ctx.project.researchQuestion))return 'refine';
    if(mat.key!=='stabilising'||review.score<65)return 'gap';
    return 'refine';
  }

  function ensureGapModal(){
    if(document.getElementById('researchGapModal'))return;
    const backdrop=document.createElement('div');
    backdrop.id='researchGapModal';
    backdrop.className='modal-backdrop';
    backdrop.hidden=true;
    backdrop.innerHTML=
      '<div class="modal research-gap-modal" role="dialog" aria-modal="true" aria-labelledby="researchGapModalTitle">'+
        '<div class="modal-head"><div><span class="eyebrow">POSSIBLE GAP SIGNAL</span><h2 id="researchGapModalTitle">Record something the literature may be missing</h2></div><button id="closeResearchGapModal" type="button">×</button></div>'+
        '<p class="gap-modal-intro">Record an observation to test with further searching. Quire will not treat this as a confirmed knowledge gap.</p>'+
        '<div class="form-grid">'+
          '<label class="field wide"><span>Possible gap / unanswered issue</span><input id="gapSignalTitle" type="text" placeholder="e.g. Limited evidence on long-term primary-care follow-up"></label>'+
          '<label class="field wide"><span>What have you noticed?</span><textarea id="gapSignalObservation" rows="4" placeholder="Describe the pattern, absence, inconsistency or limitation you are seeing across papers."></textarea></label>'+
          '<label class="field wide"><span>What evidence currently points to this?</span><textarea id="gapSignalEvidence" rows="3" placeholder="Paper titles, recurring limitations, populations not studied, conflicting findings…"></textarea></label>'+
          '<label class="field wide"><span>How will you test this gap?</span><textarea id="gapSignalNextSearch" rows="3" placeholder="What additional search, population, setting, method or keyword should you check?"></textarea></label>'+
        '</div>'+
        '<small id="gapSignalMessage" class="gap-signal-message"></small>'+
        '<div class="account-button-row"><button class="soft-btn" id="cancelResearchGap" type="button">Cancel</button><button class="primary-btn" id="saveResearchGap" type="button">Save as possible gap</button></div>'+
      '</div>';
    document.body.appendChild(backdrop);

    const close=()=>{backdrop.hidden=true;};
    document.getElementById('closeResearchGapModal')?.addEventListener('click',close);
    document.getElementById('cancelResearchGap')?.addEventListener('click',close);
    backdrop.addEventListener('click',event=>{if(event.target===backdrop)close();});
    document.getElementById('saveResearchGap')?.addEventListener('click',()=>{
      const title=document.getElementById('gapSignalTitle')?.value.trim()||'';
      const message=document.getElementById('gapSignalMessage');
      if(!title){
        if(message)message.textContent='Describe the possible gap before saving it.';
        document.getElementById('gapSignalTitle')?.focus();
        return;
      }
      window.QuireStore.addAnalysisItem({
        kind:'gap_signal',
        title,
        status:'draft',
        payload:{
          observation:document.getElementById('gapSignalObservation')?.value.trim()||'',
          evidence:document.getElementById('gapSignalEvidence')?.value.trim()||'',
          nextSearch:document.getElementById('gapSignalNextSearch')?.value.trim()||'',
          gapStatus:'emerging',
          boundary:'Possible gap only; requires further searching and researcher judgement.'
        }
      });
      close();
      render();
      window.dispatchEvent(new CustomEvent('quire:workflow-handoff',{detail:{
        title:'Possible gap saved for testing',
        copy:'Keep searching for evidence that supports, narrows or disproves this possible gap.',
        action:'Plan the next search',
        view:'searchscreen'
      }}));
    });
  }

  function openGapModal(){
    ensureGapModal();
    ['gapSignalTitle','gapSignalObservation','gapSignalEvidence','gapSignalNextSearch'].forEach(id=>{
      const node=document.getElementById(id);if(node)node.value='';
    });
    const message=document.getElementById('gapSignalMessage');if(message)message.textContent='';
    const modal=document.getElementById('researchGapModal');if(modal)modal.hidden=false;
    setTimeout(()=>document.getElementById('gapSignalTitle')?.focus(),0);
  }

  function renderFoundation(){
    const mount=document.getElementById('researchFoundationGuide');
    if(!mount||!window.QuireStore)return;
    const ctx=context();
    const starter=isStarter(ctx);
    const heading=document.querySelector('.home-heading h1');
    const headingCopy=document.querySelector('.home-heading p');
    const endSession=document.getElementById('saveSessionCheckpointBtn');
    if(heading)heading.textContent=starter?'Start your research.':'Pick up where you left off.';
    if(headingCopy)headingCopy.textContent=starter
      ? 'Begin with a broad research area. Quire will help you search, read, compare and refine the question as the literature develops.'
      : 'Quire keeps the next useful action, your recent work and the state of your thesis in one place.';
    if(endSession)endSession.hidden=starter;

    const review=reviewProgress(ctx.projectId);
    const mat=maturity(ctx.projectId);
    const currentStage=stage(ctx);
    mount.hidden=false;

    document.querySelectorAll('[data-foundation-stage]').forEach(node=>{
      node.classList.toggle('active',node.dataset.foundationStage===currentStage);
      const order=['define','collect','read','gap','refine'];
      node.classList.toggle('done',order.indexOf(node.dataset.foundationStage)<order.indexOf(currentStage));
    });

    const statusTitle=document.getElementById('foundationStatusTitle');
    const statusMeta=document.getElementById('foundationStatusMeta');
    if(statusTitle)statusTitle.textContent='Research review progress · '+review.score+'%';
    if(statusMeta)statusMeta.textContent=review.counts.papers
      ? review.counts.papers+' papers · '+review.counts.reviewed+' reviewed in depth'
      : 'No papers collected yet';

    const signals=document.getElementById('foundationSignals');
    if(signals){
      signals.innerHTML=
        '<article><span>REVIEW PROGRESS</span><strong>'+review.score+'%</strong><small>Process-based, not “percent of all literature”.</small></article>'+
        '<article><span>LITERATURE MATURITY</span><strong>'+escapeHtml(mat.label)+'</strong><small>'+escapeHtml(mat.copy)+'</small></article>'+
        '<article><span>PAPERS</span><strong>'+review.counts.papers+'</strong><small>'+review.counts.reviewed+' reviewed in depth</small></article>'+
        '<article><span>CRITICAL APPRAISAL</span><strong>'+review.counts.appraised+'</strong><small>completed appraisals</small></article>'+
        '<article><span>EVIDENCE CAPTURE</span><strong>'+(review.counts.highlights+review.counts.notes)+'</strong><small>'+review.counts.highlights+' highlights · '+review.counts.notes+' notes</small></article>'+
        '<article><span>POSSIBLE GAPS</span><strong>'+review.counts.gapSignals+'</strong><small>signals still requiring further searching</small></article>';
    }

    const breakdown=document.getElementById('foundationReviewBreakdown');
    if(breakdown){
      breakdown.innerHTML=review.components.map(row=>
        '<article class="foundation-review-row">'+
          '<div><strong>'+escapeHtml(row.label)+'</strong><small>'+escapeHtml(row.detail)+'</small></div>'+
          '<div class="foundation-review-meter"><i style="width:'+pct(row.score)+'%"></i></div>'+
          '<span>'+pct(row.score)+'% · '+row.weight+'% weight</span>'+
        '</article>'
      ).join('');
    }

    const gapAction=document.getElementById('foundationGapAction');
    const synthesisEvidence=review.components.find(row=>row.key==='synthesis')?.evidence||{};
    const gapReady=ctx.reviewed.length>=3&&Number(synthesisEvidence.synthesized||0)>=2;
    if(gapAction){
      gapAction.disabled=!gapReady;
      gapAction.textContent=gapReady?'Record a possible gap':'Compare papers first';
      gapAction.title=gapReady
        ? 'Record a possible gap signal to test with further searching.'
        : 'Read and compare several papers before recording a possible knowledge gap.';
    }

    const gapTitle=document.getElementById('foundationGapTitle');
    const gapCopy=document.getElementById('foundationGapCopy');
    if(ctx.viableGapSignals.length){
      const latest=ctx.viableGapSignals.slice().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))[0];
      if(gapTitle)gapTitle.textContent=ctx.viableGapSignals.length+' active gap hypothesis'+(ctx.viableGapSignals.length===1?'':'es')+' being tested';
      if(gapCopy)gapCopy.textContent='Latest: “'+latest.title+'”. Keep searching for evidence that supports, narrows or disproves it before treating it as the thesis gap.';
    }else if(ctx.gapSignals.length){
      if(gapTitle)gapTitle.textContent='No active gap direction';
      if(gapCopy)gapCopy.textContent='Previous gap signals have been challenged or set aside. Return to the literature and look for a better-supported direction.';
    }else{
      if(gapTitle)gapTitle.textContent='No gap claimed yet';
      if(gapCopy)gapCopy.textContent='Quire will help you record possible gap signals as you read. A possible gap is something to test with further searching—not something Quire will invent for you.';
    }

    const primary=document.getElementById('foundationPrimaryAction');
    if(primary){
      let label='Define my research area',target='launch';
      if(!isStarter(ctx)&&!ctx.articles.length){label='Plan my literature search';target='searchscreen';}
      else if(ctx.articles.length&&ctx.reviewed.length<3){label='Read across the literature';target='library';}
      else if(review.components.find(row=>row.key==='synthesis')?.evidence?.synthesized<2){label='Compare several papers';target='synthesis';}
      else if(!ctx.viableGapSignals.length){label='Compare findings & look for gaps';target='synthesis';}
      else if(!hasText(ctx.project.researchQuestion)){label='Refine the working question';target='setup';}
      else if(review.score<65||mat.key!=='stabilising'){label='Strengthen the literature foundation';target='searchscreen';}
      else{label='Organise the emerging argument';target='map';}
      primary.textContent=label+' →';
      primary.dataset.foundationTarget=target;
    }
  }

  function renderHomeHero(){
    const title=document.getElementById('dashboardPrimaryTitle');
    const eyebrow=document.getElementById('dashboardPrimaryEyebrow');
    const stats=document.getElementById('dashboardThesisStats');
    const action=document.getElementById('dashboardPrimaryAction');
    if(!title||!action)return;

    const ctx=context();
    const starter=isStarter(ctx);
    const review=reviewProgress(ctx.projectId);
    const mat=maturity(ctx.projectId);
    const currentStage=stage(ctx);
    let target='launch';

    if(starter){
      if(eyebrow)eyebrow.textContent='START YOUR RESEARCH';
      title.textContent='Begin with the area you want to explore.';
      if(stats)stats.textContent='No final question needed yet · let the literature shape it';
      action.textContent='Define my research area →';target='launch';
    }else if(currentStage==='collect'){
      if(eyebrow)eyebrow.textContent='BUILD THE LITERATURE BASE';
      title.textContent='Explore the field before narrowing the question.';
      if(stats)stats.textContent=review.counts.papers+' papers · review progress '+review.score+'% · '+mat.label;
      action.textContent='Plan & collect research →';target='searchscreen';
    }else if(currentStage==='read'){
      if(eyebrow)eyebrow.textContent='READ ACROSS THE FIELD';
      title.textContent='Read several papers, then compare what they actually say.';
      if(stats)stats.textContent=review.counts.papers+' papers · '+review.counts.reviewed+' reviewed in depth · '+review.score+'% review progress';
      action.textContent='Continue reading →';target='library';
    }else if(currentStage==='gap'){
      if(eyebrow)eyebrow.textContent='COMPARE & TEST';
      title.textContent=ctx.viableGapSignals.length?'Test the possible gap against more literature.':'Look for what is missing, uncertain or repeatedly limited.';
      if(stats)stats.textContent=mat.label+' · '+review.counts.gapSignals+' active gap hypotheses · '+review.score+'% review progress';
      action.textContent=ctx.viableGapSignals.length?'Plan another search →':'Compare papers →';
      target=ctx.viableGapSignals.length?'searchscreen':'synthesis';
    }else{
      if(eyebrow)eyebrow.textContent='REFINE THE RESEARCH DIRECTION';
      title.textContent='Use the literature to sharpen the question and define your contribution.';
      if(stats)stats.textContent=mat.label+' · '+review.counts.reviewed+' papers reviewed in depth · '+review.score+'% review progress';
      action.textContent='Review the research direction →';target='setup';
    }
    action.dataset.foundationTarget=target;
  }

  function openTarget(target){
    if(target==='launch'){
      window.QuireGuidedLaunch?.open?.();
      return;
    }
    if(target)window.showView?.(target);
  }

  function render(){
    renderFoundation();
    renderHomeHero();
  }

  function bind(){
    ensureGapModal();
    document.getElementById('foundationPrimaryAction')?.addEventListener('click',event=>openTarget(event.currentTarget.dataset.foundationTarget));
    document.getElementById('foundationResearchAction')?.addEventListener('click',()=>window.showView?.('library'));
    document.getElementById('foundationGapAction')?.addEventListener('click',openGapModal);
    document.getElementById('dashboardPrimaryAction')?.addEventListener('click',event=>openTarget(event.currentTarget.dataset.foundationTarget));

    window.addEventListener('quire:project-switched',render);
    window.addEventListener('quire:store-changed',render);
    window.addEventListener('quire:appraisal-changed',render);
    window.addEventListener('quire:view-changed',event=>{if(event.detail?.viewId==='dashboard')render();});
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireResearchFoundation={reviewProgress,maturity,stage,render,renderHomeHero,openGapModal};
})();