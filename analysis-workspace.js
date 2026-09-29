/* Quire Research Data & Analysis Workspace — Step 26 */
(function(){
  let editingId=null;
  let currentKindFilter='all';
  let currentStatusFilter='all';

  const TYPE_LABELS={
    qualitative:'Qualitative',
    quantitative:'Quantitative',
    mixed:'Mixed methods',
    meta:'Systematic review / meta-analysis',
    '':'Flexible analysis'
  };

  const KIND_CONFIG={
    qual_code:{
      label:'Code / category',group:'Analytic framework',
      fields:[
        {key:'definition',label:'Definition',type:'textarea',placeholder:'What does this code/category represent?'},
        {key:'examples',label:'Examples / indicators',type:'textarea',placeholder:'Typical examples, phrases or indicators.'},
        {key:'memo',label:'Analytic memo',type:'textarea',placeholder:'Interpretive thoughts, boundaries and relationships.'}
      ]
    },
    qual_finding:{
      label:'Qualitative finding',group:'Findings',
      fields:[
        {key:'interpretation',label:'Interpretation',type:'textarea',placeholder:'What does this finding mean?'},
        {key:'supportingData',label:'Supporting de-identified evidence',type:'textarea',placeholder:'Summarised excerpts, patterns or analytic evidence. Do not enter participant identifiers.'},
        {key:'relatedCodes',label:'Related codes / categories',type:'text',placeholder:'e.g. confidence; education; adaptation'},
        {key:'negativeCases',label:'Negative / divergent cases',type:'textarea',placeholder:'Evidence that complicates or contradicts the pattern.'}
      ]
    },
    memo:{
      label:'Analytic memo',group:'Memos',
      fields:[
        {key:'body',label:'Memo',type:'textarea',placeholder:'Record an analytic decision, reflection or interpretation.'}
      ]
    },
    quant_variable:{
      label:'Variable',group:'Analytic framework',
      fields:[
        {key:'variableType',label:'Variable type',type:'select',options:['continuous','ordinal','categorical','binary','count','date/time','other']},
        {key:'role',label:'Role',type:'select',options:['outcome','exposure / predictor','covariate','descriptive','identifier-free grouping','other']},
        {key:'unit',label:'Unit / scale',type:'text',placeholder:'e.g. years, score, mmHg'},
        {key:'coding',label:'Coding / derivation rule',type:'textarea',placeholder:'How the variable is coded or derived. Do not enter patient-level values.'}
      ]
    },
    quant_analysis:{
      label:'Quantitative analysis / result',group:'Findings',
      fields:[
        {key:'test',label:'Analysis / statistical test',type:'text',placeholder:'e.g. logistic regression, chi-square, descriptive statistics'},
        {key:'variables',label:'Variables involved',type:'text',placeholder:'Outcome, predictor, covariates'},
        {key:'result',label:'Result summary',type:'textarea',placeholder:'Summarise the de-identified aggregate result.'},
        {key:'effectEstimate',label:'Effect estimate',type:'text',placeholder:'e.g. OR 1.8, mean difference 4.2'},
        {key:'pValue',label:'p-value',type:'text',placeholder:'e.g. 0.03'},
        {key:'confidenceInterval',label:'Confidence interval',type:'text',placeholder:'e.g. 95% CI 1.2–2.6'},
        {key:'assumptions',label:'Assumptions / diagnostics',type:'textarea',placeholder:'Model checks, missingness, sensitivity analysis, caveats.'}
      ]
    },
    mixed_integration:{
      label:'Mixed-methods integration finding',group:'Findings',
      fields:[
        {key:'qualResult',label:'Qualitative result',type:'textarea',placeholder:'Qualitative finding being integrated.'},
        {key:'quantResult',label:'Quantitative result',type:'textarea',placeholder:'Quantitative result being integrated.'},
        {key:'integrationType',label:'Relationship',type:'select',options:['convergence','complementarity','dissonance','expansion']},
        {key:'interpretation',label:'Integrated interpretation',type:'textarea',placeholder:'What is learned by considering both strands together?'}
      ]
    },
    review_outcome:{
      label:'Review / meta-analysis outcome',group:'Findings',
      fields:[
        {key:'outcome',label:'Outcome',type:'text',placeholder:'Outcome being synthesised'},
        {key:'effectMeasure',label:'Effect measure',type:'text',placeholder:'e.g. RR, OR, MD, SMD'},
        {key:'model',label:'Model / synthesis method',type:'text',placeholder:'e.g. random effects, narrative synthesis'},
        {key:'estimate',label:'Pooled / synthesis result',type:'text',placeholder:'Aggregate result'},
        {key:'confidenceInterval',label:'Confidence interval',type:'text',placeholder:'e.g. 95% CI'},
        {key:'heterogeneity',label:'Heterogeneity / inconsistency',type:'text',placeholder:'e.g. I² 46%'},
        {key:'studies',label:'Studies contributing',type:'text',placeholder:'Number or source labels'},
        {key:'interpretation',label:'Interpretation',type:'textarea',placeholder:'What does this outcome mean for the review question?'}
      ]
    },
    synthesis_finding:{
      label:'Evidence-synthesis finding',group:'Findings',
      fields:[
        {key:'interpretation',label:'Finding / interpretation',type:'textarea',placeholder:'Synthesised conclusion across included studies.'},
        {key:'certainty',label:'Certainty / confidence',type:'select',options:['not assessed','higher','moderate','lower','very low / very uncertain']},
        {key:'supportingStudies',label:'Supporting studies',type:'text',placeholder:'Study labels or number of studies'},
        {key:'limitations',label:'Synthesis limitations',type:'textarea',placeholder:'Inconsistency, imprecision, indirectness, study limitations or other concerns.'}
      ]
    }
  };

  const MODES={
    qualitative:['qual_code','qual_finding','memo'],
    quantitative:['quant_variable','quant_analysis','memo'],
    mixed:['qual_code','qual_finding','quant_variable','quant_analysis','mixed_integration','memo'],
    meta:['review_outcome','synthesis_finding','memo'],
    '':['qual_finding','quant_analysis','memo']
  };

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function studyType(){return window.QuireStore.getStudySetupData()?.studyType||'';}
  function allowedKinds(){return MODES[studyType()]||MODES[''];}
  function items(){return window.QuireStore.listAnalysisItems();}
  function objectives(){return window.QuireStore.listObjectives();}
  function chapters(){return window.QuireStore.listChapters();}
  function sections(){const state=window.QuireStore.getState();const pid=window.QuireStore.getActiveProjectId();return (state.sections||[]).filter(s=>s.projectId===pid);}

  function kindLabel(kind){return KIND_CONFIG[kind]?.label||kind;}
  function statusLabel(status){return ({draft:'Draft',ready:'Ready for writing',verified:'Verified / checked'})[status]||status;}

  function renderStats(){
    const summary=window.QuireStore.analysisSummary();
    const objectiveIds=new Set(items().map(i=>i.objectiveId).filter(Boolean));
    const sectionIds=new Set(items().map(i=>i.sectionId).filter(Boolean));
    const values={
      analysisTotal:summary.total,
      analysisReady:summary.ready,
      analysisVerified:summary.verified,
      analysisObjectives:objectiveIds.size,
      analysisSections:sectionIds.size
    };
    Object.entries(values).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=String(value);});
    const badge=document.getElementById('analysisStudyType');
    if(badge)badge.textContent=TYPE_LABELS[studyType()]||'Flexible analysis';
  }

  function itemSummary(item){
    const p=item.payload||{};
    const keys=['interpretation','result','body','definition','outcome','test','qualResult','quantResult','coding'];
    const value=keys.map(k=>p[k]).find(Boolean);
    return value?String(value):'No analysis note recorded yet.';
  }

  function filterItems(){
    const query=(document.getElementById('analysisSearch')?.value||'').trim().toLowerCase();
    return items().filter(item=>{
      if(currentKindFilter!=='all'&&item.kind!==currentKindFilter)return false;
      if(currentStatusFilter!=='all'&&item.status!==currentStatusFilter)return false;
      if(query){
        const hay=[item.title,item.kind,JSON.stringify(item.payload||{})].join(' ').toLowerCase();
        if(!hay.includes(query))return false;
      }
      return true;
    });
  }

  function renderKindFilter(){
    const select=document.getElementById('analysisKindFilter');
    if(!select)return;
    const current=select.value||currentKindFilter;
    select.innerHTML='<option value="all">All analysis items</option>'+
      allowedKinds().map(kind=>'<option value="'+kind+'">'+escapeHtml(kindLabel(kind))+'</option>').join('');
    select.value=allowedKinds().includes(current)?current:'all';
    currentKindFilter=select.value;
  }

  function renderBoard(){
    const mount=document.getElementById('analysisBoard');
    if(!mount)return;
    const rows=filterItems();
    const objectiveMap=new Map(objectives().map(o=>[o.id,o]));
    const sectionMap=new Map(sections().map(s=>[s.id,s]));
    const chapterMap=new Map(chapters().map(c=>[c.id,c]));

    if(!rows.length){
      mount.innerHTML='<div class="analysis-empty"><strong>No analysis items in this view</strong><small>Add a code, variable, finding, result or memo. Quire stores analytic summaries and decisions—not identifiable raw participant data.</small></div>';
      return;
    }

    const groups=[];
    for(const kind of allowedKinds()){
      const groupRows=rows.filter(i=>i.kind===kind);
      if(groupRows.length)groups.push({kind,rows:groupRows});
    }
    rows.filter(i=>!allowedKinds().includes(i.kind)).forEach(item=>{
      let group=groups.find(g=>g.kind===item.kind);
      if(!group){group={kind:item.kind,rows:[]};groups.push(group);}
      group.rows.push(item);
    });

    mount.innerHTML=groups.map(group=>
      '<section class="analysis-kind-group">'+
        '<div class="analysis-kind-head"><span>'+escapeHtml(KIND_CONFIG[group.kind]?.group||'Analysis')+'</span><strong>'+escapeHtml(kindLabel(group.kind))+'</strong><small>'+group.rows.length+' item'+(group.rows.length===1?'':'s')+'</small></div>'+
        '<div class="analysis-card-grid">'+group.rows.map(item=>{
          const objective=objectiveMap.get(item.objectiveId);
          const section=sectionMap.get(item.sectionId);
          const chapter=section?chapterMap.get(section.chapterId):null;
          return '<article class="analysis-item-card status-'+item.status+'">'+
            '<div class="analysis-item-top"><span>'+escapeHtml(kindLabel(item.kind))+'</span><em>'+escapeHtml(statusLabel(item.status))+'</em></div>'+
            '<h3>'+escapeHtml(item.title)+'</h3>'+
            '<p>'+escapeHtml(itemSummary(item).slice(0,220))+'</p>'+
            '<div class="analysis-item-links">'+
              (objective?'<span>◎ '+escapeHtml(objective.title)+'</span>':'<span class="muted">No objective linked</span>')+
              (section?'<span>§ '+escapeHtml((chapter?.number?chapter.number+' · ':'')+section.title)+'</span>':'<span class="muted">Not linked to writing</span>')+
            '</div>'+
            '<div class="analysis-item-actions">'+
              '<button type="button" data-analysis-edit="'+item.id+'">Edit</button>'+
              (section?'<button type="button" data-analysis-open-section="'+section.id+'">Open section</button>':'')+
              '<button type="button" data-analysis-copy="'+item.id+'">Copy summary</button>'+
            '</div>'+
          '</article>';
        }).join('')+'</div>'+
      '</section>'
    ).join('');

    mount.querySelectorAll('[data-analysis-edit]').forEach(btn=>btn.addEventListener('click',()=>openModal(btn.dataset.analysisEdit)));
    mount.querySelectorAll('[data-analysis-open-section]').forEach(btn=>btn.addEventListener('click',()=>{
      window.QuireChapterEditor?.openSection?.(btn.dataset.analysisOpenSection);
      window.showView?.('chapters');
    }));
    mount.querySelectorAll('[data-analysis-copy]').forEach(btn=>btn.addEventListener('click',async()=>{
      const item=window.QuireStore.getAnalysisItem(btn.dataset.analysisCopy);
      if(!item)return;
      const text=item.title+'\n\n'+itemSummary(item);
      try{await navigator.clipboard.writeText(text);}catch(e){}
    }));
  }

  function populateCommonSelects(){
    const kind=document.getElementById('analysisItemKind');
    kind.innerHTML=allowedKinds().map(k=>'<option value="'+k+'">'+escapeHtml(kindLabel(k))+'</option>').join('');

    const objective=document.getElementById('analysisItemObjective');
    objective.innerHTML='<option value="">No objective link</option>'+objectives().map(o=>'<option value="'+o.id+'">'+escapeHtml((o.orderIndex?o.orderIndex+'. ':'')+o.title)+'</option>').join('');

    const section=document.getElementById('analysisItemSection');
    const chapterMap=new Map(chapters().map(c=>[c.id,c]));
    section.innerHTML='<option value="">Not linked to a writing section</option>'+sections().map(s=>{
      const c=chapterMap.get(s.chapterId);
      return '<option value="'+s.id+'">'+escapeHtml((c?.number?c.number+' · ':'')+(c?.title||'Chapter')+' → '+s.title)+'</option>';
    }).join('');
  }

  function fieldHtml(field,value){
    const id='analysisPayload_'+field.key;
    if(field.type==='select'){
      return '<label class="field"><span>'+escapeHtml(field.label)+'</span><select id="'+id+'" data-analysis-payload="'+field.key+'">'+
        (field.options||[]).map(opt=>'<option value="'+escapeHtml(opt)+'" '+(String(value||'')===String(opt)?'selected':'')+'>'+escapeHtml(opt)+'</option>').join('')+
      '</select></label>';
    }
    if(field.type==='textarea'){
      return '<label class="field wide"><span>'+escapeHtml(field.label)+'</span><textarea id="'+id+'" data-analysis-payload="'+field.key+'" rows="4" placeholder="'+escapeHtml(field.placeholder||'')+'">'+escapeHtml(value||'')+'</textarea></label>';
    }
    return '<label class="field"><span>'+escapeHtml(field.label)+'</span><input id="'+id+'" data-analysis-payload="'+field.key+'" type="text" value="'+escapeHtml(value||'')+'" placeholder="'+escapeHtml(field.placeholder||'')+'"></label>';
  }

  function renderDynamicFields(kind,payload={}){
    const mount=document.getElementById('analysisDynamicFields');
    const config=KIND_CONFIG[kind]||KIND_CONFIG.memo;
    mount.innerHTML=(config.fields||[]).map(field=>fieldHtml(field,payload[field.key])).join('');
  }

  function openModal(itemId=null){
    editingId=itemId;
    populateCommonSelects();
    const item=itemId?window.QuireStore.getAnalysisItem(itemId):null;
    const kind=item?.kind&&allowedKinds().includes(item.kind)?item.kind:allowedKinds()[0];
    document.getElementById('analysisModalTitle').textContent=item?'Edit analysis item':'Add analysis item';
    document.getElementById('analysisItemKind').value=kind;
    document.getElementById('analysisItemTitle').value=item?.title||'';
    document.getElementById('analysisItemObjective').value=item?.objectiveId||'';
    document.getElementById('analysisItemSection').value=item?.sectionId||'';
    document.getElementById('analysisItemStatus').value=item?.status||'draft';
    document.getElementById('deleteAnalysisItemBtn').hidden=!item;
    document.getElementById('analysisModalMessage').textContent='';
    renderDynamicFields(kind,item?.payload||{});
    document.getElementById('analysisItemModal').hidden=false;
    setTimeout(()=>document.getElementById('analysisItemTitle')?.focus(),0);
  }

  function collectPayload(){
    const payload={};
    document.querySelectorAll('[data-analysis-payload]').forEach(input=>payload[input.dataset.analysisPayload]=input.value.trim());
    return payload;
  }

  function saveItem(){
    const title=document.getElementById('analysisItemTitle').value.trim();
    if(!title){
      document.getElementById('analysisModalMessage').textContent='Give this analysis item a clear title.';
      return;
    }
    const data={
      kind:document.getElementById('analysisItemKind').value,
      title,
      objectiveId:document.getElementById('analysisItemObjective').value||null,
      sectionId:document.getElementById('analysisItemSection').value||null,
      status:document.getElementById('analysisItemStatus').value,
      payload:collectPayload()
    };
    if(editingId)window.QuireStore.updateAnalysisItem(editingId,data);
    else window.QuireStore.addAnalysisItem(data);
    document.getElementById('analysisItemModal').hidden=true;
    editingId=null;
    render();
  }

  function deleteItem(){
    if(!editingId)return;
    if(!confirm('Delete this analysis item?'))return;
    window.QuireStore.removeAnalysisItem(editingId);
    document.getElementById('analysisItemModal').hidden=true;
    editingId=null;
    render();
  }

  function render(){
    renderStats();renderKindFilter();renderBoard();
  }

  function bind(){
    document.getElementById('newAnalysisItemBtn')?.addEventListener('click',()=>openModal());
    document.getElementById('closeAnalysisItemModal')?.addEventListener('click',()=>document.getElementById('analysisItemModal').hidden=true);
    document.getElementById('cancelAnalysisItem')?.addEventListener('click',()=>document.getElementById('analysisItemModal').hidden=true);
    document.getElementById('saveAnalysisItem')?.addEventListener('click',saveItem);
    document.getElementById('deleteAnalysisItemBtn')?.addEventListener('click',deleteItem);
    document.getElementById('analysisItemModal')?.addEventListener('click',e=>{if(e.target.id==='analysisItemModal')e.currentTarget.hidden=true;});
    document.getElementById('analysisItemKind')?.addEventListener('change',e=>renderDynamicFields(e.target.value,{}));
    document.getElementById('analysisKindFilter')?.addEventListener('change',e=>{currentKindFilter=e.target.value;renderBoard();});
    document.getElementById('analysisStatusFilter')?.addEventListener('change',e=>{currentStatusFilter=e.target.value;renderBoard();});
    document.getElementById('analysisSearch')?.addEventListener('input',renderBoard);
    window.addEventListener('quire:project-switched',()=>{editingId=null;currentKindFilter='all';currentStatusFilter='all';render();});
    window.addEventListener('quire:cloud-pulled',render);
    window.addEventListener('quire:store-changed',()=>{if(document.getElementById('analysis')?.classList.contains('active'))renderStats();});
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireAnalysis={render,openModal};
})();