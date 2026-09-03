/**
 * Test Suite: Validación de Distribución Comercial Limpia y Sanitización
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
  console.log('🧪 Iniciando Suite de Pruebas: Distribución Comercial Limpia y Sanitización de Credenciales...');
  let passed = 0;
  let total = 6;

  try {
    // 1. Validar que la base de datos inicial está limpia (0 productos, 0 ventas, 1 admin base)
    const initialRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/initial-data',
      method: 'GET'
    });

    const isCleanProducts = Array.isArray(initialRes.data.products) && initialRes.data.products.length === 0;
    const isCleanSales = Array.isArray(initialRes.data.sales) && initialRes.data.sales.length === 0;
    const hasAdminUser = Array.isArray(initialRes.data.users) && initialRes.data.users.some(u => u.username === 'admin' && u.role === 'Administrador');

    if (initialRes.status === 200 && isCleanProducts && isCleanSales && hasAdminUser) {
      console.log(' ✅ [TEST 1] Base de datos limpia comprobada (0 productos de prueba, 0 ventas, 1 usuario admin base)');
      passed++;
    } else {
      console.error(' ❌ [TEST 1] Base de datos no está limpia:', {
        productsCount: initialRes.data.products?.length,
        salesCount: initialRes.data.sales?.length,
        users: initialRes.data.users
      });
    }

    // 2. Validar que data/cloud_session.json no contiene tokens de prueba residuales
    const sessionFile = path.join(__dirname, 'data', 'cloud_session.json');
    if (fs.existsSync(sessionFile)) {
      const sessionContent = fs.readFileSync(sessionFile, 'utf8');
      const sessionData = JSON.parse(sessionContent);
      const noResidualTokens = !sessionData.providers?.drive?.tokens?.access_token && !sessionData.providers?.dropbox?.tokens?.access_token;

      if (noResidualTokens) {
        console.log(' ✅ [TEST 2] data/cloud_session.json sanitizado y libre de tokens residuales de desarrollo');
        passed++;
      } else {
        console.error(' ❌ [TEST 2] Tokens residuales encontrados en cloud_session.json:', sessionData);
      }
    } else {
      console.error(' ❌ [TEST 2] Archivo cloud_session.json no encontrado');
    }

    // 3. Validar existencia y formato de .env.example
    const envExamplePath = path.join(__dirname, '.env.example');
    if (fs.existsSync(envExamplePath)) {
      const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
      const hasGoogle = envExampleContent.includes('GOOGLE_DRIVE_CLIENT_ID=""');
      const hasDropbox = envExampleContent.includes('DROPBOX_APP_KEY=""');
      const hasDb = envExampleContent.includes('DATABASE_URL=""');

      if (hasGoogle && hasDropbox && hasDb) {
        console.log(' ✅ [TEST 3] Archivo .env.example creado con variables vacías y documentación para clientes');
        passed++;
      } else {
        console.error(' ❌ [TEST 3] .env.example no contiene todas las variables requeridas');
      }
    } else {
      console.error(' ❌ [TEST 3] Archivo .env.example no existe en la raíz');
    }

    // 4. Validar endpoint de restablecimiento de fábrica (POST /api/system/factory-reset)
    const resetRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/system/factory-reset',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (resetRes.status === 200 && resetRes.data.success && resetRes.data.data?.products?.length === 0) {
      console.log(' ✅ [TEST 4] POST /api/system/factory-reset ejecuta restablecimiento limpio a valores de fábrica');
      passed++;
    } else {
      console.error(' ❌ [TEST 4] Falló restablecimiento de fábrica:', resetRes.data);
    }

    // 5. Validar script scripts/clean_seed.js
    const cleanScriptPath = path.join(__dirname, 'scripts', 'clean_seed.js');
    if (fs.existsSync(cleanScriptPath)) {
      console.log(' ✅ [TEST 5] Script scripts/clean_seed.js disponible para ejecución de primer inicio / limpieza');
      passed++;
    } else {
      console.error(' ❌ [TEST 5] Script scripts/clean_seed.js no encontrado');
    }

    // 6. Validar configuración de package.json para empaquetado y scripts de distribución
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const hasCleanScript = pkg.scripts?.['clean:data'] && pkg.scripts?.['seed'];
    const hasExclusions = pkg.build?.files?.some(f => f.includes('!test_*.js'));

    if (hasCleanScript && hasExclusions && pkg.build?.win && pkg.build?.linux) {
      console.log(' ✅ [TEST 6] package.json configurado con exclusiones de archivos de prueba y scripts de empaquetado');
      passed++;
    } else {
      console.error(' ❌ [TEST 6] Inconsistencias en package.json:', pkg.build);
    }

    console.log(`\n🏁 Resultado de Pruebas: ${passed}/${total} pruebas pasadas (${Math.round(passed/total*100)}%)\n`);
    if (passed === total) {
      console.log('🎉 TODAS LAS PRUEBAS DE DISTRIBUCIÓN COMERCIAL LIMPIA Y SANITIZACIÓN PASARON AL 100%!\n');
    }
  } catch (err) {
    console.error('Error durante la ejecución de pruebas:', err);
  }
}

runTests();
