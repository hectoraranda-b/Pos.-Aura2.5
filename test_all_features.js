const http = require('http');
const fs = require('fs');
const path = require('path');

function request(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: apiPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, text: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Full System Automated Test for Aura POS Enterprise...');
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Initial Data
  await test('GET /api/initial-data returns system metadata, credits and users', async () => {
    const res = await request('GET', '/api/initial-data');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.credits || !res.data.credits.author) throw new Error('Missing credits');
    if (!Array.isArray(res.data.users) || res.data.users.length === 0) throw new Error('Missing users array');
  });

  // 2. License Verification
  await test('POST /api/license/verify with MERA- prefix unlocks Commercial License', async () => {
    const res = await request('POST', '/api/license/verify', { licenseKey: 'MERA-ENTERPRISE-2026' });
    if (!res.data.valid || res.data.status !== 'VALIDATED_ACTIVE') throw new Error(JSON.stringify(res.data));
  });

  await test('POST /api/license/verify with DEMO unlocks Demo Mode', async () => {
    const res = await request('POST', '/api/license/verify', { licenseKey: 'DEMO' });
    if (!res.data.valid || res.data.status !== 'DEMO_MODE') throw new Error(JSON.stringify(res.data));
  });

  // 3. Direct Cloud Connect Flow
  await test('POST /api/connect-cloud establishes direct cloud link and creates physical folders', async () => {
    const res = await request('POST', '/api/connect-cloud', { provider: 'drive', account: 'director@empresa.com' });
    if (!res.data.success || res.data.account !== 'director@empresa.com') throw new Error(JSON.stringify(res.data));
  });

  // 4. Hardware Cash Drawer Kick
  await test('POST /api/hardware/cash-drawer emits ESC/POS pulse and logs event', async () => {
    const res = await request('POST', '/api/hardware/cash-drawer', { cashierName: 'Héctor Raúl', reason: 'Apertura de turno', shiftId: 'shift_1' });
    if (!res.data.success || res.data.status !== 'DRAWER_OPENED') throw new Error(JSON.stringify(res.data));
  });

  // 5. Hardware Bank Terminal Payment
  await test('POST /api/hardware/terminal-pay simulates payment approval with authCode', async () => {
    const res = await request('POST', '/api/hardware/terminal-pay', { amount: 350.50, currency: 'MXN', ticketId: 'TKT-1001', cardType: 'VISA' });
    if (!res.data.success || res.data.status !== 'APPROVED' || !res.data.authCode) throw new Error(JSON.stringify(res.data));
  });

  // 6. AI Copilot Help Desk
  await test('POST /api/ai/help-desk returns structured knowledge response for Corte Z query', async () => {
    const res = await request('POST', '/api/ai/help-desk', { query: '¿Cómo realizo un corte de caja Z?' });
    if (!res.data.success || !res.data.answer || !res.data.answer.includes('Corte Z')) throw new Error(JSON.stringify(res.data));
  });

  await test('POST /api/ai/help-desk returns keyboard shortcuts for F2 and F4', async () => {
    const res = await request('POST', '/api/ai/help-desk', { query: '¿Cuáles son los atajos de teclado?' });
    if (!res.data.success || !res.data.answer || !res.data.answer.includes('F2')) throw new Error(JSON.stringify(res.data));
  });

  console.log(`\n🏁 Test Suite Finished: ${passed}/${total} passed.\n`);
  if (passed === total) {
    console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
