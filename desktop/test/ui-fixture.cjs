// Local UI test host; never packaged or connected to an account.
const {app,BrowserWindow} = require('electron');
app.whenReady().then(()=>{new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{contextIsolation:true,sandbox:true,nodeIntegration:false}});});
app.on('window-all-closed',()=>app.quit());
