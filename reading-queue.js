/* Quire Reading Queue & Reading Purpose — Step 68 */
(function(){
  const PRIORITIES={
    next:{label:'Next',rank:1},
    soon:{label:'Soon',rank:2},
    later:{label:'Later',rank:3}
  };
  const PURPOSES={
    foundational:'Foundational / orientation',
    gap_test:'Test a possible gap',
    concept_coverage:'Strengthen search-concept coverage',
    methods:'Methods / methodology insight',
    counter_evidence:'Look for counter-evidence',
    question_refinement:'Refine the research question',
    supervisor:'Supervisor suggested',
    other:'Other researcher-defined purpose'
  };
  let editingArticleId=null;
  let expanded=true;

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function articles(){return window.QuireStore?.listArticles?.()||[];}
  function plan(article){
    const p=article?.citationData?.readingPlan;
    if(!p||typeof p!=='object')return null;
    return {
      priority:PRIORITIES[p.priority]?p.priority:'soon',
      purpose:PURPOSES[p.purpose]?p.purpose:'other',
      note:String(p.note||''),
      gapId:String(p.gapId||''),
      conceptLabel:String(p.conceptLabel||''),
      addedAt:String(p.addedAt||''),
      updatedAt:String(p.updatedAt||'')
    };
  }
  function gaps(){
    const state=window.QuireStore?.getState?.()||{};
    const pid=window.QuireStore?.getActiveProjectId?.();
    return (state.analysisItems||[]).filter(item=>item.projectId===pid&&item.kind==='gap_signal'&&!['set_aside','challenged'].includes(String(item.payload?.gapStatus||'emerging')));
  }
  function concepts(){
    return (window.QuireStore?.getSearchPlan?.()?.concepts||[]).filter(c=>(c.terms||[]).length);
  }
  function authorYear(article){
    const first=String(article?.authors||'').split(';')[0]?.trim();
    const surname=first?first.split(/\s+/).slice(-1)[0]:'Source';
    return surname+(article?.year?' '+article.year:'');
  }

  function queueRows(){
    return articles()
      .filter(article=>plan(article)&&article.readingStatus!=='reviewed')
      .sort((a,b)=>{
        const pa=plan(a),pb=plan(b);
        return (PRIORITIES[pa.priority].rank-PRIORITIES[pb.priority].rank)||
          String(pa.addedAt||a.updatedAt||'').localeCompare(String(pb.addedAt||b.updatedAt||''));
      });
  }

  function ensureModal(){
    if(document.getElementById('readingQueueModal'))return;
    const modal=document.createElement('div');
    modal.id='readingQueueModal';
    modal.className='modal-backdrop';
    modal.hidden=true;
    modal.innerHTML=
      '<div class="modal reading-queue-modal" role="dialog" aria-modal="true" aria-labelledby="readingQueueModalTitle">'+
        '<div class="modal-head"><div><span class="eyebrow">READING QUEUE</span><h2 id="readingQueueModalTitle">Plan why this paper should be read</h2></div><button id="closeReadingQueueModal" type="button">×</button></div>'+
        '<div id="readingQueueArticle" class="reading-queue-article"></div>'+
        '<div class="form-grid">'+
          '<label class="field"><span>When?</span><select id="readingQueuePriority">'+Object.entries(PRIORITIES).map(([v,row])=>'<option value="'+v+'">'+row.label+'</option>').join('')+'</select></label>'+
          '<label class="field"><span>Reading purpose</span><select id="readingQueuePurpose">'+Object.entries(PURPOSES).map(([v,label])=>'<option value="'+v+'">'+escapeHtml(label)+'</option>').join('')+'</select></label>'+
          '<label class="field wide" id="readingQueueGapWrap" hidden><span>Gap being tested</span><select id="readingQueueGap"></select></label>'+
          '<label class="field wide" id="readingQueueConceptWrap" hidden><span>Search concept to strengthen</span><select id="readingQueueConcept"></select></label>'+
          '<label class="field wide"><span>What do you want to learn from this paper?</span><textarea id="readingQueueNote" rows="4" placeholder="e.g. Check whether community follow-up has been studied outside the acute hospital setting."></textarea></label>'+
        '</div>'+
        '<small id="readingQueueMessage" class="gap-signal-message"></small>'+
        '<div class="account-button-row"><button class="text-btn danger-text" id="removeReadingQueueBtn" type="button">Remove from queue</button><button class="soft-btn" id="cancelReadingQueue" type="button">Cancel</button><button class="primary-btn" id="saveReadingQueue" type="button">Save reading plan</button></div>'+
      '</div>';
    document.body.appendChild(modal);

    const close=()=>{modal.hidden=true;editingArticleId=null;};
    document.getElementById('closeReadingQueueModal')?.addEventListener('click',close);
    document.getElementById('cancelReadingQueue')?.addEventListener('click',close);
    modal.addEventListener('click',event=>{if(event.target===modal)close();});
    document.getElementById('readingQueuePurpose')?.addEventListener('change',updateConditionalFields);
    document.getElementById('saveReadingQueue')?.addEventListener('click',save);
    document.getElementById('removeReadingQueueBtn')?.addEventListener('click',remove);
  }

  function updateConditionalFields(){
    const purpose=document.getElementById('readingQueuePurpose')?.value||'other';
    const gapWrap=document.getElementById('readingQueueGapWrap');
    const conceptWrap=document.getElementById('readingQueueConceptWrap');
    if(gapWrap)gapWrap.hidden=purpose!=='gap_test';
    if(conceptWrap)conceptWrap.hidden=purpose!=='concept_coverage';
  }

  function fillLinks(existing){
    const gap=document.getElementById('readingQueueGap');
    const concept=document.getElementById('readingQueueConcept');
    if(gap){
      gap.innerHTML='<option value="">Choose active gap</option>'+gaps().map(g=>'<option value="'+escapeHtml(g.id)+'">'+escapeHtml(g.title)+'</option>').join('');
      gap.value=existing?.gapId||'';
    }
    if(concept){
      concept.innerHTML='<option value="">Choose search concept</option>'+concepts().map(c=>'<option value="'+escapeHtml(c.label)+'">'+escapeHtml(c.label)+'</option>').join('');
      concept.value=existing?.conceptLabel||'';
    }
  }

  function open(articleId,{priority='soon',purpose='other',note='',gapId='',conceptLabel=''}={}){
    ensureModal();
    const article=window.QuireStore?.getArticle?.(articleId);if(!article)return;
    editingArticleId=articleId;
    const existing=plan(article)||{priority,purpose,note,gapId,conceptLabel};
    document.getElementById('readingQueueArticle').innerHTML='<strong>'+escapeHtml(article.title||'Untitled paper')+'</strong><small>'+escapeHtml(authorYear(article))+'</small>';
    document.getElementById('readingQueuePriority').value=existing.priority||priority;
    document.getElementById('readingQueuePurpose').value=PURPOSES[existing.purpose]?existing.purpose:purpose;
    document.getElementById('readingQueueNote').value=existing.note||note||'';
    document.getElementById('readingQueueMessage').textContent='';
    fillLinks(existing);
    updateConditionalFields();
    document.getElementById('removeReadingQueueBtn').hidden=!plan(article);
    document.getElementById('readingQueueModal').hidden=false;
  }

  function save(){
    if(!editingArticleId)return;
    const article=window.QuireStore.getArticle(editingArticleId);if(!article)return;
    const purpose=document.getElementById('readingQueuePurpose')?.value||'other';
    const current=plan(article);
    const readingPlan={
      priority:document.getElementById('readingQueuePriority')?.value||'soon',
      purpose,
      note:String(document.getElementById('readingQueueNote')?.value||'').trim(),
      gapId:purpose==='gap_test'?(document.getElementById('readingQueueGap')?.value||''):'',
      conceptLabel:purpose==='concept_coverage'?(document.getElementById('readingQueueConcept')?.value||''):'',
      addedAt:current?.addedAt||new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
    window.QuireStore.updateArticle(editingArticleId,{citationData:{...(article.citationData||{}),readingPlan}});
    document.getElementById('readingQueueModal').hidden=true;
    editingArticleId=null;
    render();
  }

  function remove(){
    if(!editingArticleId)return;
    const article=window.QuireStore.getArticle(editingArticleId);if(!article)return;
    const citationData={...(article.citationData||{})};
    delete citationData.readingPlan;
    window.QuireStore.updateArticle(editingArticleId,{citationData});
    document.getElementById('readingQueueModal').hidden=true;
    editingArticleId=null;
    render();
  }

  function purposeDetail(p){
    if(p.purpose==='gap_test'&&p.gapId){
      const gap=gaps().find(g=>g.id===p.gapId);
      return gap?'Gap: '+gap.title:'Gap test';
    }
    if(p.purpose==='concept_coverage'&&p.conceptLabel)return 'Concept: '+p.conceptLabel;
    return PURPOSES[p.purpose]||PURPOSES.other;
  }

  function render(){
    const stats=document.getElementById('readingQueueStats');
    const list=document.getElementById('readingQueueList');
    const toggle=document.getElementById('toggleReadingQueueBtn');
    if(!stats||!list||!toggle||!window.QuireStore)return;
    const rows=queueRows();
    const by={next:0,soon:0,later:0};
    rows.forEach(a=>by[plan(a).priority]++);

    stats.innerHTML=
      '<div><strong>'+rows.length+'</strong><span>papers waiting</span></div>'+
      '<div><strong>'+by.next+'</strong><span>next</span></div>'+
      '<div><strong>'+by.soon+'</strong><span>soon</span></div>'+
      '<div><strong>'+by.later+'</strong><span>later</span></div>';

    list.hidden=!expanded;
    toggle.textContent=expanded?'Hide queue':'Show queue';
    toggle.setAttribute('aria-expanded',String(expanded));

    if(!expanded)return;
    if(!rows.length){
      list.innerHTML='<div class="reading-queue-empty"><strong>Your reading queue is empty</strong><small>Add papers from the Research Library or Screening when you want to remember what to read next and why.</small></div>';
      return;
    }

    list.innerHTML=rows.map(article=>{
      const p=plan(article);
      return '<article class="reading-queue-row priority-'+escapeHtml(p.priority)+'">'+
        '<div class="reading-priority"><span>'+escapeHtml(PRIORITIES[p.priority].label)+'</span></div>'+
        '<div class="reading-queue-paper"><strong>'+escapeHtml(article.title||'Untitled paper')+'</strong><small>'+escapeHtml(authorYear(article))+'</small></div>'+
        '<div class="reading-queue-purpose"><span>'+escapeHtml(purposeDetail(p))+'</span><small>'+escapeHtml(p.note||'No reading question recorded yet.')+'</small></div>'+
        '<div class="reading-queue-actions"><button type="button" data-reading-open="'+escapeHtml(article.id)+'">Read paper</button><button type="button" data-reading-edit="'+escapeHtml(article.id)+'">Edit plan</button></div>'+
      '</article>';
    }).join('');

    list.querySelectorAll('[data-reading-open]').forEach(btn=>btn.addEventListener('click',async()=>{
      window.showView?.('reader');
      try{await window.QuirePdfReader?.openArticle?.(btn.dataset.readingOpen);}catch(e){}
    }));
    list.querySelectorAll('[data-reading-edit]').forEach(btn=>btn.addEventListener('click',()=>open(btn.dataset.readingEdit)));
  }

  function bind(){
    ensureModal();
    document.getElementById('toggleReadingQueueBtn')?.addEventListener('click',()=>{expanded=!expanded;render();});
    window.addEventListener('quire:reading-queue-request',event=>{
      const d=event.detail||{};
      if(d.articleId)open(d.articleId,d);
    });
    window.addEventListener('quire:store-changed',render);
    window.addEventListener('quire:project-switched',render);
    window.addEventListener('quire:paper-reviewed',render);
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireReadingQueue={render,open,queueRows,purposes:PURPOSES,priorities:PRIORITIES};
})();