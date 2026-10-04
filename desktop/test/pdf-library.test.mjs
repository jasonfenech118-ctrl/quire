import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,readdir,rm,rename,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {PdfLibrary} from '../pdf-library.mjs';

const pdf=new Uint8Array(Buffer.from('%PDF-1.7\nSynthetic article\n%%EOF'));
async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'quire-pdf-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const userData=join(root,'pc');await mkdir(userData);
  const drive=join(root,'pen-drive');await mkdir(drive);
  const library=new PdfLibrary(userData);await library.init();
  return {root,userData,drive,library};
}
test('PDFs persist on the PC and a chosen folder across restarts',async t=>{
  const {userData,drive,library}=await fixture(t);
  await library.save('article_1',pdf,'Research paper.pdf');
  await library.setCopyFolder(drive);
  const restarted=new PdfLibrary(userData);await restarted.init();
  assert.deepEqual((await restarted.get('article_1')).bytes,pdf);
  const state=await restarted.getState();
  assert.equal(state.pdfCount,1);assert.equal(state.copyAvailable,true);
  assert.ok((await readdir(state.copyFolder)).includes('Research-paper--article_1.pdf'));
  assert.equal((await readFile(join(state.copyFolder,'article_1.json'),'utf8')).includes('Research paper.pdf'),true);
});
test('an unplugged pen drive leaves PC PDFs available and pending copies catch up',async t=>{
  const {drive,library}=await fixture(t);
  await library.setCopyFolder(drive);
  await library.save('article_1',pdf,'One.pdf');
  await rename(drive,drive+'-unplugged');
  const state=await library.save('article_2',pdf,'Two.pdf');
  assert.equal(state.copyAvailable,false);assert.match(state.notice,/pending/);
  assert.deepEqual((await library.get('article_1')).bytes,pdf);
  assert.deepEqual((await library.get('article_2')).bytes,pdf);
  await rename(drive+'-unplugged',drive);await library.sync();
  const copy=(await library.getState()).copyFolder;
  assert.ok((await readdir(copy)).includes('Two--article_2.pdf'));
});
test('a second PC retrieves the matching article from the pen drive and keeps its own copy',async t=>{
  const {root,drive,library}=await fixture(t);
  await library.save('article_same_backup_id',pdf,'Portable.pdf');await library.setCopyFolder(drive);
  const otherUser=join(root,'second-pc');await mkdir(otherUser);
  const other=new PdfLibrary(otherUser);await other.init();await other.setCopyFolder(drive);
  assert.equal(await other.has('article_same_backup_id'),true);
  const result=await other.get('article_same_backup_id');assert.deepEqual(result.bytes,pdf);
  await rename(drive,drive+'-unplugged');
  assert.deepEqual((await other.get('article_same_backup_id')).bytes,pdf);
  assert.match((await other.getState()).notice,/restored/);
});
test('invalid IDs, non-PDF data and file symlinks cannot expose outside files',async t=>{
  const {root,library}=await fixture(t);
  assert.throws(()=>library.save('../outside',pdf),error=>error.code==='invalid_pdf_id');
  assert.throws(()=>library.save('safe',new Uint8Array([1,2,3])),error=>error.code==='invalid_pdf');
  await library.save('safe',pdf,'Paper.pdf');
  const folder=(await library.getState()).primaryFolder;
  const outside=join(root,'outside.pdf');
  const {writeFile}=await import('node:fs/promises');await writeFile(outside,pdf);
  await rm(join(folder,'Paper--safe.pdf'));await symlink(outside,join(folder,'Paper--safe.pdf'));
  await assert.rejects(library.get('safe'),error=>error.code==='pdf_storage_unavailable');
  assert.deepEqual(new Uint8Array(await readFile(outside)),pdf);
});
test('stopping folder copying keeps saved PDFs in both locations',async t=>{
  const {drive,library}=await fixture(t);
  await library.save('article_1',pdf,'Keep.pdf');await library.setCopyFolder(drive);
  const copy=(await library.getState()).copyFolder;await library.stopCopy();
  assert.equal((await library.getState()).copyFolder,null);
  assert.deepEqual((await library.get('article_1')).bytes,pdf);
  assert.ok((await readdir(copy)).includes('Keep--article_1.pdf'));
});
