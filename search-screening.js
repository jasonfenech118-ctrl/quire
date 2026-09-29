/* Quire Literature Search & Screening — Step 26 */
(function(){
  let planSaveTimer=null;
  let screeningFilter='all';

  const FRAMEWORKS={
    pico:['Population','Intervention / exposure','Comparator','Outcome'],
    pcc:['Population','Concept','Context'],
    spider:['Sample','Phenomenon of interest','Design','Evaluation','Research type'],
    custom:['Concept 1','Concept 2','Concept 3']
  };

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function safeTerm(term){
    const value=String(term||'').trim();
    if(!value)return '';
    if(/^["(].*[")]$/.test(value)||/[!*?]/.test(value))return value;
    return /\s/.test(value)?'"'+value.replace(/"/g,'')+'"':value;
  }
  function parseTerms(value){
    return String(value||'').split(/[\n,;]/).map(x=>x.trim()).filter(Boolean);
  }
  function authorYear(article){
    const first=String(article?.authors||'').split(';')[0]?.trim();
    const surname=first?first.split(/\s+/).slice(-1)[0]:'Unknown author';
    return surname+(article?.year?' '+article.year:'');
  }
  function prettyDate(value){
    if(!value)return '—';
    const date=new Date(String(value).length===10?value+'T12:00:00':value);
    return Number.isNaN(date.getTime())?'—':date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  }

  function currentPlanFromUi(){
    const existing=window.QuireStore.getSearchPlan();
    const concepts=[...document.querySelectorAll('[data-search-concept]')].map(card=>({
      id:card.dataset.conceptId||'',
      label:card.querySelector('[data-concept-label]')?.value.trim()||'Concept',
      terms:parseTerms(card.querySelector('[data-concept-terms]')?.value||'')
    }));
    return {
      ...existing,
      framework:document.getElementById('searchFramework')?.value||'',
      concepts,
      databases:parseTerms(document.getElementById('searchDatabases')?.value||''),
      limits:document.getElementById('searchLimits')?.value.trim()||'',
      inclusionCriteria:document.getElementById('searchInclusionCriteria')?.value.trim()||'',
      exclusionCriteria:document.getElementById('searchExclusionCriteria')?.value.trim()||'',
      notes:document.getElementById('searchPlanNotes')?.value.trim()||''
    };
  }

  function queryFromPlan(plan=currentPlanFromUi()){
    const groups=(plan.concepts||[]).map(concept=>{
      const terms=(concept.terms||[]).map(safeTerm).filter(Boolean);
      if(!terms.length)return '';
      return '('+terms.join(' OR ')+')';
    }).filter(Boolean);
    return groups.join(' AND ');
  }

  function renderConcepts(plan){
    const mount=document.getElementById('searchConcepts');
    if(!mount)return;
    const concepts=Array.isArray(plan.concepts)&&plan.concepts.length?plan.concepts:[{id:'',label:'Concept 1',terms:[]}];
    mount.innerHTML=concepts.map((concept,index)=>
      '<article class="search-concept-card" data-search-concept data-concept-id="'+escapeHtml(concept.id||'')+'">'+
        '<div class="search-concept-head"><span>CONCEPT '+(index+1)+'</span><button type="button" data-remove-concept="'+index+'" title="Remove concept">×</button></div>'+
        '<input data-concept-label type="text" value="'+escapeHtml(concept.label||('Concept '+(index+1)))+'" aria-label="Concept label">'+
        '<textarea data-concept-terms rows="4" placeholder="Enter synonyms separated by commas or new lines">'+escapeHtml((concept.terms||[]).join(', '))+'</textarea>'+
        '<small>'+((concept.terms||[]).length)+' terms</small>'+
      '</article>'
    ).join('');

    mount.querySelectorAll('input,textarea').forEach(input=>input.addEventListener('input',queuePlanSave));
    mount.querySelectorAll('[data-remove-concept]').forEach(btn=>btn.addEventListener('click',()=>{
      const next=currentPlanFromUi();
      next.concepts.splice(Number(btn.dataset.removeConcept),1);
      window.QuireStore.saveSearchPlan(next);
      renderPlan();
    }));
  }

  function renderQuery(){
    const query=queryFromPlan();
    const output=document.getElementById('generatedSearchQuery');
    if(output)output.value=query;
    const count=document.getElementById('searchQueryTermCount');
    const terms=currentPlanFromUi().concepts.flatMap(c=>c.terms||[]);
    if(count)count.textContent=terms.length+' '+(terms.length===1?'term':'terms');
  }

  function queuePlanSave(){
    renderQuery();
    clearTimeout(planSaveTimer);
    const state=document.getElementById('searchPlanSaveState');
    if(state)state.textContent='Saving…';
    planSaveTimer=setTimeout(()=>{
      const saved=window.QuireStore.saveSearchPlan(currentPlanFromUi());
      if(state)state.textContent='Saved';
      setTimeout(()=>{if(state)state.textContent='Autosave';},900);
      renderQuery();
      return saved;
    },450);
  }

  function applyFrameworkLabels(){
    const framework=document.getElementById('searchFramework').value;
    const labels=FRAMEWORKS[framework]||FRAMEWORKS.custom;
    const plan=currentPlanFromUi();
    const hasTerms=plan.concepts.some(c=>(c.terms||[]).length);
    if(hasTerms&&!confirm('Apply '+framework.toUpperCase()+' labels? Your search terms will be kept, but concept labels may change.'))return;
    const max=Math.max(labels.length,plan.concepts.length);
    plan.framework=framework;
    plan.concepts=Array.from({length:max},(_,index)=>({
      id:plan.concepts[index]?.id||'',
      label:labels[index]||plan.concepts[index]?.label||('Concept '+(index+1)),
      terms:plan.concepts[index]?.terms||[]
    }));
    window.QuireStore.saveSearchPlan(plan);
    renderPlan();
  }

  function renderPlan(){
    const plan=window.QuireStore.getSearchPlan();
    document.getElementById('searchFramework').value=plan.framework||'custom';
    document.getElementById('searchDatabases').value=(plan.databases||[]).join(', ');
    document.getElementById('searchLimits').value=plan.limits||'';
    document.getElementById('searchInclusionCriteria').value=plan.inclusionCriteria||'';
    document.getElementById('searchExclusionCriteria').value=plan.exclusionCriteria||'';
    document.getElementById('searchPlanNotes').value=plan.notes||'';
    renderConcepts(plan);
    renderQuery();
  }

  function renderRuns(){
    const mount=document.getElementById('searchRunsList');
    if(!mount)return;
    const rows=window.QuireStore.listSearchRuns();
    document.getElementById('searchRunCount').textContent=rows.length+' '+(rows.length===1?'run':'runs');
    if(!rows.length){
      mount.innerHTML='<div class="search-empty"><strong>No searches logged yet</strong><small>Record each database or source search so your literature-search methods remain reproducible.</small></div>';
      return;
    }
    mount.innerHTML=rows.map(run=>
      '<article class="search-run-row">'+
        '<div class="search-run-date"><strong>'+escapeHtml(prettyDate(run.searchedAt))+'</strong><small>'+escapeHtml(run.databaseName)+'</small></div>'+
        '<div class="search-run-query"><strong>'+escapeHtml(run.queryText||'No query recorded')+'</strong><small>'+escapeHtml(run.notes||'')+'</small></div>'+
        '<div class="search-run-counts"><span><strong>'+run.resultCount+'</strong> results</span><span><strong>'+run.importedCount+'</strong> imported</span><span><strong>'+run.duplicatesRemoved+'</strong> duplicates</span></div>'+
        '<button type="button" data-delete-search-run="'+run.id+'" title="Delete search run">×</button>'+
      '</article>'
    ).join('');
    mount.querySelectorAll('[data-delete-search-run]').forEach(btn=>btn.addEventListener('click',()=>{
      if(!confirm('Delete this search-run record?'))return;
      window.QuireStore.removeSearchRun(btn.dataset.deleteSearchRun);
      render();
    }));
  }

  function openRunModal(){
    const plan=window.QuireStore.getSearchPlan();
    document.getElementById('searchRunDatabase').value='';
    document.getElementById('searchRunDate').value=new Date().toISOString().slice(0,10);
    document.getElementById('searchRunQuery').value=queryFromPlan(plan);
    document.getElementById('searchRunResults').value='';
    document.getElementById('searchRunImported').value='';
    document.getElementById('searchRunDuplicates').value='';
    document.getElementById('searchRunNotes').value='';
    document.getElementById('searchRunMessage').textContent='';
    document.getElementById('searchRunModal').hidden=false;
    setTimeout(()=>document.getElementById('searchRunDatabase')?.focus(),0);
  }

  function saveRun(){
    const databaseName=document.getElementById('searchRunDatabase').value.trim();
    if(!databaseName){
      document.getElementById('searchRunMessage').textContent='Enter the database or source searched.';
      return;
    }
    const run=window.QuireStore.addSearchRun({
      databaseName,
      searchedAt:document.getElementById('searchRunDate').value||null,
      queryText:document.getElementById('searchRunQuery').value.trim(),
      resultCount:Number(document.getElementById('searchRunResults').value)||0,
      importedCount:Number(document.getElementById('searchRunImported').value)||0,
      duplicatesRemoved:Number(document.getElementById('searchRunDuplicates').value)||0,
      notes:document.getElementById('searchRunNotes').value.trim()
    });
    document.getElementById('searchRunModal').hidden=true;
    render();
    window.dispatchEvent(new CustomEvent('quire:search-run-saved',{detail:{run}}));
  }

  function articleOrigin(article){
    const data=article?.citationData||{};
    const discovery=data.discovery||null;
    if(discovery){
      const state=window.QuireStore.getState();
      const gap=discovery.gapId?(state.analysisItems||[]).find(item=>item.id===discovery.gapId&&item.kind==='gap_signal'):null;
      return {
        key:discovery.gapId?'gap_discovery':'crossref_discovery',
        label:discovery.gapId?'Gap-targeted scholarly discovery':'Scholarly candidate discovery',
        detail:[gap?.title,discovery.query].filter(Boolean).join(' · '),
        query:discovery.query||'',
        gapId:discovery.gapId||'',
        runId:discovery.discoveryRunId||''
      };
    }
    if(data.importSource){
      return {key:'reference_import',label:data.importSource+' reference import',detail:data.citationKey?'Citation key '+data.citationKey:'',query:'',gapId:'',runId:''};
    }
    if(data.metadataSource==='Crossref'){
      return {key:'metadata_lookup',label:'Crossref DOI / title lookup',detail:article.doi?'DOI '+article.doi:'Scholarly metadata record',query:'',gapId:'',runId:''};
    }
    if(data.localPdf||data.localFileName){
      return {key:'pdf_upload',label:'Uploaded PDF',detail:data.localFileName||'',query:'',gapId:'',runId:''};
    }
    return {key:'library_record',label:'Library / manual record',detail:'',query:'',gapId:'',runId:''};
  }

  function screenDecisionClass(value){
    if(value==='include')return 'include';
    if(value==='exclude')return 'exclude';
    if(value==='maybe')return 'maybe';
    return 'pending';
  }

  function filteredScreeningRows(){
    const articles=window.QuireStore.listArticles();
    const records=window.QuireStore.listScreeningRecords();
    const map=new Map(records.map(r=>[r.articleId,r]));
    const query=(document.getElementById('screeningSearch')?.value||'').trim().toLowerCase();
    return articles.map(article=>({article,record:map.get(article.id)})).filter(({article,record})=>{
      if(query){
        const origin=articleOrigin(article);
        const hay=[article.title,article.authors,article.year,article.doi,origin.label,origin.detail].filter(Boolean).join(' ').toLowerCase();
        if(!hay.includes(query))return false;
      }
      if(screeningFilter==='pending')return record.titleAbstractDecision==='pending';
      if(screeningFilter==='included')return record.fullTextDecision==='include'||(record.titleAbstractDecision==='include'&&record.fullTextDecision==='not_started');
      if(screeningFilter==='excluded')return record.titleAbstractDecision==='exclude'||record.fullTextDecision==='exclude';
      if(screeningFilter==='maybe')return record.titleAbstractDecision==='maybe'||record.fullTextDecision==='maybe';
      return true;
    });
  }

  function renderScreening(){
    window.QuireStore.ensureScreeningRecords();
    const rows=filteredScreeningRows();
    const mount=document.getElementById('screeningRows');
    if(!mount)return;
    document.getElementById('screeningVisibleCount').textContent=rows.length+' shown';

    document.querySelectorAll('[data-screening-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.screeningFilter===screeningFilter));

    if(!rows.length){
      mount.innerHTML='<div class="search-empty"><strong>No papers in this screening view</strong><small>Add references to the Research Library or change the current filter.</small></div>';
      return;
    }

    mount.innerHTML=rows.map(({article,record})=>{
      const excluded=record.titleAbstractDecision==='exclude'||record.fullTextDecision==='exclude';
      return '<article class="screening-row">'+
        '<div class="screening-paper">'+
          '<span>'+escapeHtml(authorYear(article))+'</span>'+
          '<strong>'+escapeHtml(article.title||'Untitled reference')+'</strong>'+
          '<small>'+escapeHtml([article.journal,article.doi?'DOI '+article.doi:''].filter(Boolean).join(' · '))+'</small>'+
          '<small class="screening-origin '+escapeHtml(articleOrigin(article).key)+'"><b>Origin:</b> '+escapeHtml(articleOrigin(article).label)+(articleOrigin(article).detail?' · '+escapeHtml(articleOrigin(article).detail.slice(0,180)):'')+'</small>'+
          '<button type="button" data-screen-open="'+article.id+'">Open paper →</button>'+
        '</div>'+
        '<label><span>Title / abstract</span><select data-screen-ta="'+article.id+'" class="decision-'+screenDecisionClass(record.titleAbstractDecision)+'">'+
          ['pending','include','maybe','exclude'].map(v=>'<option value="'+v+'" '+(record.titleAbstractDecision===v?'selected':'')+'>'+({pending:'Pending',include:'Include',maybe:'Maybe',exclude:'Exclude'})[v]+'</option>').join('')+
        '</select></label>'+
        '<label><span>Full text</span><select data-screen-ft="'+article.id+'" class="decision-'+screenDecisionClass(record.fullTextDecision)+'">'+
          ['not_started','include','maybe','exclude'].map(v=>'<option value="'+v+'" '+(record.fullTextDecision===v?'selected':'')+'>'+({not_started:'Not started',include:'Include',maybe:'Maybe',exclude:'Exclude'})[v]+'</option>').join('')+
        '</select></label>'+
        '<label class="screening-reason '+(excluded?'visible':'')+'"><span>Exclusion reason</span><input data-screen-reason="'+article.id+'" list="screeningExclusionReasons" type="text" value="'+escapeHtml(record.exclusionReason||'')+'" placeholder="e.g. Wrong population"></label>'+
        '<label class="screening-note"><span>Screening note</span><input data-screen-note="'+article.id+'" type="text" value="'+escapeHtml(record.notes||'')+'" placeholder="Optional note"></label>'+
      '</article>';
    }).join('');

    mount.querySelectorAll('[data-screen-ta]').forEach(select=>select.addEventListener('change',()=>{
      window.QuireStore.updateScreeningRecord(select.dataset.screenTa,{titleAbstractDecision:select.value});
      renderScreening();renderFlow();
    }));
    mount.querySelectorAll('[data-screen-ft]').forEach(select=>select.addEventListener('change',()=>{
      window.QuireStore.updateScreeningRecord(select.dataset.screenFt,{fullTextDecision:select.value});
      renderScreening();renderFlow();
    }));
    mount.querySelectorAll('[data-screen-reason]').forEach(input=>input.addEventListener('change',()=>{
      window.QuireStore.updateScreeningRecord(input.dataset.screenReason,{exclusionReason:input.value.trim()});
    }));
    mount.querySelectorAll('[data-screen-note]').forEach(input=>input.addEventListener('change',()=>{
      window.QuireStore.updateScreeningRecord(input.dataset.screenNote,{notes:input.value.trim()});
    }));
    mount.querySelectorAll('[data-screen-open]').forEach(btn=>btn.addEventListener('click',async()=>{
      window.showView?.('reader');
      try{await window.QuirePdfReader?.openArticle?.(btn.dataset.screenOpen);}catch(e){}
    }));
  }

  function renderFlow(){
    const s=window.QuireStore.screeningSummary();
    const cards=[
      ['searchFlowIdentified',s.identified||s.libraryTotal,'Records identified'],
      ['searchFlowLibrary',s.libraryTotal,'Library records'],
      ['searchFlowScreened',s.titleScreened,'Title/abstract screened'],
      ['searchFlowFullText',s.fullTextAssessed,'Full text assessed'],
      ['searchFlowIncluded',s.fullTextIncluded,'Included after full text']
    ];
    cards.forEach(([id,value])=>{const node=document.getElementById(id);if(node)node.textContent=String(value);});
    const detail=document.getElementById('searchFlowDetail');
    if(detail)detail.textContent=
      'PRISMA-style audit counts · '+s.titleExcluded+' excluded at title/abstract · '+s.fullTextExcluded+' excluded at full text · '+s.duplicatesRemoved+' duplicates logged as removed';
  }


  function csvCell(value){
    return '"'+String(value??'').replace(/"/g,'""').replace(/\r?\n/g,' ')+'"';
  }

  function safeFilename(value){
    return String(value||'quire').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'quire';
  }

  function exportAuditCsv(){
    const plan=window.QuireStore.getSearchPlan();
    const runs=window.QuireStore.listSearchRuns();
    const records=window.QuireStore.listScreeningRecords();
    const articles=window.QuireStore.listArticles();
    const articleMap=new Map(articles.map(article=>[article.id,article]));
    const summary=window.QuireStore.screeningSummary();
    const header=[
      'record_type','date','framework','database_or_source','article_title','authors',
      'query','record_origin','discovery_gap_id','title_abstract_decision','full_text_decision','exclusion_reason',
      'result_count','imported_count','duplicates_removed','limits',
      'inclusion_criteria','exclusion_criteria','notes'
    ];
    const rows=[header];

    rows.push([
      'search_plan',plan.updatedAt||plan.createdAt||'',plan.framework||'',
      (plan.databases||[]).join('; '),'','',queryFromPlan(plan),'','','','','','','','',
      plan.limits||'',plan.inclusionCriteria||'',plan.exclusionCriteria||'',plan.notes||''
    ]);

    runs.forEach(run=>rows.push([
      'search_run',run.searchedAt||run.createdAt||'',plan.framework||'',run.databaseName||'',
      '','',run.queryText||'','logged_search_run','','','','','',
      run.resultCount||0,run.importedCount||0,run.duplicatesRemoved||0,
      '','','',run.notes||''
    ]));

    const discoveryRuns=(window.QuireStore.getState().analysisItems||[])
      .filter(item=>item.projectId===window.QuireStore.getActiveProjectId()&&item.kind==='literature_discovery_run');
    discoveryRuns.forEach(item=>{
      const p=item.payload||{};
      rows.push([
        'discovery_run',p.searchedAt||item.createdAt||'',plan.framework||'',p.source||'Crossref',
        '','',p.query||'','scholarly_candidate_discovery',p.gapId||'','','','',
        p.candidateCount||0,(p.importedArticleIds||[]).length,p.duplicateCount||0,
        '','','',p.boundary||''
      ]);
    });

    records.forEach(record=>{
      const article=articleMap.get(record.articleId)||{};
      const origin=articleOrigin(article);
      rows.push([
        'screening',record.screenedAt||record.updatedAt||'',plan.framework||'','',
        article.title||'',article.authors||'',origin.query||'',origin.label||'',origin.gapId||'',
        record.titleAbstractDecision||'pending',record.fullTextDecision||'not_started',
        record.exclusionReason||'','','','','','','',record.notes||''
      ]);
    });

    rows.push([
      'flow_summary','','','','','','','','','','','','','','','','','',
      'identified='+summary.identified+
      '; library='+summary.libraryTotal+
      '; title_abstract_screened='+summary.titleScreened+
      '; title_abstract_excluded='+summary.titleExcluded+
      '; full_text_assessed='+summary.fullTextAssessed+
      '; full_text_excluded='+summary.fullTextExcluded+
      '; included='+summary.fullTextIncluded+
      '; duplicates_removed='+summary.duplicatesRemoved
    ]);

    const csv='\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const project=window.QuireStore.getActiveProject?.()||{};
    a.href=url;
    a.download=safeFilename(project.title||'quire')+'-search-screening-audit.csv';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
    window.dispatchEvent(new CustomEvent('quire:search-audit-exported',{detail:{runs:runs.length,screening:records.length}}));
  }

  function render(){
    renderPlan();renderRuns();renderScreening();renderFlow();
  }

  function bind(){
    document.getElementById('searchFramework')?.addEventListener('change',applyFrameworkLabels);
    ['searchDatabases','searchLimits','searchInclusionCriteria','searchExclusionCriteria','searchPlanNotes'].forEach(id=>document.getElementById(id)?.addEventListener('input',queuePlanSave));
    document.getElementById('addSearchConceptBtn')?.addEventListener('click',()=>{
      const plan=currentPlanFromUi();
      plan.concepts.push({id:'',label:'Concept '+(plan.concepts.length+1),terms:[]});
      window.QuireStore.saveSearchPlan(plan);
      renderPlan();
    });
    document.getElementById('copySearchQueryBtn')?.addEventListener('click',async()=>{
      const query=queryFromPlan();
      if(!query)return;
      try{await navigator.clipboard.writeText(query);}catch(e){}
      window.dispatchEvent(new CustomEvent('quire:search-query-copied'));
    });
    document.getElementById('newSearchRunBtn')?.addEventListener('click',openRunModal);
    document.getElementById('exportSearchAuditBtn')?.addEventListener('click',exportAuditCsv);
    document.getElementById('closeSearchRunModal')?.addEventListener('click',()=>document.getElementById('searchRunModal').hidden=true);
    document.getElementById('cancelSearchRun')?.addEventListener('click',()=>document.getElementById('searchRunModal').hidden=true);
    document.getElementById('saveSearchRun')?.addEventListener('click',saveRun);
    document.getElementById('searchRunModal')?.addEventListener('click',e=>{if(e.target.id==='searchRunModal')e.currentTarget.hidden=true;});

    document.querySelectorAll('[data-screening-filter]').forEach(btn=>btn.addEventListener('click',()=>{
      screeningFilter=btn.dataset.screeningFilter;renderScreening();
    }));
    document.getElementById('screeningSearch')?.addEventListener('input',renderScreening);
    document.getElementById('searchOpenReferencesBtn')?.addEventListener('click',()=>document.getElementById('openReferenceManager')?.click());

    window.addEventListener('quire:project-switched',()=>{screeningFilter='all';render();});
    window.addEventListener('quire:cloud-pulled',render);
    window.addEventListener('quire:references-imported',render);
    window.addEventListener('quire:metadata-saved',render);
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireSearchScreening={render,queryFromPlan,exportAuditCsv};
})();