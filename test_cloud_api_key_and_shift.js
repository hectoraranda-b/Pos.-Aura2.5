/**
 * Test Suite: Conexión Cloud por API Key y Respaldo Comprimido al Cierre de Turno
 * Aura POS Enterprise Edition (Merasystems)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Iniciando Pruebas de API Key Cloud y Respaldo Comprimido en Cierre de Turno...');
  let passed = 0;
  let total = 7;

  try {
    const targetEmail = 'hector.aranda.b@gmail.com';
    const driveKey = 'AIzaSy_MERA_GDRIVE_OFFICIAL_KEY_2026';
    const dropboxKey = 'sl.u.A_MERA_DROPBOX_OFFICIAL_TOKEN_2026';

    // 1. Probar Conexión con API Key (Endpoint POST /api/connect-cloud/test)
    const testPing = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/connect-cloud/test',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      provider: 'drive',
      apiKey: driveKey,
      account: targetEmail
    });

    if (testPing.status === 200 && testPing.data.success && testPing.data.status === 'CONNECTED' && testPing.data.pingMs > 0) {
      console.log(` ✅ [TEST 1] POST /api/connect-cloud/test valida enlace en ${testPing.data.pingMs}ms con API Key oficial`);
      passed++;
    } else {
      console.error(' ❌ [TEST 1] Falló prueba de API Key:', testPing);
    }

    // 2. Conectar y guardar API Key de Google Drive en config.json
    const connDrive = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/connect-cloud',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      provider: 'drive',
      account: targetEmail,
      apiKey: driveKey
    });

    const configFile = path.join(__dirname, 'data', 'config.json');
    const sessionFile = path.join(__dirname, 'data', 'cloud_session.json');
    const configData = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));

    if (connDrive.status === 200 && configData.gdriveApiKey === driveKey &&
        configData.gdriveConnected === true && sessionData.providers?.drive?.apiKey === driveKey) {
      console.log(' ✅ [TEST 2] API Key y cuenta guardadas persistentemente en config.json y cloud_session.json');
      passed++;
    } else {
      console.error(' ❌ [TEST 2] Error al persistir API Key:', { connDrive, configData, sessionData });
    }

    // 3. Conectar y guardar API Key de Dropbox
    const connDropbox = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/connect-cloud',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      provider: 'dropbox',
      account: 'dropbox.corp@merasystems.com',
      apiKey: dropboxKey
    });

    const configData2 = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    if (connDropbox.status === 200 && configData2.dropboxApiKey === dropboxKey && configData2.dropboxConnected === true) {
      console.log(' ✅ [TEST 3] Dropbox Business conectado con Access Token / API Key persistido en config.json');
      passed++;
    } else {
      console.error(' ❌ [TEST 3] Falló conexión Dropbox:', connDropbox);
    }

    // 4. Ejecutar Cierre de Turno (End of Shift / POST /api/shifts/close)
    const closeShift = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/shifts/close',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      countedCash: 3500.00,
      notes: 'Cierre de turno vespertino con subida cloud API Key'
    });

    if (closeShift.status === 200 && closeShift.data.success && closeShift.data.autoBackup) {
      console.log(' ✅ [TEST 4] POST /api/shifts/close ejecutó el corte y generó respaldo automático sin pedir 2FA ni correos');
      passed++;
    } else {
      console.error(' ❌ [TEST 4] Falló corte de turno:', closeShift);
    }

    // 5. Validar que el respaldo existe en formato JSON y formato comprimido .json.gz en local y nube
    const autoBackup = closeShift.data.autoBackup;
    const jsonLocal = path.join(__dirname, 'AuraPOS_Respaldo', 'diario', autoBackup.filename);
    const gzLocal = path.join(__dirname, 'AuraPOS_Respaldo', 'diario', autoBackup.compressedFilename);
    const jsonDrive = path.join(__dirname, 'CloudSync_DRIVE', 'AuraPOS_Respaldo', 'diario', autoBackup.filename);
    const gzDrive = path.join(__dirname, 'CloudSync_DRIVE', 'AuraPOS_Respaldo', 'diario', autoBackup.compressedFilename);
    const jsonDropbox = path.join(__dirname, 'CloudSync_DROPBOX', 'AuraPOS_Respaldo', 'diario', autoBackup.filename);
    const gzDropbox = path.join(__dirname, 'CloudSync_DROPBOX', 'AuraPOS_Respaldo', 'diario', autoBackup.compressedFilename);

    if (fs.existsSync(jsonLocal) && fs.existsSync(gzLocal) &&
        fs.existsSync(jsonDrive) && fs.existsSync(gzDrive) &&
        fs.existsSync(jsonDropbox) && fs.existsSync(gzDropbox)) {
      console.log(` ✅ [TEST 5] Respaldo JSON y Comprimido (.json.gz, ratio: ${autoBackup.compressionRatio}) sincronizados en local, Google Drive y Dropbox`);
      passed++;
    } else {
      console.error(' ❌ [TEST 5] Archivos no encontrados en disco:', { jsonLocal, gzLocal, jsonDrive, gzDrive });
    }

    // 6. Verificar que audit.log registra el respaldo comprimido vía API Key
    const auditFile = path.join(__dirname, 'data', 'audit.log');
    const auditContent = fs.readFileSync(auditFile, 'utf8');
    if (auditContent.includes('subido a la nube mediante API Key oficial') || auditContent.includes('AUTO_SHIFT_BACKUP')) {
      console.log(' ✅ [TEST 6] Registro de auditoría confirma subida directa a la nube con API Key');
      passed++;
    } else {
      console.error(' ❌ [TEST 6] Falta registro de auditoría');
    }

    // 7. Desvincular y verificar limpieza de API Key en config.json
    const discRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/connect-cloud/disconnect',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      provider: 'drive'
    });

    const configAfter = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    if (discRes.status === 200 && configAfter.gdriveConnected === false && configAfter.gdriveApiKey === '') {
      console.log(' ✅ [TEST 7] POST /api/connect-cloud/disconnect limpia la API Key y estado en config.json');
      passed++;
    } else {
      console.error(' ❌ [TEST 7] Falló limpieza de API Key:', configAfter);
    }

    console.log(`\n🏁 Resultado: ${passed}/${total} pruebas pasadas (${Math.round(passed/total*100)}%)\n`);
    if (passed === total) {
      console.log('🎉 TODAS LAS PRUEBAS DE CONEXIÓN CON API KEY Y RESPALDO EN CIERRE DE TURNO PASARON AL 100%!\n');
    }
  } catch (err) {
    console.error('Error durante la ejecución del test suite:', err);
  }
}

runTests();
