/* Folder controls for PDFs in the Windows app. Paths come only from native dialogs. */
(function(){
  const bridge=window.QuireDesktop;
  if(!bridge?.getLibraryState)return;
  const $=id=>document.getElementById(id);
  let state={primaryFolder:'',copyFolder:null,pdfCount:0,notice:'PDFs are saved on this PC.'};
  let busy=false;
  function render(next=state){
    state=next;
    $('desktopLibraryPcPath').textContent=state.primaryFolder;
    $('desktopLibraryCopyPath').textContent=state.copyFolder||'No additional folder selected';
    $('desktopLibraryCount').textContent=state.pdfCount+' PDF'+(state.pdfCount===1?'':'s')+' saved on this PC';
    $('desktopLibraryStatus').textContent=state.notice||'PDFs are saved on this PC.';
    $('desktopSetupCopyInfo').textContent=state.copyFolder?'Additional copy: '+state.copyFolder+' · '+(state.copyAvailable?'drive available':'waiting for the drive'):'PDFs stay on this PC. You can also keep a copy in a folder on a pen drive or another PC drive.';
    for(const id of ['desktopLibraryChoose','desktopLibrarySync','desktopLibraryStopCopy','desktopSetupChooseFolder'])$(id).disabled=busy;
    $('desktopLibrarySync').hidden=!state.copyFolder;
    $('desktopLibraryStopCopy').hidden=!state.copyFolder;
    $('desktopLibraryOpenCopy').hidden=!state.copyFolder;
    const reset=document.querySelector('.workspace-reset-zone small');
    if(reset)reset.textContent='Remove this workspace’s research and writing data. Article-folder files and the Quire app are kept.';
  }
  async function action(fn){
    if(busy)return;
    busy=true;render();$('desktopLibraryStatus').textContent='Updating your article folder…';
    $('desktopSetupCopyInfo').textContent='Updating your article folder…';
    try{render(await fn());}
    catch(error){$('desktopLibraryStatus').textContent=error.message;$('desktopSetupCopyInfo').textContent=error.message;}
    finally{busy=false;for(const id of ['desktopLibraryChoose','desktopLibrarySync','desktopLibraryStopCopy','desktopSetupChooseFolder'])$(id).disabled=false;}
  }
  async function openFolder(kind){
    try{const error=await bridge.openLibraryFolder(kind);if(error)$('desktopLibraryStatus').textContent='The folder could not be opened. Check that the drive is connected.';}
    catch(error){$('desktopLibraryStatus').textContent=error.message;}
  }
  function open(){ $('articleStorageModal').hidden=false;void bridge.getLibraryState().then(render).catch(error=>{$('desktopLibraryStatus').textContent=error.message;}); }
  async function initialize(){
    try{
      await window.QuirePdfStore?.migrateLegacy?.();
      render(await bridge.getLibraryState());
    }catch(error){$('desktopLibraryStatus').textContent=error.message;}
  }
  function bind(){
    $('articleStorageBtn').hidden=false;
    $('articleStorageBtn').addEventListener('click',open);
    $('closeArticleStorageModal').addEventListener('click',()=>{$('articleStorageModal').hidden=true;});
    $('desktopLibraryChoose').addEventListener('click',()=>void action(()=>bridge.chooseLibraryFolder()));
    $('desktopSetupChooseFolder').addEventListener('click',()=>void action(()=>bridge.chooseLibraryFolder()));
    $('desktopLibrarySync').addEventListener('click',()=>void action(()=>bridge.syncLibrary()));
    $('desktopLibraryStopCopy').addEventListener('click',()=>void action(()=>bridge.stopLibraryCopy()));
    $('desktopLibraryOpenPc').addEventListener('click',()=>void openFolder('pc'));
    $('desktopLibraryOpenCopy').addEventListener('click',()=>void openFolder('copy'));
    bridge.onState(next=>{if(next.library)render(next.library);});
    void initialize();
  }
  window.QuireArticleLibrary={open};
  document.addEventListener('DOMContentLoaded',bind);
})();
