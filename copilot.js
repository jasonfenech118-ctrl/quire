/* Quire Copilot v2 — claim-level grounding with exact passage citations */
(function(){
  const CONFIG_KEY='quire:ai-config';
  const STOP=new Set(('a an and are as at be been being but by can could did do does for from had has have having he her hers him his how i if in into is it its may might more most must no not of on or our ours should so than that the their theirs them then there these they this those through to too under up very was we were what when where which while who why will with would you your').split(' '));
  const MODE_QUERIES={
    summary:'aim objective purpose background methods methodology participants sample results findings conclusion implications',
    methods:'methods methodology design participants sample setting recruitment data collection interview survey measures analysis ethics statistical thematic',
    findings:'results findings outcomes themes effects associations conclusion implications significant participants reported',
    critique:'limitations strengths bias sampling sample validity reliability reflexivity generalisability transferability confounding missing data blinding randomisation'
  };

  let citationRegistry=new Map();

  function config(){
    try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}')||{};}catch(e){return {};}
  }

  function setConfig(endpoint){
    const value=String(endpoint||'').trim();
    if(value && !/^https:\/\//i.test(value)) throw new Error('Use an HTTPS endpoint.');
    if(value) localStorage.setItem(CONFIG_KEY,JSON.stringify({endpoint:value}));
    else localStorage.removeItem(CONFIG_KEY);
    updateStatus();
  }

  function tokenize(text=''){
    return String(text).toLowerCase()
      .replace(/[^a-z0-9%.-]+/g,' ')
      .split(/\s+/)
      .filter(t=>t.length>2&&!STOP.has(t));
  }

  function mergeRects(rects=[]){
    const sorted=rects.filter(Boolean).map(r=>({...r}))
      .sort((a,b)=>Math.abs(a.y-b.y)>.006?a.y-b.y:a.x-b.x);
    const merged=[];
    for(const rect of sorted){
      const last=merged[merged.length-1];
      const sameLine=last && Math.abs(last.y-rect.y)<Math.max(last.h,rect.h)*.65;
      const close=last && rect.x<=(last.x+last.w+.018);
      if(sameLine&&close){
        const right=Math.max(last.x+last.w,rect.x+rect.w);
        const bottom=Math.max(last.y+last.h,rect.y+rect.h);
        last.x=Math.min(last.x,rect.x);
        last.y=Math.min(last.y,rect.y);
        last.w=Math.min(1-last.x,right-last.x);
        last.h=Math.min(1-last.y,bottom-last.y);
      }else{
        merged.push(rect);
      }
    }
    return merged.slice(0,18);
  }

  function segmentChunks(page){
    const segments=Array.isArray(page.segments)?page.segments.filter(s=>s?.text):[];
    if(!segments.length){
      const clean=String(page.text||'').replace(/\s+/g,' ').trim();
      return clean?[{id:'p'+page.page+'c1',page:page.page,text:clean,rects:[]}]:[];
    }

    const chunks=[];
    let bucketText='';
    let bucketRects=[];
    let chunkNumber=1;

    function flush(){
      const text=bucketText.replace(/\s+/g,' ').trim();
      if(text){
        chunks.push({
          id:'p'+page.page+'c'+chunkNumber++,
          page:page.page,
          text,
          rects:mergeRects(bucketRects)
        });
      }
      bucketText='';bucketRects=[];
    }

    for(const seg of segments){
      const piece=String(seg.text||'').replace(/\s+/g,' ').trim();
      if(!piece) continue;
      if(bucketText && bucketText.length+piece.length+1>850) flush();
      bucketText+=(bucketText?' ':'')+piece;
      if(seg.rect) bucketRects.push(seg.rect);
      if(seg.eol && bucketText.length>=360) flush();
    }
    flush();
    return chunks;
  }

  function chunksFromIndex(index){
    const chunks=[];
    for(const page of index?.pages||[]) chunks.push(...segmentChunks(page));
    return chunks;
  }

  function scoreChunk(chunk,queryTokens){
    const tokens=tokenize(chunk.text);
    if(!tokens.length) return 0;
    const counts=new Map();
    tokens.forEach(t=>counts.set(t,(counts.get(t)||0)+1));
    let score=0;
    for(const q of queryTokens){
      const n=counts.get(q)||0;
      if(n) score+=2+Math.min(n,4)*.55;
      for(const token of counts.keys()){
        if(token.startsWith(q)||q.startsWith(token)) score+=.18;
      }
    }
    return score/Math.sqrt(Math.max(tokens.length,30));
  }

  function searchPassages(index,query,limit=7){
    const q=tokenize(query);
    const chunks=chunksFromIndex(index);
    if(!q.length) return chunks.slice(0,limit).map(x=>({...x,score:0}));
    return chunks.map(x=>({...x,score:scoreChunk(x,q)}))
      .sort((a,b)=>b.score-a.score)
      .filter(x=>x.score>0)
      .slice(0,limit);
  }

  function sentences(text=''){
    return (String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[])
      .map(s=>s.replace(/\s+/g,' ').trim())
      .filter(s=>s.length>35);
  }

  function clip(text,max=280){
    const clean=String(text||'').replace(/\s+/g,' ').trim();
    return clean.length<=max?clean:clean.slice(0,max-1).replace(/\s+\S*$/,'')+'…';
  }

  function citationFromPassage(passage,excerpt){
    return {
      contextId:passage.id,
      page:Number(passage.page),
      excerpt:clip(excerpt||passage.text,220),
      rects:Array.isArray(passage.rects)?passage.rects:[]
    };
  }

  function distinctPassages(passages,limit=5){
    const result=[];
    const fingerprints=new Set();
    for(const passage of passages){
      const sentence=sentences(passage.text)[0]||passage.text;
      const fp=tokenize(sentence).slice(0,9).join(' ');
      if(!fp||fingerprints.has(fp)) continue;
      fingerprints.add(fp);
      result.push({passage,sentence});
      if(result.length>=limit) break;
    }
    return result;
  }

  function claimsFromPassages(passages,limit=5){
    return distinctPassages(passages,limit).map(({passage,sentence})=>({
      text:clip(sentence,310),
      citations:[citationFromPassage(passage,sentence)]
    }));
  }

  function thesisValueAnalysis(index){
    const setup=window.QuireStore?.getStudySetupData?.()||{};
    const rq=setup.researchQuestion||window.QuireStore?.getActiveProject?.()?.researchQuestion||'the thesis research question';
    const groups=[
      ['STUDY','study design participants sample setting methods methodology'],
      ['FINDINGS','results findings outcomes conclusion'],
      ['LIMITATIONS','limitations bias confounding weakness uncertainty generalisability transferability'],
      ['THESIS RELEVANCE',rq],
      ['POSSIBLE DESTINATION','discussion literature review background implications '+rq]
    ];
    const claims=[];
    groups.forEach(([label,query])=>{
      const match=searchPassages(index,query,2)[0];
      if(match){
        const sentence=sentences(match.text)[0]||match.text;
        claims.push({text:label+': '+clip(sentence,300),citations:[citationFromPassage(match,sentence)]});
      }
    });
    return {
      title:'Why this paper may matter to your thesis',
      intro:'Quire has organised grounded source passages around the questions a researcher usually needs to answer before deciding how to use a paper.',
      claims,
      notice:'These are grounded retrieval cues, not a substitute for reading the paper. “Thesis relevance” and “possible destination” are suggestions for your judgement, not claims made by the source.'
    };
  }

  function localAnalysis(mode,index,question=''){
    if(mode==='thesis-value')return thesisValueAnalysis(index);
    const query=question||MODE_QUERIES[mode]||MODE_QUERIES.summary;
    const passages=searchPassages(index,query,mode==='summary'?10:8);
    if(!passages.length){
      return {
        title:'No matching evidence found',
        intro:'Quire extracted the paper but could not retrieve a passage that closely matched this request.',
        claims:[],
        notice:'Try a more specific question or inspect the article manually.'
      };
    }

    if(mode==='summary'){
      return {
        title:'Grounded article overview',
        intro:'These are the strongest source statements retrieved across the paper. Each statement is linked to the exact passage Quire used.',
        claims:claimsFromPassages(passages,5)
      };
    }
    if(mode==='methods'){
      return {
        title:'Methods — claim-level evidence',
        intro:'Quire retrieved source statements most relevant to design, participants, data collection and analysis.',
        claims:claimsFromPassages(passages,5)
      };
    }
    if(mode==='findings'){
      return {
        title:'Key findings — claim-level evidence',
        intro:'These source statements were the strongest matches for results, findings, outcomes and conclusions.',
        claims:claimsFromPassages(passages,5)
      };
    }
    if(mode==='critique'){
      return {
        title:'Critical appraisal — evidence to inspect',
        intro:'These passages are relevant to methodological appraisal. They are evidence for your own appraisal, not an automatic quality rating of the study.',
        claims:claimsFromPassages(passages,5),
        notice:'Absence of a retrieved passage is not evidence that the paper omitted an issue.'
      };
    }
    return {
      title:'Answer from this paper',
      intro:'These are the passages Quire found most relevant to your question.',
      claims:claimsFromPassages(passages,4)
    };
  }

  function buildContexts(index,mode,question){
    if(mode==='thesis-value')return searchPassages(index,(window.QuireStore?.getStudySetupData?.()?.researchQuestion||'study findings limitations methods implications'),10).map(p=>({context_id:p.id,page:p.page,text:p.text,rects:p.rects||[]}));
    const query=question||MODE_QUERIES[mode]||MODE_QUERIES.summary;
    return searchPassages(index,query,8).map(p=>({
      context_id:p.id,
      page:p.page,
      text:p.text,
      rects:p.rects||[]
    }));
  }

  function contextMap(contexts){
    return new Map(contexts.map(c=>[c.context_id,c]));
  }

  function mapRemoteClaim(claim,map){
    const ids=Array.isArray(claim?.context_ids)?claim.context_ids:[];
    const citations=ids.map(id=>map.get(id)).filter(Boolean).map(ctx=>({
      contextId:ctx.context_id,
      page:Number(ctx.page),
      excerpt:clip(ctx.text,220),
      rects:Array.isArray(ctx.rects)?ctx.rects:[]
    }));
    return {text:String(claim?.text||'').trim(),citations};
  }

  async function remoteAnalysis(endpoint,payload,contexts){
    const response=await fetch(endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(payload)
    });
    if(!response.ok) throw new Error('AI endpoint returned '+response.status+'.');
    const json=await response.json();
    const map=contextMap(contexts);

    if(Array.isArray(json?.claims)){
      const claims=json.claims.map(claim=>mapRemoteClaim(claim,map)).filter(c=>c.text);
      return {
        title:json.title||'Quire Copilot',
        intro:json.intro||'Grounded synthesis from the retrieved article passages.',
        claims,
        notice:claims.some(c=>!c.citations.length)
          ? 'One or more generated claims were not linked back to a supplied context. Treat uncited claims as unsupported.'
          : ''
      };
    }

    if(typeof json?.answer==='string'){
      return {
        title:json.title||'Quire Copilot',
        intro:'The connected endpoint returned the older answer format.',
        claims:[{text:json.answer,citations:[]}],
        notice:'This endpoint has not yet adopted Quire claim-level citations. Update it to return claims with context_ids before relying on generated statements.'
      };
    }
    throw new Error('AI endpoint returned an invalid response.');
  }

  function buildPayload(mode,question,article,contexts){
    return {
      schema_version:2,
      mode,
      question:question||'',
      article:{
        id:article.id,title:article.title,authors:article.authors,journal:article.journal,year:article.year,doi:article.doi
      },
      study:window.QuireStore?.getStudySetupData?.()||{},
      contexts:contexts.map(c=>({context_id:c.context_id,page:c.page,text:c.text})),
      instruction:[
        'Use only the supplied article contexts.',
        'Return JSON with title, intro, and claims.',
        'Each claim must be an object with text and context_ids.',
        'context_ids must contain only IDs from the supplied contexts that directly support that claim.',
        'Do not attach a context merely because it is topically related.',
        'If the supplied contexts do not support a requested claim, say so rather than infer it.'
      ].join(' ')
    };
  }

  async function analyse(mode='summary',question=''){
    const articleId=window.QuirePdfReader?.getCurrentArticleId?.();
    if(!articleId) throw new Error('Open a PDF article first.');
    setBusy(true,'Indexing article…');
    const index=await window.QuirePdfReader.ensureTextIndex(articleId);
    const hasText=(index.pages||[]).some(p=>String(p.text||'').trim());
    if(!hasText) throw new Error('No extractable text was found in this PDF. An OCR step is required for image-only papers.');

    const article=window.QuireStore.getArticle(articleId);
    const endpoint=config().endpoint;
    let result;

    if(endpoint){
      const contexts=buildContexts(index,mode,question);
      if(!contexts.length) throw new Error('Quire could not retrieve supporting passages for this request.');
      setBusy(true,'Asking grounded AI…');
      try{
        result=await remoteAnalysis(endpoint,buildPayload(mode,question,article,contexts),contexts);
        result.provider='remote';
      }catch(err){
        console.warn('Remote AI unavailable; using local grounded analysis.',err);
        result=localAnalysis(mode,index,question);
        result.provider='local-fallback';
        result.notice=(result.notice?result.notice+' ':'')+'The configured AI endpoint was unavailable, so Quire used local grounded analysis instead.';
      }
    }else{
      result=localAnalysis(mode,index,question);
      result.provider='local';
      result.notice=(result.notice?result.notice+' ':'')+'Local grounded mode uses source statements rather than generative paraphrasing.';
    }

    persistConversation(articleId,question,result);
    renderResult(result);
    setBusy(false);
    return result;
  }

  function allCitations(result){
    const seen=new Set();
    const refs=[];
    for(const claim of result.claims||[]){
      for(const cite of claim.citations||[]){
        const key=(cite.contextId||'')+'|'+cite.page+'|'+cite.excerpt;
        if(seen.has(key)) continue;
        seen.add(key);refs.push(cite);
      }
    }
    return refs;
  }

  function resultAsText(result){
    const body=(result.claims||[]).map((claim,index)=>{
      const pages=[...new Set((claim.citations||[]).map(c=>c.page).filter(Boolean))];
      return (index+1)+'. '+claim.text+(pages.length?' [p. '+pages.join(', ')+']':'');
    }).join('\n');
    return [result.intro,body].filter(Boolean).join('\n\n');
  }

  function persistConversation(articleId,question,result){
    try{
      const thread=window.QuireStore.getOrCreateArticleThread(articleId,'article');
      if(question) window.QuireStore.addAiMessage(thread.id,'user',question,[]);
      window.QuireStore.addAiMessage(thread.id,'assistant',resultAsText(result),allCitations(result));
    }catch(err){console.warn('Could not persist Copilot conversation',err);}
  }

  function renderClaim(claim,claimIndex,citationCounter){
    const citations=Array.isArray(claim.citations)?claim.citations:[];
    let buttons='';
    for(const citation of citations){
      const key='cite_'+claimIndex+'_'+citationCounter.value++;
      citationRegistry.set(key,citation);
      buttons+='<button type="button" class="claim-citation" data-copilot-citation="'+key+'" title="'+
        escapeHtml('Page '+citation.page+': '+citation.excerpt)+'"><span>['+(citationCounter.value-1)+']</span> p. '+Number(citation.page)+'</button>';
    }
    return '<article class="copilot-claim'+(citations.length?'':' uncited')+'">'+
      '<p>'+escapeHtml(claim.text)+'</p>'+
      (buttons?'<div class="claim-citation-row">'+buttons+'</div>':'<div class="claim-uncited">No exact source link returned</div>')+
    '</article>';
  }

  function renderResult(result){
    const target=document.getElementById('aiResponse');
    if(!target) return;
    citationRegistry=new Map();
    const counter={value:1};
    const claims=(result.claims||[]);
    target.innerHTML=
      '<span class="eyebrow">'+escapeHtml(result.title||'QUIRE COPILOT')+'</span>'+
      (result.intro?'<p class="copilot-intro">'+escapeHtml(result.intro)+'</p>':'')+
      '<div class="copilot-claims">'+claims.map((claim,index)=>renderClaim(claim,index,counter)).join('')+'</div>'+
      '<div id="citationEvidencePreview" class="citation-evidence-preview" hidden></div>'+
      (result.notice?'<small>'+escapeHtml(result.notice)+'</small>':'<small>Every citation marker is attached to the claim it supports. Verify important interpretations against the original paper.</small>');
  }

  function showCitationEvidence(citation){
    const box=document.getElementById('citationEvidencePreview');
    if(!box) return;
    box.hidden=false;
    box.innerHTML='<span class="eyebrow">EXACT SUPPORTING PASSAGE · PAGE '+Number(citation.page)+'</span><p>'+escapeHtml(citation.excerpt||'')+'</p><small>Quire is focusing this passage in the PDF.</small>';
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  }

  function setBusy(busy,label='Working…'){
    document.querySelectorAll('[data-ai],#readerAsk').forEach(btn=>btn.disabled=busy);
    const status=document.getElementById('copilotStatusLabel');
    if(status) status.textContent=busy?label:(config().endpoint?'Claim-linked AI connected':'Local claim-level mode');
    document.getElementById('copilotStatus')?.classList.toggle('working',busy);
  }

  function updateStatus(){
    const label=document.getElementById('copilotStatusLabel');
    if(label) label.textContent=config().endpoint?'Claim-linked AI connected':'Local claim-level mode';
    const endpoint=document.getElementById('aiEndpoint');
    if(endpoint&&document.activeElement!==endpoint) endpoint.value=config().endpoint||'';
  }

  function openSettings(){
    updateStatus();
    document.getElementById('aiSettingsModal').hidden=false;
  }
  function closeSettings(){document.getElementById('aiSettingsModal').hidden=true;}

  function bind(){
    document.querySelectorAll('[data-ai]').forEach(btn=>{
      btn.addEventListener('click',()=>analyse(btn.dataset.ai).catch(err=>{
        setBusy(false);
        renderResult({title:'Copilot could not analyse this paper',intro:err.message,claims:[]});
      }));
    });

    document.getElementById('readerAsk')?.addEventListener('click',()=>{
      const input=document.getElementById('readerPrompt');
      const question=input?.value.trim();
      if(!question) return;
      input.value='';
      analyse('question',question).catch(err=>{
        setBusy(false);
        renderResult({title:'Copilot could not answer',intro:err.message,claims:[]});
      });
    });

    document.getElementById('readerPrompt')?.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('readerAsk')?.click();}
    });

    document.getElementById('aiResponse')?.addEventListener('click',async e=>{
      const btn=e.target.closest('[data-copilot-citation]');
      if(!btn) return;
      const citation=citationRegistry.get(btn.dataset.copilotCitation);
      if(!citation) return;
      showCitationEvidence(citation);
      await window.QuirePdfReader?.focusEvidence?.(citation);
    });

    document.getElementById('copilotSettingsBtn')?.addEventListener('click',openSettings);
    document.getElementById('closeAiSettingsModal')?.addEventListener('click',closeSettings);
    document.getElementById('aiSettingsModal')?.addEventListener('click',e=>{if(e.target.id==='aiSettingsModal')closeSettings();});
    document.getElementById('saveAiSettings')?.addEventListener('click',()=>{
      try{setConfig(document.getElementById('aiEndpoint').value);closeSettings();}
      catch(err){const m=document.getElementById('aiSettingsMessage');if(m)m.textContent=err.message;}
    });
    document.getElementById('clearAiSettings')?.addEventListener('click',()=>{
      setConfig('');updateStatus();
      const m=document.getElementById('aiSettingsMessage');if(m)m.textContent='AI endpoint removed. Quire will use local claim-level mode.';
    });

    window.addEventListener('quire:text-index-progress',e=>{
      const current=window.QuirePdfReader?.getCurrentArticleId?.();
      if(e.detail?.articleId===current) setBusy(true,'Indexing page '+e.detail.page+' / '+e.detail.total);
    });
    window.addEventListener('quire:text-index-ready',e=>{
      const current=window.QuirePdfReader?.getCurrentArticleId?.();
      if(e.detail?.articleId===current) setBusy(false);
    });
    window.addEventListener('quire:text-index-empty',e=>{
      const current=window.QuirePdfReader?.getCurrentArticleId?.();
      if(e.detail?.articleId===current){
        setBusy(false);
        const status=document.getElementById('copilotStatusLabel');
        if(status) status.textContent='No text found · OCR needed';
      }
    });
    updateStatus();
  }

  window.QuireCopilot={analyse,searchPassages,localAnalysis,thesisValueAnalysis,setConfig,getConfig:config};
  document.addEventListener('DOMContentLoaded',bind);
})();