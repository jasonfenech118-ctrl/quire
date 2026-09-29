/* Quire Supervisor & Revision Workflow — Step 20 */
(function(){
  let activeRoundFilter='all';
  let feedbackPrefill=null;
  let selectedTextBuffer='';

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function pretty(value){
    if(!value)return '—';
    const d=new Date(String(value).length===10?value+'T12:00:00':value);
    return Number.isNaN(d.getTime())?'—':d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  }
  function state(){return window.QuireStore.getState();}
  function chapters(){return window.QuireStore.listChapters();}
  function sections(){const p=window.QuireStore.getActiveProjectId();return state().sections.filter(s=>s.projectId===p);}
  function rounds(){return window.QuireStore.listReviewRounds();}
  function feedback(){return window.QuireStore.listFeedback();}
  function versions(){return window.QuireStore.listSectionVersions();}

  function roundStatusLabel(status){
    return ({
      draft:'Draft',
      awaiting_feedback:'Awaiting feedback',
      feedback_received:'Feedback received',
      revising:'Revising',
      complete:'Complete'
    })[status]||status;
  }

  function feedbackStatusLabel(status){
    return ({open:'Open',in_progress:'In progress',resolved:'Resolved'})[status]||status;
  }

  function renderStats(){
    const items=feedback();
    const rs=rounds();
    const values={
      supervisionOpen:items.filter(x=>x.status==='open').length,
      supervisionProgress:items.filter(x=>x.status==='in_progress').length,
      supervisionResolved:items.filter(x=>x.status==='resolved').length,
      supervisionRounds:rs.length,
      supervisionVersions:versions().length
    };
    Object.entries(values).forEach(([id,value])=>{const node=document.getElementById(id);if(node)node.textContent=String(value);});
  }

  function renderRounds(){
    const mount=document.getElementById('reviewRoundsList');
    if(!mount)return;
    const rows=rounds();
    if(!rows.length){
      mount.innerHTML='<div class="supervision-empty"><strong>No review rounds yet</strong><small>Create a review round when you send a chapter or draft to your supervisor. Quire will freeze section snapshots automatically.</small></div>';
      return;
    }
    mount.innerHTML=rows.map(round=>{
      const items=feedback().filter(f=>f.reviewRoundId===round.id);
      const open=items.filter(f=>f.status!=='resolved').length;
      const versionCount=versions().filter(v=>v.reviewRoundId===round.id).length;
      return '<article class="review-round-card '+(activeRoundFilter===round.id?'selected':'')+'" data-review-round="'+round.id+'">'+
        '<div class="review-round-top"><span class="review-round-status status-'+round.status+'">'+escapeHtml(roundStatusLabel(round.status))+'</span>'+
        '<small>'+escapeHtml(pretty(round.submittedAt))+'</small></div>'+
        '<h3>'+escapeHtml(round.title)+'</h3>'+
        '<p>'+escapeHtml(round.reviewerName||'Reviewer not named')+(round.responseDueDate?' · response due '+escapeHtml(pretty(round.responseDueDate)):'')+'</p>'+
        '<div class="review-round-counts"><span>'+versionCount+' snapshots</span><span>'+open+' open feedback</span></div>'+
        '<select data-round-status="'+round.id+'">'+
          ['draft','awaiting_feedback','feedback_received','revising','complete'].map(status=>'<option value="'+status+'" '+(round.status===status?'selected':'')+'>'+roundStatusLabel(status)+'</option>').join('')+
        '</select>'+
      '</article>';
    }).join('');

    mount.querySelectorAll('[data-review-round]').forEach(card=>card.addEventListener('click',e=>{
      if(e.target.closest('select'))return;
      activeRoundFilter=activeRoundFilter===card.dataset.reviewRound?'all':card.dataset.reviewRound;
      renderRounds();renderFeedback();
    }));
    mount.querySelectorAll('[data-round-status]').forEach(select=>select.addEventListener('change',()=>{
      window.QuireStore.updateReviewRound(select.dataset.roundStatus,{status:select.value});
      render();
    }));
  }

  function targetLabel(item){
    const chapter=chapters().find(c=>c.id===item.chapterId);
    const section=sections().find(s=>s.id===item.sectionId);
    if(section)return (chapter?.number?chapter.number+' · ':'')+(chapter?.title||'Chapter')+' → '+section.title;
    if(chapter)return (chapter.number?chapter.number+' · ':'')+chapter.title;
    return 'Project-level feedback';
  }

  function renderFeedback(){
    const mount=document.getElementById('supervisorFeedbackList');
    if(!mount)return;
    let rows=feedback();
    if(activeRoundFilter!=='all')rows=rows.filter(f=>f.reviewRoundId===activeRoundFilter);

    const statusFilter=document.getElementById('feedbackStatusFilter')?.value||'active';
    if(statusFilter==='active')rows=rows.filter(f=>f.status!=='resolved');
    else if(statusFilter!=='all')rows=rows.filter(f=>f.status===statusFilter);

    document.getElementById('feedbackQueueCount').textContent=rows.length+' '+(rows.length===1?'item':'items');

    if(!rows.length){
      mount.innerHTML='<div class="supervision-empty"><strong>No feedback in this view</strong><small>Record supervisor comments as separate revision items so they never overwrite the manuscript.</small></div>';
      return;
    }

    mount.innerHTML=rows.map(item=>
      '<article class="supervisor-feedback-card priority-'+item.priority+' status-'+item.status+'">'+
        '<div class="feedback-card-head"><div><span class="feedback-category">'+escapeHtml(item.category)+'</span><span class="feedback-priority">'+escapeHtml(item.priority)+'</span></div><small>'+escapeHtml(pretty(item.createdAt))+'</small></div>'+
        '<strong>'+escapeHtml(targetLabel(item))+'</strong>'+
        (item.selectedText?'<blockquote>“'+escapeHtml(item.selectedText)+'”</blockquote>':'')+
        '<p>'+escapeHtml(item.comment)+'</p>'+
        (item.researcherResponse?'<div class="researcher-response"><span>Your response</span><p>'+escapeHtml(item.researcherResponse)+'</p></div>':'')+
        '<div class="feedback-actions">'+
          (item.sectionId?'<button type="button" data-feedback-open-section="'+item.sectionId+'">Open section</button>':'')+
          (item.status==='open'?'<button type="button" data-feedback-progress="'+item.id+'">Start revision</button>':'')+
          (item.status==='in_progress'?'<button type="button" data-feedback-resolve="'+item.id+'">Resolve</button>':'')+
          (item.status==='resolved'?'<button type="button" data-feedback-reopen="'+item.id+'">Reopen</button>':'')+
          '<button type="button" data-feedback-response="'+item.id+'">Add response</button>'+
        '</div>'+
      '</article>'
    ).join('');

    mount.querySelectorAll('[data-feedback-open-section]').forEach(btn=>btn.addEventListener('click',()=>{
      window.QuireChapterEditor?.openSection?.(btn.dataset.feedbackOpenSection);
      window.showView?.('chapters');
    }));
    mount.querySelectorAll('[data-feedback-progress]').forEach(btn=>btn.addEventListener('click',()=>updateStatus(btn.dataset.feedbackProgress,'in_progress')));
    mount.querySelectorAll('[data-feedback-resolve]').forEach(btn=>btn.addEventListener('click',()=>updateStatus(btn.dataset.feedbackResolve,'resolved')));
    mount.querySelectorAll('[data-feedback-reopen]').forEach(btn=>btn.addEventListener('click',()=>updateStatus(btn.dataset.feedbackReopen,'open')));
    mount.querySelectorAll('[data-feedback-response]').forEach(btn=>btn.addEventListener('click',()=>openResponse(btn.dataset.feedbackResponse)));
  }

  function updateStatus(id,status){
    window.QuireStore.updateFeedback(id,{status});
    render();
  }

  function openResponse(id){
    const item=feedback().find(f=>f.id===id);
    if(!item)return;
    const response=prompt('Add your response or revision note:',item.researcherResponse||'');
    if(response===null)return;
    window.QuireStore.updateFeedback(id,{researcherResponse:response});
    render();
  }

  function renderSectionFeedbackBadge(){
    const current=window.QuireChapterEditor?.getActive?.();
    const items=current?.sectionId?window.QuireStore.listFeedback({sectionId:current.sectionId}):[];
    const open=items.filter(f=>f.status!=='resolved').length;
    const badge=document.getElementById('sectionFeedbackBadge');
    if(badge)badge.textContent=open?String(open):'';
    const button=document.getElementById('openSectionFeedbackBtn');
    if(button)button.classList.toggle('has-feedback',open>0);
  }

  function currentSelectedText(){
    const editor=document.getElementById('liveSectionEditor');
    const selection=window.getSelection?.();
    if(!editor||!selection||!selection.rangeCount)return '';
    const range=selection.getRangeAt(0);
    if(!editor.contains(range.commonAncestorContainer))return '';
    return String(selection.toString()||'').trim().slice(0,1000);
  }

  function fillFeedbackTargets(prefill={}){
    const chapterSelect=document.getElementById('feedbackChapter');
    const sectionSelect=document.getElementById('feedbackSection');
    const roundSelect=document.getElementById('feedbackRound');

    roundSelect.innerHTML='<option value="">No review round</option>'+rounds().map(r=>'<option value="'+r.id+'">'+escapeHtml(r.title)+'</option>').join('');
    chapterSelect.innerHTML='<option value="">Project-level</option>'+chapters().map(c=>'<option value="'+c.id+'">'+escapeHtml((c.number?c.number+' · ':'')+c.title)+'</option>').join('');

    const chapterId=prefill.chapterId||'';
    if(chapterId)chapterSelect.value=chapterId;
    updateFeedbackSections(chapterSelect.value,prefill.sectionId||'');

    if(prefill.reviewRoundId)roundSelect.value=prefill.reviewRoundId;
  }

  function updateFeedbackSections(chapterId,selected=''){
    const select=document.getElementById('feedbackSection');
    const rows=chapterId?sections().filter(s=>s.chapterId===chapterId):[];
    select.innerHTML='<option value="">Whole chapter / project</option>'+rows.map(s=>'<option value="'+s.id+'">'+escapeHtml((s.number?s.number+' · ':'')+s.title)+'</option>').join('');
    if(selected)select.value=selected;
  }

  function openFeedbackModal(prefill={}){
    feedbackPrefill=prefill;
    fillFeedbackTargets(prefill);
    document.getElementById('feedbackReviewer').value=prefill.reviewerName||'';
    document.getElementById('feedbackCategory').value=prefill.category||'content';
    document.getElementById('feedbackPriority').value=prefill.priority||'normal';
    document.getElementById('feedbackComment').value='';
    document.getElementById('feedbackSelectedText').value=prefill.selectedText||'';
    document.getElementById('feedbackModal').hidden=false;
    setTimeout(()=>document.getElementById('feedbackComment')?.focus(),0);
  }

  function openFeedbackForCurrentSection(){
    const current=window.QuireChapterEditor?.getActive?.()||{};
    const selectedText=selectedTextBuffer||currentSelectedText();
    selectedTextBuffer='';
    const recentRound=rounds().find(r=>r.status!=='complete');
    openFeedbackModal({
      chapterId:current.chapterId,
      sectionId:current.sectionId,
      selectedText,
      reviewRoundId:recentRound?.id||'',
      reviewerName:recentRound?.reviewerName||''
    });
  }

  function saveFeedback(){
    const chapterId=document.getElementById('feedbackChapter').value||null;
    const sectionId=document.getElementById('feedbackSection').value||null;
    const comment=document.getElementById('feedbackComment').value.trim();
    if(!comment){
      document.getElementById('feedbackModalMessage').textContent='Enter the supervisor feedback.';
      return;
    }
    const roundId=document.getElementById('feedbackRound').value||null;
    const row=window.QuireStore.addFeedback({
      reviewRoundId:roundId,chapterId,sectionId,
      reviewerName:document.getElementById('feedbackReviewer').value.trim(),
      category:document.getElementById('feedbackCategory').value,
      priority:document.getElementById('feedbackPriority').value,
      selectedText:document.getElementById('feedbackSelectedText').value.trim(),
      comment
    });
    if(roundId){
      const round=rounds().find(r=>r.id===roundId);
      if(round&&round.status==='awaiting_feedback') window.QuireStore.updateReviewRound(roundId,{status:'feedback_received'});
    }
    document.getElementById('feedbackModal').hidden=true;
    document.getElementById('feedbackModalMessage').textContent='';
    render();
    window.dispatchEvent(new CustomEvent('quire:feedback-added',{detail:{feedbackId:row.id}}));
  }

  function fillRoundChapter(){
    const select=document.getElementById('reviewRoundChapter');
    select.innerHTML='<option value="">Choose chapter</option>'+chapters().map(c=>'<option value="'+c.id+'">'+escapeHtml((c.number?c.number+' · ':'')+c.title)+'</option>').join('');
  }

  function openRoundModal(){
    fillRoundChapter();
    const project=window.QuireStore.getActiveProject()||{};
    document.getElementById('reviewRoundTitle').value='Supervisor review · '+new Date().toLocaleDateString();
    document.getElementById('reviewRoundReviewer').value=project.supervisorName||'';
    document.getElementById('reviewRoundScope').value='whole_thesis';
    document.getElementById('reviewRoundChapterWrap').hidden=true;
    document.getElementById('reviewRoundSubmitted').value=new Date().toISOString().slice(0,10);
    document.getElementById('reviewRoundDue').value='';
    document.getElementById('reviewRoundNotes').value='';
    document.getElementById('reviewRoundModal').hidden=false;
  }

  function saveRound(){
    const scope=document.getElementById('reviewRoundScope').value;
    const chapterId=scope==='chapter'?document.getElementById('reviewRoundChapter').value:null;
    if(scope==='chapter'&&!chapterId){
      document.getElementById('reviewRoundModalMessage').textContent='Choose the chapter included in this review round.';
      return;
    }
    const row=window.QuireStore.createReviewRound({
      title:document.getElementById('reviewRoundTitle').value.trim()||'Supervisor review',
      reviewerName:document.getElementById('reviewRoundReviewer').value.trim(),
      scope,chapterId,
      submittedAt:document.getElementById('reviewRoundSubmitted').value||null,
      responseDueDate:document.getElementById('reviewRoundDue').value||null,
      notes:document.getElementById('reviewRoundNotes').value.trim(),
      status:'awaiting_feedback'
    });
    document.getElementById('reviewRoundModal').hidden=true;
    document.getElementById('reviewRoundModalMessage').textContent='';
    activeRoundFilter=row.id;
    render();
  }

  function renderVersions(){
    const current=window.QuireChapterEditor?.getActive?.()||{};
    const mount=document.getElementById('sectionVersionList');
    if(!mount)return;
    const rows=current.sectionId?window.QuireStore.listSectionVersions(current.sectionId):[];
    const section=sections().find(s=>s.id===current.sectionId);
    document.getElementById('versionModalSectionTitle').textContent=section?.title||'Section versions';
    document.getElementById('versionCount').textContent=rows.length+' '+(rows.length===1?'version':'versions');

    if(!rows.length){
      mount.innerHTML='<div class="supervision-empty"><strong>No saved versions yet</strong><small>Create a snapshot before major revisions, or create a supervisor review round to snapshot the submitted draft automatically.</small></div>';
      return;
    }
    mount.innerHTML=rows.map(v=>{
      const round=v.reviewRoundId?rounds().find(r=>r.id===v.reviewRoundId):null;
      return '<article class="section-version-row">'+
        '<div><span>'+escapeHtml(v.reason.replace(/_/g,' '))+'</span><strong>'+escapeHtml(v.label)+'</strong><small>'+escapeHtml(pretty(v.createdAt))+' · '+Number(v.wordCount||0).toLocaleString()+' words'+(round?' · '+escapeHtml(round.title):'')+'</small></div>'+
        '<button type="button" data-restore-version="'+v.id+'">Restore</button>'+
      '</article>';
    }).join('');
    mount.querySelectorAll('[data-restore-version]').forEach(btn=>btn.addEventListener('click',()=>{
      if(!confirm('Restore this saved version? Quire will first save a safety snapshot of the current section.'))return;
      window.QuireStore.restoreSectionVersion(btn.dataset.restoreVersion);
      window.QuireChapterEditor?.openSection?.(current.sectionId);
      setTimeout(()=>window.QuireInlineReferences?.syncSection?.(current.sectionId,document.getElementById('liveSectionEditor')),0);
      renderVersions();render();
    }));
  }

  function openVersions(){
    const current=window.QuireChapterEditor?.getActive?.();
    if(!current?.sectionId)return;
    document.getElementById('sectionVersionsModal').hidden=false;
    renderVersions();
  }

  function createSnapshot(){
    const current=window.QuireChapterEditor?.getActive?.();
    if(!current?.sectionId)return;
    window.QuireChapterEditor?.save?.();
    const label=prompt('Name this version:','Manual snapshot · '+new Date().toLocaleString());
    if(label===null)return;
    window.QuireStore.createSectionVersion(current.sectionId,{label:label.trim()||'Manual snapshot',reason:'manual'});
    renderVersions();render();
  }

  function shorten(v,n=120){const s=String(v||'');return s.length>n?s.slice(0,n-1)+'…':s;}

  function buildReviewPackage(){
    const state=window.QuireStore.getState();
    const projectId=window.QuireStore.getActiveProjectId();
    const project=state.projects.find(p=>p.id===projectId)||{};
    const latest=(state.reviewRounds||[]).filter(r=>r.projectId===projectId).sort((a,b)=>String(b.submittedAt||b.createdAt||'').localeCompare(String(a.submittedAt||a.createdAt||'')))[0]||null;
    const since=latest?.submittedAt||latest?.createdAt||'';
    const secs=(state.sections||[]).filter(s=>s.projectId===projectId);
    const changed=secs.filter(s=>!since||String(s.updatedAt||'')>String(since));
    const feedback=(state.feedbackItems||[]).filter(x=>x.projectId===projectId);
    const unresolved=feedback.filter(x=>x.status!=='resolved');
    const weak=secs.filter(sec=>!(state.evidenceLinks||[]).some(e=>e.sectionId===sec.id));
    const mount=document.getElementById('supervisorReviewPackage');if(!mount)return;
    mount.hidden=false;
    mount.innerHTML='<div class="review-package-head"><div><span class="eyebrow">REVIEW PACKAGE</span><h3>'+escapeHtml(project.title||'Thesis review')+'</h3></div><button type="button" id="downloadReviewPackageBtn">Download summary</button></div>'+
      '<div class="review-package-grid">'+
      '<section><strong>Changes since '+escapeHtml(latest?pretty(since):'project start')+'</strong>'+(changed.length?'<ul>'+changed.slice(0,12).map(s=>'<li>'+escapeHtml(s.title)+' · '+Number(s.currentWordCount||0)+' words</li>').join('')+'</ul>':'<p>No later section updates recorded.</p>')+'</section>'+
      '<section><strong>Unresolved questions / feedback</strong>'+(unresolved.length?'<ul>'+unresolved.slice(0,12).map(x=>'<li>'+escapeHtml(shorten(x.comment||'Feedback item',130))+' · '+escapeHtml(String(x.status||'open').replace(/_/g,' '))+'</li>').join('')+'</ul>':'<p>No unresolved supervisor feedback recorded.</p>')+'</section>'+
      '<section><strong>Evidence areas to discuss</strong>'+(weak.length?'<ul>'+weak.slice(0,12).map(s=>'<li>'+escapeHtml(s.title)+' · no section evidence link recorded</li>').join('')+'</ul>':'<p>Every current section has at least one evidence link recorded.</p>')+'</section>'+
      '<section><strong>Revision actions</strong>'+(unresolved.length?'<ul>'+unresolved.slice(0,12).map(x=>'<li>'+escapeHtml(shorten(x.comment||'Review feedback',130))+'</li>').join('')+'</ul>':'<p>No active revision actions recorded.</p>')+'</section></div>'+
      '<small>Quire assembles recorded changes and gaps. This package does not decide academic quality or supervisor priorities.</small>';
    document.getElementById('downloadReviewPackageBtn')?.addEventListener('click',()=>{
      const text=mount.innerText;const blob=new Blob([text],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='quire-supervisor-review-package.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
    });
  }

  function render(){
    renderStats();renderRounds();renderFeedback();renderSectionFeedbackBadge();
  }

  function bind(){
    document.getElementById('newReviewRoundBtn')?.addEventListener('click',openRoundModal);
    document.getElementById('buildReviewPackageBtn')?.addEventListener('click',buildReviewPackage);
    document.getElementById('addSupervisorFeedbackBtn')?.addEventListener('click',()=>openFeedbackModal());
    document.getElementById('openSectionFeedbackBtn')?.addEventListener('mousedown',()=>{selectedTextBuffer=currentSelectedText();});
    document.getElementById('openSectionFeedbackBtn')?.addEventListener('click',openFeedbackForCurrentSection);
    document.getElementById('openSectionVersionsBtn')?.addEventListener('click',openVersions);
    document.getElementById('createSectionSnapshotBtn')?.addEventListener('click',createSnapshot);
    document.getElementById('feedbackStatusFilter')?.addEventListener('change',renderFeedback);

    document.getElementById('reviewRoundScope')?.addEventListener('change',e=>{
      document.getElementById('reviewRoundChapterWrap').hidden=e.target.value!=='chapter';
    });
    document.getElementById('feedbackChapter')?.addEventListener('change',e=>updateFeedbackSections(e.target.value));

    document.getElementById('closeReviewRoundModal')?.addEventListener('click',()=>document.getElementById('reviewRoundModal').hidden=true);
    document.getElementById('cancelReviewRound')?.addEventListener('click',()=>document.getElementById('reviewRoundModal').hidden=true);
    document.getElementById('saveReviewRound')?.addEventListener('click',saveRound);

    document.getElementById('closeFeedbackModal')?.addEventListener('click',()=>document.getElementById('feedbackModal').hidden=true);
    document.getElementById('cancelFeedback')?.addEventListener('click',()=>document.getElementById('feedbackModal').hidden=true);
    document.getElementById('saveFeedback')?.addEventListener('click',saveFeedback);

    document.getElementById('closeSectionVersionsModal')?.addEventListener('click',()=>document.getElementById('sectionVersionsModal').hidden=true);

    ['reviewRoundModal','feedbackModal','sectionVersionsModal'].forEach(id=>{
      document.getElementById(id)?.addEventListener('click',e=>{if(e.target.id===id)e.currentTarget.hidden=true;});
    });

    window.addEventListener('quire:section-opened',renderSectionFeedbackBadge);
    window.addEventListener('quire:project-switched',()=>{activeRoundFilter='all';render();});
    window.addEventListener('quire:cloud-pulled',render);
    window.addEventListener('quire:store-changed',()=>{
      if(document.getElementById('supervision')?.classList.contains('active'))render();
      else renderSectionFeedbackBadge();
    });
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireSupervision={render,openFeedbackForCurrentSection,openVersions,buildReviewPackage};
})();