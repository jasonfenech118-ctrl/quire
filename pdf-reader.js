/* Quire PDF Reader v1 — local PDF persistence + PDF.js rendering */
(function(){
  const DB_NAME='quire-pdfs';
  const DB_VERSION=1;
  const STORE_NAME='pdfs';
  let dbPromise=null;

  function openDb(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){
        reject(new Error('This browser does not support local PDF storage.'));
        return;
      }
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE_NAME)){
          db.createObjectStore(STORE_NAME,{keyPath:'articleId'});
        }
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
        articleId,
        blob,
        name:file.name || 'document.pdf',
        type:blob.type || 'application/pdf',
        size:blob.size,
        updatedAt:new Date().toISOString()
      }));
    },
    async get(articleId){
      return transact('readonly',store=>store.get(articleId));
    },
    async has(articleId){
      const row=await this.get(articleId);
      return Boolean(row?.blob);
    },
    async remove(articleId){
      return transact('readwrite',store=>store.delete(articleId));
    }
  };

  let pdfDoc=null;
  let currentArticleId=null;
  let currentPage=1;
  let scale=1.1;
  let rendering=false;
  let pendingPage=null;
  let observer=null;

  function ensurePdfJs(){
    if(!window.pdfjsLib) throw new Error('PDF reader library could not be loaded.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }

  function titleFromFilename(name){
    return (name || 'Untitled article')
      .replace(/\.pdf$/i,'')
      .replace(/[_-]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
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
    if(indicator) indicator.textContent=pdfDoc ? 'Page '+currentPage+' / '+pdfDoc.numPages : 'Page — / —';
    if(zoom) zoom.textContent=Math.round(scale*100)+'%';
    if(prev) prev.disabled=!pdfDoc || currentPage<=1;
    if(next) next.disabled=!pdfDoc || currentPage>=pdfDoc.numPages;
  }

  async function renderPage(number){
    if(!pdfDoc) return;
    if(rendering){pendingPage=number;return;}
    rendering=true;
    currentPage=Math.max(1,Math.min(number,pdfDoc.numPages));
    updateToolbar();

    try{
      const page=await pdfDoc.getPage(currentPage);
      const viewport=page.getViewport({scale});
      const canvas=document.getElementById('pdfCanvas');
      const context=canvas.getContext('2d',{alpha:false});
      const pixelRatio=Math.min(window.devicePixelRatio || 1,2);
      canvas.width=Math.floor(viewport.width*pixelRatio);
      canvas.height=Math.floor(viewport.height*pixelRatio);
      canvas.style.width=Math.floor(viewport.width)+'px';
      canvas.style.height=Math.floor(viewport.height)+'px';

      await page.render({
        canvasContext:context,
        viewport,
        transform:pixelRatio===1?null:[pixelRatio,0,0,pixelRatio,0,0]
      }).promise;

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
        const next=pendingPage;
        pendingPage=null;
        if(next!==currentPage) renderPage(next);
      }
    }
  }

  async function renderThumbnail(pageNumber,canvas){
    if(!pdfDoc || canvas.dataset.rendered==='true') return;
    try{
      const page=await pdfDoc.getPage(pageNumber);
      const base=page.getViewport({scale:1});
      const thumbScale=Math.min(72/base.width,96/base.height);
      const viewport=page.getViewport({scale:thumbScale});
      const ctx=canvas.getContext('2d',{alpha:false});
      canvas.width=Math.ceil(viewport.width);
      canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:ctx,viewport}).promise;
      canvas.dataset.rendered='true';
    }catch(err){
      console.warn('Thumbnail render failed',err);
    }
  }

  function buildThumbnails(){
    const target=document.getElementById('pageThumbs');
    if(!target || !pdfDoc) return;
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
      btn.type='button';
      btn.className='pdf-thumb-button'+(i===currentPage?' active':'');
      btn.dataset.page=String(i);
      btn.innerHTML='<canvas aria-hidden="true"></canvas><span>'+i+'</span>';
      btn.addEventListener('click',()=>renderPage(i));
      target.appendChild(btn);
      observer.observe(btn);
    }
  }

  async function enrichArticleFromPdf(articleId,fileName){
    try{
      const metadata=await pdfDoc.getMetadata();
      const info=metadata?.info || {};
      const article=window.QuireStore?.getArticle(articleId);
      if(!article) return;
      const fallback=titleFromFilename(fileName);
      let title=(info.Title || '').trim();
      if(!title || /^untitled$/i.test(title)) title=article.title || fallback;
      const patch={
        title,
        authors:(info.Author || article.authors || '').trim(),
        citationData:{
          ...(article.citationData || {}),
          pageCount:pdfDoc.numPages,
          localFileName:fileName,
          localPdf:true
        }
      };
      window.QuireStore.updateArticle(articleId,patch);
    }catch(err){
      console.warn('PDF metadata could not be read',err);
    }
  }

  async function openArticle(articleId){
    ensurePdfJs();
    currentArticleId=articleId;
    const article=window.QuireStore?.getArticle(articleId);
    const title=document.getElementById('readerArticleTitle');
    const meta=document.getElementById('readerArticleMeta');
    if(title) title.textContent=article?.title || 'PDF reader';
    if(meta){
      const bits=[article?.authors,article?.year].filter(Boolean);
      meta.textContent=bits.join(' · ') || 'Local PDF';
    }

    const stored=await PdfStore.get(articleId);
    if(!stored?.blob){
      pdfDoc=null;
      currentPage=1;
      updateToolbar();
      document.getElementById('pageThumbs').innerHTML='';
      setReaderState('empty','This article is in your library, but its PDF is not stored on this device yet.');
      return false;
    }

    setReaderState('loading','Opening '+stored.name+'…');
    try{
      const buffer=await stored.blob.arrayBuffer();
      pdfDoc=await window.pdfjsLib.getDocument({data:new Uint8Array(buffer)}).promise;
      currentPage=1;
      scale=1.1;
      setReaderState('ready');
      buildThumbnails();
      await enrichArticleFromPdf(articleId,stored.name);
      await renderPage(1);
      const updated=window.QuireStore?.getArticle(articleId);
      if(title) title.textContent=updated?.title || titleFromFilename(stored.name);
      if(meta){
        const bits=[updated?.authors,updated?.year,pdfDoc.numPages+' pages'].filter(Boolean);
        meta.textContent=bits.join(' · ');
      }
      window.dispatchEvent(new CustomEvent('quire:pdf-opened',{detail:{articleId,pages:pdfDoc.numPages}}));
      return true;
    }catch(err){
      console.error(err);
      pdfDoc=null;
      setReaderState('empty','Quire could not open this PDF. The file may be damaged or password protected.');
      return false;
    }
  }

  async function importFile(file){
    if(!file) return null;
    const isPdf=file.type==='application/pdf' || /\.pdf$/i.test(file.name||'');
    if(!isPdf) throw new Error('Please choose a PDF file.');

    const article=window.QuireStore.addArticle({
      title:titleFromFilename(file.name),
      authors:'',
      journal:'',
      year:null,
      doi:'',
      abstract:'',
      readingStatus:'unread',
      citationData:{localFileName:file.name,fileSize:file.size,localPdf:true}
    });
    try{
      await PdfStore.save(article.id,file);
      await openArticle(article.id);
      return window.QuireStore.getArticle(article.id);
    }catch(err){
      await PdfStore.remove(article.id).catch(()=>{});
      window.QuireStore.removeArticle(article.id);
      throw err;
    }
  }

  function bindControls(){
    document.getElementById('prevPage')?.addEventListener('click',()=>renderPage(currentPage-1));
    document.getElementById('nextPage')?.addEventListener('click',()=>renderPage(currentPage+1));
    document.getElementById('zoomOut')?.addEventListener('click',()=>{
      if(!pdfDoc) return;
      scale=Math.max(.5,Number((scale-.1).toFixed(2)));
      updateToolbar();renderPage(currentPage);
    });
    document.getElementById('zoomIn')?.addEventListener('click',()=>{
      if(!pdfDoc) return;
      scale=Math.min(2.5,Number((scale+.1).toFixed(2)));
      updateToolbar();renderPage(currentPage);
    });
    document.getElementById('fitWidth')?.addEventListener('click',async()=>{
      if(!pdfDoc) return;
      const page=await pdfDoc.getPage(currentPage);
      const base=page.getViewport({scale:1});
      const stage=document.querySelector('.pdf-stage');
      const width=Math.max(320,(stage?.clientWidth || base.width)-64);
      scale=Math.min(2.5,Math.max(.5,width/base.width));
      updateToolbar();renderPage(currentPage);
    });
    document.getElementById('pdfFullscreen')?.addEventListener('click',()=>{
      const stage=document.querySelector('.pdf-stage');
      if(!stage) return;
      if(document.fullscreenElement) document.exitFullscreen?.();
      else stage.requestFullscreen?.();
    });
    document.getElementById('attachPdfBtn')?.addEventListener('click',()=>{
      window.QuirePdfReader.pendingArticleId=currentArticleId;
      document.getElementById('fileInput')?.click();
    });
    document.getElementById('replacePdfBtn')?.addEventListener('click',()=>{
      window.QuirePdfReader.pendingArticleId=currentArticleId;
      document.getElementById('fileInput')?.click();
    });
  }

  async function attachFileToArticle(articleId,file){
    if(!articleId) return importFile(file);
    const isPdf=file.type==='application/pdf' || /\.pdf$/i.test(file.name||'');
    if(!isPdf) throw new Error('Please choose a PDF file.');
    await PdfStore.save(articleId,file);
    const article=window.QuireStore.getArticle(articleId);
    window.QuireStore.updateArticle(articleId,{
      citationData:{...(article?.citationData||{}),localFileName:file.name,fileSize:file.size,localPdf:true}
    });
    await openArticle(articleId);
    return window.QuireStore.getArticle(articleId);
  }

  function init(){
    try{ensurePdfJs();}catch(err){console.warn(err);}
    bindControls();
    updateToolbar();
  }

  window.QuirePdfStore=PdfStore;
  window.QuirePdfReader={
    init,importFile,attachFileToArticle,openArticle,renderPage,
    getCurrentArticleId:()=>currentArticleId,
    pendingArticleId:null
  };

  document.addEventListener('DOMContentLoaded',init);
})();