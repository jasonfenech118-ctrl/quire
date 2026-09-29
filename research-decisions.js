/* Quire Research Decision Log — Step 62 */
(function(){
  const TYPES={
    scope:'Scope / focus',
    search:'Search strategy',
    eligibility:'Inclusion / exclusion criteria',
    methodology:'Methodology',
    analysis:'Analysis',
    supervision:'Supervisor-informed decision',
    ethics:'Ethics / governance',
    structure:'Thesis structure',
    other:'Other research decision'
  };
  let editingId=null;

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function pid(){return window.QuireStore?.getActiveProjectId?.();}
  function state(){return window.QuireStore?.getState?.()||{};}
  function decisions(){
    const projectId=pid();
    return (state().analysisItems||[])
      .filter(item=>item.projectId===projectId&&item.kind==='research_decision')
      .sort((a,b)=>String(b.payload?.decisionDate||b.updatedAt||b.createdAt||'').localeCompare(String(a.payload?.decisionDate||a.updatedAt||a.createdAt||'')));
  }
  function gaps(){
    const projectId=pid();
    return (state().analysisItems||[]).filter(item=>item.projectId===projectId&&item.kind==='gap_signal');
  }
  function revisions(){
    const projectId=pid();
    return (state().analysisItems||[]).filter(item=>item.projectId===projectId&&item.kind==='question_revision');
  }
  function payload(item){
    const p=item?.payload&&typeof item.payload==='object'?item.payload:{};
    return {
      decisionType:TYPES[p.decisionType]?p.decisionType:'other',
      decisionDate:String(p.decisionDate||''),
      rationale:String(p.rationale||''),
      evidenceTrigger:String(p.evidenceTrigger||''),
      gapId:String(p.gapId||''),
      questionRevisionId:String(p.questionRevisionId||''),
      decisionStatus:['current','superseded'].includes(p.decisionStatus)?p.decisionStatus:'current',
      authorshipBoundary:String(p.authorshipBoundary||'Researcher-recorded decision and rationale.')
    };
  }
  function prettyDate(value){
    if(!value)return 'No date';
    const d=new Date(value.length===10?value+'T12:00:00':value);
    return Number.isNaN(d.getTime())?'No date':d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  }

  function ensureModal(){
    if(document.getElementById('researchDecisionModal'))return;
    const modal=document.createElement('div');
    modal.id='researchDecisionModal';
    modal.className='modal-backdrop';
    modal.hidden=true;
    modal.innerHTML=
      '<div class="modal research-decision-modal" role="dialog" aria-modal="true" aria-labelledby="researchDecisionModalTitle">'+
        '<div class="modal-head"><div><span class="eyebrow">RESEARCH DECISION</span><h2 id="researchDecisionModalTitle">Record a research decision</h2></div><button id="closeResearchDecision" type="button">×</button></div>'+
        '<p class="research-decision-intro">Use this for decisions that materially change how the project is scoped, searched, designed, analysed or interpreted. Quire records your reasoning; it does not decide for you.</p>'+
        '<div class="form-grid">'+
          '<label class="field"><span>Decision type</span><select id="researchDecisionType">'+Object.entries(TYPES).map(([v,l])=>'<option value="'+v+'">'+escapeHtml(l)+'</option>').join('')+'</select></label>'+
          '<label class="field"><span>Date</span><input id="researchDecisionDate" type="date"></label>'+
          '<label class="field wide"><span>Decision</span><textarea id="researchDecisionText" rows="3" placeholder="What did you decide to change, keep or do next?"></textarea></label>'+
          '<label class="field wide"><span>Why?</span><textarea id="researchDecisionRationale" rows="4" placeholder="Record the reasoning behind the decision."></textarea></label>'+
          '<label class="field wide"><span>Evidence / trigger</span><textarea id="researchDecisionEvidence" rows="3" placeholder="Literature pattern, supervisor feedback, feasibility issue, methodological requirement…"></textarea></label>'+
          '<label class="field"><span>Linked possible gap (optional)</span><select id="researchDecisionGap"></select></label>'+
          '<label class="field"><span>Linked question refinement (optional)</span><select id="researchDecisionQuestion"></select></label>'+
          '<label class="field"><span>Status</span><select id="researchDecisionStatus"><option value="current">Current decision</option><option value="superseded">Superseded / replaced later</option></select></label>'+
        '</div>'+
        '<small id="researchDecisionMessage" class="gap-signal-message"></small>'+
        '<div class="account-button-row"><button class="soft-btn" id="cancelResearchDecision" type="button">Cancel</button><button class="primary-btn" id="saveResearchDecision" type="button">Save decision</button></div>'+
      '</div>';
    document.body.appendChild(modal);
    const close=()=>{modal.hidden=true;editingId=null;};
    document.getElementById('closeResearchDecision')?.addEventListener('click',close);
    document.getElementById('cancelResearchDecision')?.addEventListener('click',close);
    modal.addEventListener('click',event=>{if(event.target===modal)close();});
    document.getElementById('saveResearchDecision')?.addEventListener('click',save);
  }

  function populateLinks(){
    const gapSelect=document.getElementById('researchDecisionGap');
    const questionSelect=document.getElementById('researchDecisionQuestion');
    if(gapSelect)gapSelect.innerHTML='<option value="">No linked gap</option>'+gaps().map(g=>'<option value="'+escapeHtml(g.id)+'">'+escapeHtml(g.title)+'</option>').join('');
    if(questionSelect)questionSelect.innerHTML='<option value="">No linked question refinement</option>'+revisions().slice().reverse().map((r,i)=>'<option value="'+escapeHtml(r.id)+'">Revision '+(revisions().length-i)+' · '+escapeHtml(r.title)+'</option>').join('');
  }

  function open(id=null){
    ensureModal();editingId=id;
    populateLinks();
    const item=id?window.QuireStore.getAnalysisItem(id):null;
    const p=payload(item);
    document.getElementById('researchDecisionModalTitle').textContent=id?'Edit research decision':'Record a research decision';
    document.getElementById('researchDecisionType').value=p.decisionType;
    document.getElementById('researchDecisionDate').value=p.decisionDate||new Date().toISOString().slice(0,10);
    document.getElementById('researchDecisionText').value=item?.title||'';
    document.getElementById('researchDecisionRationale').value=p.rationale;
    document.getElementById('researchDecisionEvidence').value=p.evidenceTrigger;
    document.getElementById('researchDecisionGap').value=p.gapId;
    document.getElementById('researchDecisionQuestion').value=p.questionRevisionId;
    document.getElementById('researchDecisionStatus').value=p.decisionStatus;
    document.getElementById('researchDecisionMessage').textContent='';
    document.getElementById('researchDecisionModal').hidden=false;
    setTimeout(()=>document.getElementById('researchDecisionText')?.focus(),0);
  }

  function save(){
    const title=String(document.getElementById('researchDecisionText')?.value||'').trim();
    const rationale=String(document.getElementById('researchDecisionRationale')?.value||'').trim();
    const message=document.getElementById('researchDecisionMessage');
    if(!title){if(message)message.textContent='Describe the decision you made.';return;}
    if(!rationale){if(message)message.textContent='Record the rationale so the decision remains understandable later.';return;}
    const data={
      title,
      status:'draft',
      payload:{
        decisionType:document.getElementById('researchDecisionType')?.value||'other',
        decisionDate:document.getElementById('researchDecisionDate')?.value||new Date().toISOString().slice(0,10),
        rationale,
        evidenceTrigger:String(document.getElementById('researchDecisionEvidence')?.value||'').trim(),
        gapId:document.getElementById('researchDecisionGap')?.value||'',
        questionRevisionId:document.getElementById('researchDecisionQuestion')?.value||'',
        decisionStatus:document.getElementById('researchDecisionStatus')?.value||'current',
        authorshipBoundary:'Researcher-recorded decision and rationale.'
      }
    };
    if(editingId)window.QuireStore.updateAnalysisItem(editingId,data);
    else window.QuireStore.addAnalysisItem({kind:'research_decision',...data});
    document.getElementById('researchDecisionModal').hidden=true;
    editingId=null;
    render();
  }

  function render(){
    const summary=document.getElementById('researchDecisionSummary');
    const list=document.getElementById('researchDecisionList');
    if(!summary||!list||!window.QuireStore)return;
    const rows=decisions();
    const current=rows.filter(r=>payload(r).decisionStatus==='current').length;
    const superseded=rows.length-current;
    summary.innerHTML='<strong>'+rows.length+' recorded decision'+(rows.length===1?'':'s')+'</strong><small>'+current+' current · '+superseded+' superseded</small>';

    if(!rows.length){
      list.innerHTML='<div class="research-decision-empty">No major research decisions recorded yet. Use this when a meaningful change should remain traceable later.</div>';
      return;
    }
    const gapMap=new Map(gaps().map(g=>[g.id,g]));
    const qMap=new Map(revisions().map(r=>[r.id,r]));
    list.innerHTML=rows.map(item=>{
      const p=payload(item);
      const gap=gapMap.get(p.gapId);
      const q=qMap.get(p.questionRevisionId);
      return '<article class="research-decision-row '+(p.decisionStatus==='superseded'?'superseded':'')+'">'+
        '<div class="research-decision-meta"><span>'+escapeHtml(TYPES[p.decisionType])+'</span><small>'+escapeHtml(prettyDate(p.decisionDate||item.createdAt))+'</small></div>'+
        '<div><strong>'+escapeHtml(item.title)+'</strong><p>'+escapeHtml(p.rationale)+'</p>'+
          (p.evidenceTrigger?'<small><b>Trigger:</b> '+escapeHtml(p.evidenceTrigger)+'</small>':'')+
          (gap?'<small><b>Gap:</b> '+escapeHtml(gap.title)+'</small>':'')+
          (q?'<small><b>Question version:</b> '+escapeHtml(q.title)+'</small>':'')+
        '</div>'+
        '<button type="button" data-edit-research-decision="'+escapeHtml(item.id)+'">Edit</button>'+
      '</article>';
    }).join('');
    list.querySelectorAll('[data-edit-research-decision]').forEach(btn=>btn.addEventListener('click',()=>open(btn.dataset.editResearchDecision)));
  }

  function bind(){
    ensureModal();
    document.getElementById('addResearchDecisionBtn')?.addEventListener('click',()=>open());
    window.addEventListener('quire:store-changed',render);
    window.addEventListener('quire:project-switched',render);
    window.addEventListener('quire:view-changed',event=>{if(event.detail?.viewId==='setup')render();});
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireResearchDecisions={render,open,decisions,types:TYPES};
})();