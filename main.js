const { app, BrowserWindow, session, ipcMain, ipcRenderer } = require('electron')
const path = require('node:path');
const { exec, spawn } = require('child_process');
let Server;

(async () => {
  Server = (await import("arrpc")).default;
})();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#2f3241',
      symbolColor: '#74b1be',
      height: 48
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      allowDisplayingInsecureContent: true,
      allowRunningInsecureContent: true,
      webSecurity: false,
    }
  })
  
  app.commandLine.appendSwitch('ignore-certificate-errors');
  app.commandLine.appendSwitch('ignore-certificate-errors')
  app.commandLine.appendSwitch('allow-insecure-localhost')
  app.commandLine.appendSwitch('ignore-urlfetcher-cert-requests')
  app.commandLine.appendSwitch('allow-running-insecure-content')

  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (url.startsWith('https://localhost:6969')) {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  });

  // mainWindow.loadURL('http://localhost:6969/__launch/4');
  // mainWindow.loadURL('http://localhost:6969/app');
  mainWindow.loadFile(path.join(__dirname, 'assets', 'html', 'versionType.html'));

  ipcMain.handle('main-window:loadURL', async (event, url, useVencord) => {
    let rpcServer;

    if (useVencord) {
      const extensionPath = path.join(__dirname, 'assets', 'extensions', 'vencord');
      session.defaultSession.loadExtension(extensionPath)
        .then(() => {
          console.log('Vencord loaded successfully');
          mainWindow.loadURL(url);
        })
        .catch(err => {
          console.error('Failed to load extension:', err);
        });
      
      return true;
    } else {
      mainWindow.loadURL(url);
      const arrpc = await new Server();

      arrpc.on('activity', data => console.log("wattafak", data, mainWindow.webContents.send('rpc', data)));
      arrpc.on('invite', (code, callback) => {
        // your invite code handling here
        // callback(true) // Reply back to tell the client whether the invite is valid or not 
      });

      await sleep(1000);

      mainWindow.webContents.executeJavaScript(`
        // NOTE: you may have to run this after onload
        (() => {
        let Dispatcher, lookupAsset, lookupApp, apps = {};

        const ws = new WebSocket('ws://127.0.0.1:1337'); // connect to arRPC bridge websocket
        ws.onmessage = async x => {
          msg = JSON.parse(x.data);

          if (!Dispatcher) {
            let wpRequire;
            window.webpackChunkdiscord_app.push([[ Symbol() ], {}, x => wpRequire = x]);
            window.webpackChunkdiscord_app.pop();

            const modules = wpRequire.c;

            for (const id in modules) {
              const mod = modules[id].exports;
              // if (!mod?.__esModule) continue;

              for (const prop in mod) {
                // if (!mod.hasOwnProperty(prop)) continue;

                const candidate = mod[prop];
                try {
                  if (candidate && candidate.register && candidate.wait) {
                    Dispatcher = candidate;
                    break;
                  }
                } catch {}
              }

              if (Dispatcher) break;
            }

            const factories = wpRequire.m;
            for (const id in factories) {
              if (factories[id].toString().includes('getAssetImage: size must === [number, number] for Twitch')) {
                const mod = wpRequire(id);

                // fetchAssetIds
                const _lookupAsset = Object.values(mod).find(e => typeof e === 'function' && e.toString().includes('APPLICATION_ASSETS_FETCH_SUCCESS'));
                if (_lookupAsset) lookupAsset = async (appId, name) => (await _lookupAsset(appId, [ name, undefined ]))[0];
              }

              if (lookupAsset) break;
            }

            for (const id in factories) {
              if (factories[id].toString().includes('APPLICATION_RPC(')) {
                const mod = wpRequire(id);

                // fetchApplicationsRPC
                const _lookupApp = Object.values(mod).find(e => {
                  if (typeof e !== 'function') return;
                  const str = e.toString();
                  return str.includes(',coverImage:') && str.includes('INVALID_ORIGIN');
                });
                if (_lookupApp) lookupApp = async appId => {
                  let socket = {};
                  await _lookupApp(socket, appId);
                  return socket.application;
                };
              }

              if (lookupApp) break;
            }
          }

          if (msg.activity?.assets?.large_image) msg.activity.assets.large_image = await lookupAsset(msg.activity.application_id, msg.activity.assets.large_image);
          if (msg.activity?.assets?.small_image) msg.activity.assets.small_image = await lookupAsset(msg.activity.application_id, msg.activity.assets.small_image);

          if (msg.activity) {
            const appId = msg.activity.application_id;
            if (!apps[appId]) apps[appId] = await lookupApp(appId);

            const app = apps[appId];
            if (!msg.activity.name) msg.activity.name = app.name;
          }

          Dispatcher.dispatch({ type: 'LOCAL_ACTIVITY_UPDATE', ...msg }); // set RPC status
        };
        })();
      `).then((result) => {
        console.log('sigma js injected successfully:', result);
      }).catch((error) => {
        console.error('failed to inject js:', error);
      });

      return true;
    }
  });

  ipcMain.handle('api:exec', (event, command, callback) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        event.sender.send('api:exec:response', { error: error.message });
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        event.sender.send('api:exec:response', { stderr: stderr });
        return;
      }
      console.log(`stdout: ${stdout}`);
      event.sender.send('api:exec:response', { stdout: stdout });
    });
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})