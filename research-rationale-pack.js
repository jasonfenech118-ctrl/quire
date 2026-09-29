/* Quire Supervisor Research Rationale Pack — Step 64 */
(function(){
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function pid(){return window.QuireStore?.getActiveProjectId?.();}
  function state(){return window.QuireStore?.getState?.()||{};}
  function project(){return window.QuireStore?.getActiveProject?.()||{};}
  function rows(kind){
    const projectId=pid();
    return (state().analysisItems||[]).filter(item=>item.projectId===projectId&&item.kind===kind);
  }
  function prettyDate(value){
    if(!value)return '—';
    const d=new Date(String(value).length===10?value+'T12:00:00':value);
    return Number.isNaN(d.getTime())?'—':d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  }
  function gapStatus(item){
    return String(item?.payload?.gapStatus||'emerging');
  }
  function gapStatusLabel(status){
    return ({
      emerging:'Emerging',
      testing:'Being tested',
      narrowed:'Narrowed',
      supported:'Supported by current review',
      challenged:'Challenged',
      set_aside:'Set aside'
    })[status]||status;
  }
  function latestContribution(){
    return rows('contribution_statement').sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))[0]||null;
  }
  function latestSearchCheckpoint(){
    return rows('search_checkpoint').sort((a,b)=>String(b.payload?.checkpointDate||b.createdAt||'').localeCompare(String(a.payload?.checkpointDate||a.createdAt||'')))[0]||null;
  }

  function data(){
    const p=project();
    const review=window.QuireResearchFoundation?.reviewProgress?.()||{score:0,counts:{}};
    const maturity=window.QuireResearchFoundation?.maturity?.()||{label:'Needs broader searching',copy:''};
    const contributionTrend=window.QuirePaperContribution?.maturityEvidence?.()||{classified:0,counts:{newConcept:0,reinforces:0,challenges:0}};
    const gaps=rows('gap_signal').sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
    const revisions=rows('question_revision').sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
    const decisions=rows('research_decision').sort((a,b)=>String(b.payload?.decisionDate||b.createdAt||'').localeCompare(String(a.payload?.decisionDate||a.createdAt||'')));
    const searchRuns=window.QuireStore?.listSearchRuns?.()||[];
    const contribution=latestContribution();
    const checkpoint=latestSearchCheckpoint();
    return {p,review,maturity,contributionTrend,gaps,revisions,decisions,searchRuns,contribution,checkpoint};
  }

  function markdown(){
    const d=data();
    const lines=[];
    lines.push('# Quire Research Rationale Pack');
    lines.push('');
    lines.push('Project: '+(d.p.title||'Untitled research project'));
    lines.push('Generated: '+new Date().toLocaleString());
    lines.push('');
    lines.push('> This pack summarises the researcher’s recorded literature-review reasoning. It does not certify novelty, search completeness, academic quality, supervisor approval, or that a knowledge gap is universally established.');
    lines.push('');
    lines.push('## Current research direction');
    lines.push('');
    lines.push('Current working question: '+(d.p.researchQuestion||'Not yet defined'));
    lines.push('Research review progress: '+d.review.score+'%');
    lines.push('Literature maturity: '+d.maturity.label);
    if(d.maturity.copy)lines.push('Maturity note: '+d.maturity.copy);
    lines.push('Papers reviewed in depth: '+(d.review.counts?.reviewed||0));
    lines.push('Post-reading checkpoints: '+d.contributionTrend.classified);
    lines.push('');
    lines.push('## Literature maturity signals');
    lines.push('');
    lines.push('- New-concept signals in recent classified papers: '+(d.contributionTrend.counts?.newConcept||0));
    lines.push('- Reinforcement signals: '+(d.contributionTrend.counts?.reinforces||0));
    lines.push('- Challenge signals: '+(d.contributionTrend.counts?.challenges||0));
    lines.push('');
    lines.push('## Possible gaps and how they were tested');
    lines.push('');
    if(!d.gaps.length)lines.push('No possible gap signals recorded yet.');
    d.gaps.forEach((g,index)=>{
      const p=g.payload||{};
      lines.push('### Gap '+(index+1)+': '+g.title);
      lines.push('');
      lines.push('Status: '+gapStatusLabel(gapStatus(g)));
      if(p.observation)lines.push('Observation: '+p.observation);
      if(p.evidence)lines.push('Why it may matter: '+p.evidence);
      if(p.nextSearch)lines.push('Next/targeted search: '+p.nextSearch);
      lines.push('Supporting papers linked: '+(Array.isArray(p.supportingArticleIds)?p.supportingArticleIds.length:0));
      lines.push('Challenging/complicating papers linked: '+(Array.isArray(p.challengingArticleIds)?p.challengingArticleIds.length:0));
      lines.push('Targeted search tests logged: '+(Array.isArray(p.searchTests)?p.searchTests.length:0));
      lines.push('');
    });
    lines.push('## Research-question evolution');
    lines.push('');
    if(!d.revisions.length)lines.push('No formal question refinements recorded yet.');
    d.revisions.forEach((r,index)=>{
      const p=r.payload||{};
      lines.push('### Version '+(index+1)+' · '+prettyDate(r.createdAt));
      lines.push('');
      lines.push(p.newQuestion||r.title||'');
      if(p.previousQuestion)lines.push('Previous wording: '+p.previousQuestion);
      if(p.rationale)lines.push('What changed: '+p.rationale);
      if(p.evidenceBasis)lines.push('Literature rationale: '+p.evidenceBasis);
      lines.push('');
    });
    lines.push('## Working contribution');
    lines.push('');
    if(!d.contribution)lines.push('No working contribution statement recorded yet.');
    else{
      const p=d.contribution.payload||{};
      lines.push(p.statement||'No working statement recorded.');
      if(p.unresolvedIssue)lines.push('Unresolved issue: '+p.unresolvedIssue);
      if(p.thesisResponse)lines.push('This thesis will: '+p.thesisResponse);
      if(p.significance)lines.push('Intended contribution: '+p.significance);
      if(p.boundary)lines.push('Boundary: '+p.boundary);
      lines.push('Linked gap status at save: '+gapStatusLabel(p.gapStatusAtSave||'emerging'));
    }
    lines.push('');
    lines.push('## Search strategy development');
    lines.push('');
    lines.push('Logged search runs: '+d.searchRuns.length);
    if(d.checkpoint){
      const p=d.checkpoint.payload||{};
      lines.push('Latest search checkpoint: '+(d.checkpoint.title||''));
      lines.push('Checkpoint date: '+prettyDate(p.checkpointDate||d.checkpoint.createdAt));
      if(p.rationale)lines.push('Rationale: '+p.rationale);
      if(p.reviewScore!=null)lines.push('Review progress at checkpoint: '+p.reviewScore+'%');
      if(p.maturityLabel)lines.push('Literature maturity at checkpoint: '+p.maturityLabel);
      if(p.boundary)lines.push('Boundary: '+p.boundary);
    }else{
      lines.push('No formal search-review checkpoint recorded yet.');
    }
    lines.push('');
    lines.push('## Major research decisions');
    lines.push('');
    if(!d.decisions.length)lines.push('No major research decisions recorded yet.');
    d.decisions.forEach(dec=>{
      const p=dec.payload||{};
      lines.push('- '+prettyDate(p.decisionDate||dec.createdAt)+' · '+dec.title);
      if(p.rationale)lines.push('  - Rationale: '+p.rationale);
      if(p.evidenceTrigger)lines.push('  - Evidence/trigger: '+p.evidenceTrigger);
      if(p.decisionStatus)lines.push('  - Status: '+p.decisionStatus.replace(/_/g,' '));
    });
    lines.push('');
    lines.push('## Questions for supervision');
    lines.push('');
    const activeGaps=d.gaps.filter(g=>!['set_aside','challenged'].includes(gapStatus(g)));
    if(activeGaps.length)lines.push('- Which active gap hypothesis is currently the most defensible direction to keep testing?');
    if(d.maturity.key!=='stabilising')lines.push('- Is the literature base broad enough yet, or should searching remain wider?');
    if(d.contribution)lines.push('- Is the working contribution appropriately scoped, or does it overstate what the proposed study can add?');
    if(d.revisions.length)lines.push('- Does the latest research question reflect the evidence base and remain feasible for the project?');
    if(!activeGaps.length&&!d.contribution&&!d.revisions.length)lines.push('- What should be prioritised next in the literature review and project refinement?');
    return lines.join('\n');
  }

  function download(){
    const md=markdown();
    const blob=new Blob([md],{type:'text/markdown;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const title=String(project().title||'quire').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'quire';
    a.href=url;a.download=title+'-research-rationale-pack.md';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),800);
  }

  function render(){
    const mount=document.getElementById('researchRationalePackage');if(!mount)return;
    const d=data();
    const active=d.gaps.filter(g=>!['set_aside','challenged'].includes(gapStatus(g))).length;
    const challenged=d.gaps.filter(g=>gapStatus(g)==='challenged').length;
    mount.hidden=false;
    mount.innerHTML=
      '<div class="research-rationale-head"><div><span class="eyebrow">RESEARCH RATIONALE PACK</span><h3>'+escapeHtml(d.p.title||'Research rationale')+'</h3><p>Literature → gap testing → question refinement → intended contribution.</p></div><button type="button" id="downloadResearchRationalePackBtn">↓ Download .md</button></div>'+
      '<div class="research-rationale-grid">'+
        '<section><strong>'+d.review.score+'%</strong><span>research-review progress</span><small>'+escapeHtml(d.maturity.label)+'</small></section>'+
        '<section><strong>'+active+'</strong><span>active gap hypotheses</span><small>'+challenged+' challenged</small></section>'+
        '<section><strong>'+d.revisions.length+'</strong><span>question refinements</span><small>'+d.decisions.length+' major decisions logged</small></section>'+
        '<section><strong>'+(d.searchRuns.length)+'</strong><span>search runs</span><small>'+(d.checkpoint?'checkpoint recorded':'no checkpoint yet')+'</small></section>'+
      '</div>'+
      '<div class="research-rationale-preview">'+
        '<strong>Current working question</strong><p>'+escapeHtml(d.p.researchQuestion||'Not yet defined')+'</p>'+
        '<strong>Working contribution</strong><p>'+escapeHtml(d.contribution?.payload?.statement||'Not yet defined')+'</p>'+
      '</div>'+
      '<small>Researcher-authored reasoning summary. Quire does not certify novelty, search completeness or academic merit.</small>';
    document.getElementById('downloadResearchRationalePackBtn')?.addEventListener('click',download);
  }

  function bind(){
    document.getElementById('buildResearchRationalePackBtn')?.addEventListener('click',render);
    window.addEventListener('quire:project-switched',()=>{const m=document.getElementById('researchRationalePackage');if(m)m.hidden=true;});
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireResearchRationalePack={render,download,markdown,data};
})();