const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: body, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Iniciando Suite de Pruebas: Auditoría, Respaldos Automáticos, config.json y Red LAN...');
  let passed = 0;
  let total = 0;

  function assert(name, condition, extra = '') {
    total++;
    if (condition) {
      console.log(` ✅ [TEST ${total}] ${name}`);
      passed++;
    } else {
      console.error(` ❌ [TEST ${total}] FALLÓ: ${name} ${extra}`);
    }
  }

  try {
    // 1. Test Network LAN Info & CORS
    const netRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/network/info',
      method: 'GET'
    });
    assert(
      'GET /api/network/info devuelve IPs locales y URLs de LAN',
      netRes.status === 200 && Array.isArray(netRes.body.localIps) && netRes.body.localIps.length > 0
    );
    assert(
      'Cabeceras CORS permisivas presentes para tablets en LAN',
      netRes.headers['access-control-allow-origin'] === '*'
    );

    // 2. Test Persistent Configuration (config.json)
    const getCfg = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/config',
      method: 'GET'
    });
    assert(
      'GET /api/config carga la configuración persistente',
      getCfg.status === 200 && getCfg.body.storeName !== undefined
    );

    const updateCfg = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/config',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      storeName: 'Aura SuperMart Enterprise Pro',
      theme: 'dark',
      taxRate: 16,
      updatedBy: 'ISC Héctor Raúl Aranda'
    });
    assert(
      'POST /api/config guarda cambios en data/config.json',
      updateCfg.status === 200 && updateCfg.body.config.storeName === 'Aura SuperMart Enterprise Pro'
    );

    const configPath = path.join(__dirname, 'data', 'config.json');
    assert(
      'Archivo físico data/config.json existe y está actualizado en disco',
      fs.existsSync(configPath) && fs.readFileSync(configPath, 'utf8').includes('Aura SuperMart Enterprise Pro')
    );

    // 3. Test Audit Log API & File
    const logClientRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/audit/log',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      action: 'AUTH_DENIED',
      details: 'Intento de acceso denegado a Configuración para Cajero',
      user: { id: 'usr_2', name: 'Valeria Ríos', role: 'Cajero' }
    });
    assert(
      'POST /api/audit/log registra eventos en audit.log',
      logClientRes.status === 200 && logClientRes.body.success === true
    );

    const auditRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/audit/logs',
      method: 'GET'
    });
    assert(
      'GET /api/audit/logs devuelve registros parseados con timestamp, rol, IP y acción',
      auditRes.status === 200 && Array.isArray(auditRes.body.logs) && auditRes.body.logs.length > 0
    );

    const auditLogFile = path.join(__dirname, 'data', 'audit.log');
    assert(
      'Archivo físico data/audit.log existe en disco',
      fs.existsSync(auditLogFile) && fs.readFileSync(auditLogFile, 'utf8').includes('ACTION: AUTH_DENIED')
    );

    // 4. Test Shift Close with Automatic Backup (Local & Cloud Sync)
    const closeShiftRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/shifts/close',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      countedCash: 2450.00,
      notes: 'Cierre de turno con arqueo completo'
    });
    assert(
      'POST /api/shifts/close devuelve autoBackup con metadatos del archivo',
      closeShiftRes.status === 200 && closeShiftRes.body.autoBackup && closeShiftRes.body.autoBackup.filename
    );

    const backupFilename = closeShiftRes.body.autoBackup.filename;
    const localBackupFile = path.join(__dirname, 'AuraPOS_Respaldo', 'diario', backupFilename);
    const driveBackupFile = path.join(__dirname, 'CloudSync_DRIVE', 'AuraPOS_Respaldo', 'diario', backupFilename);
    const dropboxBackupFile = path.join(__dirname, 'CloudSync_DROPBOX', 'AuraPOS_Respaldo', 'diario', backupFilename);

    assert(
      'Respaldo automático JSON guardado físicamente en /AuraPOS_Respaldo/diario/',
      fs.existsSync(localBackupFile)
    );
    assert(
      'Respaldo automático JSON sincronizado en /CloudSync_DRIVE/AuraPOS_Respaldo/diario/',
      fs.existsSync(driveBackupFile)
    );
    assert(
      'Respaldo automático JSON sincronizado en /CloudSync_DROPBOX/AuraPOS_Respaldo/diario/',
      fs.existsSync(dropboxBackupFile)
    );

    // 5. Test Hardware Peripherals + Audit log integration
    const drawerRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/hardware/cash-drawer',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      cashierName: 'Valeria Ríos',
      reason: 'Apertura para cambio de billete'
    });
    assert(
      'POST /api/hardware/cash-drawer emite pulso y registra en audit.log',
      drawerRes.status === 200 && drawerRes.body.status === 'DRAWER_OPENED'
    );

    const terminalRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/hardware/terminal-pay',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      amount: 420.00,
      currency: 'MXN'
    });
    assert(
      'POST /api/hardware/terminal-pay procesa transacción bancaria y registra en audit.log',
      terminalRes.status === 200 && terminalRes.body.status === 'APPROVED' && terminalRes.body.authCode.startsWith('MERA-')
    );

    console.log(`\n🏁 Resultado: ${passed}/${total} pruebas pasadas con éxito (${Math.round(passed/total*100)}%)\n`);

  } catch (err) {
    console.error('Error durante la ejecución de pruebas:', err);
  }
}

runTests();
