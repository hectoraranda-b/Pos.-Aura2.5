/**
 * Test Suite: Validación de Lectura de .env y Google Drive en Backend
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
  console.log('🧪 Iniciando Pruebas de Carga de .env y Autoconfiguración de Google Drive...');
  let passed = 0;
  let total = 5;

  try {
    // 1. Validar que GET /api/status detecta las credenciales de .env
    const statusRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/status',
      method: 'GET'
    });

    if (statusRes.status === 200 && statusRes.data.cloudEnv?.gdrive?.configuredViaEnv === true) {
      console.log(' ✅ [TEST 1] GET /api/status reporta cloudEnv.gdrive.configuredViaEnv: true desde .env');
      passed++;
    } else {
      console.error(' ❌ [TEST 1] Falló detección de .env:', statusRes.data);
    }

    // 2. Validar que las credenciales sensibles no se exponen al cliente
    const initialRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/initial-data',
      method: 'GET'
    });

    const rawInitial = JSON.stringify(initialRes.data);
    if (!rawInitial.includes('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')) {
      console.log(' ✅ [TEST 2] Las credenciales secretas (client_secret) están protegidas en el backend y no se exponen a la interfaz');
      passed++;
    } else {
      console.error(' ❌ [TEST 2] ADVERTENCIA: Client Secret detectado en el payload cliente!');
    }

    // 3. Probar conexión inmediata con Google Drive mediante las credenciales de .env sin enviar API key en el cuerpo
    const testPing = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/connect-cloud/test',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      provider: 'drive'
    });

    if (testPing.status === 200 && testPing.data.success && testPing.data.configuredViaEnv === true && testPing.data.pingMs > 0) {
      console.log(` ✅ [TEST 3] POST /api/connect-cloud/test valida Google Drive automáticamente vía .env (${testPing.data.pingMs}ms)`);
      passed++;
    } else {
      console.error(' ❌ [TEST 3] Falló validación de enlace vía .env:', testPing);
    }

    // 4. Ejecutar cierre de turno y validar subida automática a Google Drive
    const closeShift = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/shifts/close',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      countedCash: 4800.00,
      notes: 'Corte de turno con respaldo automático hacia Google Drive (.env)'
    });

    if (closeShift.status === 200 && closeShift.data.success && closeShift.data.autoBackup) {
      console.log(' ✅ [TEST 4] POST /api/shifts/close ejecutado con autoBackup en segundo plano');
      passed++;
    } else {
      console.error(' ❌ [TEST 4] Falló corte de turno:', closeShift);
    }

    // 5. Validar existencia física del respaldo JSON y GZIP en la carpeta de sincronización de Google Drive
    const autoBackup = closeShift.data.autoBackup;
    const driveJson = path.join(__dirname, 'CloudSync_DRIVE', 'AuraPOS_Respaldo', 'diario', autoBackup.filename);
    const driveGz = path.join(__dirname, 'CloudSync_DRIVE', 'AuraPOS_Respaldo', 'diario', autoBackup.compressedFilename);

    if (fs.existsSync(driveJson) && fs.existsSync(driveGz)) {
      console.log(` ✅ [TEST 5] Archivos físico JSON y comprimido (.json.gz) generados exitosamente en /CloudSync_DRIVE/AuraPOS_Respaldo/diario/`);
      passed++;
    } else {
      console.error(' ❌ [TEST 5] No se encontraron archivos en Google Drive:', { driveJson, driveGz });
    }

    console.log(`\n🏁 Resultado: ${passed}/${total} pruebas pasadas (${Math.round(passed/total*100)}%)\n`);
    if (passed === total) {
      console.log('🎉 TODAS LAS PRUEBAS DE INTEGRACIÓN .ENV Y GOOGLE DRIVE PASARON AL 100%!\n');
    }
  } catch (err) {
    console.error('Error durante las pruebas:', err);
  }
}

runTests();
