/* Quire Copilot v1 — grounded retrieval over real PDF text */
(function(){
  const CONFIG_KEY='quire:ai-config';
  const STOP=new Set(('a an and are as at be been being but by can could did do does for from had has have having he her hers him his how i if in into is it its may might more most must no not of on or our ours should so than that the their theirs them then there these they this those through to too under up very was we were what when where which while who why will with would you your').split(' '));

  const MODE_QUERIES={
    summary:'aim objective purpose background methods methodology participants sample results findings conclusion implications',
    methods:'methods methodology design participants sample setting recruitment data collection interview survey measures analysis ethics statistical thematic',
    findings:'results findings outcomes themes effects associations conclusion implications significant participants reported',
    critique:'limitations strengths bias sampling sample validity reliability reflexivity generalisability transferability confounding missing data blinding randomisation'
  };

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

  function chunksFromIndex(index){
    const chunks=[];
    for(const page of index?.pages||[]){
      const paras=String(page.text||'').split(/\n{2,}/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
      const source=paras.length?paras:[String(page.text||'').replace(/\s+/g,' ').trim()];
      for(const para of source){
        if(!para) continue;
        if(para.length<=1100){
          chunks.push({page:page.page,text:para});
        }else{
          const sentences=para.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[para];
          let bucket='';
          for(const sentence of sentences){
            if(bucket.length+sentence.length>950&&bucket){chunks.push({page:page.page,text:bucket.trim()});bucket='';}
            bucket+=' '+sentence.trim();
          }
          if(bucket.trim()) chunks.push({page:page.page,text:bucket.trim()});
        }
      }
    }
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
      .map(s=>s.replace(/\s+/g,' ').trim()).filter(s=>s.length>35);
  }

  function clip(text,max=260){
    const clean=String(text||'').replace(/\s+/g,' ').trim();
    return clean.length<=max?clean:clean.slice(0,max-1).replace(/\s+\S*$/,'')+'…';
  }

  function topTerms(passages,limit=6){
    const counts=new Map();
    passages.forEach(p=>tokenize(p.text).forEach(t=>{
      if(/^\d/.test(t)||t.length<4) return;
      counts.set(t,(counts.get(t)||0)+1);
    }));
    return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([t])=>t);
  }

  function sourceRefs(passages){
    const seen=new Set();
    return passages.filter(p=>{
      const key=p.page+'|'+p.text.slice(0,80);
      if(seen.has(key)) return false;
      seen.add(key);return true;
    }).slice(0,6).map(p=>({page:p.page,excerpt:clip(p.text,180)}));
  }

  function localAnalysis(mode,index,question=''){
    const query=question||MODE_QUERIES[mode]||MODE_QUERIES.summary;
    const passages=searchPassages(index,query,mode==='summary'?9:7);
    if(!passages.length){
      return {title:'No matching text found',answer:'Quire extracted the PDF text, but it could not find passages that matched this request closely enough.',citations:[]};
    }

    if(mode==='summary'){
      const pool=[];
      passages.forEach(p=>sentences(p.text).slice(0,3).forEach(s=>pool.push({page:p.page,text:s,score:p.score})));
      const chosen=[];
      const fingerprints=new Set();
      for(const item of pool.sort((a,b)=>b.score-a.score)){
        const fp=tokenize(item.text).slice(0,7).join(' ');
        if(!fp||fingerprints.has(fp)) continue;
        fingerprints.add(fp);chosen.push(item);
        if(chosen.length>=5) break;
      }
      const terms=topTerms(passages,5);
      return {
        title:'Grounded article overview',
        answer:'The strongest summary evidence in the extracted paper centres on '+(terms.length?terms.join(', '):'the paper’s main reported topics')+'.\n\n'+
          chosen.map(x=>'• '+clip(x.text,260)+' [p. '+x.page+']').join('\n'),
        citations:sourceRefs(passages)
      };
    }

    if(mode==='methods'){
      return {
        title:'Methods — source-grounded',
        answer:'These are the passages Quire found most relevant to study design, participants, data collection and analysis:\n\n'+
          passages.slice(0,5).map(p=>'• '+clip(sentences(p.text)[0]||p.text,280)+' [p. '+p.page+']').join('\n'),
        citations:sourceRefs(passages)
      };
    }

    if(mode==='findings'){
      return {
        title:'Key findings — source-grounded',
        answer:'These passages are the strongest matches for results, findings and conclusions in the paper:\n\n'+
          passages.slice(0,5).map(p=>'• '+clip(sentences(p.text)[0]||p.text,280)+' [p. '+p.page+']').join('\n'),
        citations:sourceRefs(passages)
      };
    }

    if(mode==='critique'){
      const whole=(index.pages||[]).map(p=>p.text).join(' ').toLowerCase();
      const checks=[
        ['limitations','limitations'],
        ['sample or sampling','sample'],
        ['ethics','ethic'],
        ['bias','bias'],
        ['validity / reliability','valid'],
        ['reflexivity','reflex'],
        ['missing data','missing data']
      ];
      const present=checks.filter(([,needle])=>whole.includes(needle)).map(([label])=>label);
      const absent=checks.filter(([,needle])=>!whole.includes(needle)).map(([label])=>label);
      return {
        title:'Grounded critical-appraisal starting point',
        answer:'Quire found explicit text relating to: '+(present.length?present.join(', '):'none of the checked appraisal terms')+'.\n\n'+
          (absent.length?'It did not find an explicit text match for: '+absent.join(', ')+'. This is not proof that the paper omits these issues; inspect the methods and discussion directly.\n\n':'')+
          'Most relevant appraisal passages:\n'+passages.slice(0,4).map(p=>'• '+clip(sentences(p.text)[0]||p.text,250)+' [p. '+p.page+']').join('\n'),
        citations:sourceRefs(passages)
      };
    }

    const answerPassages=passages.slice(0,4);
    return {
      title:'Answer from this paper',
      answer:'Quire found the following passages most relevant to your question:\n\n'+
        answerPassages.map(p=>'• '+clip(sentences(p.text)[0]||p.text,300)+' [p. '+p.page+']').join('\n'),
      citations:sourceRefs(answerPassages)
    };
  }

  async function remoteAnalysis(endpoint,payload){
    const response=await fetch(endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(payload)
    });
    if(!response.ok) throw new Error('AI endpoint returned '+response.status+'.');
    const json=await response.json();
    if(!json||typeof json.answer!=='string') throw new Error('AI endpoint returned an invalid response.');
    return {
      title:json.title||'Quire Copilot',
      answer:json.answer,
      citations:Array.isArray(json.citations)?json.citations:[]
    };
  }

  async function buildPayload(mode,question,article,index){
    const retrievalQuery=question||MODE_QUERIES[mode]||MODE_QUERIES.summary;
    const contexts=searchPassages(index,retrievalQuery,8).map(p=>({page:p.page,text:p.text}));
    return {
      mode,question:question||'',article:{
        id:article.id,title:article.title,authors:article.authors,journal:article.journal,year:article.year,doi:article.doi
      },
      study:window.QuireStore?.getStudySetupData?.()||{},
      contexts,
      instruction:'Answer only from the supplied article contexts. If the contexts do not support a claim, say so. Return page citations for substantive claims.'
    };
  }

  async function analyse(mode='summary',question=''){
    const articleId=window.QuirePdfReader?.getCurrentArticleId?.();
    if(!articleId) throw new Error('Open a PDF article first.');
    setBusy(true,'Indexing article…');
    const index=await window.QuirePdfReader.ensureTextIndex(articleId);
    const article=window.QuireStore.getArticle(articleId);
    const endpoint=config().endpoint;
    let result;
    if(endpoint){
      setBusy(true,'Asking grounded AI…');
      const payload=await buildPayload(mode,question,article,index);
      try{
        result=await remoteAnalysis(endpoint,payload);
        result.provider='remote';
      }catch(err){
        console.warn('Remote AI unavailable; using local grounded analysis.',err);
        result=localAnalysis(mode,index,question);
        result.provider='local-fallback';
        result.notice='The configured AI endpoint was unavailable, so Quire used local grounded analysis instead.';
      }
    }else{
      result=localAnalysis(mode,index,question);
      result.provider='local';
      result.notice='Local grounded mode extracts and retrieves evidence from the paper. Connect a secure AI endpoint for generative synthesis.';
    }
    persistConversation(articleId,mode,question,result);
    renderResult(result);
    setBusy(false);
    return result;
  }

  function persistConversation(articleId,mode,question,result){
    try{
      const thread=window.QuireStore.getOrCreateArticleThread(articleId,'article');
      if(question) window.QuireStore.addAiMessage(thread.id,'user',question,[]);
      window.QuireStore.addAiMessage(thread.id,'assistant',result.answer,result.citations||[]);
    }catch(err){console.warn('Could not persist Copilot conversation',err);}
  }

  function renderText(text){
    return String(text||'').split(/\n{2,}/).map(block=>{
      const lines=block.split(/\n/).filter(Boolean);
      if(lines.every(line=>line.trim().startsWith('•'))){
        return '<ul>'+lines.map(line=>'<li>'+escapeHtml(line.replace(/^\s*•\s*/,''))+'</li>').join('')+'</ul>';
      }
      return '<p>'+escapeHtml(block).replace(/\n/g,'<br>')+'</p>';
    }).join('');
  }

  function renderResult(result){
    const target=document.getElementById('aiResponse');
    if(!target) return;
    const cites=(result.citations||[]).filter(c=>Number(c.page)>0);
    target.innerHTML='<span class="eyebrow">'+escapeHtml(result.title||'QUIRE COPILOT')+'</span>'+
      renderText(result.answer)+
      (cites.length?'<div class="copilot-sources"><strong>Source pages</strong><div>'+cites.map(c=>'<button type="button" data-copilot-page="'+Number(c.page)+'">p. '+Number(c.page)+'</button>').join('')+'</div></div>':'')+
      (result.notice?'<small>'+escapeHtml(result.notice)+'</small>':'<small>Grounded in the extracted text of this article. Verify important claims against the source.</small>');
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  }

  function setBusy(busy,label='Working…'){
    document.querySelectorAll('[data-ai],#readerAsk').forEach(btn=>btn.disabled=busy);
    const status=document.getElementById('copilotStatusLabel');
    if(status) status.textContent=busy?label:(config().endpoint?'Grounded AI connected':'Local grounded mode');
    document.getElementById('copilotStatus')?.classList.toggle('working',busy);
  }

  function updateStatus(){
    const label=document.getElementById('copilotStatusLabel');
    if(label) label.textContent=config().endpoint?'Grounded AI connected':'Local grounded mode';
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
        setBusy(false);renderResult({title:'Copilot could not analyse this paper',answer:err.message,citations:[]});
      }));
    });
    document.getElementById('readerAsk')?.addEventListener('click',()=>{
      const input=document.getElementById('readerPrompt');
      const question=input?.value.trim();
      if(!question) return;
      input.value='';
      analyse('question',question).catch(err=>{
        setBusy(false);renderResult({title:'Copilot could not answer',answer:err.message,citations:[]});
      });
    });
    document.getElementById('readerPrompt')?.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('readerAsk')?.click();}
    });
    document.getElementById('aiResponse')?.addEventListener('click',e=>{
      const btn=e.target.closest('[data-copilot-page]');
      if(btn) window.QuirePdfReader?.renderPage?.(Number(btn.dataset.copilotPage));
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
      const m=document.getElementById('aiSettingsMessage');if(m)m.textContent='AI endpoint removed. Quire will use local grounded mode.';
    });
    window.addEventListener('quire:text-index-progress',e=>{
      const current=window.QuirePdfReader?.getCurrentArticleId?.();
      if(e.detail?.articleId===current) setBusy(true,'Indexing page '+e.detail.page+' / '+e.detail.total);
    });
    window.addEventListener('quire:text-index-ready',e=>{
      const current=window.QuirePdfReader?.getCurrentArticleId?.();
      if(e.detail?.articleId===current) setBusy(false);
    });
    updateStatus();
  }

  window.QuireCopilot={analyse,searchPassages,localAnalysis,setConfig,getConfig:config};
  document.addEventListener('DOMContentLoaded',bind);
})();