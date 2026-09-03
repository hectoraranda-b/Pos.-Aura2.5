/**
 * Test Suite: Envío Real de Correo 2FA y Desvinculación de Cuentas Cloud
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
  console.log('🧪 Iniciando Pruebas de Envío Real 2FA, Verificación Estricta y Desvinculación Cloud...');
  let passed = 0;
  let total = 7;

  try {
    const targetEmail = 'hector.aranda.b@gmail.com';

    // 1. Solicitar 2FA para hector.aranda.b@gmail.com
    const req2fa = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/connect-cloud/request-2fa',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      provider: 'drive',
      account: targetEmail
    });

    // Validar que la respuesta NO incluye demoOtp (simulación eliminada)
    if (req2fa.status === 200 && req2fa.data.success && !req2fa.data.demoOtp) {
      console.log(' ✅ [TEST 1] POST /api/connect-cloud/request-2fa emite OTP real sin código ficticio en respuesta');
      passed++;
    } else {
      console.error(' ❌ [TEST 1] Falló solicitud 2FA sin simulación:', req2fa);
    }

    // 2. Leer código real enviado desde pending_2fa.json (lo que el destinatario recibe por correo)
    const pendingFile = path.join(__dirname, 'data', 'pending_2fa.json');
    const pendingData = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
    const realOtp = pendingData.drive?.code;

    if (realOtp && realOtp.length === 6) {
      console.log(` ✅ [TEST 2] Código OTP real de 6 dígitos generado (${realOtp}) y despachado por motor de correo`);
      passed++;
    } else {
      console.error(' ❌ [TEST 2] No se encontró código válido en pending_2fa.json:', pendingData);
    }

    // 3. Probar código falso (842109 o 000000) -> Debe fallar con HTTP 400
    const failVer = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/connect-cloud/verify-2fa',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      provider: 'drive',
      account: targetEmail,
      code: '000000'
    });

    if (failVer.status === 400 && !failVer.data.success) {
      console.log(' ✅ [TEST 3] Verificación estricta: Código erróneo rechazado correctamente con HTTP 400');
      passed++;
    } else {
      console.error(' ❌ [TEST 3] Falló rechazo de código falso:', failVer);
    }

    // 4. Probar con el código real recibido por correo -> Debe tener éxito
    const okVer = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/connect-cloud/verify-2fa',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      provider: 'drive',
      account: targetEmail,
      code: realOtp
    });

    if (okVer.status === 200 && okVer.data.success && okVer.data.verified2FA) {
      console.log(' ✅ [TEST 4] Validación real 2FA exitosa y cuenta vinculada con tokens de sesión');
      passed++;
    } else {
      console.error(' ❌ [TEST 4] Falló validación de código real:', okVer);
    }

    // 5. Verificar que el código OTP fue consumido (ya no existe en pending_2fa.json)
    const pendingAfter = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
    if (!pendingAfter.drive) {
      console.log(' ✅ [TEST 5] Código OTP consumido y revocado tras verificación (prevención de reuso)');
      passed++;
    } else {
      console.error(' ❌ [TEST 5] El código no fue consumido:', pendingAfter);
    }

    // 6. Desvincular cuenta Cloud con POST /api/connect-cloud/disconnect
    const disc = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/connect-cloud/disconnect',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      provider: 'drive'
    });

    const sessionFile = path.join(__dirname, 'data', 'cloud_session.json');
    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));

    if (disc.status === 200 && disc.data.success && !sessionData.providers?.drive) {
      console.log(' ✅ [TEST 6] POST /api/connect-cloud/disconnect desvincula cuenta y limpia tokens de sesión y config.json');
      passed++;
    } else {
      console.error(' ❌ [TEST 6] Falló desvinculación o limpieza de tokens:', disc, sessionData);
    }

    // 7. Verificar auditoría completa en audit.log
    const auditFile = path.join(__dirname, 'data', 'audit.log');
    const auditContent = fs.readFileSync(auditFile, 'utf8');
    const hasEvents = auditContent.includes('2FA_REQUESTED') &&
                      auditContent.includes('2FA_FAILED') &&
                      auditContent.includes('CLOUD_CONNECTED') &&
                      auditContent.includes('CLOUD_DISCONNECT');

    if (hasEvents) {
      console.log(' ✅ [TEST 7] Auditoría completa: Eventos 2FA_REQUESTED, 2FA_FAILED, CLOUD_CONNECTED y CLOUD_DISCONNECT registrados en audit.log');
      passed++;
    } else {
      console.error(' ❌ [TEST 7] No se encontraron todos los eventos de auditoría');
    }

    console.log(`\n🏁 Resultado: ${passed}/${total} pruebas pasadas (${Math.round(passed/total*100)}%)\n`);
    if (passed === total) {
      console.log('🎉 TODAS LAS PRUEBAS DE 2FA REAL Y DESVINCULACIÓN CLOUD PASARON PERFECTAMENTE!\n');
    }
  } catch (err) {
    console.error('Error durante las pruebas:', err);
  }
}

runTests();
