/* Quire Critical Appraisal — Step 25 */
(function(){
  let selectedArticleId=null;
  let scope='all';
  let saveTimer=null;

  const TOOLS={
    generic:{
      label:'Generic structured appraisal',
      domains:[
        ['aim','Clear research aim / question'],
        ['design','Design appropriate to the question'],
        ['sampling','Sampling / selection adequately described'],
        ['measurement','Data collection / measurement appropriate'],
        ['analysis','Analysis approach appropriate and transparent'],
        ['bias','Bias, confounding or alternative explanations considered'],
        ['findings','Findings supported by the reported data'],
        ['applicability','Applicability to the thesis question considered']
      ]
    },
    qualitative:{
      label:'Qualitative study appraisal',
      domains:[
        ['aim','Research aim clearly stated'],
        ['methodology','Qualitative methodology appropriate'],
        ['sampling','Recruitment / sampling strategy justified'],
        ['collection','Data collection supports the research aim'],
        ['reflexivity','Researcher role / reflexivity considered'],
        ['ethics','Ethical issues addressed'],
        ['analysis','Analysis process sufficiently transparent'],
        ['grounding','Interpretations grounded in participant data'],
        ['transferability','Context and transferability considered']
      ]
    },
    rct:{
      label:'Randomised trial appraisal',
      domains:[
        ['randomisation','Randomisation / allocation adequately described'],
        ['baseline','Groups reasonably comparable at baseline'],
        ['blinding','Blinding used where feasible and relevant'],
        ['followup','Follow-up and attrition adequately handled'],
        ['intervention','Intervention and comparator clearly delivered'],
        ['outcomes','Outcomes measured appropriately'],
        ['analysis','Analysis matches the trial design'],
        ['precision','Effect estimates and precision reported'],
        ['applicability','Clinical / contextual applicability considered']
      ]
    },
    observational:{
      label:'Observational study appraisal',
      domains:[
        ['population','Study population and selection clearly described'],
        ['exposure','Exposure / predictor measurement appropriate'],
        ['outcome','Outcome measurement appropriate'],
        ['confounding','Important confounding considered'],
        ['followup','Follow-up / missing data adequately addressed'],
        ['analysis','Statistical analysis appropriate'],
        ['precision','Uncertainty / precision reported'],
        ['temporality','Temporal relationship interpretable where relevant'],
        ['applicability','Applicability to the thesis population considered']
      ]
    },
    systematic:{
      label:'Systematic review appraisal',
      domains:[
        ['question','Review question and eligibility criteria clear'],
        ['protocol','Protocol / methods planned in advance where appropriate'],
        ['search','Search strategy sufficiently comprehensive'],
        ['selection','Study selection transparent and reproducible'],
        ['appraisal','Included studies critically appraised'],
        ['extraction','Data extraction methods transparent'],
        ['synthesis','Synthesis method appropriate'],
        ['heterogeneity','Heterogeneity / inconsistency considered'],
        ['certainty','Limitations and certainty of evidence considered']
      ]
    },
    mixed:{
      label:'Mixed-methods appraisal',
      domains:[
        ['rationale','Rationale for mixed methods is clear'],
        ['qual','Qualitative component methodologically sound'],
        ['quant','Quantitative component methodologically sound'],
        ['integration','Integration occurs at an appropriate point'],
        ['divergence','Divergent findings are considered'],
        ['inference','Integrated conclusions are supported'],
        ['applicability','Applicability of integrated findings considered']
      ]
    }
  };

  const JUDGEMENTS={
    not_started:'Not appraised',
    lower_concern:'Lower concern',
    some_concerns:'Some concerns',
    major_concerns:'Major concerns',
    unclear:'Unclear'
  };

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function authorYear(article){
    const first=String(article?.authors||'').split(';')[0]?.trim();
    const surname=first?first.split(/\s+/).slice(-1)[0]:'Unknown author';
    return surname+(article?.year?' '+article.year:'');
  }
  function articlePool(){
    const articles=window.QuireStore.listArticles();
    if(scope==='all')return articles;
    const records=window.QuireStore.listScreeningRecords();
    const included=new Set(records.filter(r=>
      r.fullTextDecision==='include' ||
      (r.fullTextDecision==='not_started' && r.titleAbstractDecision==='include')
    ).map(r=>r.articleId));
    return articles.filter(a=>included.has(a.id));
  }

  function appraisalMap(){
    return new Map(window.QuireStore.listAppraisals().map(a=>[a.articleId,a]));
  }

  function renderStats(){
    const screening=window.QuireStore.screeningSummary();
    const summary=window.QuireStore.appraisalSummary();
    const included=screening.fullTextIncluded || screening.titleIncluded || 0;
    const values={
      appraisalIncluded:included,
      appraisalCompleted:summary.completed,
      appraisalLower:summary.lowerConcern,
      appraisalSome:summary.someConcerns,
      appraisalMajor:summary.majorConcerns
    };
    Object.entries(values).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=String(value);});
  }

  function renderArticleList(){
    const mount=document.getElementById('appraisalArticleList');
    if(!mount)return;
    const query=(document.getElementById('appraisalSearch')?.value||'').trim().toLowerCase();
    const map=appraisalMap();
    let rows=articlePool().filter(a=>{
      if(!query)return true;
      return [a.title,a.authors,a.journal,a.year,a.doi].filter(Boolean).join(' ').toLowerCase().includes(query);
    });

    if(!selectedArticleId || !rows.some(a=>a.id===selectedArticleId)) selectedArticleId=rows[0]?.id||null;

    document.getElementById('appraisalPaperCount').textContent=rows.length+' '+(rows.length===1?'paper':'papers');
    if(!rows.length){
      mount.innerHTML='<div class="appraisal-empty"><strong>No papers in this view</strong><small>Include papers during screening or switch the scope to All library papers.</small></div>';
      return;
    }

    mount.innerHTML=rows.map(article=>{
      const appraisal=map.get(article.id);
      const judgement=appraisal?.overallJudgement||'not_started';
      return '<button type="button" class="appraisal-paper-row '+(selectedArticleId===article.id?'active':'')+'" data-appraisal-article="'+article.id+'">'+
        '<div><span>'+escapeHtml(authorYear(article))+'</span><strong>'+escapeHtml(article.title||'Untitled paper')+'</strong><small>'+escapeHtml(article.journal||'')+'</small></div>'+
        '<em class="appraisal-judgement '+judgement+'">'+escapeHtml(JUDGEMENTS[judgement])+'</em>'+
      '</button>';
    }).join('');

    mount.querySelectorAll('[data-appraisal-article]').forEach(btn=>btn.addEventListener('click',()=>{
      selectedArticleId=btn.dataset.appraisalArticle;
      renderArticleList();
      renderEditor();
    }));
  }

  function templateDomains(toolType,existing=[]){
    const template=TOOLS[toolType]||TOOLS.generic;
    const byKey=new Map((existing||[]).map(d=>[d.key,d]));
    return template.domains.map(([key,label])=>({
      key,label,
      decision:byKey.get(key)?.decision||'unclear',
      note:byKey.get(key)?.note||''
    }));
  }

  function currentArticle(){
    return window.QuireStore.getArticle(selectedArticleId);
  }

  function currentAppraisal(){
    const article=currentArticle();
    if(!article)return null;
    const existing=window.QuireStore.getAppraisal(article.id);
    if(existing)return existing;
    return {
      articleId:article.id,toolType:'generic',
      domains:templateDomains('generic'),
      overallJudgement:'not_started',
      strengths:'',limitations:'',applicability:''
    };
  }

  function renderEditor(){
    const article=currentArticle();
    const empty=document.getElementById('appraisalEditorEmpty');
    const editor=document.getElementById('appraisalEditor');
    if(!article){
      if(empty)empty.hidden=false;
      if(editor)editor.hidden=true;
      return;
    }
    if(empty)empty.hidden=true;
    editor.hidden=false;

    const appraisal=currentAppraisal();
    document.getElementById('appraisalArticleTitle').textContent=article.title||'Untitled paper';
    document.getElementById('appraisalArticleMeta').textContent=[article.authors,article.journal,article.year,article.doi?'DOI '+article.doi:''].filter(Boolean).join(' · ');
    document.getElementById('appraisalTool').value=appraisal.toolType||'generic';
    document.getElementById('appraisalOverall').value=appraisal.overallJudgement||'not_started';
    document.getElementById('appraisalStrengths').value=appraisal.strengths||'';
    document.getElementById('appraisalLimitations').value=appraisal.limitations||'';
    document.getElementById('appraisalApplicability').value=appraisal.applicability||'';

    const domains=templateDomains(appraisal.toolType||'generic',appraisal.domains||[]);
    const mount=document.getElementById('appraisalDomains');
    mount.innerHTML=domains.map((domain,index)=>
      '<article class="appraisal-domain" data-appraisal-domain data-domain-key="'+escapeHtml(domain.key)+'">'+
        '<div><span>DOMAIN '+(index+1)+'</span><strong>'+escapeHtml(domain.label)+'</strong></div>'+
        '<select data-domain-decision>'+
          ['yes','no','unclear','na'].map(value=>'<option value="'+value+'" '+(domain.decision===value?'selected':'')+'>'+({yes:'Yes / adequately addressed',no:'No / concern identified',unclear:'Unclear',na:'Not applicable'})[value]+'</option>').join('')+
        '</select>'+
        '<input data-domain-note type="text" value="'+escapeHtml(domain.note||'')+'" placeholder="Appraisal note / evidence from paper">'+
      '</article>'
    ).join('');

    mount.querySelectorAll('select,input').forEach(input=>input.addEventListener('change',queueSave));
    document.getElementById('appraisalSaveState').textContent=appraisal.completedAt?'Completed · '+new Date(appraisal.completedAt).toLocaleDateString():'Autosave';
  }

  function collect(){
    const article=currentArticle();
    if(!article)return null;
    const domains=[...document.querySelectorAll('[data-appraisal-domain]')].map(row=>({
      key:row.dataset.domainKey,
      label:row.querySelector('strong')?.textContent||'',
      decision:row.querySelector('[data-domain-decision]')?.value||'unclear',
      note:row.querySelector('[data-domain-note]')?.value.trim()||''
    }));
    return {
      toolType:document.getElementById('appraisalTool').value,
      domains,
      overallJudgement:document.getElementById('appraisalOverall').value,
      strengths:document.getElementById('appraisalStrengths').value.trim(),
      limitations:document.getElementById('appraisalLimitations').value.trim(),
      applicability:document.getElementById('appraisalApplicability').value.trim()
    };
  }

  function saveNow(){
    const article=currentArticle();
    const data=collect();
    if(!article||!data)return;
    const saved=window.QuireStore.saveAppraisal(article.id,data);
    const state=document.getElementById('appraisalSaveState');
    if(state)state.textContent='Saved';
    setTimeout(()=>{if(state)state.textContent=saved.completedAt?'Completed':'Autosave';},800);
    renderStats();
    renderArticleList();
    window.dispatchEvent(new CustomEvent('quire:appraisal-changed',{detail:{articleId:article.id}}));
  }

  function queueSave(){
    clearTimeout(saveTimer);
    const state=document.getElementById('appraisalSaveState');
    if(state)state.textContent='Saving…';
    saveTimer=setTimeout(saveNow,450);
  }

  function changeTool(){
    const appraisal=currentAppraisal();
    const next=document.getElementById('appraisalTool').value;
    const hasWork=(appraisal.domains||[]).some(d=>d.note||d.decision==='yes'||d.decision==='no') ||
      appraisal.strengths||appraisal.limitations||appraisal.applicability;
    if(hasWork && next!==appraisal.toolType && !confirm('Switch appraisal domain set? Existing summary text will be kept, but domain-specific notes that do not match the new tool may no longer appear.')){
      document.getElementById('appraisalTool').value=appraisal.toolType;
      return;
    }
    window.QuireStore.saveAppraisal(selectedArticleId,{
      ...collect(),
      toolType:next,
      domains:templateDomains(next,appraisal.domains||[])
    });
    renderEditor();renderArticleList();renderStats();
  }

  function bind(){
    document.getElementById('appraisalScope')?.addEventListener('change',e=>{scope=e.target.value;selectedArticleId=null;renderArticleList();renderEditor();});
    document.getElementById('appraisalSearch')?.addEventListener('input',renderArticleList);
    document.getElementById('appraisalTool')?.addEventListener('change',changeTool);
    ['appraisalOverall','appraisalStrengths','appraisalLimitations','appraisalApplicability'].forEach(id=>{
      document.getElementById(id)?.addEventListener(id==='appraisalOverall'?'change':'input',queueSave);
    });
    document.getElementById('saveAppraisalBtn')?.addEventListener('click',saveNow);
    document.getElementById('openAppraisalPaperBtn')?.addEventListener('click',async()=>{
      if(!selectedArticleId)return;
      window.showView?.('reader');
      try{await window.QuirePdfReader?.openArticle?.(selectedArticleId);}catch(e){}
    });
    window.addEventListener('quire:project-switched',()=>{selectedArticleId=null;render();});
    window.addEventListener('quire:cloud-pulled',render);
    window.addEventListener('quire:store-changed',()=>{
      if(document.getElementById('appraisal')?.classList.contains('active'))renderStats();
    });
    render();
  }

  function render(){
    renderStats();renderArticleList();renderEditor();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireAppraisal={render,getJudgementLabel:value=>JUDGEMENTS[value]||value};
})();