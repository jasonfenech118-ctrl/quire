/* Quire OCR — Step 17
 * Browser-side OCR for scanned/image-only PDFs.
 * The PDF never needs to leave the device; Tesseract language/worker assets are loaded on demand.
 */
(function(){
  const TESSERACT_SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  let enginePromise=null;
  let activeWorker=null;
  let running=false;
  let cancelRequested=false;

  function statusElements(){
    return {
      panel:document.getElementById('ocrPanel'),
      status:document.getElementById('ocrStatus'),
      detail:document.getElementById('ocrDetail'),
      bar:document.getElementById('ocrProgressBar'),
      run:document.getElementById('ocrPdfBtn'),
      page:document.getElementById('ocrCurrentPageBtn'),
      cancel:document.getElementById('cancelOcrBtn')
    };
  }

  function setStatus(text,progress=null,detail=''){
    const el=statusElements();
    if(el.status) el.status.textContent=text;
    if(el.detail) el.detail.textContent=detail;
    if(el.bar&&progress!=null) el.bar.style.width=Math.max(0,Math.min(100,progress))+'%';
  }

  function showPanel(message=''){
    const el=statusElements();
    if(el.panel) el.panel.hidden=false;
    if(message) setStatus(message,null);
  }

  function hidePanel(){
    const el=statusElements();
    if(el.panel&&!running) el.panel.hidden=true;
  }

  function loadEngine(){
    if(window.Tesseract?.createWorker) return Promise.resolve(window.Tesseract);
    if(enginePromise) return enginePromise;
    enginePromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-quire-tesseract]');
      if(existing){
        existing.addEventListener('load',()=>window.Tesseract?.createWorker?resolve(window.Tesseract):reject(new Error('OCR engine loaded incorrectly.')),{once:true});
        existing.addEventListener('error',()=>reject(new Error('OCR engine could not be downloaded.')),{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=TESSERACT_SRC;
      script.async=true;
      script.dataset.quireTesseract='true';
      script.onload=()=>window.Tesseract?.createWorker?resolve(window.Tesseract):reject(new Error('OCR engine loaded incorrectly.'));
      script.onerror=()=>reject(new Error('OCR engine could not be downloaded. Check your connection.'));
      document.head.appendChild(script);
    }).catch(err=>{enginePromise=null;throw err;});
    return enginePromise;
  }

  function languageValue(){
    const value=document.getElementById('ocrLanguage')?.value||'eng';
    return value.includes('+')?value.split('+'):value;
  }

  function flattenWords(data={}){
    if(Array.isArray(data.words)&&data.words.length) return data.words;
    const words=[];
    for(const block of (data.blocks||[])){
      for(const paragraph of (block.paragraphs||[])){
        for(const line of (paragraph.lines||[])){
          for(const word of (line.words||[])) words.push(word);
        }
      }
    }
    return words;
  }

  function wordSegments(words,width,height){
    return (words||[]).map(word=>{
      const box=word.bbox||word.boundingBox||{};
      const x0=Number(box.x0??box.x??0);
      const y0=Number(box.y0??box.y??0);
      const x1=Number(box.x1??((box.x??0)+(box.w??0)));
      const y1=Number(box.y1??((box.y??0)+(box.h??0)));
      const text=String(word.text||'').replace(/\s+/g,' ').trim();
      if(!text||!Number.isFinite(x0)||!Number.isFinite(y0)||!Number.isFinite(x1)||!Number.isFinite(y1)) return null;
      return {
        text,
        rect:{
          x:Math.max(0,Math.min(1,x0/width)),
          y:Math.max(0,Math.min(1,y0/height)),
          w:Math.max(.0005,Math.min(1,(x1-x0)/width)),
          h:Math.max(.0005,Math.min(1,(y1-y0)/height))
        },
        eol:false
      };
    }).filter(Boolean);
  }

  function segmentsToText(segments=[]){
    if(!segments.length) return '';
    const ordered=segments.slice().sort((a,b)=>{
      const dy=Math.abs(a.rect.y-b.rect.y);
      return dy>.012?a.rect.y-b.rect.y:a.rect.x-b.rect.x;
    });
    let text='',lastY=null;
    for(const segment of ordered){
      if(lastY!=null&&Math.abs(segment.rect.y-lastY)>.025) text+='\n';
      else if(text&&!text.endsWith('\n')) text+=' ';
      text+=segment.text;
      lastY=segment.rect.y;
    }
    return text.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  }

  async function renderPageImage(page){
    const viewport=page.getViewport({scale:1.8});
    const canvas=document.createElement('canvas');
    canvas.width=Math.ceil(viewport.width);
    canvas.height=Math.ceil(viewport.height);
    const ctx=canvas.getContext('2d',{alpha:false});
    await page.render({canvasContext:ctx,viewport}).promise;
    return {canvas,viewport};
  }

  async function makeWorker(){
    const Tesseract=await loadEngine();
    const langs=languageValue();
    return Tesseract.createWorker(langs,1,{
      logger(message){
        if(!running) return;
        if(message.status==='recognizing text'&&typeof message.progress==='number'){
          const state=window.QuireOCR?._progressState;
          if(!state) return;
          const overall=((state.completed)+message.progress)/Math.max(1,state.total)*100;
          setStatus('Recognising page '+state.page+' / '+state.documentPages,overall,state.scopeLabel);
        }
      }
    });
  }

  function pageList(pdf,scope){
    if(scope==='page'){
      const current=window.QuirePdfReader?.getCurrentPage?.()||1;
      return [Math.max(1,Math.min(pdf.numPages,current))];
    }
    return Array.from({length:pdf.numPages},(_,i)=>i+1);
  }

  async function run(scope='all'){
    if(running) return;
    const pdf=window.QuirePdfReader?.getDocument?.();
    const articleId=window.QuirePdfReader?.getCurrentArticleId?.();
    if(!pdf||!articleId) throw new Error('Open a PDF before running OCR.');

    showPanel();
    running=true;
    cancelRequested=false;
    const el=statusElements();
    if(el.run) el.run.disabled=true;
    if(el.page) el.page.disabled=true;
    if(el.cancel) el.cancel.hidden=false;

    const pagesToConsider=pageList(pdf,scope);
    const onlyEmpty=document.getElementById('ocrOnlyEmpty')?.checked!==false;
    setStatus('Checking existing text…',0,'Quire will preserve native PDF text and any OCR already completed.');
    const existing=await window.QuirePdfReader.ensureTextIndex(articleId).catch(
      ()=>window.QuirePdfReader.getTextIndex(articleId).catch(()=>null)
    );
    const existingPages=new Map((existing?.pages||[]).map(p=>[Number(p.page),p]));
    const pageNumbers=pagesToConsider.filter(pageNumber=>{
      if(!onlyEmpty) return true;
      const page=existingPages.get(pageNumber);
      return !page||String(page.text||'').trim().length<30;
    });

    if(!pageNumbers.length){
      setStatus('No OCR needed',100,'The selected pages already contain extractable text.');
      running=false;
      if(el.run) el.run.disabled=false;
      if(el.page) el.page.disabled=false;
      if(el.cancel) el.cancel.hidden=true;
      return [];
    }

    window.QuireOCR._progressState={
      completed:0,total:pageNumbers.length,page:pageNumbers[0],documentPages:pdf.numPages,
      scopeLabel:scope==='page'?'Current page':'Document OCR'
    };

    try{
      setStatus('Loading OCR engine…',0,'The first run may take longer while language data is cached.');
      activeWorker=await makeWorker();
      const ocrPages=[];

      for(let index=0;index<pageNumbers.length;index++){
        if(cancelRequested) throw new Error('OCR cancelled.');
        const pageNumber=pageNumbers[index];
        window.QuireOCR._progressState={completed:index,total:pageNumbers.length,page:pageNumber,documentPages:pdf.numPages,scopeLabel:scope==='page'?'Current page':'Document OCR'};
        setStatus('Preparing page '+pageNumber+' / '+pdf.numPages,(index/pageNumbers.length)*100,'Rendering page image locally…');

        const page=await pdf.getPage(pageNumber);
        const {canvas}=await renderPageImage(page);
        const result=await activeWorker.recognize(canvas);
        if(cancelRequested) throw new Error('OCR cancelled.');

        const segments=wordSegments(flattenWords(result?.data||{}),canvas.width,canvas.height);
        const text=segments.length?segmentsToText(segments):String(result?.data?.text||'').trim();
        ocrPages.push({page:pageNumber,text,segments,ocr:true});
      }

      const merged=new Map(existingPages);
      ocrPages.forEach(page=>merged.set(Number(page.page),page));
      const mergedPages=[...merged.values()].sort((a,b)=>Number(a.page)-Number(b.page));
      await window.QuirePdfStore.saveTextIndex(articleId,mergedPages);

      const article=window.QuireStore.getArticle(articleId);
      window.QuireStore.updateArticle(articleId,{
        citationData:{
          ...(article?.citationData||{}),
          ocrIndexedAt:new Date().toISOString(),
          ocrLanguage:Array.isArray(languageValue())?languageValue().join('+'):languageValue(),
          textIndexedAt:new Date().toISOString(),
          textPageCount:mergedPages.length,
          textIndexVersion:window.QuirePdfReader?.getTextIndexVersion?.()||2
        }
      });

      setStatus('OCR complete',100,(scope==='page'?'Page':'Document')+' is now searchable and available to Quire Copilot.');
      await window.QuirePdfReader.renderPage(window.QuirePdfReader.getCurrentPage?.()||1);
      window.dispatchEvent(new CustomEvent('quire:text-index-ready',{detail:{articleId,pages:mergedPages.length,ocr:true}}));
      window.dispatchEvent(new CustomEvent('quire:ocr-complete',{detail:{articleId,pages:ocrPages.length,scope}}));
      return ocrPages;
    }catch(err){
      if(cancelRequested||/cancel/i.test(err.message||'')){
        setStatus('OCR stopped',null,'No unfinished page was saved.');
        return [];
      }
      setStatus('OCR could not finish',null,err.message||'Unknown OCR error.');
      throw err;
    }finally{
      try{await activeWorker?.terminate?.();}catch(e){}
      activeWorker=null;
      running=false;
      cancelRequested=false;
      window.QuireOCR._progressState=null;
      if(el.run) el.run.disabled=false;
      if(el.page) el.page.disabled=false;
      if(el.cancel) el.cancel.hidden=true;
    }
  }

  async function cancel(){
    if(!running) return;
    cancelRequested=true;
    setStatus('Stopping OCR…',null,'Cancelling the active OCR worker.');
    try{await activeWorker?.terminate?.();}catch(e){}
    activeWorker=null;
  }

  function bind(){
    document.getElementById('openOcrPanelBtn')?.addEventListener('click',()=>{
      showPanel('OCR scanned PDF');
      setStatus('Ready to run OCR',0,'Use OCR when a scanned paper has no selectable text.');
    });
    document.getElementById('closeOcrPanelBtn')?.addEventListener('click',hidePanel);
    document.getElementById('ocrPdfBtn')?.addEventListener('click',()=>run('all').catch(()=>{}));
    document.getElementById('ocrCurrentPageBtn')?.addEventListener('click',()=>run('page').catch(()=>{}));
    document.getElementById('cancelOcrBtn')?.addEventListener('click',cancel);

    window.addEventListener('quire:text-index-empty',()=>{
      showPanel();
      setStatus('Scanned PDF detected',0,'No usable text was found. Run OCR to make the paper searchable, selectable and available to Copilot.');
    });

    window.addEventListener('quire:pdf-opened',async e=>{
      const articleId=e.detail?.articleId;
      const article=window.QuireStore?.getArticle?.(articleId);
      if(article?.citationData?.ocrIndexedAt){
        showPanel();
        setStatus('OCR text available',100,'This PDF already has an OCR text layer on this device.');
      }else if(!running){
        hidePanel();
        setStatus('OCR not started',0,'');
      }
    });
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireOCR={
    run,cancel,showPanel,isRunning:()=>running,_progressState:null
  };
})();