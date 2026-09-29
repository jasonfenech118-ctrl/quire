/* Quire Living Gap Explorer — Step 57 */
(function(){
  const STATUS={
    emerging:{label:'Emerging',copy:'A possible gap noticed in the literature. It still needs deliberate searching.'},
    testing:{label:'Being tested',copy:'You are actively looking for literature that could support, narrow or challenge this gap.'},
    narrowed:{label:'Narrowed',copy:'The original gap was too broad and has been refined by further reading.'},
    supported:{label:'Supported by current review',copy:'Your current review gives this gap meaningful support, but it is still not treated as universally confirmed.'},
    challenged:{label:'Challenged',copy:'Further literature weakens or complicates the original gap idea.'},
    set_aside:{label:'Set aside',copy:'You are no longer using this gap as a current thesis direction.'}
  };

  let editingId=null;

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function projectId(){return window.QuireStore?.getActiveProjectId?.();}
  function state(){return window.QuireStore?.getState?.()||{};}
  function gaps(){
    const pid=projectId();
    return (state().analysisItems||[])
      .filter(item=>item.projectId===pid&&item.kind==='gap_signal')
      .sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
  }
  function articles(){
    return window.QuireStore?.listArticles?.()||[];
  }
  function payload(item){
    const p=item?.payload&&typeof item.payload==='object'?item.payload:{};
    return {
      observation:String(p.observation||''),
      evidence:String(p.evidence||''),
      nextSearch:String(p.nextSearch||''),
      gapStatus:STATUS[p.gapStatus]?p.gapStatus:'emerging',
      supportingArticleIds:Array.isArray(p.supportingArticleIds)?p.supportingArticleIds:[],
      challengingArticleIds:Array.isArray(p.challengingArticleIds)?p.challengingArticleIds:[],
      searchTests:Array.isArray(p.searchTests)?p.searchTests:[],
      boundary:String(p.boundary||'Possible gap only; requires further searching and researcher judgement.')
    };
  }
  function articleMap(){return new Map(articles().map(a=>[a.id,a]));}
  function articleLabel(article){
    if(!article)return 'Missing source';
    const first=String(article.authors||'').split(';')[0]?.trim();
    const surname=first?first.split(/\s+/).slice(-1)[0]:'Source';
    return surname+(article.year?' '+article.year:'')+' · '+(article.title||'Untitled paper');
  }

  function ensureModal(){
    if(document.getElementById('gapExplorerEditModal'))return;
    const modal=document.createElement('div');
    modal.id='gapExplorerEditModal';
    modal.className='modal-backdrop';
    modal.hidden=true;
    modal.innerHTML=
      '<div class="modal gap-explorer-edit-modal" role="dialog" aria-modal="true" aria-labelledby="gapExplorerEditTitle">'+
        '<div class="modal-head"><div><span class="eyebrow">LIVING GAP EXPLORER</span><h2 id="gapExplorerEditTitle">Review possible gap</h2></div><button id="closeGapExplorerEdit" type="button">×</button></div>'+
        '<div class="form-grid">'+
          '<label class="field wide"><span>Possible gap</span><input id="gapExplorerEditName" type="text"></label>'+
          '<label class="field"><span>Status</span><select id="gapExplorerEditStatus">'+
            Object.entries(STATUS).map(([value,row])=>'<option value="'+value+'">'+escapeHtml(row.label)+'</option>').join('')+
          '</select></label>'+
          '<label class="field wide"><span>What have you observed?</span><textarea id="gapExplorerEditObservation" rows="4"></textarea></label>'+
          '<label class="field wide"><span>Why might this be a gap?</span><textarea id="gapExplorerEditEvidence" rows="4"></textarea></label>'+
          '<label class="field wide"><span>What search would test it next?</span><textarea id="gapExplorerEditNextSearch" rows="3"></textarea></label>'+
        '</div>'+
        '<div class="gap-evidence-columns">'+
          '<section><span class="eyebrow">PAPERS THAT CURRENTLY SUPPORT IT</span><div id="gapExplorerSupportPapers" class="gap-paper-checks"></div></section>'+
          '<section><span class="eyebrow">PAPERS THAT CHALLENGE / COMPLICATE IT</span><div id="gapExplorerChallengePapers" class="gap-paper-checks"></div></section>'+
        '</div>'+
        '<div class="gap-boundary-note"><strong>Quire boundary</strong><small>A status of “Supported by current review” means your present evidence base supports the gap. It is not a claim that no relevant literature exists elsewhere.</small></div>'+
        '<small id="gapExplorerEditMessage" class="gap-signal-message"></small>'+
        '<div class="account-button-row"><button class="soft-btn" id="cancelGapExplorerEdit" type="button">Cancel</button><button class="primary-btn" id="saveGapExplorerEdit" type="button">Save gap review</button></div>'+
      '</div>';
    document.body.appendChild(modal);
    const close=()=>{modal.hidden=true;editingId=null;};
    document.getElementById('closeGapExplorerEdit')?.addEventListener('click',close);
    document.getElementById('cancelGapExplorerEdit')?.addEventListener('click',close);
    modal.addEventListener('click',event=>{if(event.target===modal)close();});
    document.getElementById('saveGapExplorerEdit')?.addEventListener('click',saveEdit);
  }

  function renderPaperChecks(targetId,selectedIds){
    const target=document.getElementById(targetId);if(!target)return;
    const selected=new Set(selectedIds||[]);
    const rows=articles().slice().sort((a,b)=>{
      const ra=a.readingStatus==='reviewed'?0:1;
      const rb=b.readingStatus==='reviewed'?0:1;
      return ra-rb||String(a.title||'').localeCompare(String(b.title||''));
    });
    if(!rows.length){
      target.innerHTML='<p>No papers in the library yet.</p>';
      return;
    }
    target.innerHTML=rows.map(article=>
      '<label><input type="checkbox" value="'+escapeHtml(article.id)+'" '+(selected.has(article.id)?'checked':'')+'><span><strong>'+escapeHtml(articleLabel(article))+'</strong><small>'+escapeHtml(article.readingStatus==='reviewed'?'Reviewed':'Not yet reviewed')+'</small></span></label>'
    ).join('');
  }

  function openEdit(id){
    ensureModal();
    const item=gaps().find(g=>g.id===id);if(!item)return;
    editingId=id;
    const p=payload(item);
    document.getElementById('gapExplorerEditName').value=item.title||'';
    document.getElementById('gapExplorerEditStatus').value=p.gapStatus;
    document.getElementById('gapExplorerEditObservation').value=p.observation;
    document.getElementById('gapExplorerEditEvidence').value=p.evidence;
    document.getElementById('gapExplorerEditNextSearch').value=p.nextSearch;
    document.getElementById('gapExplorerEditMessage').textContent='';
    renderPaperChecks('gapExplorerSupportPapers',p.supportingArticleIds);
    renderPaperChecks('gapExplorerChallengePapers',p.challengingArticleIds);
    document.getElementById('gapExplorerEditModal').hidden=false;
    setTimeout(()=>document.getElementById('gapExplorerEditName')?.focus(),0);
  }

  function checkedValues(id){
    return [...document.querySelectorAll('#'+id+' input:checked')].map(input=>input.value);
  }

  function saveEdit(){
    if(!editingId)return;
    const title=document.getElementById('gapExplorerEditName')?.value.trim()||'';
    const message=document.getElementById('gapExplorerEditMessage');
    if(!title){
      if(message)message.textContent='Give the possible gap a clear label.';
      return;
    }
    const current=window.QuireStore.getAnalysisItem(editingId);
    if(!current)return;
    const currentPayload=payload(current);
    const nextPayload={
      ...currentPayload,
      observation:document.getElementById('gapExplorerEditObservation')?.value.trim()||'',
      evidence:document.getElementById('gapExplorerEditEvidence')?.value.trim()||'',
      nextSearch:document.getElementById('gapExplorerEditNextSearch')?.value.trim()||'',
      gapStatus:document.getElementById('gapExplorerEditStatus')?.value||'emerging',
      supportingArticleIds:checkedValues('gapExplorerSupportPapers'),
      challengingArticleIds:checkedValues('gapExplorerChallengePapers'),
      boundary:'Possible gap only; requires further searching and researcher judgement.'
    };
    window.QuireStore.updateAnalysisItem(editingId,{title,payload:nextPayload,status:'draft'});
    document.getElementById('gapExplorerEditModal').hidden=true;
    editingId=null;
    render();
  }

  function evidenceChips(ids,map,kind){
    if(!ids?.length)return '<small class="gap-none">None linked yet</small>';
    return '<div class="gap-paper-chips">'+ids.map(id=>{
      const article=map.get(id);
      return '<button type="button" data-gap-open-paper="'+escapeHtml(id)+'" class="'+kind+'">'+escapeHtml(articleLabel(article))+'</button>';
    }).join('')+'</div>';
  }

  function render(){
    const list=document.getElementById('gapExplorerList');
    const summary=document.getElementById('gapExplorerSummary');
    if(!list||!summary||!window.QuireStore)return;
    const rows=gaps();
    const map=articleMap();
    const active=rows.filter(row=>payload(row).gapStatus!=='set_aside');
    const supported=rows.filter(row=>payload(row).gapStatus==='supported').length;
    const challenged=rows.filter(row=>payload(row).gapStatus==='challenged').length;
    summary.innerHTML=
      '<div><strong>'+active.length+'</strong><span>active gap hypotheses</span></div>'+
      '<div><strong>'+supported+'</strong><span>supported by current review</span></div>'+
      '<div><strong>'+challenged+'</strong><span>challenged by further reading</span></div>'+
      '<div><strong>'+rows.reduce((n,row)=>n+payload(row).searchTests.length,0)+'</strong><span>targeted search tests logged</span></div>';

    if(!rows.length){
      list.innerHTML='<div class="gap-explorer-empty"><strong>No possible gaps recorded yet</strong><p>Read and compare several papers first. When a real pattern of absence, inconsistency or repeated limitation starts to appear, record it as a hypothesis to test.</p></div>';
      return;
    }

    list.innerHTML=rows.map(item=>{
      const p=payload(item);
      const status=STATUS[p.gapStatus]||STATUS.emerging;
      return '<article class="gap-explorer-card status-'+escapeHtml(p.gapStatus)+'" data-gap-id="'+escapeHtml(item.id)+'">'+
        '<div class="gap-card-head"><div><span class="gap-status">'+escapeHtml(status.label)+'</span><h3>'+escapeHtml(item.title)+'</h3></div><button type="button" data-gap-edit="'+escapeHtml(item.id)+'">Review gap</button></div>'+
        '<p class="gap-status-copy">'+escapeHtml(status.copy)+'</p>'+
        (p.observation?'<div class="gap-observation"><span>WHAT YOU NOTICED</span><p>'+escapeHtml(p.observation)+'</p></div>':'')+
        (p.evidence?'<div class="gap-observation"><span>WHY IT MAY MATTER</span><p>'+escapeHtml(p.evidence)+'</p></div>':'')+
        '<div class="gap-evidence-grid">'+
          '<section><span>SUPPORTING PAPERS</span>'+evidenceChips(p.supportingArticleIds,map,'support')+'</section>'+
          '<section><span>CHALLENGING / COMPLICATING PAPERS</span>'+evidenceChips(p.challengingArticleIds,map,'challenge')+'</section>'+
        '</div>'+
        '<div class="gap-next-search"><div><span>NEXT SEARCH TO TEST THIS</span><strong>'+escapeHtml(p.nextSearch||'Not planned yet')+'</strong></div><button type="button" data-gap-search="'+escapeHtml(item.id)+'">Plan targeted search →</button></div>'+
      '</article>';
    }).join('');

    list.querySelectorAll('[data-gap-edit]').forEach(btn=>btn.addEventListener('click',()=>openEdit(btn.dataset.gapEdit)));
    list.querySelectorAll('[data-gap-search]').forEach(btn=>btn.addEventListener('click',()=>{
      const item=gaps().find(g=>g.id===btn.dataset.gapSearch);if(!item)return;
      window.dispatchEvent(new CustomEvent('quire:gap-search-request',{detail:{gapId:item.id}}));
      window.showView?.('searchscreen');
    }));
    list.querySelectorAll('[data-gap-open-paper]').forEach(btn=>btn.addEventListener('click',async()=>{
      window.showView?.('reader');
      try{await window.QuirePdfReader?.openArticle?.(btn.dataset.gapOpenPaper);}catch(e){}
    }));
  }

  function bind(){
    ensureModal();
    document.getElementById('newGapFromSynthesisBtn')?.addEventListener('click',()=>window.QuireResearchFoundation?.openGapModal?.());
    window.addEventListener('quire:store-changed',render);
    window.addEventListener('quire:project-switched',render);
    window.addEventListener('quire:view-changed',event=>{if(event.detail?.viewId==='synthesis')render();});
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireGapExplorer={render,openEdit,statuses:STATUS};
})();