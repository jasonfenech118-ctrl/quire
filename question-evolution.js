/* Quire Research Question Evolution — Step 59 */
(function(){
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function pid(){return window.QuireStore?.getActiveProjectId?.();}
  function project(){return window.QuireStore?.getActiveProject?.()||{};}
  function revisions(){
    const state=window.QuireStore?.getState?.()||{};
    const projectId=pid();
    return (state.analysisItems||[])
      .filter(item=>item.projectId===projectId&&item.kind==='question_revision')
      .sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
  }
  function gaps(){
    const state=window.QuireStore?.getState?.()||{};
    const projectId=pid();
    return (state.analysisItems||[]).filter(item=>item.projectId===projectId&&item.kind==='gap_signal');
  }
  function payload(item){
    const p=item?.payload&&typeof item.payload==='object'?item.payload:{};
    return {
      previousQuestion:String(p.previousQuestion||''),
      newQuestion:String(p.newQuestion||item?.title||''),
      rationale:String(p.rationale||''),
      evidenceBasis:String(p.evidenceBasis||''),
      gapId:String(p.gapId||''),
      boundary:String(p.boundary||'Researcher-recorded refinement; Quire does not determine whether the question is academically final.')
    };
  }
  function prettyDate(value){
    if(!value)return '';
    const d=new Date(value);
    return Number.isNaN(d.getTime())?'':d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  }
  function ensureModal(){
    if(document.getElementById('questionEvolutionModal'))return;
    const modal=document.createElement('div');
    modal.id='questionEvolutionModal';
    modal.className='modal-backdrop';
    modal.hidden=true;
    modal.innerHTML=
      '<div class="modal question-evolution-modal" role="dialog" aria-modal="true" aria-labelledby="questionEvolutionModalTitle">'+
        '<div class="modal-head"><div><span class="eyebrow">QUESTION EVOLUTION</span><h2 id="questionEvolutionModalTitle">Record a research-question refinement</h2></div><button id="closeQuestionEvolutionModal" type="button">×</button></div>'+
        '<p class="question-evolution-intro">Record a meaningful change in research direction. This is a provenance note about your reasoning, not an automatic judgement that the new wording is better.</p>'+
        '<div class="question-version-preview"><span>PREVIOUS SAVED QUESTION</span><p id="questionEvolutionPrevious"></p></div>'+
        '<div class="form-grid">'+
          '<label class="field wide"><span>New working research question</span><textarea id="questionEvolutionNew" rows="4" placeholder="Enter the refined working question"></textarea></label>'+
          '<label class="field wide"><span>What changed?</span><textarea id="questionEvolutionRationale" rows="3" placeholder="Scope narrowed, population changed, setting clarified, outcome changed, concept reframed…"></textarea></label>'+
          '<label class="field wide"><span>Why did the literature lead to this change?</span><textarea id="questionEvolutionEvidence" rows="4" placeholder="Summarise the evidence pattern, limitation, disagreement or absence that prompted the refinement."></textarea></label>'+
          '<label class="field wide"><span>Linked possible gap (optional)</span><select id="questionEvolutionGap"></select></label>'+
        '</div>'+
        '<small id="questionEvolutionMessage" class="gap-signal-message"></small>'+
        '<div class="account-button-row"><button class="soft-btn" id="cancelQuestionEvolution" type="button">Cancel</button><button class="primary-btn" id="saveQuestionEvolution" type="button">Save refinement</button></div>'+
      '</div>';
    document.body.appendChild(modal);
    const close=()=>{modal.hidden=true;};
    document.getElementById('closeQuestionEvolutionModal')?.addEventListener('click',close);
    document.getElementById('cancelQuestionEvolution')?.addEventListener('click',close);
    modal.addEventListener('click',event=>{if(event.target===modal)close();});
    document.getElementById('saveQuestionEvolution')?.addEventListener('click',saveRevision);
  }

  function openModal(){
    ensureModal();
    const current=String(project().researchQuestion||'').trim();
    const field=document.getElementById('researchQuestion');
    const draft=String(field?.value||current).trim();
    document.getElementById('questionEvolutionPrevious').textContent=current||'No working question has been formally saved yet.';
    document.getElementById('questionEvolutionNew').value=draft||current;
    document.getElementById('questionEvolutionRationale').value='';
    document.getElementById('questionEvolutionEvidence').value='';
    document.getElementById('questionEvolutionMessage').textContent='';
    const select=document.getElementById('questionEvolutionGap');
    if(select){
      select.innerHTML='<option value="">No linked gap</option>'+gaps().map(g=>'<option value="'+escapeHtml(g.id)+'">'+escapeHtml(g.title)+'</option>').join('');
    }
    document.getElementById('questionEvolutionModal').hidden=false;
    setTimeout(()=>document.getElementById('questionEvolutionNew')?.focus(),0);
  }

  function saveRevision(){
    const current=String(project().researchQuestion||'').trim();
    const next=String(document.getElementById('questionEvolutionNew')?.value||'').trim();
    const rationale=String(document.getElementById('questionEvolutionRationale')?.value||'').trim();
    const evidenceBasis=String(document.getElementById('questionEvolutionEvidence')?.value||'').trim();
    const gapId=document.getElementById('questionEvolutionGap')?.value||'';
    const message=document.getElementById('questionEvolutionMessage');
    if(!next){
      if(message)message.textContent='Enter the refined working question.';
      return;
    }
    if(current&&next===current&&!rationale&&!evidenceBasis){
      if(message)message.textContent='The wording has not changed. Add the reason for recording this as a meaningful checkpoint.';
      return;
    }

    window.QuireStore.addAnalysisItem({
      kind:'question_revision',
      title:next,
      status:'draft',
      payload:{
        previousQuestion:current,
        newQuestion:next,
        rationale,
        evidenceBasis,
        gapId,
        boundary:'Researcher-recorded refinement; Quire does not determine whether the question is academically final.'
      }
    });
    window.QuireStore.updateProject(pid(),{researchQuestion:next});
    const field=document.getElementById('researchQuestion');
    if(field)field.value=next;
    document.getElementById('questionEvolutionModal').hidden=true;
    render();
    window.dispatchEvent(new CustomEvent('quire:question-refined',{detail:{projectId:pid(),question:next,gapId}}));
  }

  function render(){
    const timeline=document.getElementById('questionEvolutionTimeline');
    const status=document.getElementById('questionEvolutionStatus');
    if(!timeline||!status||!window.QuireStore)return;
    const rows=revisions();
    const current=String(project().researchQuestion||'').trim();
    const draft=String(document.getElementById('researchQuestion')?.value||'').trim();
    const last=rows[rows.length-1];

    if(!rows.length){
      status.innerHTML='<strong>No refinement history yet</strong><small>The current question can stay provisional while you build the literature base. Record a refinement only when the evidence genuinely changes the direction.</small>';
      timeline.innerHTML='<div class="question-evolution-empty">Your question history will appear here as the literature sharpens the project.</div>';
      return;
    }

    const lastQuestion=payload(last).newQuestion;
    if(draft&&draft!==lastQuestion){
      status.innerHTML='<strong>Current wording differs from the last recorded refinement</strong><small>If this difference reflects a genuine evidence-led change in direction, record it so the reasoning is not lost.</small>';
    }else{
      status.innerHTML='<strong>'+rows.length+' recorded refinement'+(rows.length===1?'':'s')+'</strong><small>Latest working question: '+escapeHtml(current||lastQuestion)+'</small>';
    }

    const gapMap=new Map(gaps().map(g=>[g.id,g]));
    timeline.innerHTML=rows.slice().reverse().map((item,index)=>{
      const p=payload(item);
      const version=rows.length-index;
      const gap=gapMap.get(p.gapId);
      return '<article class="question-evolution-entry">'+
        '<div class="question-version"><span>VERSION '+version+'</span><small>'+escapeHtml(prettyDate(item.createdAt))+'</small></div>'+
        '<div><strong>'+escapeHtml(p.newQuestion)+'</strong>'+
          (p.previousQuestion?'<small class="question-previous">Previous: '+escapeHtml(p.previousQuestion)+'</small>':'<small class="question-previous">First formally recorded working question</small>')+
          (p.rationale?'<p><b>What changed:</b> '+escapeHtml(p.rationale)+'</p>':'')+
          (p.evidenceBasis?'<p><b>Literature rationale:</b> '+escapeHtml(p.evidenceBasis)+'</p>':'')+
          (gap?'<button type="button" data-question-gap="'+escapeHtml(gap.id)+'">Linked gap: '+escapeHtml(gap.title)+' →</button>':'')+
        '</div>'+
      '</article>';
    }).join('');

    timeline.querySelectorAll('[data-question-gap]').forEach(btn=>btn.addEventListener('click',()=>{
      window.showView?.('synthesis');
      setTimeout(()=>window.QuireGapExplorer?.openEdit?.(btn.dataset.questionGap),0);
    }));
  }

  function bind(){
    ensureModal();
    document.getElementById('recordQuestionRefinementBtn')?.addEventListener('click',openModal);
    document.getElementById('researchQuestion')?.addEventListener('input',render);
    window.addEventListener('quire:store-changed',render);
    window.addEventListener('quire:project-switched',render);
    window.addEventListener('quire:view-changed',event=>{if(event.detail?.viewId==='setup')render();});
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireQuestionEvolution={render,openModal,revisions};
})();