/**
 * Aura POS Enterprise Edition (Merasystems)
 * Script de Inicialización Limpia de Fábrica (Clean Seed / Production Reset)
 * Autor: ISC Héctor Raúl Antonio Aranda Barroso
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const BACKUP_ROOT = path.join(ROOT_DIR, 'AuraPOS_Respaldo');
const CLOUD_DRIVE_ROOT = path.join(ROOT_DIR, 'CloudSync_DRIVE', 'AuraPOS_Respaldo');
const CLOUD_DROPBOX_ROOT = path.join(ROOT_DIR, 'CloudSync_DROPBOX', 'AuraPOS_Respaldo');

console.log('🧹 [AURA POS] Iniciando proceso de sanitización y seed limpio para distribución...');

// 1. Asegurar directorios base
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
[BACKUP_ROOT, CLOUD_DRIVE_ROOT, CLOUD_DROPBOX_ROOT].forEach(root => {
  ['diario', 'semanal', 'mensual'].forEach(sub => {
    const p = path.join(root, sub);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });
});

// 2. Estado de Datos de Fábrica Prístino
const now = new Date();
const cleanInitialData = {
  credits: {
    author: "ISC Héctor Raúl Antonio Aranda Barroso",
    company: "Merasystems",
    licenseKey: "DEMO",
    licenseStatus: "DEMO_MODE",
    licensedTo: "Versión Demo / Evaluación Merasystems",
    issuedDate: now.toISOString().split('T')[0],
    version: "2.5.0 Enterprise Pro"
  },
  settings: {
    storeName: "Mi Comercio POS",
    businessName: "Aura POS Retail Systems",
    taxId: "XAXX010101000",
    address: "Dirección Principal del Establecimiento",
    phone: "+52 (00) 0000-0000",
    email: "contacto@micomercio.com",
    currency: "MXN",
    currencySymbol: "$",
    taxRate: 16,
    taxInclusive: false,
    ticketHeader: "¡BIENVENIDO A SU COMERCIO!",
    ticketFooter: "¡Gracias por su compra! Desarrollado por Merasystems.",
    showTaxBreakdown: true,
    ticketPaperWidth: "80mm",
    storageDestination: "local",
    gdriveAccount: "No vinculado",
    gdriveApiKey: "",
    gdriveConnected: false,
    dropboxAccount: "No vinculado",
    dropboxApiKey: "",
    dropboxConnected: false,
    enableMetrics: true,
    reportFrequency: "mensual",
    theme: "dark",
    autoPrint: false
  },
  roles: [
    { id: "role_admin", name: "Administrador", canDiscount: true, canCancel: true, canEditStock: true, canViewReports: true },
    { id: "role_cashier", name: "Cajero", canDiscount: true, canCancel: false, canEditStock: false, canViewReports: false }
  ],
  users: [
    {
      id: "usr_admin",
      name: "Administrador General",
      username: "admin",
      role: "Administrador",
      pin: "1234",
      active: true,
      avatar: "AD"
    }
  ],
  products: [],
  sales: [],
  currentShift: {
    id: "shift_1",
    shiftNumber: 1,
    openedAt: now.toISOString(),
    cashier: "Administrador General",
    cashierId: "usr_admin",
    initialCash: 0.00,
    status: "OPEN",
    movements: []
  },
  shiftHistory: []
};

// 3. Escribir data/pos_data.json limpio
const dataFile = path.join(DATA_DIR, 'pos_data.json');
fs.writeFileSync(dataFile, JSON.stringify(cleanInitialData, null, 2), 'utf8');
console.log(' ✅ data/pos_data.json inicializado en estado limpio (0 productos, 0 ventas, 1 admin base: "admin" / PIN: 1234)');

// 4. Limpiar data/cloud_session.json (Sin tokens residuales)
const sessionFile = path.join(DATA_DIR, 'cloud_session.json');
fs.writeFileSync(sessionFile, JSON.stringify({ updatedAt: null, providers: {} }, null, 2), 'utf8');
console.log(' ✅ data/cloud_session.json sanitizado (sin tokens residuales de OAuth)');

// 5. Limpiar data/pending_2fa.json
const pending2faFile = path.join(DATA_DIR, 'pending_2fa.json');
fs.writeFileSync(pending2faFile, JSON.stringify({}, null, 2), 'utf8');

// 6. Limpiar data/hardware_events.json
const hwFile = path.join(DATA_DIR, 'hardware_events.json');
fs.writeFileSync(hwFile, JSON.stringify([], null, 2), 'utf8');

// 7. Reiniciar data/audit.log con registro inicial limpio
const auditFile = path.join(DATA_DIR, 'audit.log');
const initAuditLine = `[${now.toISOString()}] [INFO] [usr_admin|Administrador General|Administrador] [ACTION: SYSTEM_INITIALIZED] [IP: 127.0.0.1] Sistema inicializado en estado de fábrica para distribución comercial.\n`;
fs.writeFileSync(auditFile, initAuditLine, 'utf8');
console.log(' ✅ data/audit.log reiniciado con evento de inicialización limpia');

// 8. Actualizar data/config.json
const configFile = path.join(DATA_DIR, 'config.json');
let machineId = "MERA-MID-PROD-2026-0001";
const machineIdFile = path.join(DATA_DIR, 'machine_id.json');
if (fs.existsSync(machineIdFile)) {
  try {
    const m = JSON.parse(fs.readFileSync(machineIdFile, 'utf8'));
    if (m.machineId) machineId = m.machineId;
  } catch(e){}
}

const trialExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const cleanConfig = {
  ...cleanInitialData.settings,
  author: cleanInitialData.credits.author,
  company: cleanInitialData.credits.company,
  licenseKey: "DEMO",
  licenseStatus: "DEMO_MODE",
  licensedTo: cleanInitialData.credits.licensedTo,
  machineId: machineId,
  installedAt: now.toISOString(),
  trialExpiresAt: trialExpires.toISOString(),
  trialDaysTotal: 7
};
fs.writeFileSync(configFile, JSON.stringify(cleanConfig, null, 2), 'utf8');
console.log(' ✅ data/config.json inicializado con periodo de prueba demo de 7 días');

console.log('\n✨ [SANITY CHECK COMPLETE] Aura POS está listo para empaquetado y distribución limpia.\n');
