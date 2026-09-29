/* Quire Product Polish — Step 23 */
(function(){
  let searchResults=[];
  let searchIndex=-1;
  let previousModalFocus=null;

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function textFromHtml(html=''){
    const div=document.createElement('div');div.innerHTML=String(html);
    return (div.textContent||'').replace(/\s+/g,' ').trim();
  }
  function truncate(v,n=100){const s=String(v||'');return s.length>n?s.slice(0,n-1)+'…':s;}
  function normalize(v=''){return String(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
  function terms(v=''){return normalize(v).split(' ').filter(Boolean);}

  function activeState(){
    const state=window.QuireStore?.getState?.()||{};
    const projectId=window.QuireStore?.getActiveProjectId?.();
    return {state,projectId};
  }

  function buildSearchIndex(){
    const {state,projectId}=activeState();
    if(!projectId)return [];
    const chapters=(state.chapters||[]).filter(x=>x.projectId===projectId);
    const articles=(state.articles||[]).filter(x=>x.projectId===projectId);
    const rows=[];

    chapters.forEach(ch=>rows.push({
      type:'chapter',id:ch.id,title:ch.title,
      meta:'Chapter '+(ch.number||ch.orderIndex||''),
      text:[ch.title,ch.number].join(' ')
    }));

    (state.sections||[]).filter(x=>x.projectId===projectId).forEach(sec=>{
      const chapter=chapters.find(c=>c.id===sec.chapterId);
      rows.push({
        type:'section',id:sec.id,title:sec.title,
        meta:(chapter?.title||'Chapter')+' · '+(sec.currentWordCount||0)+' words',
        text:[sec.title,textFromHtml(sec.content),chapter?.title].join(' ')
      });
    });

    articles.forEach(a=>rows.push({
      type:'article',id:a.id,title:a.title,
      meta:[a.authors,a.journal,a.year,a.doi].filter(Boolean).join(' · '),
      text:[a.title,a.authors,a.journal,a.year,a.doi,a.abstract].join(' ')
    }));

    (state.highlights||[]).filter(x=>x.projectId===projectId).forEach(h=>{
      const article=articles.find(a=>a.id===h.articleId);
      rows.push({
        type:'highlight',id:h.id,articleId:h.articleId,page:h.pageNumber,
        title:truncate(h.highlightedText,82),
        meta:(article?.title||'Article')+' · p. '+(h.pageNumber||'—'),
        text:[h.highlightedText,h.category,article?.title,article?.authors].join(' ')
      });
    });

    (state.notes||[]).filter(x=>x.projectId===projectId).forEach(n=>{
      const article=articles.find(a=>a.id===n.articleId);
      rows.push({
        type:'note',id:n.id,articleId:n.articleId,
        title:n.title||truncate(n.body,82)||'Research note',
        meta:article?.title||n.noteType||'Note',
        text:[n.title,n.body,(n.tags||[]).join(' '),article?.title].join(' ')
      });
    });

    (state.themes||[]).filter(x=>x.projectId===projectId).forEach(t=>rows.push({
      type:'theme',id:t.id,title:t.name,meta:'Theme',text:[t.name,t.description].join(' ')
    }));

    (state.objectives||[]).filter(x=>x.projectId===projectId).forEach(o=>rows.push({
      type:'objective',id:o.id,title:o.title,meta:'Objective '+(o.orderIndex||''),text:[o.title,o.description].join(' ')
    }));

    (state.feedbackItems||[]).filter(x=>x.projectId===projectId).forEach(f=>{
      const section=(state.sections||[]).find(s=>s.id===f.sectionId);
      rows.push({
        type:'feedback',id:f.id,sectionId:f.sectionId,
        title:truncate(f.comment,82),meta:'Supervisor feedback'+(section?' · '+section.title:''),
        text:[f.comment,f.selectedText,f.researcherResponse,f.category,section?.title].join(' ')
      });
    });

    return rows;
  }

  function score(row,queryTerms){
    const hay=normalize(row.text);
    const title=normalize(row.title);
    let total=0;
    for(const term of queryTerms){
      if(title===term)total+=20;
      else if(title.startsWith(term))total+=9;
      else if(title.includes(term))total+=6;
      if(hay.includes(term))total+=2;
      else return 0;
    }
    return total;
  }

  function search(query){
    const q=terms(query);
    if(!q.length)return [];
    return buildSearchIndex()
      .map(row=>({...row,score:score(row,q)}))
      .filter(row=>row.score>0)
      .sort((a,b)=>b.score-a.score||String(a.title).localeCompare(String(b.title)))
      .slice(0,18);
  }

  function icon(type){
    return ({article:'PDF',section:'§',chapter:'¶',highlight:'"',note:'✎',theme:'◇',objective:'◎',feedback:'☷'})[type]||'•';
  }

  function renderSearch(query){
    const box=document.getElementById('globalSearchResults');
    if(!box)return;
    const value=String(query||'').trim();
    if(!value){
      box.hidden=true;box.innerHTML='';searchResults=[];searchIndex=-1;return;
    }

    searchResults=search(value);searchIndex=searchResults.length?0:-1;
    box.hidden=false;
    if(!searchResults.length){
      box.innerHTML='<div class="global-search-empty"><strong>No matches</strong><small>Search papers, authors, chapter text, notes, highlights, themes or feedback.</small></div>';
      return;
    }
    box.innerHTML='<div class="global-search-head"><span>'+searchResults.length+' results</span><small>↑↓ navigate · Enter open · Esc close</small></div>'+
      searchResults.map((row,index)=>
        '<button type="button" class="global-search-result '+(index===searchIndex?'active':'')+'" data-search-result="'+index+'">'+
          '<span class="global-search-icon">'+escapeHtml(icon(row.type))+'</span>'+
          '<div><strong>'+escapeHtml(row.title)+'</strong><small>'+escapeHtml(row.meta||row.type)+'</small></div>'+
          '<em>'+escapeHtml(row.type)+'</em>'+
        '</button>'
      ).join('');
    box.querySelectorAll('[data-search-result]').forEach(btn=>btn.addEventListener('click',()=>openResult(searchResults[Number(btn.dataset.searchResult)])));
  }

  function setSearchIndex(index){
    if(!searchResults.length)return;
    searchIndex=(index+searchResults.length)%searchResults.length;
    document.querySelectorAll('[data-search-result]').forEach((node,i)=>node.classList.toggle('active',i===searchIndex));
    document.querySelector('[data-search-result="'+searchIndex+'"]')?.scrollIntoView({block:'nearest'});
  }

  async function openResult(row){
    if(!row)return;
    closeSearch();
    if(row.type==='article'){
      window.showView?.('reader');
      try{await window.QuirePdfReader?.openArticle?.(row.id);}catch(e){}
    }else if(row.type==='section'){
      window.QuireChapterEditor?.openSection?.(row.id);window.showView?.('chapters');
    }else if(row.type==='chapter'){
      window.QuireChapterEditor?.openChapter?.(row.id);window.showView?.('chapters');
    }else if(row.type==='highlight'){
      window.showView?.('reader');
      try{
        await window.QuirePdfReader?.openArticle?.(row.articleId);
        if(row.page)await window.QuirePdfReader?.renderPage?.(row.page);
      }catch(e){}
    }else if(row.type==='note'){
      if(row.articleId){
        window.showView?.('reader');
        try{await window.QuirePdfReader?.openArticle?.(row.articleId);}catch(e){}
      }else window.showView?.('library');
    }else if(row.type==='theme'||row.type==='objective'){
      window.showView?.('map');
      setTimeout(()=>window.QuireThesisMap?.focusNode?.(row.type,row.id),50);
    }else if(row.type==='feedback'){
      if(row.sectionId)window.QuireChapterEditor?.openSection?.(row.sectionId);
      window.showView?.('supervision');
    }
  }

  function closeSearch(){
    const box=document.getElementById('globalSearchResults');
    if(box){box.hidden=true;box.innerHTML='';}
    searchResults=[];searchIndex=-1;
  }

  function sanitizeBackupState(input){
    if(!input||!Array.isArray(input.projects))throw new Error('This is not a valid Quire workspace backup.');
    const state=JSON.parse(JSON.stringify(input));
    const arrays=['projects','studySetups','objectives','chapters','sections','articles','highlights','notes','themes','articleThemes','evidenceLinks','milestones','progressSnapshots','aiThreads','aiMessages','reviewRounds','feedbackItems','sectionVersions'];
    arrays.forEach(key=>{if(!Array.isArray(state[key]))state[key]=[];});
    const sanitizeHtml=html=>{
      const root=document.createElement('div');root.innerHTML=String(html||'');
      root.querySelectorAll('script,style,iframe,object,embed,form,link,meta').forEach(n=>n.remove());
      root.querySelectorAll('*').forEach(node=>{
        [...node.attributes].forEach(attr=>{
          const name=attr.name.toLowerCase();
          const value=attr.value||'';
          if(name.startsWith('on'))node.removeAttribute(attr.name);
          if((name==='href'||name==='src')&&/^\s*javascript:/i.test(value))node.removeAttribute(attr.name);
        });
      });
      return root.innerHTML;
    };
    state.sections.forEach(s=>{s.content=sanitizeHtml(s.content);});
    state.sectionVersions.forEach(v=>{v.content=sanitizeHtml(v.content);});
    if(!state.projects.some(p=>p.id===state.activeProjectId))state.activeProjectId=state.projects[0]?.id||null;
    state.version=1;
    return state;
  }


  function relativeTime(value){
    const date=new Date(value||0);
    if(Number.isNaN(date.getTime()))return 'Recently';
    const seconds=Math.max(0,Math.floor((Date.now()-date.getTime())/1000));
    if(seconds<60)return 'Just now';
    const mins=Math.floor(seconds/60);if(mins<60)return mins+' min ago';
    const hours=Math.floor(mins/60);if(hours<24)return hours+' hr'+(hours===1?'':'s')+' ago';
    const days=Math.floor(hours/24);if(days<7)return days+' day'+(days===1?'':'s')+' ago';
    return date.toLocaleDateString(undefined,{day:'numeric',month:'short'});
  }

  function recentWorkRows(){
    const {state,projectId}=activeState();
    if(!projectId)return [];
    const chapters=(state.chapters||[]).filter(x=>x.projectId===projectId);
    const rows=[];

    (state.sections||[]).filter(x=>x.projectId===projectId && (x.content||x.currentWordCount)).forEach(section=>{
      const chapter=chapters.find(c=>c.id===section.chapterId);
      rows.push({
        type:'section',id:section.id,
        title:(chapter?.title?chapter.title+' — ':'')+section.title,
        detail:(Number(section.currentWordCount)||0).toLocaleString()+' words',
        at:section.updatedAt||section.createdAt,
        icon:'§',iconClass:'chapter'
      });
    });

    (state.articles||[]).filter(x=>x.projectId===projectId).forEach(article=>{
      const highlightCount=(state.highlights||[]).filter(h=>h.articleId===article.id).length;
      rows.push({
        type:'article',id:article.id,title:article.title,
        detail:highlightCount?highlightCount+' highlight'+(highlightCount===1?'':'s'):((article.readingStatus||'unread').replace(/_/g,' ')),
        at:article.updatedAt||article.createdAt,
        icon:'PDF',iconClass:''
      });
    });

    (state.notes||[]).filter(x=>x.projectId===projectId).forEach(note=>{
      rows.push({
        type:'note',id:note.id,articleId:note.articleId,
        title:note.title||truncate(note.body,72)||'Research note',
        detail:'Research note',at:note.updatedAt||note.createdAt,
        icon:'✎',iconClass:'note'
      });
    });

    (state.feedbackItems||[]).filter(x=>x.projectId===projectId).forEach(item=>{
      rows.push({
        type:'feedback',id:item.id,sectionId:item.sectionId,
        title:truncate(item.comment,72),detail:'Supervisor feedback · '+(item.status||'open').replace(/_/g,' '),
        at:item.updatedAt||item.createdAt,icon:'☷',iconClass:'note'
      });
    });

    return rows.filter(r=>r.at).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,5);
  }

  function renderRecentWork(){
    const mount=document.getElementById('dashboardRecentWork');
    if(!mount)return;
    const rows=recentWorkRows();
    if(!rows.length){
      mount.innerHTML='<div class="recent-work-empty">Your recent writing, papers and research notes will appear here.</div>';
      return;
    }
    mount.innerHTML=rows.map((row,index)=>
      '<button class="recent-item" type="button" data-recent-index="'+index+'">'+
        '<div class="file-icon '+escapeHtml(row.iconClass||'')+'">'+escapeHtml(row.icon)+'</div>'+
        '<div><strong>'+escapeHtml(row.title)+'</strong><small>'+escapeHtml(row.detail)+' · '+escapeHtml(relativeTime(row.at))+'</small></div>'+
        '<span>›</span>'+
      '</button>'
    ).join('');
    mount.querySelectorAll('[data-recent-index]').forEach(btn=>btn.addEventListener('click',()=>openResult(rows[Number(btn.dataset.recentIndex)])));
  }

  function downloadBackup(){
    const state=window.QuireStore.getState();
    const payload={
      format:'quire-workspace-backup',
      backupVersion:1,
      exportedAt:new Date().toISOString(),
      note:'Structured Quire data backup. Local PDF binaries are not included.',
      state
    };
    const project=window.QuireStore.getActiveProject()||{};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=(project.title||'quire-workspace').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'-backup.json';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
    announce('Quire backup downloaded');
  }

  async function restoreBackup(file){
    if(!file)return;
    const raw=await file.text();
    let parsed;
    try{parsed=JSON.parse(raw);}catch(e){throw new Error('The selected file is not valid JSON.');}
    const rawState=parsed?.format==='quire-workspace-backup'?parsed.state:parsed;
    const state=sanitizeBackupState(rawState);
    if(!confirm('Restore this Quire backup? Your current structured workspace will be replaced. Local PDFs stored on this device are not deleted.'))return;
    window.QuireStore.replaceState(state);
    window.dispatchEvent(new CustomEvent('quire:project-switched',{detail:{projectId:state.activeProjectId}}));
    announce('Quire workspace restored');
  }

  async function diagnostics(){
    const mount=document.getElementById('diagnosticsResults');
    if(!mount)return;
    mount.innerHTML='<div class="diagnostic-loading">Running checks…</div>';
    const checks=[];
    const add=(name,status,detail)=>checks.push({name,status,detail});

    try{localStorage.setItem('quire:diag','1');localStorage.removeItem('quire:diag');add('Local data storage','ok','localStorage is writable.');}
    catch(e){add('Local data storage','error','localStorage is unavailable.');}

    add('PDF database','indexedDB' in window?'ok':'error','IndexedDB '+('indexedDB' in window?'is available.':'is not available.'));
    add('PDF reader',window.pdfjsLib?.getDocument?'ok':'error',window.pdfjsLib?.getDocument?'PDF.js loaded.':'PDF.js did not load.');
    add('Secure browser context',window.isSecureContext?'ok':'warning',window.isSecureContext?'HTTPS / secure context detected.':'Some install and storage features work best over HTTPS.');
    add('Service worker','serviceWorker' in navigator?'ok':'warning','serviceWorker' in navigator?'Offline support is available in this browser.':'Service workers are not supported.');
    add('Cloud configuration',window.QuireCloud?.isConfigured?.()?'ok':'info',window.QuireCloud?.isConfigured?.()?'Supabase project configured.':'Local-only mode; Supabase is not configured.');
    add('Cloud account',window.QuireCloud?.getUser?.()?'ok':'info',window.QuireCloud?.getUser?.()?'Signed in.':'No cloud user signed in.');

    if(navigator.storage?.estimate){
      try{
        const estimate=await navigator.storage.estimate();
        const used=Number(estimate.usage)||0,total=Number(estimate.quota)||0;
        const fmt=n=>n>1073741824?(n/1073741824).toFixed(1)+' GB':(n/1048576).toFixed(0)+' MB';
        add('Browser storage','ok',fmt(used)+' used'+(total?' of '+fmt(total):'')+'.');
      }catch(e){}
    }

    const state=window.QuireStore.getState();
    const projectId=window.QuireStore.getActiveProjectId();
    add('Active project',projectId&&state.projects.some(p=>p.id===projectId)?'ok':'error',projectId?'Active project ID is valid.':'No active project.');
    const brokenSections=(state.sections||[]).filter(s=>!state.chapters.some(c=>c.id===s.chapterId)).length;
    add('Section relationships',brokenSections?'warning':'ok',brokenSections?brokenSections+' section(s) have a missing chapter.':'Section/chapter relationships are consistent.');

    mount.innerHTML=checks.map(c=>
      '<div class="diagnostic-row '+c.status+'"><span></span><div><strong>'+escapeHtml(c.name)+'</strong><small>'+escapeHtml(c.detail)+'</small></div></div>'
    ).join('');
    document.getElementById('diagnosticsSummary').textContent=checks.filter(c=>c.status==='error').length
      ? 'One or more checks need attention.'
      : 'Core browser checks passed.';
  }

  function announce(message){
    const region=document.getElementById('quireLiveRegion');
    if(region){region.textContent='';setTimeout(()=>region.textContent=message,10);}
  }

  function openShortcuts(){
    document.getElementById('shortcutsModal').hidden=false;
  }

  function closeVisibleModal(){
    const open=[...document.querySelectorAll('.modal-backdrop:not([hidden])')].pop();
    if(open){open.hidden=true;return true;}
    return false;
  }

  function focusables(container){
    return [...container.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter(el=>!el.hidden&&el.offsetParent!==null);
  }

  function improveModals(){
    document.querySelectorAll('.modal-backdrop').forEach(backdrop=>{
      const modal=backdrop.querySelector('.modal');
      if(modal){modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');}
    });
    const observer=new MutationObserver(entries=>{
      entries.forEach(entry=>{
        const backdrop=entry.target;
        if(!(backdrop instanceof HTMLElement)||!backdrop.classList.contains('modal-backdrop'))return;
        if(!backdrop.hidden){
          previousModalFocus=document.activeElement;
          setTimeout(()=>focusables(backdrop)[0]?.focus(),0);
        }else if(previousModalFocus instanceof HTMLElement){
          previousModalFocus.focus?.();previousModalFocus=null;
        }
      });
    });
    document.querySelectorAll('.modal-backdrop').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['hidden']}));
  }

  function registerServiceWorker(){
    if(!('serviceWorker' in navigator))return;
    if(location.protocol==='file:')return;
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Quire offline cache unavailable',err));
    });
  }

  function updateConnectivity(){
    const node=document.getElementById('connectivityStatus');
    if(!node)return;
    const online=navigator.onLine;
    node.dataset.state=online?'online':'offline';
    node.textContent=online?'Online':'Offline';
    node.title=online?'Network connection available':'Quire is offline; local work remains available';
  }

  function bind(){
    const input=document.getElementById('globalSearch');
    input?.addEventListener('input',e=>renderSearch(e.target.value));
    input?.addEventListener('focus',e=>{if(e.target.value.trim())renderSearch(e.target.value);});
    input?.addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'){e.preventDefault();setSearchIndex(searchIndex+1);}
      else if(e.key==='ArrowUp'){e.preventDefault();setSearchIndex(searchIndex-1);}
      else if(e.key==='Enter'&&searchIndex>=0){e.preventDefault();openResult(searchResults[searchIndex]);}
      else if(e.key==='Escape'){e.preventDefault();closeSearch();input.blur();}
    });
    document.addEventListener('click',e=>{
      if(!e.target.closest('.search')&&!e.target.closest('#globalSearchResults'))closeSearch();
    });

    document.addEventListener('keydown',e=>{
      const mod=e.metaKey||e.ctrlKey;
      if(mod&&e.key.toLowerCase()==='s'){
        e.preventDefault();
        if(document.getElementById('chapters')?.classList.contains('active'))window.QuireChapterEditor?.save?.();
        else if(document.getElementById('methodology')?.classList.contains('active'))window.QuireMethodology?.save?.();
        else document.getElementById('saveStudySetup')?.click();
        announce('Saved');
      }
      if(mod&&e.key==='/'){e.preventDefault();openShortcuts();}
      if(e.key==='Escape'){
        if(!closeVisibleModal())closeSearch();
      }
      if(e.key==='Tab'){
        const open=[...document.querySelectorAll('.modal-backdrop:not([hidden])')].pop();
        if(!open)return;
        const items=focusables(open);if(items.length<2)return;
        const first=items[0],last=items[items.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    });

    document.getElementById('mobileNavBtn')?.addEventListener('click',()=>document.body.classList.toggle('mobile-nav-open'));
    document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>document.body.classList.remove('mobile-nav-open')));

    document.getElementById('openShortcutsBtn')?.addEventListener('click',openShortcuts);
    document.getElementById('closeShortcutsModal')?.addEventListener('click',()=>document.getElementById('shortcutsModal').hidden=true);
    document.getElementById('shortcutsModal')?.addEventListener('click',e=>{if(e.target.id==='shortcutsModal')e.currentTarget.hidden=true;});

    document.getElementById('downloadBackupBtn')?.addEventListener('click',downloadBackup);
    document.getElementById('restoreBackupBtn')?.addEventListener('click',()=>document.getElementById('backupFileInput')?.click());
    document.getElementById('backupFileInput')?.addEventListener('change',async e=>{
      try{await restoreBackup(e.target.files?.[0]);}
      catch(err){announce(err.message||'Backup restore failed');alert(err.message||'Backup restore failed');}
      finally{e.target.value='';}
    });
    document.getElementById('runDiagnosticsBtn')?.addEventListener('click',diagnostics);

    window.addEventListener('online',updateConnectivity);
    window.addEventListener('offline',updateConnectivity);
    window.addEventListener('quire:project-switched',renderRecentWork);
    window.addEventListener('quire:store-changed',renderRecentWork);
    window.addEventListener('beforeunload',()=>window.QuireChapterEditor?.save?.());

    improveModals();
    updateConnectivity();
    renderRecentWork();
    registerServiceWorker();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuirePolish={search,downloadBackup,restoreBackup,diagnostics};
})();