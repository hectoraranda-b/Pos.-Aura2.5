/**
 * Test Suite: Validación de OAuth 2.0 Local, Respaldo Cifrado AES-256 y Empaquetado Desktop
 * Aura POS Enterprise Edition (Merasystems)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function decryptBackupBuffer(encryptedBuffer, customKey) {
  const encKey = customKey || process.env.BACKUP_ENCRYPTION_KEY || 'MERA_AURA_ENTERPRISE_SECRET_KEY_2026';
  const iv = encryptedBuffer.slice(0, 16);
  const data = encryptedBuffer.slice(16);
  const key = crypto.createHash('sha256').update(encKey).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

async function runTests() {
  console.log('🧪 Iniciando Suite de Pruebas: OAuth 2.0 Local, Respaldo Cifrado AES-256 y Empaquetado...');
  let passed = 0;
  let total = 8;

  try {
    // 1. GET /api/auth/google/url - Validar URL de redirección local
    const gUrlRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/google/url',
      method: 'GET'
    });

    if (gUrlRes.status === 200 && gUrlRes.data.success && gUrlRes.data.authUrl.includes('localhost%3A3000%2Fapi%2Fauth%2Fgoogle%2Fcallback')) {
      console.log(' ✅ [TEST 1] GET /api/auth/google/url genera URL OAuth con redirect_uri en localhost:3000');
      passed++;
    } else {
      console.error(' ❌ [TEST 1] Falló generación de URL OAuth Google:', gUrlRes.data);
    }

    // 2. GET /api/auth/dropbox/url - Validar URL de redirección local Dropbox
    const dbUrlRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/dropbox/url',
      method: 'GET'
    });

    if (dbUrlRes.status === 200 && dbUrlRes.data.success && dbUrlRes.data.authUrl.includes('localhost%3A3000%2Fapi%2Fauth%2Fdropbox%2Fcallback')) {
      console.log(' ✅ [TEST 2] GET /api/auth/dropbox/url genera URL OAuth con redirect_uri en localhost:3000');
      passed++;
    } else {
      console.error(' ❌ [TEST 2] Falló generación de URL OAuth Dropbox:', dbUrlRes.data);
    }

    // 3. Simular Callback OAuth de Google Drive en localhost:3000
    const gCallbackRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/google/callback?code=TEST_OAUTH_CODE_MERA_GDRIVE_2026',
      method: 'GET'
    });

    if (gCallbackRes.status === 200 && gCallbackRes.raw.includes('Google Drive Conectado')) {
      console.log(' ✅ [TEST 3] GET /api/auth/google/callback captura código OAuth y completa enlace local');
      passed++;
    } else {
      console.error(' ❌ [TEST 3] Falló callback OAuth de Google Drive:', gCallbackRes);
    }

    // 4. Validar persistencia en data/cloud_session.json
    const sessionFile = path.join(__dirname, 'data', 'cloud_session.json');
    if (fs.existsSync(sessionFile)) {
      const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      if (sessionData.providers?.drive?.connected && sessionData.providers?.drive?.tokens?.access_token) {
        console.log(' ✅ [TEST 4] Tokens OAuth guardados de forma segura en data/cloud_session.json');
        passed++;
      } else {
        console.error(' ❌ [TEST 4] Tokens no encontrados en cloud_session.json:', sessionData);
      }
    } else {
      console.error(' ❌ [TEST 4] No existe cloud_session.json');
    }

    // 5. POST /api/backup/now - Generar Respaldo Unificado Cifrado AES-256
    const backupRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/backup/now',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      user: 'ISC Héctor Raúl',
      reason: 'Respaldo manual de prueba cifrado'
    });

    if (backupRes.status === 200 && backupRes.data.success && backupRes.data.backup?.encryptedFilename) {
      console.log(` ✅ [TEST 5] POST /api/backup/now genera archivo cifrado (${backupRes.data.backup.encryptedFilename})`);
      passed++;
    } else {
      console.error(' ❌ [TEST 5] Falló generación de respaldo cifrado:', backupRes.data);
    }

    // 6. Validar integridad de descifrado del archivo .aura.enc
    const backupInfo = backupRes.data.backup;
    const encPath = path.join(__dirname, 'AuraPOS_Respaldo', 'diario', backupInfo.encryptedFilename);
    if (fs.existsSync(encPath)) {
      const encBuffer = fs.readFileSync(encPath);
      const decryptedGz = decryptBackupBuffer(encBuffer);
      const unzippedJson = zlib.gunzipSync(decryptedGz).toString('utf8');
      const parsedBackup = JSON.parse(unzippedJson);

      if (parsedBackup.backupType && parsedBackup.company === 'Merasystems' && parsedBackup.products) {
        console.log(' ✅ [TEST 6] Archivo .aura.enc descifrado exitosamente con AES-256 (Datos íntegros verificados)');
        passed++;
      } else {
        console.error(' ❌ [TEST 6] Datos corruptos al descifrar el respaldo:', parsedBackup);
      }
    } else {
      console.error(' ❌ [TEST 6] Archivo .aura.enc no encontrado en disco:', encPath);
    }

    // 7. Validar configuración de empaquetado electron-builder en package.json
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const hasWinNsis = pkg.build?.win?.target?.includes('nsis');
    const hasLinuxDeb = pkg.build?.linux?.target?.includes('deb');
    const hasScripts = pkg.scripts?.['build:win'] && pkg.scripts?.['build:linux'] && pkg.scripts?.['build:deb'];

    if (hasWinNsis && hasLinuxDeb && hasScripts) {
      console.log(' ✅ [TEST 7] package.json configurado correctamente para instalador Windows (.exe NSIS) y paquete Linux (.deb Debian/ChromeOS)');
      passed++;
    } else {
      console.error(' ❌ [TEST 7] Configuración de electron-builder incompleta en package.json:', pkg.build);
    }

    // 8. Validar archivo electron-main.js
    const mainJsPath = path.join(__dirname, 'electron-main.js');
    if (fs.existsSync(mainJsPath) && fs.readFileSync(mainJsPath, 'utf8').includes('BrowserWindow')) {
      console.log(' ✅ [TEST 8] electron-main.js existe con configuración de ventana de escritorio nativa');
      passed++;
    } else {
      console.error(' ❌ [TEST 8] electron-main.js no encontrado o inválido');
    }

    console.log(`\n🏁 Resultado de Pruebas: ${passed}/${total} pruebas pasadas (${Math.round(passed/total*100)}%)\n`);
    if (passed === total) {
      console.log('🎉 TODAS LAS PRUEBAS DE OAUTH LOCAL, RESPALDO CIFRADO Y EMPAQUETADO PASARON CON ÉXITO AL 100%!\n');
    }
  } catch (err) {
    console.error('Error durante ejecución de pruebas:', err);
  }
}

runTests();
