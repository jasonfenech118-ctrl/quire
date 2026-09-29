/* Quire PDF Reader v2 — real PDF rendering, text selection, highlights and notes */
(function(){
  const DB_NAME='quire-pdfs';
  const DB_VERSION=2;
  const STORE_NAME='pdfs';
  const TEXT_STORE_NAME='text-index';
  let dbPromise=null;

  let pdfDoc=null;
  let currentArticleId=null;
  let currentPage=1;
  let scale=1.1;
  let rendering=false;
  let pendingPage=null;
  let observer=null;
  let selectionTimer=null;
  let pendingSelection=null;
  let editingHighlightId=null;

  function openDb(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)) return reject(new Error('This browser does not support local PDF storage.'));
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME,{keyPath:'articleId'});
        if(!db.objectStoreNames.contains(TEXT_STORE_NAME)) db.createObjectStore(TEXT_STORE_NAME,{keyPath:'articleId'});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error || new Error('Could not open local PDF storage.'));
    });
    return dbPromise;
  }

  async function transact(mode,action){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,mode);
      const store=tx.objectStore(STORE_NAME);
      let request;
      try{request=action(store);}catch(err){reject(err);return;}
      if(request){
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error);
      }else{
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error);
      }
    });
  }

  const PdfStore={
    async save(articleId,file){
      const blob=file instanceof Blob ? file : new Blob([file],{type:'application/pdf'});
      return transact('readwrite',store=>store.put({
        articleId,blob,name:file.name||'document.pdf',type:blob.type||'application/pdf',
        size:blob.size,updatedAt:new Date().toISOString()
      }));
    },
    async get(articleId){return transact('readonly',store=>store.get(articleId));},
    async has(articleId){return Boolean((await this.get(articleId))?.blob);},
    async remove(articleId){return transact('readwrite',store=>store.delete(articleId));},
    async saveTextIndex(articleId,pages){
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(TEXT_STORE_NAME,'readwrite');
        const store=tx.objectStore(TEXT_STORE_NAME);
        const request=store.put({articleId,pages,updatedAt:new Date().toISOString()});
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error);
      });
    },
    async getTextIndex(articleId){
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(TEXT_STORE_NAME,'readonly');
        const request=tx.objectStore(TEXT_STORE_NAME).get(articleId);
        request.onsuccess=()=>resolve(request.result||null);
        request.onerror=()=>reject(request.error);
      });
    },
    async removeTextIndex(articleId){
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(TEXT_STORE_NAME,'readwrite');
        const request=tx.objectStore(TEXT_STORE_NAME).delete(articleId);
        request.onsuccess=()=>resolve();
        request.onerror=()=>reject(request.error);
      });
    }
  };

  function ensurePdfJs(){
    if(!window.pdfjsLib) throw new Error('PDF reader library could not be loaded.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }

  function titleFromFilename(name){
    return (name||'Untitled article').replace(/\.pdf$/i,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function setReaderState(state,message=''){
    const empty=document.getElementById('pdfEmptyState');
    const loading=document.getElementById('pdfLoadingState');
    const canvasWrap=document.getElementById('pdfCanvasWrap');
    if(empty) empty.hidden=state!=='empty';
    if(loading) loading.hidden=state!=='loading';
    if(canvasWrap) canvasWrap.hidden=state!=='ready';
    if(message){
      const target=state==='empty'?document.getElementById('pdfEmptyMessage'):document.getElementById('pdfLoadingMessage');
      if(target) target.textContent=message;
    }
  }

  function updateToolbar(){
    const indicator=document.getElementById('pageIndicator');
    const zoom=document.getElementById('zoomIndicator');
    const prev=document.getElementById('prevPage');
    const next=document.getElementById('nextPage');
    if(indicator) indicator.textContent=pdfDoc?'Page '+currentPage+' / '+pdfDoc.numPages:'Page — / —';
    if(zoom) zoom.textContent=Math.round(scale*100)+'%';
    if(prev) prev.disabled=!pdfDoc||currentPage<=1;
    if(next) next.disabled=!pdfDoc||currentPage>=pdfDoc.numPages;
  }

  async function renderTextLayer(page,viewport){
    const layer=document.getElementById('pdfTextLayer');
    if(!layer) return;
    layer.innerHTML='';
    layer.style.width=viewport.width+'px';
    layer.style.height=viewport.height+'px';

    const textContent=await page.getTextContent();
    const styles=textContent.styles||{};

    for(const item of textContent.items){
      if(!item.str) continue;
      const tx=window.pdfjsLib.Util.transform(viewport.transform,item.transform);
      const angle=Math.atan2(tx[1],tx[0]);
      const fontHeight=Math.hypot(tx[2],tx[3]);
      const style=styles[item.fontName]||{};
      let fontAscent=fontHeight;
      if(style.ascent) fontAscent=style.ascent*fontHeight;
      else if(style.descent) fontAscent=(1+style.descent)*fontHeight;

      const span=document.createElement('span');
      span.textContent=item.str;
      span.style.left=tx[4]+'px';
      span.style.top=(tx[5]-fontAscent)+'px';
      span.style.fontSize=fontHeight+'px';
      span.style.fontFamily=style.fontFamily||'sans-serif';
      span.style.transformOrigin='0 0';
      layer.appendChild(span);

      const targetWidth=(item.width||0)*viewport.scale;
      const measured=span.getBoundingClientRect().width;
      const transforms=[];
      if(angle) transforms.push('rotate('+angle+'rad)');
      if(targetWidth>0 && measured>0) transforms.push('scaleX('+(targetWidth/measured)+')');
      if(transforms.length) span.style.transform=transforms.join(' ');
    }
  }

  function colorClass(color){
    return ['yellow','green','blue','rose'].includes(color)?color:'yellow';
  }

  function renderHighlights(){
    const layer=document.getElementById('pdfHighlightLayer');
    if(!layer) return;
    layer.innerHTML='';
    const highlights=window.QuireStore?.listHighlights(currentArticleId)||[];
    highlights.filter(h=>h.pageNumber===currentPage).forEach(h=>{
      const rects=h.pdfAnchor?.rects||[];
      rects.forEach(rect=>{
        const el=document.createElement('button');
        el.type='button';
        el.className='saved-highlight '+colorClass(h.color);
        el.dataset.highlightId=h.id;
        el.style.left=(rect.x*100)+'%';
        el.style.top=(rect.y*100)+'%';
        el.style.width=(rect.w*100)+'%';
        el.style.height=(rect.h*100)+'%';
        el.title=h.highlightedText||'Saved highlight';
        el.addEventListener('click',ev=>{
          ev.stopPropagation();
          openExistingHighlight(h.id);
        });
        layer.appendChild(el);
      });
    });
    refreshHighlightSidebar();
  }

  async function renderPage(number){
    if(!pdfDoc) return;
    if(rendering){pendingPage=number;return;}
    rendering=true;
    currentPage=Math.max(1,Math.min(number,pdfDoc.numPages));
    hideSelectionToolbar();
    updateToolbar();

    try{
      const page=await pdfDoc.getPage(currentPage);
      const viewport=page.getViewport({scale});
      const canvas=document.getElementById('pdfCanvas');
      const surface=document.getElementById('pdfPageSurface');
      const highlightLayer=document.getElementById('pdfHighlightLayer');
      const context=canvas.getContext('2d',{alpha:false});
      const pixelRatio=Math.min(window.devicePixelRatio||1,2);

      canvas.width=Math.floor(viewport.width*pixelRatio);
      canvas.height=Math.floor(viewport.height*pixelRatio);
      canvas.style.width=Math.floor(viewport.width)+'px';
      canvas.style.height=Math.floor(viewport.height)+'px';
      if(surface){surface.style.width=viewport.width+'px';surface.style.height=viewport.height+'px';}
      if(highlightLayer){highlightLayer.style.width=viewport.width+'px';highlightLayer.style.height=viewport.height+'px';}

      await page.render({
        canvasContext:context,viewport,
        transform:pixelRatio===1?null:[pixelRatio,0,0,pixelRatio,0,0]
      }).promise;
      await renderTextLayer(page,viewport);
      renderHighlights();

      document.querySelectorAll('.pdf-thumb-button').forEach(btn=>{
        btn.classList.toggle('active',Number(btn.dataset.page)===currentPage);
      });
      document.querySelector('.pdf-thumb-button.active')?.scrollIntoView({block:'nearest'});
    }catch(err){
      console.error(err);
      setReaderState('empty','Quire could not render this PDF page.');
    }finally{
      rendering=false;
      if(pendingPage!==null){
        const next=pendingPage;pendingPage=null;
        if(next!==currentPage) renderPage(next);
      }
    }
  }

  async function renderThumbnail(pageNumber,canvas){
    if(!pdfDoc||canvas.dataset.rendered==='true') return;
    try{
      const page=await pdfDoc.getPage(pageNumber);
      const base=page.getViewport({scale:1});
      const thumbScale=Math.min(72/base.width,96/base.height);
      const viewport=page.getViewport({scale:thumbScale});
      const ctx=canvas.getContext('2d',{alpha:false});
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:ctx,viewport}).promise;
      canvas.dataset.rendered='true';
    }catch(err){console.warn('Thumbnail render failed',err);}
  }

  function buildThumbnails(){
    const target=document.getElementById('pageThumbs');
    if(!target||!pdfDoc) return;
    target.innerHTML='';
    if(observer) observer.disconnect();
    observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting) return;
        const canvas=entry.target.querySelector('canvas');
        if(canvas) renderThumbnail(Number(entry.target.dataset.page),canvas);
      });
    },{root:target,rootMargin:'100px 0px'});
    for(let i=1;i<=pdfDoc.numPages;i++){
      const btn=document.createElement('button');
      btn.type='button';btn.className='pdf-thumb-button'+(i===currentPage?' active':'');btn.dataset.page=String(i);
      btn.innerHTML='<canvas aria-hidden="true"></canvas><span>'+i+'</span>';
      btn.addEventListener('click',()=>renderPage(i));
      target.appendChild(btn);observer.observe(btn);
    }
  }

  function getSelectionPayload(){
    const sel=window.getSelection();
    const layer=document.getElementById('pdfTextLayer');
    if(!sel||sel.rangeCount===0||sel.isCollapsed||!layer) return null;
    const range=sel.getRangeAt(0);
    if(!layer.contains(range.commonAncestorContainer)) return null;
    const text=sel.toString().replace(/\s+/g,' ').trim();
    if(!text) return null;

    const layerRect=layer.getBoundingClientRect();
    const rects=[...range.getClientRects()]
      .filter(r=>r.width>1&&r.height>1&&r.bottom>=layerRect.top&&r.top<=layerRect.bottom)
      .map(r=>({
        x:Math.max(0,(r.left-layerRect.left)/layerRect.width),
        y:Math.max(0,(r.top-layerRect.top)/layerRect.height),
        w:Math.min(1,r.width/layerRect.width),
        h:Math.min(1,r.height/layerRect.height)
      }))
      .filter(r=>r.x<1&&r.y<1);

    if(!rects.length) return null;
    return {
      articleId:currentArticleId,pageNumber:currentPage,highlightedText:text,
      color:'yellow',category:'key_finding',
      pdfAnchor:{rects,pageWidth:layerRect.width,pageHeight:layerRect.height,version:1}
    };
  }

  function showSelectionToolbar(payload){
    pendingSelection=payload;
    const toolbar=document.getElementById('selectionToolbar');
    const sel=window.getSelection();
    if(!toolbar||!sel||!sel.rangeCount) return;
    const rect=sel.getRangeAt(0).getBoundingClientRect();
    toolbar.hidden=false;
    const width=toolbar.offsetWidth||250;
    const left=Math.max(8,Math.min(window.innerWidth-width-8,rect.left+rect.width/2-width/2));
    const top=Math.max(8,rect.top-48);
    toolbar.style.left=left+'px';toolbar.style.top=top+'px';
  }

  function hideSelectionToolbar(){
    const toolbar=document.getElementById('selectionToolbar');
    if(toolbar) toolbar.hidden=true;
  }

  function clearNativeSelection(){
    try{window.getSelection()?.removeAllRanges();}catch(e){}
  }

  function onTextSelection(){
    clearTimeout(selectionTimer);
    selectionTimer=setTimeout(()=>{
      const payload=getSelectionPayload();
      if(payload) showSelectionToolbar(payload);
      else hideSelectionToolbar();
    },30);
  }

  function savePendingHighlight(color='yellow'){
    if(!pendingSelection) return null;
    const highlight=window.QuireStore.addHighlight({...pendingSelection,color});
    pendingSelection=null;
    hideSelectionToolbar();clearNativeSelection();
    renderHighlights();
    window.dispatchEvent(new CustomEvent('quire:annotation-changed',{detail:{articleId:currentArticleId}}));
    return highlight;
  }

  function fillLinkSelects(){
    const theme=document.getElementById('highlightTheme');
    const objective=document.getElementById('highlightObjective');
    const chapter=document.getElementById('highlightChapter');
    if(theme){
      theme.innerHTML='<option value="">No theme yet</option>'+window.QuireStore.listThemes().map(x=>'<option value="'+x.id+'">'+escapeHtmlLocal(x.name)+'</option>').join('');
    }
    if(objective){
      objective.innerHTML='<option value="">No objective yet</option>'+window.QuireStore.listObjectives().map(x=>'<option value="'+x.id+'">Objective '+x.orderIndex+' · '+escapeHtmlLocal(x.title)+'</option>').join('');
    }
    if(chapter){
      chapter.innerHTML='<option value="">Not linked to a chapter yet</option>'+window.QuireStore.listChapters().map(x=>'<option value="'+x.id+'">'+escapeHtmlLocal((x.number?x.number+' · ':'')+x.title)+'</option>').join('');
    }
  }

  function escapeHtmlLocal(value){
    return String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  }

  function openNoteModalForSelection(){
    if(!pendingSelection) return;
    editingHighlightId=null;
    fillLinkSelects();
    document.getElementById('notePageLabel').textContent='PAGE '+pendingSelection.pageNumber;
    document.getElementById('noteHighlightText').textContent=pendingSelection.highlightedText;
    document.getElementById('highlightNoteBody').value='';
    document.getElementById('highlightCategory').value='key_finding';
    document.getElementById('evidenceRelationship').value='supports';
    document.getElementById('highlightTheme').value='';
    document.getElementById('highlightObjective').value='';
    document.getElementById('highlightChapter').value='';
    document.getElementById('highlightNoteModal').hidden=false;
    hideSelectionToolbar();
  }

  function openExistingHighlight(highlightId){
    const h=window.QuireStore.getHighlight(highlightId);
    if(!h) return;
    editingHighlightId=highlightId;
    pendingSelection=null;
    fillLinkSelects();
    document.getElementById('notePageLabel').textContent='PAGE '+h.pageNumber;
    document.getElementById('noteHighlightText').textContent=h.highlightedText;
    const note=(window.QuireStore.listNotes(h.articleId)||[]).find(n=>n.highlightId===h.id);
    document.getElementById('highlightNoteBody').value=note?.body||'';
    document.getElementById('highlightCategory').value=h.category||'key_finding';
    const links=window.QuireStore.listEvidenceLinks(h.id);
    const link=links[0]||{};
    document.getElementById('evidenceRelationship').value=link.relationship||'supports';
    document.getElementById('highlightTheme').value=link.themeId||'';
    document.getElementById('highlightObjective').value=link.objectiveId||'';
    document.getElementById('highlightChapter').value=link.chapterId||'';
    document.getElementById('highlightNoteModal').hidden=false;
  }

  function closeNoteModal(){
    const modal=document.getElementById('highlightNoteModal');
    if(modal) modal.hidden=true;
    if(!editingHighlightId){pendingSelection=null;clearNativeSelection();}
    editingHighlightId=null;
  }

  function saveNoteModal(withNote){
    let highlight;
    if(editingHighlightId){
      highlight=window.QuireStore.updateHighlight(editingHighlightId,{
        category:document.getElementById('highlightCategory').value
      });
    }else if(pendingSelection){
      highlight=window.QuireStore.addHighlight({
        ...pendingSelection,category:document.getElementById('highlightCategory').value
      });
    }
    if(!highlight) return;

    let note=null;
    const body=document.getElementById('highlightNoteBody').value.trim();
    const existing=(window.QuireStore.listNotes(highlight.articleId)||[]).find(n=>n.highlightId===highlight.id);
    if(withNote&&body){
      note=existing
        ? window.QuireStore.updateNote(existing.id,{body,noteType:'research'})
        : window.QuireStore.addNote({articleId:highlight.articleId,highlightId:highlight.id,body,noteType:'research'});
    }

    const themeId=document.getElementById('highlightTheme').value||null;
    const objectiveId=document.getElementById('highlightObjective').value||null;
    const chapterId=document.getElementById('highlightChapter').value||null;
    if(themeId||objectiveId||chapterId){
      window.QuireStore.addEvidenceLink({
        articleId:highlight.articleId,highlightId:highlight.id,noteId:note?.id||existing?.id||null,
        themeId,objectiveId,chapterId,
        relationship:document.getElementById('evidenceRelationship').value||'supports'
      });
    }

    document.getElementById('highlightNoteModal').hidden=true;
    pendingSelection=null;editingHighlightId=null;clearNativeSelection();
    renderHighlights();
    window.dispatchEvent(new CustomEvent('quire:annotation-changed',{detail:{articleId:currentArticleId}}));
  }

  function refreshHighlightSidebar(){
    const list=document.getElementById('highlightsList');
    const count=document.getElementById('highlightCount');
    if(!list) return;
    const highlights=currentArticleId?(window.QuireStore?.listHighlights(currentArticleId)||[]):[];
    if(count) count.textContent=String(highlights.length);
    if(!highlights.length){
      list.innerHTML='<div class="empty-highlights"><strong>No highlights yet</strong><small>Select text on the PDF, then choose a highlight colour or add a note.</small></div>';
      return;
    }
    const notes=window.QuireStore.listNotes(currentArticleId);
    list.innerHTML=highlights.map(h=>{
      const note=notes.find(n=>n.highlightId===h.id);
      const category=(h.category||'key_finding').replace(/_/g,' ');
      return '<article class="highlight-list-card" data-highlight-card="'+h.id+'">'+
        '<div class="highlight-card-meta"><span class="highlight-swatch '+colorClass(h.color)+'"></span><strong>Page '+h.pageNumber+'</strong><span>'+escapeHtmlLocal(category)+'</span></div>'+
        '<p>'+escapeHtmlLocal(h.highlightedText)+'</p>'+
        (note?'<div class="highlight-card-note">'+escapeHtmlLocal(note.body)+'</div>':'')+
        '<div class="highlight-card-actions"><button type="button" data-edit-highlight="'+h.id+'">'+(note?'Edit note':'Add note')+'</button><button type="button" data-delete-highlight="'+h.id+'">Delete</button></div>'+
      '</article>';
    }).join('');

    list.querySelectorAll('[data-highlight-card]').forEach(card=>card.addEventListener('click',e=>{
      if(e.target.closest('button')) return;
      const h=window.QuireStore.getHighlight(card.dataset.highlightCard);
      if(h) renderPage(h.pageNumber).then(()=>setTimeout(()=>{
        document.querySelectorAll('[data-highlight-id="'+h.id+'"]').forEach(el=>{
          el.classList.add('focus-pulse');setTimeout(()=>el.classList.remove('focus-pulse'),1000);
        });
      },60));
    }));
    list.querySelectorAll('[data-edit-highlight]').forEach(btn=>btn.addEventListener('click',()=>openExistingHighlight(btn.dataset.editHighlight)));
    list.querySelectorAll('[data-delete-highlight]').forEach(btn=>btn.addEventListener('click',()=>{
      if(!confirm('Delete this highlight and its attached note?')) return;
      window.QuireStore.removeHighlight(btn.dataset.deleteHighlight);
      renderHighlights();
      window.dispatchEvent(new CustomEvent('quire:annotation-changed',{detail:{articleId:currentArticleId}}));
    }));
  }

  function switchReaderSide(mode){
    const pages=mode==='pages';
    document.getElementById('pageThumbs').hidden=!pages;
    document.getElementById('highlightsList').hidden=pages;
    document.getElementById('pagesTab').classList.toggle('active',pages);
    document.getElementById('highlightsTab').classList.toggle('active',!pages);
    if(!pages) refreshHighlightSidebar();
  }


  async function extractTextIndex(articleId){
    if(!pdfDoc || articleId!==currentArticleId) throw new Error('Open the article before indexing its text.');
    const pages=[];
    for(let pageNumber=1;pageNumber<=pdfDoc.numPages;pageNumber++){
      const page=await pdfDoc.getPage(pageNumber);
      const content=await page.getTextContent();
      let text='';
      for(const item of content.items){
        if(!item.str) continue;
        text+=item.str;
        text+=item.hasEOL?'\n':' ';
      }
      text=text.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').replace(/[ \t]{2,}/g,' ').trim();
      pages.push({page:pageNumber,text});
      window.dispatchEvent(new CustomEvent('quire:text-index-progress',{detail:{articleId,page:pageNumber,total:pdfDoc.numPages}}));
    }
    await PdfStore.saveTextIndex(articleId,pages);
    const article=window.QuireStore?.getArticle(articleId);
    if(article){
      window.QuireStore.updateArticle(articleId,{
        citationData:{...(article.citationData||{}),textIndexedAt:new Date().toISOString(),textPageCount:pages.length}
      });
    }
    window.dispatchEvent(new CustomEvent('quire:text-index-ready',{detail:{articleId,pages:pages.length}}));
    return {articleId,pages,updatedAt:new Date().toISOString()};
  }

  async function ensureTextIndex(articleId,{force=false}={}){
    if(!force){
      const existing=await PdfStore.getTextIndex(articleId);
      if(existing?.pages?.length) return existing;
    }
    if(articleId!==currentArticleId || !pdfDoc){
      await openArticle(articleId);
    }
    return extractTextIndex(articleId);
  }

  async function enrichArticleFromPdf(articleId,fileName){
    try{
      const metadata=await pdfDoc.getMetadata();
      const info=metadata?.info||{};
      const article=window.QuireStore?.getArticle(articleId);
      if(!article) return;
      const fallback=titleFromFilename(fileName);
      let title=(info.Title||'').trim();
      if(!title||/^untitled$/i.test(title)) title=article.title||fallback;
      window.QuireStore.updateArticle(articleId,{
        title,authors:(info.Author||article.authors||'').trim(),
        citationData:{...(article.citationData||{}),pageCount:pdfDoc.numPages,localFileName:fileName,localPdf:true}
      });
    }catch(err){console.warn('PDF metadata could not be read',err);}
  }

  async function openArticle(articleId){
    ensurePdfJs();currentArticleId=articleId;
    const article=window.QuireStore?.getArticle(articleId);
    const title=document.getElementById('readerArticleTitle');
    const meta=document.getElementById('readerArticleMeta');
    if(title) title.textContent=article?.title||'PDF reader';
    if(meta){const bits=[article?.authors,article?.year].filter(Boolean);meta.textContent=bits.join(' · ')||'Local PDF';}

    const stored=await PdfStore.get(articleId);
    if(!stored?.blob){
      pdfDoc=null;currentPage=1;updateToolbar();
      document.getElementById('pageThumbs').innerHTML='';refreshHighlightSidebar();
      setReaderState('empty','This article is in your library, but its PDF is not stored on this device yet.');
      return false;
    }

    setReaderState('loading','Opening '+stored.name+'…');
    try{
      const buffer=await stored.blob.arrayBuffer();
      pdfDoc=await window.pdfjsLib.getDocument({data:new Uint8Array(buffer)}).promise;
      currentPage=1;scale=1.1;setReaderState('ready');buildThumbnails();
      await enrichArticleFromPdf(articleId,stored.name);
      await renderPage(1);
      ensureTextIndex(articleId).catch(err=>console.warn('PDF text indexing failed',err));
      const updated=window.QuireStore?.getArticle(articleId);
      if(title) title.textContent=updated?.title||titleFromFilename(stored.name);
      if(meta){const bits=[updated?.authors,updated?.year,pdfDoc.numPages+' pages'].filter(Boolean);meta.textContent=bits.join(' · ');}
      refreshHighlightSidebar();
      window.dispatchEvent(new CustomEvent('quire:pdf-opened',{detail:{articleId,pages:pdfDoc.numPages}}));
      return true;
    }catch(err){
      console.error(err);pdfDoc=null;
      setReaderState('empty','Quire could not open this PDF. The file may be damaged or password protected.');
      return false;
    }
  }

  async function importFile(file){
    if(!file) return null;
    if(!(file.type==='application/pdf'||/\.pdf$/i.test(file.name||''))) throw new Error('Please choose a PDF file.');
    const article=window.QuireStore.addArticle({
      title:titleFromFilename(file.name),authors:'',journal:'',year:null,doi:'',abstract:'',
      readingStatus:'unread',citationData:{localFileName:file.name,fileSize:file.size,localPdf:true}
    });
    try{
      await PdfStore.save(article.id,file);await openArticle(article.id);
      return window.QuireStore.getArticle(article.id);
    }catch(err){
      await PdfStore.remove(article.id).catch(()=>{});
      await PdfStore.removeTextIndex(article.id).catch(()=>{});
      window.QuireStore.removeArticle(article.id);throw err;
    }
  }

  async function attachFileToArticle(articleId,file){
    if(!articleId) return importFile(file);
    if(!(file.type==='application/pdf'||/\.pdf$/i.test(file.name||''))) throw new Error('Please choose a PDF file.');
    await PdfStore.save(articleId,file);
    const article=window.QuireStore.getArticle(articleId);
    window.QuireStore.updateArticle(articleId,{citationData:{...(article?.citationData||{}),localFileName:file.name,fileSize:file.size,localPdf:true}});
    await openArticle(articleId);
    return window.QuireStore.getArticle(articleId);
  }

  function bindControls(){
    document.getElementById('prevPage')?.addEventListener('click',()=>renderPage(currentPage-1));
    document.getElementById('nextPage')?.addEventListener('click',()=>renderPage(currentPage+1));
    document.getElementById('zoomOut')?.addEventListener('click',()=>{if(!pdfDoc)return;scale=Math.max(.5,Number((scale-.1).toFixed(2)));updateToolbar();renderPage(currentPage);});
    document.getElementById('zoomIn')?.addEventListener('click',()=>{if(!pdfDoc)return;scale=Math.min(2.5,Number((scale+.1).toFixed(2)));updateToolbar();renderPage(currentPage);});
    document.getElementById('fitWidth')?.addEventListener('click',async()=>{
      if(!pdfDoc)return;
      const page=await pdfDoc.getPage(currentPage);const base=page.getViewport({scale:1});
      const stage=document.querySelector('.pdf-stage');const width=Math.max(320,(stage?.clientWidth||base.width)-64);
      scale=Math.min(2.5,Math.max(.5,width/base.width));updateToolbar();renderPage(currentPage);
    });
    document.getElementById('pdfFullscreen')?.addEventListener('click',()=>{
      const stage=document.querySelector('.pdf-stage');if(!stage)return;
      if(document.fullscreenElement) document.exitFullscreen?.();else stage.requestFullscreen?.();
    });
    document.getElementById('attachPdfBtn')?.addEventListener('click',()=>{window.QuirePdfReader.pendingArticleId=currentArticleId;document.getElementById('fileInput')?.click();});
    document.getElementById('replacePdfBtn')?.addEventListener('click',()=>{window.QuirePdfReader.pendingArticleId=currentArticleId;document.getElementById('fileInput')?.click();});

    document.getElementById('pdfTextLayer')?.addEventListener('mouseup',onTextSelection);
    document.getElementById('pdfTextLayer')?.addEventListener('keyup',onTextSelection);
    document.querySelectorAll('[data-highlight-color]').forEach(btn=>btn.addEventListener('mousedown',e=>e.preventDefault()));
    document.querySelectorAll('[data-highlight-color]').forEach(btn=>btn.addEventListener('click',()=>savePendingHighlight(btn.dataset.highlightColor)));
    document.getElementById('highlightWithNoteBtn')?.addEventListener('mousedown',e=>e.preventDefault());
    document.getElementById('highlightWithNoteBtn')?.addEventListener('click',openNoteModalForSelection);
    document.getElementById('pagesTab')?.addEventListener('click',()=>switchReaderSide('pages'));
    document.getElementById('highlightsTab')?.addEventListener('click',()=>switchReaderSide('highlights'));

    document.getElementById('closeHighlightNoteModal')?.addEventListener('click',closeNoteModal);
    document.getElementById('highlightNoteModal')?.addEventListener('click',e=>{if(e.target.id==='highlightNoteModal')closeNoteModal();});
    document.getElementById('saveHighlightNote')?.addEventListener('click',()=>saveNoteModal(true));
    document.getElementById('saveHighlightOnly')?.addEventListener('click',()=>saveNoteModal(false));
    document.addEventListener('mousedown',e=>{
      const toolbar=document.getElementById('selectionToolbar');
      if(!toolbar?.hidden&&!toolbar.contains(e.target)&&!document.getElementById('pdfTextLayer')?.contains(e.target)) hideSelectionToolbar();
    });
  }

  function init(){
    try{ensurePdfJs();}catch(err){console.warn(err);}
    bindControls();updateToolbar();refreshHighlightSidebar();
  }

  window.QuirePdfStore=PdfStore;
  window.QuirePdfReader={
    init,importFile,attachFileToArticle,openArticle,renderPage,renderHighlights,refreshHighlightSidebar,
    ensureTextIndex,getTextIndex:(articleId)=>PdfStore.getTextIndex(articleId),
    getCurrentArticleId:()=>currentArticleId,pendingArticleId:null
  };

  document.addEventListener('DOMContentLoaded',init);
})();