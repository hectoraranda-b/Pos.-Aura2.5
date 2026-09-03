/**
 * Test Suite: Vinculación Directa Cloud y Desvinculación en config.json
 * Aura POS (Merasystems Enterprise Edition)
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
  console.log('🧪 Iniciando Pruebas de Vinculación Directa Cloud y Desvinculación en config.json...');
  let passed = 0;
  let total = 6;

  try {
    const targetEmail = 'hector.aranda.b@gmail.com';

    // 1. Conectar directamente Google Drive sin OTP/2FA
    const connDrive = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/connect-cloud',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      provider: 'drive',
      account: targetEmail
    });

    if (connDrive.status === 200 && connDrive.data.success && connDrive.data.account === targetEmail) {
      console.log(' ✅ [TEST 1] POST /api/connect-cloud conecta Google Drive directamente sin 2FA');
      passed++;
    } else {
      console.error(' ❌ [TEST 1] Falló conexión directa:', connDrive);
    }

    // 2. Verificar persistencia inmediata en data/config.json y data/cloud_session.json
    const configFile = path.join(__dirname, 'data', 'config.json');
    const sessionFile = path.join(__dirname, 'data', 'cloud_session.json');
    const configData = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));

    if (configData.gdriveConnected === true && configData.gdriveAccount === targetEmail &&
        sessionData.providers?.drive?.connected === true) {
      console.log(' ✅ [TEST 2] config.json y cloud_session.json actualizados persistentemente con la cuenta vinculada');
      passed++;
    } else {
      console.error(' ❌ [TEST 2] Error en persistencia:', { configData, sessionData });
    }

    // 3. Verificar estructura física de carpetas en disco
    const driveDir = path.join(__dirname, 'CloudSync_DRIVE', 'AuraPOS_Respaldo', 'diario');
    if (fs.existsSync(driveDir)) {
      console.log(' ✅ [TEST 3] Estructura física de sincronización creada en /CloudSync_DRIVE/AuraPOS_Respaldo/');
      passed++;
    } else {
      console.error(' ❌ [TEST 3] Carpeta de respaldo no encontrada:', driveDir);
    }

    // 4. Desvincular cuenta Google Drive con POST /api/connect-cloud/disconnect
    const discDrive = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/connect-cloud/disconnect',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      provider: 'drive'
    });

    const configAfter = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    const sessionAfter = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));

    if (discDrive.status === 200 && discDrive.data.success &&
        configAfter.gdriveConnected === false && !sessionAfter.providers?.drive) {
      console.log(' ✅ [TEST 4] POST /api/connect-cloud/disconnect limpia credenciales en config.json y sesión');
      passed++;
    } else {
      console.error(' ❌ [TEST 4] Falló desvinculación:', discDrive, configAfter);
    }

    // 5. Conectar y desvincular Dropbox Business
    const connDb = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/connect-cloud',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      provider: 'dropbox',
      account: 'corp.pos@dropbox.com'
    });

    const discDb = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/connect-cloud/disconnect',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      provider: 'dropbox'
    });

    if (connDb.status === 200 && connDb.data.success && discDb.status === 200 && discDb.data.success) {
      console.log(' ✅ [TEST 5] Ciclo completo de conexión y desvinculación para Dropbox Business exitoso');
      passed++;
    } else {
      console.error(' ❌ [TEST 5] Falló prueba con Dropbox:', { connDb, discDb });
    }

    // 6. Verificar trazabilidad en audit.log
    const auditFile = path.join(__dirname, 'data', 'audit.log');
    const auditContent = fs.readFileSync(auditFile, 'utf8');

    if (auditContent.includes('CLOUD_CONNECTED') && auditContent.includes('CLOUD_DISCONNECT')) {
      console.log(' ✅ [TEST 6] Eventos CLOUD_CONNECTED y CLOUD_DISCONNECT registrados correctamente en audit.log');
      passed++;
    } else {
      console.error(' ❌ [TEST 6] No se encontraron eventos en audit.log');
    }

    console.log(`\n🏁 Resultado: ${passed}/${total} pruebas pasadas (${Math.round(passed/total*100)}%)\n`);
    if (passed === total) {
      console.log('🎉 TODAS LAS PRUEBAS DE VINCULACIÓN DIRECTA Y DESVINCULACIÓN CLOUD PASARON PERFECTAMENTE!\n');
    }
  } catch (err) {
    console.error('Error durante las pruebas:', err);
  }
}

runTests();
