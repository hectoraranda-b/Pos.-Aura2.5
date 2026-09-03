/**
 * Aura POS Enterprise Edition (Merasystems)
 * Desktop Native Shell (Electron Main Process)
 * Multiplatform: Windows (.exe) & Linux Debian/ChromeOS (.deb)
 * Author: ISC Héctor Raúl Antonio Aranda Barroso
 */

const { app, BrowserWindow, Menu, globalShortcut, dialog } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
let serverInstance = null;
const SERVER_PORT = process.env.PORT || 3000;

function waitForServer(port, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const req = http.get(`http://localhost:${port}/api/status`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          resolve(true);
        }
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error('Timeout esperando servidor Express interno'));
        }
      });
      req.end();
    }, 300);
  });
}

function startInternalServer() {
  try {
    // Requerir e iniciar el servidor Express en el mismo hilo de Node.js
    require('./server.js');
    console.log('⚡ [ELECTRON] Servidor Express interno iniciado en puerto', SERVER_PORT);
  } catch (err) {
    console.error('❌ [ELECTRON] Error iniciando servidor interno:', err.message);
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 680,
    title: 'Aura POS Enterprise Edition - Merasystems',
    backgroundColor: '#0b0f19',
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    show: false
  });

  // Cargar URL del servidor Express local
  mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Configurar menú de aplicación
  const templateMenu = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Imprimir Ticket (Ctrl+P)',
          accelerator: 'CmdOrCtrl+P',
          click: () => { mainWindow.webContents.print({ silent: false }); }
        },
        { type: 'separator' },
        { label: 'Salir de Aura POS', role: 'quit' }
      ]
    },
    {
      label: 'Acciones POS',
      submenu: [
        {
          label: 'Cobrar Venta (F2)',
          accelerator: 'F2',
          click: () => { mainWindow.webContents.send('shortcut-f2'); }
        },
        {
          label: 'Limpiar Carrito (F4)',
          accelerator: 'F4',
          click: () => { mainWindow.webContents.send('shortcut-f4'); }
        },
        {
          label: 'Corte de Turno (F9)',
          accelerator: 'F9',
          click: () => { mainWindow.webContents.send('shortcut-f9'); }
        }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Recargar', role: 'reload' },
        { label: 'Alternar Pantalla Completa', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Herramientas de Desarrollador', role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de Aura POS Enterprise',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Aura POS Enterprise Edition',
              message: 'Aura POS Enterprise Edition v2.5.0',
              detail: 'Autor: ISC Héctor Raúl Antonio Aranda Barroso\nEmpresa: Merasystems Corp\nLicencia: Validación Machine ID Local\nPlataformas: Windows & Linux Debian/ChromeOS',
              buttons: ['Aceptar']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(templateMenu);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ciclo de vida de Electron
app.whenReady().then(async () => {
  startInternalServer();

  try {
    await waitForServer(SERVER_PORT, 10000);
    createMainWindow();
  } catch (err) {
    console.error('Error al esperar servidor:', err);
    createMainWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
