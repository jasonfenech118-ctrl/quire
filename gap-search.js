/* Quire Gap → Search Iteration — Step 58 */
(function(){
  const STOP=new Set('the and for with from into about this that what where when which why how does did have has had were was are is be been being a an of to in on at by as or not no more less limited evidence research study studies paper papers literature possible gap issue problem current review'.split(' '));

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function pid(){return window.QuireStore?.getActiveProjectId?.();}
  function storageKey(){return 'quire_gap_search_context_v1:'+(pid()||'none');}
  function readGapId(){try{return localStorage.getItem(storageKey())||'';}catch(e){return '';}}
  function writeGapId(id){try{if(id)localStorage.setItem(storageKey(),id);else localStorage.removeItem(storageKey());}catch(e){}}
  function gapById(id){
    const state=window.QuireStore?.getState?.()||{};
    return (state.analysisItems||[]).find(item=>item.id===id&&item.projectId===pid()&&item.kind==='gap_signal')||null;
  }
  function currentGap(){return gapById(readGapId());}
  function payload(gap){
    const p=gap?.payload&&typeof gap.payload==='object'?gap.payload:{};
    return {
      ...p,
      observation:String(p.observation||''),
      evidence:String(p.evidence||''),
      nextSearch:String(p.nextSearch||''),
      gapStatus:String(p.gapStatus||'emerging'),
      searchTests:Array.isArray(p.searchTests)?p.searchTests:[]
    };
  }

  function terms(gap){
    if(!gap)return [];
    const p=payload(gap);
    const raw=[gap.title,p.observation,p.nextSearch].filter(Boolean).join(' ').toLowerCase();
    const tokens=raw.replace(/[^a-z0-9\- ]+/g,' ').split(/\s+/)
      .map(x=>x.trim()).filter(x=>x.length>3&&!STOP.has(x));
    const counts=new Map();
    tokens.forEach(t=>counts.set(t,(counts.get(t)||0)+1));
    return [...counts.entries()]
      .sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length)
      .map(([t])=>t).slice(0,12);
  }

  function queryForGap(gap){
    const ts=terms(gap);
    if(!ts.length)return '';
    return '('+ts.map(t=>/\s/.test(t)?'"'+t+'"':t).join(' OR ')+')';
  }

  function markTesting(gap){
    if(!gap)return;
    const p=payload(gap);
    if(['emerging','narrowed'].includes(p.gapStatus)){
      window.QuireStore.updateAnalysisItem(gap.id,{payload:{...p,gapStatus:'testing'}});
    }
  }

  function addConcept(gap){
    if(!gap)return;
    const suggested=terms(gap);
    if(!suggested.length)return;
    const plan=window.QuireStore.getSearchPlan();
    const label='Gap test: '+String(gap.title||'possible gap').slice(0,55);
    const concepts=Array.isArray(plan.concepts)?plan.concepts.slice():[];
    const existing=concepts.find(c=>String(c.label||'').toLowerCase()===label.toLowerCase());
    if(existing){
      existing.terms=[...new Set([...(existing.terms||[]),...suggested])];
    }else{
      concepts.push({id:'',label,terms:suggested});
    }
    window.QuireStore.saveSearchPlan({...plan,concepts});
    markTesting(gap);
    window.QuireSearchScreening?.render?.();
    render();
  }

  function openRunModal(gap){
    if(!gap)return;
    document.getElementById('newSearchRunBtn')?.click();
    setTimeout(()=>{
      const query=document.getElementById('searchRunQuery');
      const notes=document.getElementById('searchRunNotes');
      if(query&&!query.value.trim())query.value=queryForGap(gap);
      else if(query){
        const proposed=queryForGap(gap);
        if(proposed&&!query.value.includes(proposed))query.value=(query.value.trim()?query.value.trim()+'\nAND\n':'')+proposed;
      }
      if(notes&&!notes.value.trim())notes.value='Targeted gap test: '+gap.title;
    },0);
    markTesting(gap);
  }

  function appendSearchTest(gap,run){
    if(!gap||!run)return;
    const p=payload(gap);
    const tests=p.searchTests.slice();
    if(tests.some(t=>t.runId===run.id))return;
    tests.push({
      runId:run.id,
      databaseName:run.databaseName||'',
      searchedAt:run.searchedAt||'',
      resultCount:Number(run.resultCount)||0,
      importedCount:Number(run.importedCount)||0,
      queryText:String(run.queryText||''),
      createdAt:new Date().toISOString()
    });
    window.QuireStore.updateAnalysisItem(gap.id,{payload:{...p,gapStatus:'testing',searchTests:tests}});
  }

  function render(){
    const mount=document.getElementById('gapSearchContext');if(!mount)return;
    const gap=currentGap();
    if(!gap){mount.hidden=true;mount.innerHTML='';return;}
    const p=payload(gap);
    const suggested=terms(gap);
    mount.hidden=false;
    mount.innerHTML=
      '<div class="gap-search-copy">'+
        '<span class="eyebrow">TARGETED GAP TEST</span>'+
        '<h2>'+escapeHtml(gap.title)+'</h2>'+
        '<p>'+(escapeHtml(p.nextSearch||'Use a targeted search to look for literature that could support, narrow or challenge this possible gap.'))+'</p>'+
        '<small>This is a search iteration, not proof that the gap exists. Terms below are derived only from your own recorded gap text.</small>'+
      '</div>'+
      '<div class="gap-search-terms">'+
        '<span>Suggested terms from your gap note</span>'+
        '<div>'+suggested.map(t=>'<b>'+escapeHtml(t)+'</b>').join('')+(suggested.length?'':'<em>Add more detail to the gap note to generate useful terms.</em>')+'</div>'+
      '</div>'+
      '<div class="gap-search-actions">'+
        '<button class="primary-btn" id="gapSearchAddConcept" type="button" '+(suggested.length?'':'disabled')+'>＋ Add as separate search concept</button>'+
        '<button class="soft-btn" id="gapSearchLogRun" type="button">Log targeted search</button>'+
        '<button class="text-btn" id="gapSearchBack" type="button">← Gap Explorer</button>'+
        '<button class="text-btn" id="gapSearchDismiss" type="button">Clear context</button>'+
      '</div>'+
      '<div class="gap-search-history">'+
        '<strong>'+p.searchTests.length+' linked search test'+(p.searchTests.length===1?'':'s')+'</strong>'+
        (p.searchTests.length?'<small>'+escapeHtml(p.searchTests.slice(-3).map(t=>(t.databaseName||'Source')+(t.searchedAt?' · '+t.searchedAt:'')+' · '+(t.resultCount||0)+' results').join(' | '))+'</small>':'<small>No targeted search has been logged against this gap yet.</small>')+
      '</div>';

    document.getElementById('gapSearchAddConcept')?.addEventListener('click',()=>addConcept(gap));
    document.getElementById('gapSearchLogRun')?.addEventListener('click',()=>openRunModal(gap));
    document.getElementById('gapSearchBack')?.addEventListener('click',()=>window.showView?.('synthesis'));
    document.getElementById('gapSearchDismiss')?.addEventListener('click',()=>{writeGapId('');render();});
  }

  function bind(){
    window.addEventListener('quire:gap-search-request',event=>{
      const id=event.detail?.gapId||'';
      const gap=gapById(id);
      if(!gap)return;
      writeGapId(id);
      markTesting(gap);
      render();
    });
    window.addEventListener('quire:search-run-saved',event=>{
      const gap=currentGap();
      if(gap&&event.detail?.run)appendSearchTest(gap,event.detail.run);
      render();
    });
    window.addEventListener('quire:project-switched',render);
    window.addEventListener('quire:store-changed',render);
    window.addEventListener('quire:view-changed',event=>{if(event.detail?.viewId==='searchscreen')render();});
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireGapSearch={render,currentGap,terms,queryForGap,addConcept};
})();