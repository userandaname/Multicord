// const { exec } = require('child_process');

/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

document.addEventListener('DOMContentLoaded', async () => {
    async function addTitlebar() {
      const titlebar = document.createElement('div');

      titlebar.style.cssText = `
          -webkit-app-region: drag;
          height: 48px;
          width: 100%;
          background: #333;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
      `;
    
      titlebar.style.position = 'fixed';
      titlebar.style.top = '0';
      titlebar.style.left = '0';
      titlebar.style.opacity = '0';
    
      document.body.prepend(titlebar);
    }

    await addTitlebar();
    const vanillaButton = document.getElementById("Vanilla");
    const vencordButton = document.getElementById("Vencord");
    const legacyButton = document.getElementById("Legacy");
  
    vanillaButton.addEventListener("click", async () => {
      vanillaButton.textContent = "Please wait...";
      vanillaButton.disabled = true;
      window.mainWindow.loadURL('https://discord.com/app', false);
      await addTitlebar();
    });

    vencordButton.addEventListener("click", async () => {
      vencordButton.textContent = "Please wait...";
      vencordButton.disabled = true;
      window.mainWindow.loadURL('https://discord.com/app', true);
      await addTitlebar();
    });

    legacyButton.addEventListener("click", async () => {
      legacyButton.textContent = "Please wait...";
      legacyButton.disabled = true;
      // window.api.exec('npm start --prefix ../server', (error, stdout, stderr) => {
      //   if (error) {
      //     console.error(`Error starting server: ${error.message}`);
      //     return;
      //   }
      //   if (stderr) {
      //     console.error(`Server stderr: ${stderr}`);
      //     return;
      //   }
      //   console.log(`Server stdout: ${stdout}`);
      // });
      window.mainWindow.loadURL('http://localhost:6969', false);
      await addTitlebar();
    });
});  