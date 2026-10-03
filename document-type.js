/* Quire Document Type — thesis, research paper or assignment */
(function(){
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function el(id){return document.getElementById(id);}

  function type(projectId){return window.QuireStore?.getProjectType?.(projectId)||'thesis';}
  function isPaper(projectId){return type(projectId)==='paper';}
  function isAssignment(projectId){return type(projectId)==='assignment';}
  function cap(word,yes){return yes?word.charAt(0).toUpperCase()+word.slice(1):word;}
  // noun() -> 'thesis' / 'paper' / 'assignment'; capitalised when upper=true
  function noun(kind,upper){
    const k=kind||type();
    return cap(k==='paper'?'paper':k==='assignment'?'assignment':'thesis',upper);
  }
  function partNoun(kind,upper){return cap((kind||type())==='thesis'?'chapter':'section',upper);}
  function templates(kind){
    const all=window.QuireStore?.documentTemplates||{};
    return all[kind]||all.thesis||{};
  }
  function typeOptions(kind){
    const store=window.QuireStore||{};
    if(kind==='paper')return store.paperArticleTypes||{};
    if(kind==='assignment')return store.assignmentTypes||{};
    return {empirical:'Empirical thesis',review:'Review-based thesis',compact:'Compact dissertation'};
  }
  // Pick data-doc-<kind>[-suffix] text, falling back to the thesis wording.
  function pick(node,prefix,kind){return node.getAttribute(prefix+kind)??node.getAttribute(prefix+'thesis');}

  // Replace the trailing text of an element without touching icon spans or counters.
  function setLabel(node,text){
    const textNodes=[...node.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim());
    if(textNodes.length)textNodes[textNodes.length-1].textContent=(node.children.length?' ':'')+text;
    else node.textContent=text;
  }

  function applyLabels(){
    const kind=type();
    document.body?.setAttribute('data-doc-type',kind);
    document.querySelectorAll('[data-doc-thesis]').forEach(node=>setLabel(node,pick(node,'data-doc-',kind)));
    document.querySelectorAll('[data-doc-ph-thesis]').forEach(node=>node.setAttribute('placeholder',pick(node,'data-doc-ph-',kind)));
    document.querySelectorAll('[data-doc-only]').forEach(node=>{node.hidden=!node.dataset.docOnly.split(/\s+/).includes(kind);});
  }

  /* ---------- Structure editor (shared by guided setup and Study Setup) ---------- */
  function structureEditor(mount,{items=[],unit='Section',onChange}={}){
    let rows=items.map(item=>typeof item==='string'?{title:item}:{id:item.id||null,title:item.title||''});
    function emit(){onChange?.(rows.map(r=>({...r})));}
    function render(){
      if(!mount)return;
      mount.innerHTML='<div class="structure-editor-list">'+rows.map((row,index)=>
        '<div class="structure-editor-row" data-row="'+index+'">'+
          '<span class="structure-editor-num">'+(index+1)+'</span>'+
          '<input type="text" value="'+escapeHtml(row.title)+'" aria-label="'+escapeHtml(unit)+' '+(index+1)+' title" data-structure-title="'+index+'">'+
          '<button type="button" data-structure-up="'+index+'" aria-label="Move up"'+(index===0?' disabled':'')+'>↑</button>'+
          '<button type="button" data-structure-down="'+index+'" aria-label="Move down"'+(index===rows.length-1?' disabled':'')+'>↓</button>'+
          '<button type="button" data-structure-remove="'+index+'" aria-label="Remove">×</button>'+
        '</div>'
      ).join('')+'</div>'+
      '<button type="button" class="soft-btn structure-editor-add" data-structure-add>＋ Add '+escapeHtml(unit.toLowerCase())+'</button>';
      mount.querySelectorAll('[data-structure-title]').forEach(input=>input.addEventListener('input',()=>{
        rows[Number(input.dataset.structureTitle)].title=input.value;emit();
      }));
      mount.querySelectorAll('[data-structure-up]').forEach(btn=>btn.addEventListener('click',()=>move(Number(btn.dataset.structureUp),-1)));
      mount.querySelectorAll('[data-structure-down]').forEach(btn=>btn.addEventListener('click',()=>move(Number(btn.dataset.structureDown),1)));
      mount.querySelectorAll('[data-structure-remove]').forEach(btn=>btn.addEventListener('click',()=>{
        rows.splice(Number(btn.dataset.structureRemove),1);render();emit();
      }));
      mount.querySelector('[data-structure-add]')?.addEventListener('click',()=>{
        rows.push({id:null,title:'New '+unit.toLowerCase()});render();emit();
        const inputs=mount.querySelectorAll('[data-structure-title]');
        inputs[inputs.length-1]?.select();
      });
    }
    function move(index,delta){
      const target=index+delta;
      if(target<0||target>=rows.length)return;
      [rows[index],rows[target]]=[rows[target],rows[index]];
      render();emit();
    }
    render();
    return {
      get:()=>rows.map(r=>({...r})).filter(r=>String(r.title).trim()),
      set:(next,{unit:nextUnit}={})=>{if(nextUnit)unit=nextUnit;rows=next.map(item=>typeof item==='string'?{title:item}:{id:item.id||null,title:item.title||''});render();}
    };
  }

  /* ---------- Study Setup: document type card ---------- */
  let setupEditor=null;

  function currentSetupType(){
    return document.querySelector('input[name="projectType"]:checked')?.value||type();
  }

  function renderTemplateOptions(){
    const select=el('structureTemplate');
    if(!select)return;
    const kind=currentSetupType();
    const labels=typeOptions(kind);
    select.innerHTML=Object.keys(templates(kind)).map(key=>'<option value="'+key+'">'+escapeHtml(labels[key]||key)+'</option>').join('');
    if(kind==='paper'&&el('paperArticleType')?.value)select.value=el('paperArticleType').value;
    if(kind==='assignment'&&el('assignmentType')?.value)select.value=el('assignmentType').value;
  }

  function refreshSetupCard(){
    const kind=currentSetupType();
    document.querySelectorAll('[data-setup-doc-only]').forEach(node=>{node.hidden=!node.dataset.setupDocOnly.split(/\s+/).includes(kind);});
    const unit=partNoun(kind,true);
    if(el('structureCardUnit'))el('structureCardUnit').textContent=kind==='thesis'?'Thesis chapters':noun(kind,true)+' sections';
    renderTemplateOptions();
    if(!setupEditor)setupEditor=structureEditor(el('setupStructureEditor'),{items:[],unit});
    const chapters=window.QuireStore?.listChapters?.()||[];
    setupEditor.set(chapters.map(c=>({id:c.id,title:c.title})),{unit});
    setStructureMessage('');
    updateAbstractCount();
  }

  function setStructureMessage(text){const node=el('structureMessage');if(node)node.textContent=text||'';}

  function loadTemplate(){
    const kind=currentSetupType();
    const list=templates(kind)[el('structureTemplate')?.value]||[];
    if(!list.length||!setupEditor)return;
    const current=setupEditor.get();
    // Reuse existing ids for matching titles so writing stays attached.
    const pool=[...current];
    setupEditor.set(list.map(title=>{
      const i=pool.findIndex(r=>r.id&&r.title.trim().toLowerCase()===title.toLowerCase());
      return i>=0?pool.splice(i,1)[0]:{title};
    }),{unit:partNoun(kind,true)});
    setStructureMessage('Template loaded. Review it, then choose “Apply structure”.');
  }

  function applyStructure(){
    if(!setupEditor)return;
    const items=setupEditor.get();
    if(!items.length){setStructureMessage('Keep at least one '+partNoun(currentSetupType())+'.');return;}
    const result=window.QuireStore?.setDocumentStructure?.(null,items);
    if(!result){setStructureMessage('Quire could not update the structure.');return;}
    setupEditor.set(result.chapters.map(c=>({id:c.id,title:c.title})));
    setStructureMessage(result.kept.length
      ? 'Structure updated. Kept '+result.kept.map(t=>'“'+t+'”').join(', ')+' because it already contains writing.'
      : 'Structure updated.');
    window.QuireChapterEditor?.render?.();
    window.showToast?.('Structure updated');
  }

  function updateAbstractCount(){
    const node=el('paperAbstractCount');
    if(!node)return;
    const words=(String(el('paperAbstract')?.value||'').trim().match(/\S+/g)||[]).length;
    const limit=Number(el('paperAbstractWordLimit')?.value)||0;
    node.textContent=limit?'· '+words+' / '+limit+' words':'· '+words+' words';
    node.classList.toggle('over-limit',Boolean(limit&&words>limit));
  }

  function bind(){
    el('paperAbstract')?.addEventListener('input',updateAbstractCount);
    el('paperAbstractWordLimit')?.addEventListener('input',updateAbstractCount);
    document.querySelectorAll('input[name="projectType"]').forEach(r=>r.addEventListener('change',refreshSetupCard));
    el('paperArticleType')?.addEventListener('change',()=>{const s=el('structureTemplate');if(s)s.value=el('paperArticleType').value;});
    el('assignmentType')?.addEventListener('change',()=>{const s=el('structureTemplate');if(s)s.value=el('assignmentType').value;});
    el('loadStructureTemplate')?.addEventListener('click',loadTemplate);
    el('applyStructureBtn')?.addEventListener('click',applyStructure);
    window.addEventListener('quire:project-switched',()=>{applyLabels();refreshSetupCard();});
    window.addEventListener('quire:store-changed',applyLabels);
    applyLabels();
    refreshSetupCard();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireDocType={type,isPaper,isAssignment,noun,partNoun,templates,typeOptions,applyLabels,structureEditor,refreshSetupCard};
})();
