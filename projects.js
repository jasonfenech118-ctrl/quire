/* Quire Projects — Step 9 */
(function(){
  function pct(projectId){
    const p=window.QuireStore.getLatestProgress(projectId)||{};
    const project=window.QuireStore.listProjects().find(x=>x.id===projectId)||{};
    const wordTarget=Number(project.wordTarget)||0;
    const writing=wordTarget?Math.min(100,Math.round((Number(p.currentWords)||0)/wordTarget*100)):0;
    const research=p.articlesTotal?Math.min(100,Math.round((p.articlesReviewed||0)/p.articlesTotal*100)):0;
    const chapters=p.chaptersTotal?Math.min(100,Math.round((p.chaptersDeveloped||0)/p.chaptersTotal*100)):0;
    const milestones=p.milestonesTotal?Math.min(100,Math.round((p.milestonesComplete||0)/p.milestonesTotal*100)):0;
    return Math.round(writing*.35+research*.2+chapters*.25+milestones*.2);
  }

  function pretty(date){
    if(!date) return 'No deadline';
    const d=new Date(date+'T12:00:00');
    return Number.isNaN(d.getTime())?'No deadline':d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  }

  function render(){
    const activeId=window.QuireStore.getActiveProjectId();
    const active=window.QuireStore.listProjects({includeArchived:false});
    const archived=window.QuireStore.listProjects().filter(p=>p.status==='archived');
    const mount=document.getElementById('projectsGrid');
    const archivedMount=document.getElementById('archivedProjects');
    if(!mount) return;

    mount.innerHTML=active.map(project=>{
      const progress=window.QuireStore.getLatestProgress(project.id)||{};
      const articles=(window.QuireStore.getState().articles||[]).filter(a=>a.projectId===project.id).length;
      const chapters=(window.QuireStore.getState().chapters||[]).filter(c=>c.projectId===project.id).length;
      const percent=pct(project.id);
      return '<article class="research-project-card '+(project.id===activeId?'active':'')+'" data-project-card="'+project.id+'">'+
        '<div class="project-card-top"><span class="eyebrow">'+(project.id===activeId?'ACTIVE PROJECT':'THESIS PROJECT')+'</span><button type="button" class="project-menu-btn" data-project-edit="'+project.id+'">⋯</button></div>'+
        '<h2>'+escapeHtml(project.title||'Untitled thesis')+'</h2>'+
        '<p>'+escapeHtml(project.researchQuestion||'Research question not yet defined')+'</p>'+
        '<div class="project-card-meta"><span>'+articles+' articles</span><span>'+chapters+' chapters</span><span>'+pretty(project.finalDeadline)+'</span></div>'+
        '<div class="project-card-progress"><div><span style="width:'+percent+'%"></span></div><strong>'+percent+'%</strong></div>'+
        '<div class="project-card-actions"><button type="button" class="primary-btn" data-project-open="'+project.id+'">'+(project.id===activeId?'Open workspace':'Switch & open')+'</button><button type="button" class="soft-btn" data-project-setup="'+project.id+'">Study setup</button></div>'+
      '</article>';
    }).join('')+
    '<button class="new-project-card" id="createProjectCard" type="button"><span>＋</span><strong>New research project</strong><small>Start another thesis, dissertation, review or study</small></button>';

    if(archivedMount){
      archivedMount.innerHTML=archived.length?archived.map(p=>'<div class="archived-project-row"><div><strong>'+escapeHtml(p.title)+'</strong><small>Archived project</small></div><button type="button" data-project-restore="'+p.id+'">Restore</button></div>').join(''):'<p class="empty-projects">No archived projects.</p>';
    }

    document.getElementById('projectCount')?.replaceChildren(document.createTextNode(String(active.length)));
    bindCards();
  }

  function bindCards(){
    document.querySelectorAll('[data-project-open]').forEach(btn=>btn.addEventListener('click',()=>{
      switchProject(btn.dataset.projectOpen,'dashboard');
    }));
    document.querySelectorAll('[data-project-setup]').forEach(btn=>btn.addEventListener('click',()=>{
      switchProject(btn.dataset.projectSetup,'setup');
    }));
    document.querySelectorAll('[data-project-edit]').forEach(btn=>btn.addEventListener('click',e=>{
      e.stopPropagation();openEdit(btn.dataset.projectEdit);
    }));
    document.querySelectorAll('[data-project-restore]').forEach(btn=>btn.addEventListener('click',()=>{
      window.QuireStore.restoreProject(btn.dataset.projectRestore);render();
    }));
    document.getElementById('createProjectCard')?.addEventListener('click',openCreate);
  }

  function switchProject(id,target='dashboard'){
    if(!window.QuireStore.setActiveProject(id)) return;
    window.dispatchEvent(new CustomEvent('quire:project-switched',{detail:{projectId:id}}));
    render();
    window.showView?.(target);
  }

  function openCreate(){
    document.getElementById('projectModalTitle').textContent='New research project';
    document.getElementById('projectEditId').value='';
    document.getElementById('projectName').value='';
    document.getElementById('projectDegree').value='';
    document.getElementById('projectInstitution').value='';
    document.getElementById('projectQuestion').value='';
    document.getElementById('projectWordTarget').value='20000';
    document.getElementById('projectDeadline').value='';
    document.getElementById('archiveProjectBtn').hidden=true;
    document.getElementById('projectModal').hidden=false;
  }

  function openEdit(id){
    const p=window.QuireStore.listProjects().find(x=>x.id===id);
    if(!p) return;
    document.getElementById('projectModalTitle').textContent='Edit research project';
    document.getElementById('projectEditId').value=p.id;
    document.getElementById('projectName').value=p.title||'';
    document.getElementById('projectDegree').value=p.degreeName||'';
    document.getElementById('projectInstitution').value=p.institutionName||'';
    document.getElementById('projectQuestion').value=p.researchQuestion||'';
    document.getElementById('projectWordTarget').value=p.wordTarget||'';
    document.getElementById('projectDeadline').value=p.finalDeadline||'';
    document.getElementById('archiveProjectBtn').hidden=false;
    document.getElementById('projectModal').hidden=false;
  }

  function closeModal(){document.getElementById('projectModal').hidden=true;}

  function save(){
    const id=document.getElementById('projectEditId').value;
    const data={
      title:document.getElementById('projectName').value.trim()||'Untitled thesis',
      degreeName:document.getElementById('projectDegree').value.trim(),
      institutionName:document.getElementById('projectInstitution').value.trim(),
      researchQuestion:document.getElementById('projectQuestion').value.trim(),
      wordTarget:Number(document.getElementById('projectWordTarget').value)||null,
      finalDeadline:document.getElementById('projectDeadline').value||null
    };
    let project;
    if(id) project=window.QuireStore.updateProject(id,data);
    else project=window.QuireStore.createProject(data);
    if(project){
      window.QuireStore.setActiveProject(project.id);
      window.dispatchEvent(new CustomEvent('quire:project-switched',{detail:{projectId:project.id}}));
    }
    closeModal();render();
  }

  function archive(){
    const id=document.getElementById('projectEditId').value;
    if(!id) return;
    if(!confirm('Archive this research project? Its data will be kept.')) return;
    window.QuireStore.archiveProject(id);
    closeModal();render();
    window.dispatchEvent(new CustomEvent('quire:project-switched',{detail:{projectId:window.QuireStore.getActiveProjectId()}}));
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}

  function bind(){
    document.getElementById('newResearchProjectBtn')?.addEventListener('click',openCreate);
    document.getElementById('closeProjectModal')?.addEventListener('click',closeModal);
    document.getElementById('closeProjectModalSecondary')?.addEventListener('click',closeModal);
    document.getElementById('saveProjectBtn')?.addEventListener('click',save);
    document.getElementById('archiveProjectBtn')?.addEventListener('click',archive);
    document.getElementById('projectModal')?.addEventListener('click',e=>{if(e.target.id==='projectModal')closeModal();});
    window.addEventListener('quire:store-changed',render);
    window.addEventListener('quire:cloud-pulled',render);
    render();
  }
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireProjects={render,openCreate,switchProject};
})();