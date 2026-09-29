/* Quire Working Contribution Builder — Step 60 */
(function(){
  const TYPES={
    contextual:'Context / setting contribution',
    population:'Population-specific contribution',
    methodological:'Methodological contribution',
    implementation:'Practice / implementation contribution',
    conceptual:'Conceptual contribution',
    replication:'Replication / validation contribution',
    evidence:'Additional empirical evidence',
    other:'Other / researcher-defined'
  };

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function pid(){return window.QuireStore?.getActiveProjectId?.();}
  function state(){return window.QuireStore?.getState?.()||{};}
  function project(){return window.QuireStore?.getActiveProject?.()||{};}
  function gaps(){
    const projectId=pid();
    return (state().analysisItems||[]).filter(item=>item.projectId===projectId&&item.kind==='gap_signal');
  }
  function contributions(){
    const projectId=pid();
    return (state().analysisItems||[])
      .filter(item=>item.projectId===projectId&&item.kind==='contribution_statement')
      .sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
  }
  function gapPayload(gap){
    const p=gap?.payload&&typeof gap.payload==='object'?gap.payload:{};
    return {
      gapStatus:String(p.gapStatus||'emerging'),
      observation:String(p.observation||''),
      evidence:String(p.evidence||''),
      nextSearch:String(p.nextSearch||'')
    };
  }
  function contributionPayload(item){
    const p=item?.payload&&typeof item.payload==='object'?item.payload:{};
    return {
      gapId:String(p.gapId||''),
      questionAtSave:String(p.questionAtSave||''),
      contributionType:String(p.contributionType||'other'),
      existingKnowledge:String(p.existingKnowledge||''),
      unresolvedIssue:String(p.unresolvedIssue||''),
      thesisResponse:String(p.thesisResponse||''),
      significance:String(p.significance||''),
      boundary:String(p.boundary||''),
      statement:String(p.statement||''),
      gapStatusAtSave:String(p.gapStatusAtSave||'')
    };
  }
  function gapStatusLabel(status){
    return ({
      emerging:'Emerging gap',
      testing:'Gap being tested',
      narrowed:'Gap narrowed by further reading',
      supported:'Supported by current review',
      challenged:'Gap challenged',
      set_aside:'Gap set aside'
    })[status]||'Gap status not set';
  }

  function readiness(gap){
    if(!gap)return {key:'none',label:'No gap selected',copy:'Record and test a possible gap before defining what the thesis may contribute.'};
    const status=gapPayload(gap).gapStatus;
    if(status==='supported')return {key:'current_support',label:'Grounded in the current review',copy:'The linked gap is supported by your present literature review. The contribution remains a working research claim, not an established outcome.'};
    if(status==='narrowed')return {key:'provisional',label:'Provisional contribution',copy:'The gap has been narrowed, but further searching may still change the contribution.'};
    if(status==='testing'||status==='emerging')return {key:'provisional',label:'Provisional contribution',copy:'The linked gap is still being tested. Treat the contribution as a hypothesis about what the thesis may add.'};
    if(status==='challenged')return {key:'caution',label:'Contribution needs reconsideration',copy:'Further literature has challenged the linked gap. Revisit the contribution before relying on it.'};
    if(status==='set_aside')return {key:'caution',label:'Linked gap is set aside',copy:'This contribution is tied to a gap you are no longer actively using.'};
    return {key:'provisional',label:'Provisional contribution',copy:'Keep testing the gap and refining what the thesis may add.'};
  }

  function ensureModal(){
    if(document.getElementById('contributionBuilderModal'))return;
    const modal=document.createElement('div');
    modal.id='contributionBuilderModal';
    modal.className='modal-backdrop';
    modal.hidden=true;
    modal.innerHTML=
      '<div class="modal contribution-builder-modal" role="dialog" aria-modal="true" aria-labelledby="contributionBuilderModalTitle">'+
        '<div class="modal-head"><div><span class="eyebrow">WORKING CONTRIBUTION</span><h2 id="contributionBuilderModalTitle">Define what the thesis may add</h2></div><button id="closeContributionBuilder" type="button">×</button></div>'+
        '<p class="contribution-builder-intro">Build this from your own reading and research plan. Quire can arrange your wording, but it does not decide that a contribution is novel, important or proven.</p>'+
        '<div class="form-grid">'+
          '<label class="field wide"><span>Linked possible gap</span><select id="contributionGap"></select></label>'+
          '<label class="field"><span>Contribution type</span><select id="contributionType">'+
            Object.entries(TYPES).map(([value,label])=>'<option value="'+value+'">'+escapeHtml(label)+'</option>').join('')+
          '</select></label>'+
          '<label class="field wide"><span>What does the existing literature already cover?</span><textarea id="contributionExisting" rows="3" placeholder="Summarise what is already reasonably established in your current review."></textarea></label>'+
          '<label class="field wide"><span>What remains unresolved?</span><textarea id="contributionUnresolved" rows="3" placeholder="State the specific issue the thesis is responding to."></textarea></label>'+
          '<label class="field wide"><span>What will this thesis actually do?</span><textarea id="contributionResponse" rows="3" placeholder="Describe the study, comparison, population, context, method or analysis you will undertake."></textarea></label>'+
          '<label class="field wide"><span>What could that add to knowledge or practice?</span><textarea id="contributionSignificance" rows="3" placeholder="Describe the intended contribution in your own words."></textarea></label>'+
          '<label class="field wide"><span>Boundary — what will you NOT claim?</span><textarea id="contributionBoundary" rows="2" placeholder="e.g. This study will not establish causality or represent all stoma populations."></textarea></label>'+
        '</div>'+
        '<div class="contribution-draft-box">'+
          '<div><span class="eyebrow">WORKING STATEMENT</span><button class="text-btn" id="buildContributionStatement" type="button">Draft from my fields</button></div>'+
          '<textarea id="contributionStatement" rows="5" placeholder="Your editable contribution statement will appear here."></textarea>'+
          '<small>Check and edit this wording yourself before saving. It should describe an intended contribution, not claim a finding before the study is done.</small>'+
        '</div>'+
        '<small id="contributionBuilderMessage" class="gap-signal-message"></small>'+
        '<div class="account-button-row"><button class="soft-btn" id="cancelContributionBuilder" type="button">Cancel</button><button class="primary-btn" id="saveContributionBuilder" type="button">Save working contribution</button></div>'+
      '</div>';
    document.body.appendChild(modal);
    const close=()=>{modal.hidden=true;};
    document.getElementById('closeContributionBuilder')?.addEventListener('click',close);
    document.getElementById('cancelContributionBuilder')?.addEventListener('click',close);
    modal.addEventListener('click',event=>{if(event.target===modal)close();});
    document.getElementById('buildContributionStatement')?.addEventListener('click',buildStatement);
    document.getElementById('saveContributionBuilder')?.addEventListener('click',save);
    document.getElementById('contributionGap')?.addEventListener('change',prefillFromGap);
  }

  function selectedGap(){
    const id=document.getElementById('contributionGap')?.value||'';
    return gaps().find(g=>g.id===id)||null;
  }

  function prefillFromGap(){
    const gap=selectedGap();if(!gap)return;
    const p=gapPayload(gap);
    const unresolved=document.getElementById('contributionUnresolved');
    if(unresolved&&!unresolved.value.trim())unresolved.value=p.observation||gap.title||'';
    const existing=document.getElementById('contributionExisting');
    if(existing&&!existing.value.trim()&&p.evidence)existing.value=p.evidence;
  }

  function buildStatement(){
    const gap=selectedGap();
    const unresolved=String(document.getElementById('contributionUnresolved')?.value||'').trim();
    const response=String(document.getElementById('contributionResponse')?.value||'').trim();
    const significance=String(document.getElementById('contributionSignificance')?.value||'').trim();
    const boundary=String(document.getElementById('contributionBoundary')?.value||'').trim();
    const parts=[];
    if(unresolved&&response)parts.push('In response to '+unresolved.replace(/[.]+$/,'')+', this thesis will '+response.replace(/^[Tt]his thesis (?:will )?/,'').replace(/[.]+$/,'')+'.');
    else if(response)parts.push('This thesis will '+response.replace(/^[Tt]his thesis (?:will )?/,'').replace(/[.]+$/,'')+'.');
    if(significance)parts.push('The intended contribution is '+significance.replace(/[.]+$/,'')+'.');
    if(gap&&!unresolved)parts.push('This work responds to the currently identified gap concerning '+String(gap.title||'').replace(/[.]+$/,'')+'.');
    if(boundary)parts.push('This statement is bounded by the following limitation: '+boundary.replace(/[.]+$/,'')+'.');
    document.getElementById('contributionStatement').value=parts.join(' ');
  }

  function open(){
    ensureModal();
    const rows=gaps().filter(g=>gapPayload(g).gapStatus!=='set_aside');
    const select=document.getElementById('contributionGap');
    select.innerHTML='<option value="">Select a possible gap</option>'+rows.map(g=>'<option value="'+escapeHtml(g.id)+'">'+escapeHtml(g.title)+' · '+escapeHtml(gapStatusLabel(gapPayload(g).gapStatus))+'</option>').join('');
    const latest=contributions()[0];
    const p=contributionPayload(latest);
    if(latest&&rows.some(g=>g.id===p.gapId))select.value=p.gapId;
    document.getElementById('contributionType').value=TYPES[p.contributionType]?p.contributionType:'other';
    document.getElementById('contributionExisting').value=p.existingKnowledge;
    document.getElementById('contributionUnresolved').value=p.unresolvedIssue;
    document.getElementById('contributionResponse').value=p.thesisResponse;
    document.getElementById('contributionSignificance').value=p.significance;
    document.getElementById('contributionBoundary').value=p.boundary;
    document.getElementById('contributionStatement').value=p.statement;
    document.getElementById('contributionBuilderMessage').textContent='';
    document.getElementById('contributionBuilderModal').hidden=false;
    if(!latest&&rows.length){select.value=rows[0].id;prefillFromGap();}
  }

  function save(){
    const gap=selectedGap();
    const message=document.getElementById('contributionBuilderMessage');
    if(!gap){if(message)message.textContent='Choose the possible gap this contribution responds to.';return;}
    const response=String(document.getElementById('contributionResponse')?.value||'').trim();
    const significance=String(document.getElementById('contributionSignificance')?.value||'').trim();
    let statement=String(document.getElementById('contributionStatement')?.value||'').trim();
    if(!response){if(message)message.textContent='Describe what the thesis will actually do.';return;}
    if(!statement){buildStatement();statement=String(document.getElementById('contributionStatement')?.value||'').trim();}
    const p={
      gapId:gap.id,
      questionAtSave:String(project().researchQuestion||''),
      contributionType:document.getElementById('contributionType')?.value||'other',
      existingKnowledge:String(document.getElementById('contributionExisting')?.value||'').trim(),
      unresolvedIssue:String(document.getElementById('contributionUnresolved')?.value||'').trim(),
      thesisResponse:response,
      significance,
      boundary:String(document.getElementById('contributionBoundary')?.value||'').trim(),
      statement,
      gapStatusAtSave:gapPayload(gap).gapStatus,
      authorshipBoundary:'Researcher-authored working contribution. Quire structures supplied wording and does not establish novelty.'
    };
    const latest=contributions()[0];
    if(latest)window.QuireStore.updateAnalysisItem(latest.id,{title:'Working contribution',payload:p,status:'draft'});
    else window.QuireStore.addAnalysisItem({kind:'contribution_statement',title:'Working contribution',payload:p,status:'draft'});
    document.getElementById('contributionBuilderModal').hidden=true;
    render();
  }

  function render(){
    const status=document.getElementById('contributionBuilderStatus');
    const output=document.getElementById('contributionBuilderOutput');
    const button=document.getElementById('openContributionBuilderBtn');
    if(!status||!output||!button||!window.QuireStore)return;
    const gapRows=gaps().filter(g=>gapPayload(g).gapStatus!=='set_aside');
    button.disabled=!gapRows.length;
    if(!gapRows.length){
      status.innerHTML='<strong>Contribution not defined yet</strong><small>First identify and test at least one possible gap in the literature.</small>';
      output.innerHTML='<div class="contribution-empty">A contribution should emerge from the evidence base—not be invented at the start of the project.</div>';
      return;
    }
    const latest=contributions()[0];
    if(!latest){
      const best=gapRows.find(g=>gapPayload(g).gapStatus==='supported')||gapRows[0];
      const ready=readiness(best);
      status.innerHTML='<strong>'+escapeHtml(ready.label)+'</strong><small>'+escapeHtml(ready.copy)+'</small>';
      output.innerHTML='<div class="contribution-empty">You have a gap hypothesis but no working contribution statement yet. Define what your thesis will actually do in response to it.</div>';
      return;
    }
    const p=contributionPayload(latest);
    const gap=gapRows.find(g=>g.id===p.gapId)||gaps().find(g=>g.id===p.gapId)||null;
    const ready=readiness(gap);
    status.innerHTML='<strong>'+escapeHtml(ready.label)+'</strong><small>'+escapeHtml(ready.copy)+'</small>';
    output.innerHTML=
      '<article class="contribution-card readiness-'+escapeHtml(ready.key)+'">'+
        '<div class="contribution-card-head"><span>'+escapeHtml(TYPES[p.contributionType]||TYPES.other)+'</span><small>'+escapeHtml(gap?gapStatusLabel(gapPayload(gap).gapStatus):'Linked gap unavailable')+'</small></div>'+
        '<blockquote>'+escapeHtml(p.statement||'No working statement saved yet.')+'</blockquote>'+
        '<div class="contribution-details">'+
          (p.unresolvedIssue?'<p><b>Unresolved issue:</b> '+escapeHtml(p.unresolvedIssue)+'</p>':'')+
          (p.thesisResponse?'<p><b>This thesis will:</b> '+escapeHtml(p.thesisResponse)+'</p>':'')+
          (p.significance?'<p><b>Intended contribution:</b> '+escapeHtml(p.significance)+'</p>':'')+
          (p.boundary?'<p><b>Boundary:</b> '+escapeHtml(p.boundary)+'</p>':'')+
        '</div>'+
        '<small class="contribution-authorship-note">Researcher-authored working contribution · Quire does not certify novelty.</small>'+
      '</article>';
  }

  function bind(){
    ensureModal();
    document.getElementById('openContributionBuilderBtn')?.addEventListener('click',open);
    window.addEventListener('quire:store-changed',render);
    window.addEventListener('quire:project-switched',render);
    window.addEventListener('quire:view-changed',event=>{if(event.detail?.viewId==='synthesis')render();});
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireContributionBuilder={render,open,readiness,contributions};
})();