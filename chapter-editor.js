/* Quire Chapter Editor — Step 10 */
(function(){
  let activeChapterId=null;
  let activeSectionId=null;
  let saveTimer=null;

  function words(text=''){return (String(text).trim().match(/\b[\w’'-]+\b/g)||[]).length;}

  function chapterNumber(chapter){return chapter.number||String(chapter.orderIndex||'');}
  function sectionNumber(chapter,section,index){return section.number||chapterNumber(chapter)+'.'+(index+1);}

  function ensureSection(chapter){
    let sections=window.QuireStore.listSections(chapter.id);
    if(!sections.length){
      const label=chapter.title==='Literature Review'?'Overview':'Chapter notes';
      const created=window.QuireStore.addSection(chapter.id,{title:label,status:'in_progress'});
      sections=[created];
    }
    return sections;
  }

  function render(){
    const chapters=window.QuireStore.listChapters();
    if(!chapters.length) return;
    if(!activeChapterId || !chapters.some(c=>c.id===activeChapterId)) activeChapterId=chapters[0].id;
    const chapter=chapters.find(c=>c.id===activeChapterId);
    const sections=ensureSection(chapter);
    if(!activeSectionId || !sections.some(s=>s.id===activeSectionId)) activeSectionId=sections[0].id;

    renderTree(chapters);
    loadEditor();
  }

  function renderTree(chapters){
    const tree=document.getElementById('chapterTreeMount');
    if(!tree) return;
    tree.innerHTML=chapters.map(chapter=>{
      const sections=window.QuireStore.listSections(chapter.id);
      return '<div class="chapter-tree-group">'+
        '<button class="chapter-tree-row '+(chapter.id===activeChapterId?'active':'')+'" data-chapter-id="'+chapter.id+'"><span>'+escapeHtml(chapterNumber(chapter))+'</span><strong>'+escapeHtml(chapter.title)+'</strong><small>'+sections.length+'</small></button>'+
        (chapter.id===activeChapterId?'<div class="chapter-section-list" data-section-list="'+chapter.id+'">'+sections.map((section,index)=>
          '<button draggable="true" class="section-tree-row '+(section.id===activeSectionId?'active':'')+'" data-section-id="'+section.id+'"><span>⋮⋮</span><strong>'+escapeHtml(sectionNumber(chapter,section,index)+' '+section.title)+'</strong></button>'
        ).join('')+'</div>':'')+
      '</div>';
    }).join('');

    tree.querySelectorAll('[data-chapter-id]').forEach(btn=>btn.addEventListener('click',()=>{
      activeChapterId=btn.dataset.chapterId;activeSectionId=null;render();
    }));
    tree.querySelectorAll('[data-section-id]').forEach(btn=>btn.addEventListener('click',()=>{
      activeSectionId=btn.dataset.sectionId;loadEditor();renderTree(chapters);
    }));
    bindDrag();
  }

  function loadEditor(){
    const chapter=window.QuireStore.listChapters().find(c=>c.id===activeChapterId);
    const sections=window.QuireStore.listSections(activeChapterId);
    const section=sections.find(s=>s.id===activeSectionId);
    if(!chapter||!section) return;

    const title=document.getElementById('liveSectionTitle');
    const editor=document.getElementById('liveSectionEditor');
    const status=document.getElementById('sectionStatus');
    const target=document.getElementById('sectionTargetWords');
    if(title) title.value=section.title||'';
    if(editor) editor.innerHTML=section.content||'';
    if(status) status.value=section.status||'not_started';
    if(target) target.value=section.targetWordCount||'';

    document.getElementById('chapterEditorMeta').textContent='Chapter '+chapterNumber(chapter)+' · '+chapter.title;
    updateWordStats(section,chapter);
    window.dispatchEvent(new CustomEvent('quire:section-opened',{detail:{chapterId:chapter.id,sectionId:section.id}}));
  }

  function updateWordStats(section,chapter){
    const count=words(document.getElementById('liveSectionEditor')?.innerText||section.content||'');
    const target=Number(document.getElementById('sectionTargetWords')?.value)||0;
    document.getElementById('sectionWordCount').textContent=count+' words';
    document.getElementById('sectionWordTarget').textContent=target?'/ '+target:'No target';
    const pct=target?Math.min(100,Math.round(count/target*100)):0;
    document.getElementById('sectionWordBar').style.width=pct+'%';

    const all=window.QuireStore.listSections(chapter.id);
    const chapterWords=all.reduce((sum,s)=>sum+(s.id===section.id?count:Number(s.currentWordCount)||0),0);
    window.QuireStore.updateChapter(chapter.id,{currentWordCount:chapterWords,status:chapterWords?'in_progress':chapter.status});
  }

  function queueSave(){
    clearTimeout(saveTimer);
    document.getElementById('editorSaveState').textContent='Saving…';
    saveTimer=setTimeout(saveNow,550);
  }

  function saveNow(){
    if(!activeSectionId) return;
    const editor=document.getElementById('liveSectionEditor');
    const body=editor?.innerHTML||'';
    const count=words(editor?.innerText||'');
    const updated=window.QuireStore.updateSection(activeSectionId,{
      title:document.getElementById('liveSectionTitle').value.trim()||'Untitled section',
      content:body,
      currentWordCount:count,
      targetWordCount:Number(document.getElementById('sectionTargetWords').value)||null,
      status:document.getElementById('sectionStatus').value
    });
    const chapter=window.QuireStore.listChapters().find(c=>c.id===activeChapterId);
    updateWordStats(updated,chapter);
    document.getElementById('editorSaveState').textContent='Saved';
    setTimeout(()=>{const e=document.getElementById('editorSaveState');if(e)e.textContent='Autosave';},1200);
    renderTree(window.QuireStore.listChapters());
  }

  function addSection(){
    const chapter=window.QuireStore.listChapters().find(c=>c.id===activeChapterId)||window.QuireStore.listChapters()[0];
    if(!chapter) return;
    const sections=window.QuireStore.listSections(chapter.id);
    const created=window.QuireStore.addSection(chapter.id,{title:'New section',orderIndex:sections.length+1,status:'outlined'});
    activeChapterId=chapter.id;activeSectionId=created.id;render();
    setTimeout(()=>document.getElementById('liveSectionTitle')?.select(),50);
  }

  function removeCurrent(){
    if(!activeSectionId) return;
    const sections=window.QuireStore.listSections(activeChapterId);
    if(sections.length<=1){alert('Keep at least one section in a chapter.');return;}
    if(!confirm('Delete this section?')) return;
    window.QuireStore.removeSection(activeSectionId);
    activeSectionId=null;render();
  }

  function format(command,value=null){
    document.getElementById('liveSectionEditor')?.focus();
    document.execCommand(command,false,value);
    queueSave();
  }

  function bindDrag(){
    let dragging=null;
    document.querySelectorAll('.section-tree-row').forEach(row=>{
      row.addEventListener('dragstart',()=>{dragging=row.dataset.sectionId;row.classList.add('dragging');});
      row.addEventListener('dragend',()=>{row.classList.remove('dragging');dragging=null;});
      row.addEventListener('dragover',e=>e.preventDefault());
      row.addEventListener('drop',e=>{
        e.preventDefault();
        if(!dragging||dragging===row.dataset.sectionId)return;
        const ids=window.QuireStore.listSections(activeChapterId).map(s=>s.id);
        const from=ids.indexOf(dragging),to=ids.indexOf(row.dataset.sectionId);
        ids.splice(to,0,ids.splice(from,1)[0]);
        window.QuireStore.reorderSections(activeChapterId,ids);
        renderTree(window.QuireStore.listChapters());
      });
    });
  }

  function bind(){
    document.getElementById('addChapterSectionBtn')?.addEventListener('click',addSection);
    document.getElementById('chapterTreeAddBtn')?.addEventListener('click',addSection);
    document.getElementById('deleteSectionBtn')?.addEventListener('click',removeCurrent);
    ['liveSectionTitle','sectionTargetWords','sectionStatus'].forEach(id=>document.getElementById(id)?.addEventListener('input',queueSave));
    document.getElementById('sectionStatus')?.addEventListener('change',queueSave);
    document.getElementById('liveSectionEditor')?.addEventListener('input',()=>{
      const section=window.QuireStore.listSections(activeChapterId).find(s=>s.id===activeSectionId);
      const chapter=window.QuireStore.listChapters().find(c=>c.id===activeChapterId);
      if(section&&chapter) updateWordStats(section,chapter);
      queueSave();
    });
    document.querySelectorAll('[data-editor-command]').forEach(btn=>btn.addEventListener('click',()=>format(btn.dataset.editorCommand,btn.dataset.editorValue||null)));
    window.addEventListener('quire:project-switched',()=>{activeChapterId=null;activeSectionId=null;render();});
    window.addEventListener('quire:cloud-pulled',()=>{activeChapterId=null;activeSectionId=null;render();});
    render();
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireChapterEditor={render,getActive:()=>({chapterId:activeChapterId,sectionId:activeSectionId}),save:saveNow};
})();