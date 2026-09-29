/* Quire Search Review Checkpoint — Step 63 */
(function(){
  const DECISIONS={
    broad_continue:{label:'Continue broad searching',copy:'The field is still changing enough that wider searching remains useful.'},
    targeted_continue:{label:'Continue with targeted gap searches',copy:'Broad coverage is more established, but specific gaps still need deliberate testing.'},
    pause_broad:{label:'Pause broad searching for now',copy:'Pause broad searching while continuing targeted checks, writing or analysis. This is reversible.'},
    stage_complete:{label:'Search stage complete for now',copy:'Record that this stage of searching is complete for the current project phase. This is not a universal claim of search completeness.'}
  };

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function pid(){return window.QuireStore?.getActiveProjectId?.();}
  function state(){return window.QuireStore?.getState?.()||{};}
  function setup(){return window.QuireStore?.getStudySetupData?.()||{};}
  function checkpoints(){
    const projectId=pid();
    return (state().analysisItems||[])
      .filter(item=>item.projectId===projectId&&item.kind==='search_checkpoint')
      .sort((a,b)=>String(b.payload?.checkpointDate||b.createdAt||'').localeCompare(String(a.payload?.checkpointDate||a.createdAt||'')));
  }
  function activeGaps(){
    const projectId=pid();
    return (state().analysisItems||[]).filter(item=>{
      if(item.projectId!==projectId||item.kind!=='gap_signal')return false;
      return !['set_aside','challenged'].includes(String(item.payload?.gapStatus||'emerging'));
    });
  }
  function payload(item){
    const p=item?.payload&&typeof item.payload==='object'?item.payload:{};
    return {
      decision:DECISIONS[p.decision]?p.decision:'broad_continue',
      rationale:String(p.rationale||''),
      checkpointDate:String(p.checkpointDate||''),
      nextReviewDate:String(p.nextReviewDate||''),
      gapId:String(p.gapId||''),
      notes:String(p.notes||''),
      reviewScore:Number(p.reviewScore)||0,
      maturityLabel:String(p.maturityLabel||''),
      boundary:String(p.boundary||'Researcher decision; not proof of literature saturation or universal search completeness.')
    };
  }
  function prettyDate(value){
    if(!value)return 'Not set';
    const d=new Date(value.length===10?value+'T12:00:00':value);
    return Number.isNaN(d.getTime())?'Not set':d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  }
  function signals(){
    const review=window.QuireResearchFoundation?.reviewProgress?.()||{score:0,counts:{}};
    const maturity=window.QuireResearchFoundation?.maturity?.()||{key:'broad',label:'Needs broader searching',copy:''};
    const contribution=window.QuirePaperContribution?.maturityEvidence?.()||{classified:0,counts:{newConcept:0},label:'Building evidence'};
    const runs=window.QuireStore?.listSearchRuns?.()||[];
    return {
      review,maturity,contribution,runs:runs.length,gaps:activeGaps().length,
      systematic:setup().studyType==='meta'
    };
  }

  function ensureModal(){
    if(document.getElementById('searchCheckpointModal'))return;
    const modal=document.createElement('div');
    modal.id='searchCheckpointModal';
    modal.className='modal-backdrop';
    modal.hidden=true;
    modal.innerHTML=
      '<div class="modal search-checkpoint-modal" role="dialog" aria-modal="true" aria-labelledby="searchCheckpointModalTitle">'+
        '<div class="modal-head"><div><span class="eyebrow">SEARCH REVIEW CHECKPOINT</span><h2 id="searchCheckpointModalTitle">Record the search decision</h2></div><button id="closeSearchCheckpoint" type="button">×</button></div>'+
        '<p class="search-checkpoint-intro">Use the evidence signals as context, then record your own decision and rationale. Quire does not determine when searching is academically complete.</p>'+
        '<div class="form-grid">'+
          '<label class="field wide"><span>Decision</span><select id="searchCheckpointDecision">'+Object.entries(DECISIONS).map(([v,row])=>'<option value="'+v+'">'+escapeHtml(row.label)+'</option>').join('')+'</select></label>'+
          '<label class="field"><span>Checkpoint date</span><input id="searchCheckpointDate" type="date"></label>'+
          '<label class="field"><span>Review again on (optional)</span><input id="searchCheckpointNextDate" type="date"></label>'+
          '<label class="field wide"><span>Why are you making this decision?</span><textarea id="searchCheckpointRationale" rows="4" placeholder="Use the review progress, maturity pattern, gap searches, supervisor guidance or protocol requirements as part of your reasoning."></textarea></label>'+
          '<label class="field wide"><span>Linked active gap (optional)</span><select id="searchCheckpointGap"></select></label>'+
          '<label class="field wide"><span>Additional notes</span><textarea id="searchCheckpointNotes" rows="3"></textarea></label>'+
        '</div>'+
        '<div id="searchCheckpointBoundary" class="search-checkpoint-boundary"></div>'+
        '<small id="searchCheckpointMessage" class="gap-signal-message"></small>'+
        '<div class="account-button-row"><button class="soft-btn" id="cancelSearchCheckpoint" type="button">Cancel</button><button class="primary-btn" id="saveSearchCheckpoint" type="button">Save checkpoint</button></div>'+
      '</div>';
    document.body.appendChild(modal);
    const close=()=>{modal.hidden=true;};
    document.getElementById('closeSearchCheckpoint')?.addEventListener('click',close);
    document.getElementById('cancelSearchCheckpoint')?.addEventListener('click',close);
    modal.addEventListener('click',event=>{if(event.target===modal)close();});
    document.getElementById('saveSearchCheckpoint')?.addEventListener('click',save);
  }

  function open(){
    ensureModal();
    const latest=checkpoints()[0];
    const p=payload(latest);
    document.getElementById('searchCheckpointDecision').value=latest?p.decision:'broad_continue';
    document.getElementById('searchCheckpointDate').value=new Date().toISOString().slice(0,10);
    document.getElementById('searchCheckpointNextDate').value='';
    document.getElementById('searchCheckpointRationale').value='';
    document.getElementById('searchCheckpointNotes').value='';
    const gapSelect=document.getElementById('searchCheckpointGap');
    gapSelect.innerHTML='<option value="">No linked gap</option>'+activeGaps().map(g=>'<option value="'+escapeHtml(g.id)+'">'+escapeHtml(g.title)+'</option>').join('');
    const s=signals();
    document.getElementById('searchCheckpointBoundary').innerHTML=s.systematic
      ? '<strong>Systematic-review safeguard</strong><small>For systematic or scoping reviews, protocol methods, database dates, update-search requirements and institutional guidance remain authoritative. A Quire checkpoint does not replace them.</small>'
      : '<strong>Interpretation safeguard</strong><small>A maturity signal or declining number of new concepts does not prove saturation or that no relevant literature remains.</small>';
    document.getElementById('searchCheckpointMessage').textContent='';
    document.getElementById('searchCheckpointModal').hidden=false;
  }

  function save(){
    const decision=document.getElementById('searchCheckpointDecision')?.value||'broad_continue';
    const rationale=String(document.getElementById('searchCheckpointRationale')?.value||'').trim();
    const message=document.getElementById('searchCheckpointMessage');
    if(!rationale){if(message)message.textContent='Record the rationale for this search decision.';return;}
    const s=signals();
    window.QuireStore.addAnalysisItem({
      kind:'search_checkpoint',
      title:DECISIONS[decision].label,
      status:'draft',
      payload:{
        decision,
        rationale,
        checkpointDate:document.getElementById('searchCheckpointDate')?.value||new Date().toISOString().slice(0,10),
        nextReviewDate:document.getElementById('searchCheckpointNextDate')?.value||'',
        gapId:document.getElementById('searchCheckpointGap')?.value||'',
        notes:String(document.getElementById('searchCheckpointNotes')?.value||'').trim(),
        reviewScore:s.review.score,
        maturityLabel:s.maturity.label,
        searchRuns:s.runs,
        reviewedPapers:s.review.counts?.reviewed||0,
        activeGaps:s.gaps,
        boundary:'Researcher decision; not proof of literature saturation or universal search completeness.'
      }
    });
    document.getElementById('searchCheckpointModal').hidden=true;
    render();
  }

  function render(){
    const signalsMount=document.getElementById('searchCheckpointSignals');
    const latestMount=document.getElementById('searchCheckpointLatest');
    if(!signalsMount||!latestMount||!window.QuireStore)return;
    const s=signals();
    signalsMount.innerHTML=
      '<div><strong>'+s.review.score+'%</strong><span>review-process progress</span></div>'+
      '<div><strong>'+escapeHtml(s.maturity.label)+'</strong><span>literature maturity</span></div>'+
      '<div><strong>'+s.runs+'</strong><span>logged search runs</span></div>'+
      '<div><strong>'+s.review.counts.reviewed+'</strong><span>papers reviewed in depth</span></div>'+
      '<div><strong>'+s.gaps+'</strong><span>active gap hypotheses</span></div>';

    const latest=checkpoints()[0];
    if(!latest){
      latestMount.innerHTML='<div class="search-checkpoint-empty"><strong>No search checkpoint recorded yet</strong><small>'+escapeHtml(s.maturity.copy||'Record a checkpoint when you need to explain why the next search phase is broad, targeted or paused.')+'</small></div>';
      return;
    }
    const p=payload(latest);
    const gap=activeGaps().find(g=>g.id===p.gapId);
    latestMount.innerHTML=
      '<article class="search-checkpoint-card">'+
        '<div><span class="eyebrow">LATEST RESEARCHER DECISION</span><strong>'+escapeHtml(DECISIONS[p.decision].label)+'</strong><small>'+escapeHtml(prettyDate(p.checkpointDate))+(p.nextReviewDate?' · review again '+escapeHtml(prettyDate(p.nextReviewDate)):'')+'</small></div>'+
        '<p>'+escapeHtml(p.rationale)+'</p>'+
        (gap?'<small><b>Linked gap:</b> '+escapeHtml(gap.title)+'</small>':'')+
        '<small><b>Signals at the time:</b> '+p.reviewScore+'% review progress · '+escapeHtml(p.maturityLabel)+'</small>'+
        '<small class="search-checkpoint-boundary-inline">'+escapeHtml(p.boundary)+'</small>'+
      '</article>';
  }

  function bind(){
    ensureModal();
    document.getElementById('recordSearchCheckpointBtn')?.addEventListener('click',open);
    window.addEventListener('quire:store-changed',render);
    window.addEventListener('quire:project-switched',render);
    window.addEventListener('quire:literature-maturity-updated',render);
    window.addEventListener('quire:view-changed',event=>{if(event.detail?.viewId==='searchscreen')render();});
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireSearchCheckpoint={render,open,checkpoints,signals,decisions:DECISIONS};
})();