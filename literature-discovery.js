/* Quire Literature Discovery from Search Plan — Step 65 */
(function(){
  let results=[];
  let discoveryRunId=null;
  let lastQuery='';
  let lastGapId='';

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function normalTitle(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
  function doiKey(v){return String(v||'').trim().toLowerCase();}
  function projectId(){return window.QuireStore?.getActiveProjectId?.();}
  function plan(){return window.QuireStore?.getSearchPlan?.()||{};}
  function activeGap(){return window.QuireGapSearch?.currentGap?.()||null;}

  function queryFromPlan(){
    const p=plan();
    const conceptTerms=(p.concepts||[]).flatMap(concept=>(concept.terms||[]).slice(0,5));
    const unique=[...new Set(conceptTerms.map(t=>String(t||'').trim()).filter(Boolean))];
    if(unique.length)return unique.slice(0,18).join(' ');
    const gap=activeGap();
    if(gap){
      const gp=gap.payload||{};
      return [gap.title,gp.nextSearch,gp.observation].filter(Boolean).join(' ').slice(0,500);
    }
    const project=window.QuireStore?.getActiveProject?.()||{};
    return String(project.researchQuestion||project.title||'').trim();
  }

  function duplicateFor(item){
    const library=window.QuireStore?.listArticles?.()||[];
    const doi=doiKey(item?.doi);
    if(doi){
      const byDoi=library.find(a=>doiKey(a.doi)===doi);
      if(byDoi)return byDoi;
    }
    const title=normalTitle(item?.title);
    if(title&&title.length>12){
      return library.find(a=>normalTitle(a.title)===title)||null;
    }
    return null;
  }

  function candidateMeta(item){
    return [item.authors,item.year,item.journal].filter(Boolean).join(' · ');
  }

  function openPanel(){
    const panel=document.getElementById('literatureDiscoveryPanel');if(!panel)return;
    panel.hidden=false;
    const query=document.getElementById('literatureDiscoveryQuery');
    if(query&&!query.value.trim())query.value=queryFromPlan();
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function closePanel(){
    const panel=document.getElementById('literatureDiscoveryPanel');
    if(panel)panel.hidden=true;
  }

  function render(){
    const mount=document.getElementById('literatureDiscoveryResults');
    const status=document.getElementById('literatureDiscoveryStatus');
    const importBtn=document.getElementById('importDiscoveryCandidatesBtn');
    if(!mount||!status||!importBtn)return;

    if(!results.length){
      mount.innerHTML='<div class="literature-discovery-empty"><strong>No discovery results yet</strong><small>Run a scholarly metadata search from your research-plan concepts. Candidates are not added to your library automatically.</small></div>';
      importBtn.disabled=true;
      return;
    }

    const newCount=results.filter(item=>!duplicateFor(item)).length;
    const existingCount=results.length-newCount;
    status.textContent=results.length+' candidates · '+newCount+' new · '+existingCount+' already in library';

    mount.innerHTML=results.map((item,index)=>{
      const duplicate=duplicateFor(item);
      const abstract=String(item.abstract||'').trim();
      return '<article class="literature-candidate '+(duplicate?'duplicate':'')+'">'+
        '<label class="candidate-select">'+
          '<input type="checkbox" data-discovery-select="'+index+'" '+(duplicate?'disabled':'')+'>'+
          '<span></span>'+
        '</label>'+
        '<div class="candidate-body">'+
          '<div class="candidate-label">'+(duplicate?'ALREADY IN LIBRARY':'SCHOLARLY CANDIDATE · NOT YET VERIFIED')+'</div>'+
          '<h3>'+escapeHtml(item.title||'Untitled candidate')+'</h3>'+
          '<p class="candidate-meta">'+escapeHtml(candidateMeta(item)||'Metadata incomplete')+'</p>'+
          '<p class="candidate-abstract">'+escapeHtml(abstract?abstract.slice(0,520):'No abstract supplied in this Crossref record. Inspect the article record/full paper before screening it in.')+'</p>'+
          '<div class="candidate-details">'+
            (item.doi?'<span>DOI '+escapeHtml(item.doi)+'</span>':'<span>No DOI supplied</span>')+
            (duplicate?'<span>Matches: '+escapeHtml(duplicate.title||'library record')+'</span>':'')+
          '</div>'+
        '</div>'+
        '<div class="candidate-actions">'+
          (item.sourceUrl?'<button type="button" data-discovery-open-record="'+index+'">Open record ↗</button>':'')+
          (duplicate?'<button type="button" data-discovery-open-library="'+escapeHtml(duplicate.id)+'">Open library record</button>':'')+
        '</div>'+
      '</article>';
    }).join('');

    mount.querySelectorAll('[data-discovery-select]').forEach(input=>input.addEventListener('change',updateImportState));
    mount.querySelectorAll('[data-discovery-open-record]').forEach(btn=>btn.addEventListener('click',()=>{
      const item=results[Number(btn.dataset.discoveryOpenRecord)];
      if(item?.sourceUrl)window.open(item.sourceUrl,'_blank','noopener');
    }));
    mount.querySelectorAll('[data-discovery-open-library]').forEach(btn=>btn.addEventListener('click',async()=>{
      window.showView?.('reader');
      try{await window.QuirePdfReader?.openArticle?.(btn.dataset.discoveryOpenLibrary);}catch(e){}
    }));
    updateImportState();
  }

  function selectedIndices(){
    return [...document.querySelectorAll('[data-discovery-select]:checked')].map(input=>Number(input.dataset.discoverySelect));
  }

  function updateImportState(){
    const button=document.getElementById('importDiscoveryCandidatesBtn');if(!button)return;
    const count=selectedIndices().length;
    button.disabled=count===0;
    button.textContent=count?'Import '+count+' selected to screening queue':'Import selected to screening queue';
  }

  function recordDiscoveryRun(query,candidates){
    const gap=activeGap();
    const row=window.QuireStore.addAnalysisItem({
      kind:'literature_discovery_run',
      title:'Scholarly candidate discovery',
      status:'draft',
      payload:{
        source:'Crossref',
        query,
        gapId:gap?.id||'',
        candidateCount:candidates.length,
        importedArticleIds:[],
        duplicateCount:candidates.filter(item=>duplicateFor(item)).length,
        searchedAt:new Date().toISOString(),
        boundary:'Metadata discovery only. Candidate relevance and evidentiary value require researcher screening and paper inspection.'
      }
    });
    discoveryRunId=row.id;
    lastGapId=gap?.id||'';
    return row;
  }

  async function runSearch(){
    const queryNode=document.getElementById('literatureDiscoveryQuery');
    const status=document.getElementById('literatureDiscoveryStatus');
    const button=document.getElementById('runLiteratureDiscoveryBtn');
    const mount=document.getElementById('literatureDiscoveryResults');
    const query=String(queryNode?.value||'').trim();
    if(!query){
      if(status)status.textContent='Add search concepts or enter a discovery query first.';
      queryNode?.focus();
      return;
    }
    if(!window.QuireMetadata?.searchBatch){
      if(status)status.textContent='Scholarly metadata search is unavailable.';
      return;
    }
    if(button){button.disabled=true;button.textContent='Searching…';}
    if(status)status.textContent='Searching scholarly metadata…';
    if(mount)mount.innerHTML='<div class="literature-discovery-loading">Searching Crossref for candidate records…</div>';
    try{
      const rows=Number(document.getElementById('literatureDiscoveryRows')?.value)||20;
      results=await window.QuireMetadata.searchBatch(query,{rows});
      lastQuery=query;
      recordDiscoveryRun(query,results);
      render();
    }catch(error){
      results=[];
      if(status)status.textContent='Candidate search unavailable';
      if(mount)mount.innerHTML='<div class="literature-discovery-error"><strong>Scholarly metadata search could not be reached</strong><small>'+escapeHtml(error.message||'Unknown search error')+'. Your saved search plan is unchanged.</small></div>';
      updateImportState();
    }finally{
      if(button){button.disabled=false;button.textContent='Search scholarly metadata';}
    }
  }

  function selectNew(){
    document.querySelectorAll('[data-discovery-select]:not(:disabled)').forEach(input=>input.checked=true);
    updateImportState();
  }

  function importSelected(){
    const selected=selectedIndices().map(index=>results[index]).filter(Boolean);
    if(!selected.length)return;
    const imported=[];
    let skipped=0;
    selected.forEach(item=>{
      if(duplicateFor(item)){skipped++;return;}
      const article=window.QuireStore.addArticle({
        ...item,
        citationData:{
          ...(item.citationData||{}),
          discovery:{
            source:'Crossref',
            query:lastQuery,
            discoveredAt:new Date().toISOString(),
            discoveryRunId:discoveryRunId||'',
            gapId:lastGapId||'',
            status:'candidate_imported_for_screening',
            boundary:'Imported from scholarly metadata discovery. Relevance and evidentiary value are not yet verified.'
          }
        }
      });
      imported.push(article.id);
    });

    if(discoveryRunId){
      const run=window.QuireStore.getAnalysisItem(discoveryRunId);
      if(run){
        const p=run.payload||{};
        window.QuireStore.updateAnalysisItem(discoveryRunId,{
          payload:{...p,importedArticleIds:[...new Set([...(p.importedArticleIds||[]),...imported])],importedCount:(p.importedArticleIds||[]).length+imported.length}
        });
      }
    }
    window.QuireStore.ensureScreeningRecords?.();
    window.QuireSearchScreening?.render?.();
    render();
    const status=document.getElementById('literatureDiscoveryStatus');
    if(status)status.textContent=imported.length+' imported for screening'+(skipped?' · '+skipped+' duplicate'+(skipped===1?'':'s')+' skipped':'');
    window.dispatchEvent(new CustomEvent('quire:literature-candidates-imported',{detail:{imported:imported.length,skipped,query:lastQuery,discoveryRunId}}));
  }

  function refreshQueryFromPlan(){
    const node=document.getElementById('literatureDiscoveryQuery');
    if(node)node.value=queryFromPlan();
  }

  function bind(){
    document.getElementById('openLiteratureDiscoveryBtn')?.addEventListener('click',()=>{refreshQueryFromPlan();openPanel();});
    document.getElementById('closeLiteratureDiscoveryBtn')?.addEventListener('click',closePanel);
    document.getElementById('runLiteratureDiscoveryBtn')?.addEventListener('click',runSearch);
    document.getElementById('selectNewDiscoveryBtn')?.addEventListener('click',selectNew);
    document.getElementById('importDiscoveryCandidatesBtn')?.addEventListener('click',importSelected);
    document.getElementById('literatureDiscoveryQuery')?.addEventListener('keydown',event=>{
      if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();runSearch();}
    });
    window.addEventListener('quire:gap-search-request',()=>setTimeout(refreshQueryFromPlan,0));
    window.addEventListener('quire:project-switched',()=>{
      results=[];discoveryRunId=null;lastQuery='';lastGapId='';
      closePanel();render();
    });
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireLiteratureDiscovery={open:openPanel,runSearch,render,queryFromPlan,duplicateFor};
})();