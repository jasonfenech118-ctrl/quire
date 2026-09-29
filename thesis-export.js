/* Quire Thesis Export — Step 21 */
(function(){
  const SETTINGS_PREFIX='quire:export:';

  function projectId(){return window.QuireStore?.getActiveProjectId?.()||'default';}
  function settingsKey(){return SETTINGS_PREFIX+projectId();}

  function loadSettings(){
    try{return JSON.parse(localStorage.getItem(settingsKey())||'{}')||{};}catch(e){return {};}
  }
  function saveSettings(data){
    localStorage.setItem(settingsKey(),JSON.stringify(data));
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function safeFile(v='thesis'){return String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'thesis';}
  function prettyDate(value){
    if(!value)return '';
    const d=new Date(String(value).length===10?value+'T12:00:00':value);
    return Number.isNaN(d.getTime())?'':d.toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'});
  }

  function cleanContent(html=''){
    const root=document.createElement('div');
    root.innerHTML=String(html||'');
    root.querySelectorAll('script,style,button,input,select,textarea').forEach(n=>n.remove());
    root.querySelectorAll('*').forEach(node=>{
      [...node.attributes].forEach(attr=>{
        if(attr.name==='href')return;
        node.removeAttribute(attr.name);
      });
    });
    return root.innerHTML;
  }

  function currentSettings(){
    return {
      authorName:document.getElementById('exportAuthorName')?.value.trim()||'',
      submissionDate:document.getElementById('exportSubmissionDate')?.value||'',
      scope:document.getElementById('exportScope')?.value||'whole',
      chapterId:document.getElementById('exportChapter')?.value||'',
      includeAbstract:document.getElementById('exportIncludeAbstract')?.checked!==false,
      includeToc:document.getElementById('exportIncludeToc')?.checked!==false,
      includeBibliography:document.getElementById('exportIncludeBibliography')?.checked!==false,
      pageBreakChapters:document.getElementById('exportPageBreakChapters')?.checked!==false
    };
  }

  function chaptersFor(settings){
    const chapters=window.QuireStore.listChapters();
    if(settings.scope==='chapter'&&settings.chapterId)return chapters.filter(c=>c.id===settings.chapterId);
    return chapters;
  }

  function sectionRows(chapterId){
    return window.QuireStore.listSections(chapterId);
  }

  function bibliography(){
    return window.QuireCitations?.bibliography?.({onlyUsed:true})||[];
  }

  function contentModel(){
    const project=window.QuireStore.getActiveProject()||{};
    const settings=currentSettings();
    const chapters=chaptersFor(settings);
    const entries=chapters.map(chapter=>({
      chapter,
      sections:sectionRows(chapter.id)
    }));
    const totalWords=entries.reduce((sum,row)=>sum+row.sections.reduce((s,sec)=>s+(Number(sec.currentWordCount)||0),0),0);
    return {project,settings,entries,totalWords,bibliography:bibliography()};
  }

  function renderChapter(row,index,settings){
    const chapter=row.chapter;
    const number=chapter.number||String(index+1);
    const sections=row.sections;
    const sectionHtml=sections.length?sections.map((section,sIndex)=>{
      const secNumber=section.number||number+'.'+(sIndex+1);
      return '<section class="export-section">'+
        '<h2>'+escapeHtml(secNumber)+' '+escapeHtml(section.title)+'</h2>'+
        '<div class="export-section-body">'+(cleanContent(section.content)||'<p class="export-empty-text">No manuscript text in this section.</p>')+'</div>'+
      '</section>';
    }).join(''):'<p class="export-empty-text">No sections in this chapter.</p>';

    return '<article class="export-chapter '+(settings.pageBreakChapters?'page-break':'')+'">'+
      '<h1>Chapter '+escapeHtml(number)+' · '+escapeHtml(chapter.title)+'</h1>'+
      sectionHtml+
    '</article>';
  }

  function renderToc(entries){
    return '<section class="export-front-section export-toc"><h1>Contents</h1>'+
      entries.map((row,index)=>{
        const number=row.chapter.number||String(index+1);
        return '<div class="export-toc-chapter"><strong>'+escapeHtml(number)+' '+escapeHtml(row.chapter.title)+'</strong>'+
          row.sections.map((sec,sIndex)=>'<span>'+escapeHtml(sec.number||number+'.'+(sIndex+1))+' '+escapeHtml(sec.title)+'</span>').join('')+
        '</div>';
      }).join('')+
      '<p class="export-toc-note">Page numbers can be updated after opening the Word export or after final pagination.</p></section>';
  }

  function renderBibliography(rows){
    return '<section class="export-bibliography page-break"><h1>References</h1>'+
      (rows.length?rows.map(r=>'<p>'+escapeHtml(r.text)+'</p>').join(''):'<p class="export-empty-text">No cited references are currently detected.</p>')+
    '</section>';
  }

  function renderPreview(){
    const mount=document.getElementById('thesisExportDocument');
    if(!mount)return;
    const {project,settings,entries,totalWords,bibliography:refs}=contentModel();
    const style=window.QuireCitations?.getStyle?.()||'harvard';

    mount.innerHTML=
      '<article class="export-title-page">'+
        '<div class="export-title-page-inner">'+
          (project.institutionName?'<p class="export-institution">'+escapeHtml(project.institutionName)+'</p>':'')+
          '<h1>'+escapeHtml(project.title||'Untitled thesis')+'</h1>'+
          (settings.authorName?'<p class="export-author">'+escapeHtml(settings.authorName)+'</p>':'')+
          (project.degreeName?'<p class="export-degree">Submitted in fulfilment of the requirements for '+escapeHtml(project.degreeName)+'</p>':'')+
          (project.supervisorName?'<p class="export-supervisor">Supervisor: '+escapeHtml(project.supervisorName)+'</p>':'')+
          (settings.submissionDate?'<p class="export-date">'+escapeHtml(prettyDate(settings.submissionDate))+'</p>':'')+
        '</div>'+
      '</article>'+
      (settings.includeAbstract?'<section class="export-front-section page-break"><h1>Abstract</h1>'+(project.abstract?'<p>'+escapeHtml(project.abstract)+'</p>':'<p class="export-empty-text">Abstract not yet provided.</p>')+'</section>':'')+
      (settings.includeToc?renderToc(entries):'')+
      entries.map((row,index)=>renderChapter(row,index,settings)).join('')+
      (settings.includeBibliography?renderBibliography(refs):'');

    document.getElementById('exportWordCount').textContent=totalWords.toLocaleString();
    document.getElementById('exportChapterCount').textContent=String(entries.length);
    document.getElementById('exportReferenceCount').textContent=String(refs.length);
    document.getElementById('exportCitationStyleLabel').textContent=style==='apa7'?'APA 7th':style==='vancouver'?'Vancouver':'Harvard';
    renderReadiness(project,settings,entries,refs);
  }

  function renderReadiness(project,settings,entries,refs){
    const issues=[];
    if(!project.title)issues.push('Thesis title is missing.');
    if(!settings.authorName)issues.push('Candidate / author name is missing.');
    if(!project.institutionName)issues.push('Institution is not set.');
    if(!project.degreeName)issues.push('Degree / programme is not set.');
    if(settings.includeAbstract&&!project.abstract)issues.push('Abstract is empty.');
    if(entries.some(row=>!row.sections.length))issues.push('At least one exported chapter has no sections.');
    const citationProblems=window.QuireCitations?.diagnostics?.().missing||[];
    if(settings.includeBibliography&&citationProblems.length)issues.push(citationProblems.length+' library reference(s) are missing core author/year metadata.');

    const box=document.getElementById('exportReadiness');
    if(!box)return;
    if(!issues.length){
      box.className='export-readiness ready';
      box.innerHTML='<strong>Export structure ready</strong><small>No obvious structural export issues detected. Check your institution’s final formatting rules before submission.</small>';
    }else{
      box.className='export-readiness';
      box.innerHTML='<strong>'+issues.length+' item'+(issues.length===1?'':'s')+' to review</strong><ul>'+issues.map(i=>'<li>'+escapeHtml(i)+'</li>').join('')+'</ul>';
    }
  }

  function populate(){
    const project=window.QuireStore.getActiveProject()||{};
    const saved=loadSettings();
    const chapters=window.QuireStore.listChapters();

    document.getElementById('exportAuthorName').value=saved.authorName||'';
    document.getElementById('exportSubmissionDate').value=saved.submissionDate||project.finalDeadline||new Date().toISOString().slice(0,10);
    document.getElementById('exportScope').value=saved.scope||'whole';
    document.getElementById('exportChapter').innerHTML=chapters.map(c=>'<option value="'+c.id+'">'+escapeHtml((c.number?c.number+' · ':'')+c.title)+'</option>').join('');
    document.getElementById('exportChapter').value=saved.chapterId&&chapters.some(c=>c.id===saved.chapterId)?saved.chapterId:(chapters[0]?.id||'');
    document.getElementById('exportChapterWrap').hidden=document.getElementById('exportScope').value!=='chapter';
    document.getElementById('exportIncludeAbstract').checked=saved.includeAbstract!==false;
    document.getElementById('exportIncludeToc').checked=saved.includeToc!==false;
    document.getElementById('exportIncludeBibliography').checked=saved.includeBibliography!==false;
    document.getElementById('exportPageBreakChapters').checked=saved.pageBreakChapters!==false;
    document.getElementById('exportAbstract').value=project.abstract||'';
    document.getElementById('exportCitationStyle').value=window.QuireCitations?.getStyle?.()||'harvard';
    renderPreview();
  }

  function persist(){
    const settings=currentSettings();
    saveSettings(settings);
    const project=window.QuireStore.getActiveProject();
    const abstract=document.getElementById('exportAbstract').value.trim();
    if(project&&abstract!==String(project.abstract||'')) window.QuireStore.updateProject(project.id,{abstract});
  }

  function onSettingsChange(){
    persist();
    renderPreview();
  }

  function wordDocumentHtml(){
    const {project}=contentModel();
    const body=document.getElementById('thesisExportDocument')?.innerHTML||'';
    return '<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>'+
      escapeHtml(project.title||'Thesis')+
      '</title><style>'+
      '@page{size:A4;margin:2.5cm 2.5cm 2.5cm 3cm}body{font-family:Georgia,serif;font-size:12pt;line-height:1.5;color:#000}'+
      '.export-title-page{height:24cm;display:table;width:100%;page-break-after:always}.export-title-page-inner{display:table-cell;vertical-align:middle;text-align:center}.export-title-page h1{font-size:22pt;margin:30pt 0}.export-institution,.export-author{font-size:13pt}.export-degree,.export-supervisor,.export-date{margin-top:18pt}'+
      '.page-break{page-break-before:always}.export-front-section h1,.export-chapter>h1,.export-bibliography h1{font-size:18pt;margin-bottom:18pt}.export-section h2{font-size:14pt;margin-top:20pt}.export-section-body p{margin:0 0 10pt}.export-section-body blockquote{margin-left:20pt;border-left:1pt solid #777;padding-left:10pt}.export-toc-chapter{margin:8pt 0}.export-toc-chapter strong,.export-toc-chapter span{display:block}.export-toc-chapter span{margin-left:18pt}.export-toc-note,.export-empty-text{color:#666;font-style:italic}.export-bibliography p{margin-left:18pt;text-indent:-18pt;margin-bottom:8pt}'+
      '</style></head><body>'+body+'</body></html>';
  }

  function downloadWord(){
    persist();renderPreview();
    const project=window.QuireStore.getActiveProject()||{};
    const blob=new Blob(['\ufeff',wordDocumentHtml()],{type:'application/msword;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=safeFile(project.title||'thesis')+'.doc';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    window.dispatchEvent(new CustomEvent('quire:thesis-exported',{detail:{format:'word'}}));
  }

  function printPdf(){
    persist();renderPreview();
    document.body.dataset.exportPrint='true';
    window.print();
    setTimeout(()=>delete document.body.dataset.exportPrint,500);
    window.dispatchEvent(new CustomEvent('quire:thesis-exported',{detail:{format:'pdf'}}));
  }

  function bind(){
    ['exportAuthorName','exportSubmissionDate','exportScope','exportChapter','exportIncludeAbstract','exportIncludeToc','exportIncludeBibliography','exportPageBreakChapters','exportAbstract']
      .forEach(id=>document.getElementById(id)?.addEventListener(id==='exportAbstract'||id==='exportAuthorName'?'input':'change',()=>{
        if(id==='exportScope')document.getElementById('exportChapterWrap').hidden=document.getElementById('exportScope').value!=='chapter';
        onSettingsChange();
      }));
    document.getElementById('exportCitationStyle')?.addEventListener('change',e=>{
      window.QuireCitations?.setStyle?.(e.target.value);
      renderPreview();
    });
    document.getElementById('downloadWordBtn')?.addEventListener('click',downloadWord);
    document.getElementById('printPdfBtn')?.addEventListener('click',printPdf);
    document.getElementById('refreshExportPreview')?.addEventListener('click',renderPreview);
    window.addEventListener('quire:project-switched',populate);
    window.addEventListener('quire:citation-style-changed',renderPreview);
    window.addEventListener('quire:store-changed',()=>{
      if(document.getElementById('export')?.classList.contains('active'))renderPreview();
    });
    populate();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireExport={renderPreview,downloadWord,printPdf};
})();