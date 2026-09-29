/* Quire OCR — Step 17 */
(function(){
  let running=false;
  let cancelRequested=false;

  function setStatus(text,progress=null){
    const status=document.getElementById('ocrStatus');
    const bar=document.getElementById('ocrProgressBar');
    if(status) status.textContent=text;
    if(bar && progress!=null) bar.style.width=Math.max(0,Math.min(100,progress))+'%';
  }

  function wordSegments(words,width,height){
    return (words||[]).map(w=>{
      const box=w.bbox||w.boundingBox||{};
      const x0=box.x0??box.x??0;
      const y0=box.y0??box.y??0;
      const x1=box.x1??((box.x??0)+(box.w??0));
      const y1=box.y1??((box.y??0)+(box.h??0));
      const text=String(w.text||'').trim();
      if(!text) return null;
      return {
        text,
        rect:{
          x:Math.max(0,Math.min(1,x0/width)),
          y:Math.max(0,Math.min(1,y0/height)),
          w:Math.max(0,Math.min(1,(x1-x0)/width)),
          h:Math.max(0,Math.min(1,(y1-y0)/height))
        },
        eol:false
      };
    }).filter(Boolean);
  }

  async function renderPage(page){
    const viewport=page.getViewport({scale:1.8});
    const canvas=document.createElement('canvas');
    canvas.width=Math.ceil(viewport.width);
    canvas.height=Math.ceil(viewport.height);
    const ctx=canvas.getContext('2d',{alpha:false});
    await page.render({canvasContext:ctx,viewport}).promise;
    return {canvas,viewport};
  }

  async function run(){
    if(running) return;
    const pdf=window.QuirePdfReader?.getDocument?.();
    const articleId=window.QuirePdfReader?.getCurrentArticleId?.();
    if(!pdf||!articleId) throw new Error('Open a PDF before running OCR.');
    if(!window.Tesseract?.recognize) throw new Error('OCR engine could not be loaded.');

    running=true;cancelRequested=false;
    const runBtn=document.getElementById('ocrPdfBtn');
    const cancelBtn=document.getElementById('cancelOcrBtn');
    if(runBtn) runBtn.disabled=true;
    if(cancelBtn) cancelBtn.hidden=false;
    const pages=[];

    try{
      for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
        if(cancelRequested) throw new Error('OCR cancelled.');
        setStatus('OCR page '+pageNumber+' / '+pdf.numPages,((pageNumber-1)/pdf.numPages)*100);
        const page=await pdf.getPage(pageNumber);
        const {canvas}=await renderPage(page);
        const result=await window.Tesseract.recognize(canvas,'eng',{
          logger:m=>{
            if(m.status==='recognizing text'&&typeof m.progress==='number'){
              const overall=((pageNumber-1)+m.progress)/pdf.numPages*100;
              setStatus('OCR page '+pageNumber+' / '+pdf.numPages,overall);
            }
          }
        });
        const text=String(result?.data?.text||'').trim();
        const segments=wordSegments(result?.data?.words||[],canvas.width,canvas.height);
        pages.push({page:pageNumber,text,segments});
      }

      await window.QuirePdfStore.saveTextIndex(articleId,pages);
      const article=window.QuireStore.getArticle(articleId);
      window.QuireStore.updateArticle(articleId,{
        citationData:{
          ...(article?.citationData||{}),
          ocrIndexedAt:new Date().toISOString(),
          ocrLanguage:'eng',
          textIndexedAt:new Date().toISOString(),
          textPageCount:pages.length,
          textIndexVersion:window.QuirePdfReader?.getTextIndexVersion?.()||2
        }
      });
      setStatus('OCR complete',100);
      window.dispatchEvent(new CustomEvent('quire:text-index-ready',{detail:{articleId,pages:pages.length,ocr:true}}));
      window.dispatchEvent(new CustomEvent('quire:ocr-complete',{detail:{articleId,pages:pages.length}}));
      return pages;
    }finally{
      running=false;
      if(runBtn) runBtn.disabled=false;
      if(cancelBtn) cancelBtn.hidden=true;
    }
  }

  function bind(){
    document.getElementById('ocrPdfBtn')?.addEventListener('click',async()=>{
      const panel=document.getElementById('ocrPanel');if(panel)panel.hidden=false;
      try{await run();}catch(err){setStatus(err.message||'OCR failed');}
    });
    document.getElementById('cancelOcrBtn')?.addEventListener('click',()=>{cancelRequested=true;setStatus('Stopping after current page…');});
    window.addEventListener('quire:text-index-empty',()=>{
      const panel=document.getElementById('ocrPanel');if(panel)panel.hidden=false;
      setStatus('No selectable text found. OCR can make this paper searchable.');
    });
    window.addEventListener('quire:pdf-opened',()=>{
      const panel=document.getElementById('ocrPanel');if(panel)panel.hidden=true;
      setStatus('OCR not started',0);
    });
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireOCR={run,isRunning:()=>running};
})();