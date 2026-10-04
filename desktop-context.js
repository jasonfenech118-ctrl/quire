/* Shared, explicit context selection for the personal ChatGPT assistant. */
(function(){
  const clip=(value,n=1800)=>String(value??'').slice(0,n);
  const pick=(row,keys)=>Object.fromEntries(keys.filter(k=>row?.[k]!==undefined).map(k=>[k,clip(row[k])]));
  function build(bundle,setup,detail={},includeNotes=true){
    if(!bundle?.project)return {};
    const projectId=bundle.project.id;
    const scoped=rows=>(rows||[]).filter(row=>row.projectId===projectId);
    const articleIds=new Set(scoped(bundle.articles).map(a=>a.id));
    const context={
      project:pick(bundle.project,['id','title','researchQuestion','projectType']),
      study:pick(setup,['studyType','researchQuestion','population','studySetting','qualDesign','quantDesign','mixedDesign','reviewType','reportingFramework','methodNotes']),
      objectives:scoped(bundle.objectives).slice(0,20).map(row=>pick(row,['id','text','title'])),
      chapters:scoped(bundle.chapters).slice(0,15).map(row=>pick(row,['id','title'])),
      selectedText:clip(detail.selectedText||detail.paragraph,18000),
      sectionTitle:clip(detail.sectionTitle,300),
      articles:scoped(bundle.articles).slice(0,30).map(row=>pick(row,['id','title','authors','year','doi','abstract'])),
      notes:includeNotes?scoped(bundle.notes).filter(row=>!row.articleId||articleIds.has(row.articleId)).slice(-20).map(row=>pick(row,['title','body','articleId'])):[],
      highlights:includeNotes?scoped(bundle.highlights).filter(row=>articleIds.has(row.articleId)).slice(-25).map(row=>pick(row,['articleId','pageNumber','highlightedText'])):[]
    };
    // Keep large libraries within the native request budget while preserving the
    // selected passage and project essentials. Tell the assistant what it lacks.
    const groups=['articles','notes','highlights'];
    while(JSON.stringify(context).length>75000){
      const largest=groups.filter(key=>context[key].length).sort((a,b)=>JSON.stringify(context[b]).length-JSON.stringify(context[a]).length)[0];
      if(!largest)break;
      if(largest==='articles')context[largest].pop();
      else context[largest].shift();
      context.scopeNotice='Only a subset of saved material fits this request. Do not assume the entire library was supplied.';
    }
    return context;
  }
  window.QuireChatGPTContext={build};
})();
