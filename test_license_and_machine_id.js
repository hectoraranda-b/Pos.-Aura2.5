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
  console.log('🧪 Iniciando Suite de Pruebas: Machine ID, Modo Demo de 7 Días y Activación Merasystems...');
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
    // 1. Check physical machine_id.json
    const machineIdFile = path.join(__dirname, 'data', 'machine_id.json');
    assert(
      'Archivo físico data/machine_id.json generado al iniciar el servidor',
      fs.existsSync(machineIdFile)
    );

    const machineFileContent = JSON.parse(fs.readFileSync(machineIdFile, 'utf8'));
    assert(
      'Machine ID tiene formato MERA-MID-XXXX-XXXX-XXXX-XXXX',
      /^MERA-MID-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(machineFileContent.machineId)
    );

    // 2. GET /api/system/machine-id
    const midRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/system/machine-id',
      method: 'GET'
    });
    assert(
      'GET /api/system/machine-id devuelve el Machine ID del equipo',
      midRes.status === 200 && midRes.body.machineId === machineFileContent.machineId
    );

    // 3. GET /api/license/status
    const licRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/license/status',
      method: 'GET'
    });
    assert(
      'GET /api/license/status devuelve metadatos de licenciamiento y machineId',
      licRes.status === 200 && licRes.body.machineId === machineFileContent.machineId
    );

    // 4. Test Demo Mode Activation
    const demoRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/license/verify',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      licenseKey: 'DEMO'
    });
    assert(
      'POST /api/license/verify con DEMO activa periodo de prueba de 7 días',
      demoRes.status === 200 && demoRes.body.isTrial === true && demoRes.body.trialDaysRemaining > 0
    );

    // 5. Test Commercial License Activation (MERA- prefix)
    const commRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/license/activate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      licenseKey: 'MERA-ENTERPRISE-2026-X89'
    });
    assert(
      'POST /api/license/activate con clave MERA- activa Licencia Comercial permanente',
      commRes.status === 200 && commRes.body.isLicensed === true && commRes.body.locked === false
    );

    // 6. Test Expiration Locking Simulation
    // Force config.json to have expired trial and DEMO key
    const configPath = path.join(__dirname, 'data', 'config.json');
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    cfg.licenseKey = 'DEMO';
    cfg.licenseStatus = 'DEMO_MODE';
    cfg.trialExpiresAt = new Date(Date.now() - 86400000).toISOString(); // Expired 1 day ago
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');

    // Reload active config in server
    await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/config',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, cfg);

    const expiredStatusRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/license/status',
      method: 'GET'
    });
    assert(
      'Cuando el periodo de prueba expira, GET /api/license/status reporta locked: true',
      expiredStatusRes.body.locked === true && expiredStatusRes.body.status === 'DEMO_TRIAL_EXPIRED'
    );

    const blockedSaleRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/sales',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      items: [{ id: 'prod_1', name: 'Café', quantity: 1, salePrice: 89 }],
      total: 89
    });
    assert(
      'POST /api/sales bloquea cobros con HTTP 403 cuando el periodo de prueba expiró',
      blockedSaleRes.status === 403 && blockedSaleRes.body.locked === true
    );

    // 7. Reactivate with Commercial License Key
    const reactivateRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/license/activate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      licenseKey: 'MERA-AURA-ENTERPRISE-2026-X89'
    });
    assert(
      'POST /api/license/activate desbloquea el sistema permanentemente tras expiración',
      reactivateRes.status === 200 && reactivateRes.body.locked === false && reactivateRes.body.isLicensed === true
    );

    const unblockedSaleRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/sales',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      items: [{ id: 'prod_1', name: 'Café Espresso', quantity: 1, salePrice: 89 }],
      total: 89,
      cashier: 'Carlos Mendoza',
      paymentMethod: 'Efectivo'
    });
    assert(
      'POST /api/sales procesa ventas exitosamente con licencia comercial activa',
      unblockedSaleRes.status === 201 && unblockedSaleRes.body.success === true
    );

    console.log(`\n🏁 Resultado: ${passed}/${total} pruebas de Machine ID y Licenciamiento pasadas con éxito (${Math.round(passed/total*100)}%)\n`);

  } catch (err) {
    console.error('Error durante la ejecución de pruebas:', err);
  }
}

runTests();
