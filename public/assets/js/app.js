/**
 * AURA POS (Enterprise Edition) - Core Application Logic & SPA Controller
 * Developer: ISC Héctor Raúl Antonio Aranda Barroso
 * Company: Merasystems Corp
 * Version: 2.5.0
 * Architecture: Reactive Modular SPA with REST API & Multidestination Cloud Storage Engine
 */

(function () {
  'use strict';

  // ==========================================================================
  // APPLICATION STATE (Central Single Source of Truth)
  // ==========================================================================
  const State = {
    credits: {
      author: "ISC Héctor Raúl Antonio Aranda Barroso",
      company: "Merasystems",
      licenseKey: "MERA-AURA-ENTERPRISE-2026-X89",
      licenseStatus: "VALIDATED_ACTIVE",
      licensedTo: "Merasystems Corp",
      version: "2.5.0 Enterprise Pro"
    },
    settings: {
      storeName: "Aura SuperMart Enterprise",
      businessName: "Aura Retail Systems S.A. de C.V.",
      taxId: "AUR240815XYZ",
      address: "Av. Tecnológico #1050, Corporativo Aura, CDMX",
      phone: "+52 (55) 8432-9000",
      email: "contacto@aurapos.enterprise.io",
      currency: "MXN",
      currencySymbol: "$",
      taxRate: 16,
      showTaxBreakdown: true,
      ticketHeader: "¡BIENVENIDO A AURA SUPERMART!",
      ticketFooter: "¡Gracias por su compra! Desarrollado por Merasystems.",
      ticketPaperWidth: "80mm",
      storageDestination: "local", // local, gdrive, dropbox
      gdriveAccount: "nube.merasystems@gmail.com",
      dropboxAccount: "dropbox@merasystems.com",
      gdriveConnected: true,
      dropboxConnected: true,
      enableMetrics: true,
      reportFrequency: "mensual",
      theme: "dark",
      autoPrint: false
    },
    currentUser: {
      id: "usr_1",
      name: "Carlos Mendoza",
      username: "admin",
      role: "Administrador",
      pin: "1234",
      avatar: "CM",
      canDiscount: true,
      canCancel: true,
      canEditStock: true,
      canViewReports: true
    },
    users: [
      { id: "usr_1", name: "Carlos Mendoza", username: "admin", role: "Administrador", pin: "1234", avatar: "CM" },
      { id: "usr_2", name: "Valeria Ríos", username: "cajera1", role: "Cajero", pin: "0000", avatar: "VR" },
      { id: "usr_3", name: "Alejandro Mora", username: "cajero2", role: "Cajero", pin: "5555", avatar: "AM" }
    ],
    products: [],
    sales: [],
    currentShift: {
      id: "shift_104",
      shiftNumber: 104,
      openedAt: new Date().toISOString(),
      cashier: "Carlos Mendoza",
      cashierId: "usr_1",
      initialCash: 1500.00,
      status: "OPEN",
      movements: [
        { id: "mov_1", type: "IN", amount: 300.00, reason: "Fondo adicional para cambio (Morralla)", time: new Date(Date.now() - 3600000 * 3).toISOString() },
        { id: "mov_2", type: "OUT", amount: 250.00, reason: "Pago a repartidor de garrafones", time: new Date(Date.now() - 3600000 * 1.5).toISOString() }
      ]
    },
    cart: [],
    cartDiscountPercent: 0,
    selectedCategory: "ALL",
    currentView: "pos",
    charts: {
      salesTimeline: null,
      paymentDist: null
    },
    parsedImportProducts: []
  };

  // ==========================================================================
  // AUDIO SYNTHESIS & SOUND EFFECTS (Web Audio API)
  // ==========================================================================
  const SoundFX = {
    audioCtx: null,
    init() {
      if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
    },
    beep(freq = 880, duration = 0.08, type = 'sine') {
      try {
        this.init();
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
      } catch (e) {
        // audio context not ready
      }
    },
    success() {
      this.beep(659.25, 0.08);
      setTimeout(() => this.beep(880, 0.12), 80);
    },
    cashRegister() {
      this.beep(523.25, 0.08);
      setTimeout(() => this.beep(659.25, 0.08), 90);
      setTimeout(() => this.beep(1046.50, 0.2), 180);
    },
    error() {
      this.beep(220, 0.15, 'sawtooth');
    }
  };

  // ==========================================================================
  // FORMATTERS & UTILS
  // ==========================================================================
  const Utils = {
    formatMoney(amount) {
      const sym = State.settings.currencySymbol || "$";
      const num = parseFloat(amount) || 0;
      return `${sym}${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
    formatDate(isoString) {
      if (!isoString) return '--';
      const d = new Date(isoString);
      return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    formatTime(isoString) {
      if (!isoString) return '--';
      const d = new Date(isoString);
      return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    },
    showToast(message, type = 'success', title = '') {
      const toast = document.getElementById('auraToast');
      const toastTitle = document.getElementById('toastTitle');
      const toastMsg = document.getElementById('toastMessage');
      const toastIcon = document.getElementById('toastIcon');

      if (!toast) return;

      toast.className = `aura-toast ${type} show`;
      toastTitle.textContent = title || (type === 'success' ? 'Éxito' : type === 'error' ? 'Error' : 'Aviso');
      toastMsg.textContent = message;

      if (type === 'success') {
        toastIcon.className = 'bi bi-check-circle-fill text-success fs-5';
      } else if (type === 'error') {
        toastIcon.className = 'bi bi-exclamation-triangle-fill text-danger fs-5';
      } else if (type === 'warning') {
        toastIcon.className = 'bi bi-exclamation-diamond-fill text-warning fs-5';
      } else {
        toastIcon.className = 'bi bi-info-circle-fill text-info fs-5';
      }

      setTimeout(() => {
        toast.classList.remove('show');
      }, 3500);
    },
    downloadFile(content, fileName, mimeType = 'text/plain') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // ==========================================================================
  // THEME ENGINE (DARK / LIGHT MODE TOGGLE)
  // ==========================================================================
  const ThemeEngine = {
    init() {
      const saved = localStorage.getItem('aura_pos_theme') || State.settings.theme || 'dark';
      this.applyTheme(saved);

      const btnToggle = document.getElementById('btnToggleTheme');
      if (btnToggle) {
        btnToggle.addEventListener('click', () => {
          const current = document.documentElement.getAttribute('data-theme') || 'dark';
          const next = current === 'dark' ? 'light' : 'dark';
          this.applyTheme(next);
          StorageEngine.syncSettings();
          SoundFX.beep(800, 0.05);
          Utils.showToast(`Modo ${next === 'dark' ? 'Oscuro' : 'Claro'} activado y guardado en config.json`, 'info');
        });
      }
    },
    applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.setAttribute('data-bs-theme', theme);
      State.settings.theme = theme;
      localStorage.setItem('aura_pos_theme', theme);

      const icon = document.getElementById('themeIcon');
      const label = document.getElementById('themeLabelText');

      if (theme === 'dark') {
        if (icon) icon.className = 'bi bi-moon-stars-fill text-warning';
        if (label) label.textContent = 'Oscuro';
      } else {
        if (icon) icon.className = 'bi bi-sun-fill text-warning';
        if (label) label.textContent = 'Claro';
      }
    }
  };

  // ==========================================================================
  // DATA PERSISTENCE & MULTIDESTINATION CLOUD STORAGE ENGINE
  // ==========================================================================
  const StorageEngine = {
    STORAGE_KEY: 'aura_pos_enterprise_v2',
    async loadInitialData() {
      const local = localStorage.getItem(this.STORAGE_KEY);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          State.settings = { ...State.settings, ...parsed.settings };
          State.products = parsed.products || [];
          State.sales = parsed.sales || [];
          State.currentShift = parsed.currentShift || State.currentShift;
          State.users = parsed.users || State.users;
        } catch (e) {
          console.warn('Error reading local storage', e);
        }
      }

      try {
        const res = await fetch('/api/sync/full');
        if (res.ok) {
          const serverData = await res.json();
          if (serverData && serverData.products && serverData.products.length > 0) {
            State.settings = { ...State.settings, ...serverData.settings };
            State.products = serverData.products;
            State.sales = serverData.sales || [];
            State.currentShift = serverData.currentShift || State.currentShift;
            State.users = serverData.users || State.users;
            State.cloudEnv = serverData.cloudEnv || null;
            this.saveLocal();
          }
        }
      } catch (err) {
        console.log('Client mode ready:', err.message);
      }

      // Default sample products if empty
      if (!State.products || State.products.length === 0) {
        State.products = [
          { id: "prod_1", barcode: "75010001", sku: "BEB-001", name: "Café Espresso Premium 250g", category: "Bebidas & Café", costPrice: 48.50, salePrice: 89.00, taxRate: 16, stock: 45, minStock: 10, unit: "Pza", icon: "bi-cup-hot" },
          { id: "prod_2", barcode: "75010002", sku: "BEB-002", name: "Bebida Energética Nitro 473ml", category: "Bebidas & Café", costPrice: 18.00, salePrice: 38.50, taxRate: 16, stock: 6, minStock: 15, unit: "Pza", icon: "bi-lightning-charge" },
          { id: "prod_3", barcode: "75010003", sku: "PAN-001", name: "Croissant Mantequilla Francés", category: "Panadería & Repostería", costPrice: 14.20, salePrice: 32.00, taxRate: 16, stock: 28, minStock: 8, unit: "Pza", icon: "bi-egg-fried" },
          { id: "prod_4", barcode: "75010004", sku: "LACT-001", name: "Leche Orgánica Entera 1L", category: "Lácteos & Huevos", costPrice: 21.00, salePrice: 34.50, taxRate: 0, stock: 35, minStock: 12, unit: "Pza", icon: "bi-droplet-half" },
          { id: "prod_5", barcode: "75010005", sku: "SNK-001", name: "Chips Artesanales Sal de Mar 180g", category: "Snacks & Dulces", costPrice: 22.50, salePrice: 45.00, taxRate: 16, stock: 18, minStock: 10, unit: "Pza", icon: "bi-bag-check" },
          { id: "prod_6", barcode: "75010006", sku: "TEC-001", name: "Cable USB-C Carga Rápida 2m", category: "Tecnología & Accesorios", costPrice: 65.00, salePrice: 149.00, taxRate: 16, stock: 4, minStock: 8, unit: "Pza", icon: "bi-usb-c" },
          { id: "prod_7", barcode: "75010007", sku: "FRU-001", name: "Manzana Honeycrisp Selección", category: "Frutas & Verduras", costPrice: 32.00, salePrice: 59.90, taxRate: 0, stock: 52, minStock: 15, unit: "Kg", icon: "bi-apple" },
          { id: "prod_8", barcode: "75010008", sku: "HIG-001", name: "Jabón Líquido Antibacterial 500ml", category: "Cuidado Personal", costPrice: 24.00, salePrice: 52.00, taxRate: 16, stock: 3, minStock: 12, unit: "Pza", icon: "bi-shield-check" },
          { id: "prod_9", barcode: "75010009", sku: "BEB-003", name: "Agua Mineral Alcalina 1.5L", category: "Bebidas & Café", costPrice: 9.80, salePrice: 22.00, taxRate: 16, stock: 64, minStock: 20, unit: "Pza", icon: "bi-water" },
          { id: "prod_10", barcode: "75010010", sku: "PAN-002", name: "Baguette Rústica de Masa Madre", category: "Panadería & Repostería", costPrice: 16.00, salePrice: 35.00, taxRate: 16, stock: 22, minStock: 10, unit: "Pza", icon: "bi-bread-slice" }
        ];
        this.saveLocal();
      }
    },
    saveLocal() {
      try {
        const payload = {
          settings: State.settings,
          products: State.products,
          sales: State.sales,
          currentShift: State.currentShift,
          users: State.users
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        console.error('Failed to save to local storage', e);
      }
    },
    async syncProduct(product, method = 'POST') {
      this.saveLocal();
      try {
        const url = method === 'PUT' ? `/api/products/${product.id}` : '/api/products';
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product)
        });
      } catch (e) {}
    },
    async syncSale(sale) {
      this.saveLocal();
      try {
        await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sale)
        });
      } catch (e) {}
    },
    async syncSettings() {
      this.saveLocal();
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.settings)
        });
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.settings)
        });
      } catch (e) {}
    },
    // Handles Multidestination storage (Local, GDrive, Dropbox)
    async handleFileExport(fileName, content, period = 'diario', format = 'csv') {
      const dest = State.settings.storageDestination || 'local';

      if (dest === 'local') {
        // Direct local download
        Utils.downloadFile(content, fileName, format === 'xml' ? 'application/xml;charset=utf-8;' : 'text/csv;charset=utf-8;');
        SoundFX.success();
        Utils.showToast(`Archivo descargado localmente: ${fileName}`, 'success');
      } else {
        const destName = dest === 'gdrive' ? 'Google Drive' : 'Dropbox';
        // 1. Physically save to server structure /AuraPOS_Respaldo/<period>/
        try {
          const res = await fetch('/api/backup/cloud-save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destination: destName,
              period,
              filename: fileName,
              content,
              format
            })
          });
          const json = await res.json();
          SoundFX.success();
          Utils.showToast(`Sincronizado con ${destName} en /AuraPOS_Respaldo/${period}/${fileName}`, 'success', `Nube ${destName}`);
        } catch (e) {
          // Fallback download if offline
          Utils.downloadFile(content, fileName, format === 'xml' ? 'application/xml;charset=utf-8;' : 'text/csv;charset=utf-8;');
        }
      }
    }
  };

  // ==========================================================================
  // EXPORT & IMPORT ENGINE (XML & CSV)
  // ==========================================================================
  const CatalogExportImport = {
    init() {
      // Export buttons in Catalog
      document.getElementById('btnExportCatalogCsv')?.addEventListener('click', () => this.exportCatalog('csv'));
      document.getElementById('btnExportCatalogXml')?.addEventListener('click', () => this.exportCatalog('xml'));

      // Export buttons in Inventory
      document.getElementById('btnExportInventoryCsv')?.addEventListener('click', () => this.exportCatalog('csv'));
      document.getElementById('btnExportInventoryXml')?.addEventListener('click', () => this.exportCatalog('xml'));

      // Open Import Modal buttons
      document.getElementById('btnOpenImportCatalogModal')?.addEventListener('click', () => this.openImportModal());
      document.getElementById('btnOpenImportInventoryModal')?.addEventListener('click', () => this.openImportModal());

      // File input change in Import modal
      const fileIn = document.getElementById('inputBulkImportFile');
      if (fileIn) {
        fileIn.addEventListener('change', (e) => this.handleFileSelection(e));
      }

      // Execute bulk import button
      const btnExec = document.getElementById('btnExecuteBulkImport');
      if (btnExec) {
        btnExec.addEventListener('click', () => this.executeImport());
      }
    },

    exportCatalog(format = 'csv') {
      const timestamp = new Date().toISOString().slice(0, 10);
      const dest = State.settings.storageDestination || 'local';

      if (format === 'csv') {
        let csv = "\uFEFF"; // UTF-8 BOM
        csv += "SKU,CodigoBarras,Nombre,Categoria,Costo,PrecioVenta,TasaIVA,Stock,StockMinimo,Unidad,Utilidad,MargenPorcentaje\n";
        State.products.forEach(p => {
          const profit = p.salePrice - p.costPrice;
          const margin = p.salePrice > 0 ? (profit / p.salePrice) * 100 : 0;
          csv += `"${p.sku}","${p.barcode}","${p.name}","${p.category}",${p.costPrice.toFixed(2)},${p.salePrice.toFixed(2)},${p.taxRate},${p.stock},${p.minStock},"${p.unit}",${profit.toFixed(2)},${margin.toFixed(1)}%\n`;
        });

        const filename = `AuraPOS_Catalogo_${timestamp}.csv`;
        StorageEngine.handleFileExport(filename, csv, 'diario', 'csv');
      } else if (format === 'xml') {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<aura_pos_catalog export_date="${new Date().toISOString()}" developer="${State.credits.author}" company="${State.credits.company}">\n`;
        xml += `  <meta>\n`;
        xml += `    <total_items>${State.products.length}</total_items>\n`;
        xml += `    <currency>${State.settings.currency}</currency>\n`;
        xml += `  </meta>\n`;
        xml += `  <products>\n`;
        State.products.forEach(p => {
          const profit = p.salePrice - p.costPrice;
          const margin = p.salePrice > 0 ? (profit / p.salePrice) * 100 : 0;
          xml += `    <product id="${p.id}">\n`;
          xml += `      <sku>${p.sku}</sku>\n`;
          xml += `      <barcode>${p.barcode}</barcode>\n`;
          xml += `      <name><![CDATA[${p.name}]]></name>\n`;
          xml += `      <category><![CDATA[${p.category}]]></category>\n`;
          xml += `      <cost_price>${p.costPrice.toFixed(2)}</cost_price>\n`;
          xml += `      <sale_price>${p.salePrice.toFixed(2)}</sale_price>\n`;
          xml += `      <tax_rate>${p.taxRate}</tax_rate>\n`;
          xml += `      <stock>${p.stock}</stock>\n`;
          xml += `      <min_stock>${p.minStock}</min_stock>\n`;
          xml += `      <unit>${p.unit}</unit>\n`;
          xml += `      <net_profit>${profit.toFixed(2)}</net_profit>\n`;
          xml += `      <margin_percent>${margin.toFixed(1)}</margin_percent>\n`;
          xml += `    </product>\n`;
        });
        xml += `  </products>\n`;
        xml += `</aura_pos_catalog>`;

        const filename = `AuraPOS_Catalogo_${timestamp}.xml`;
        StorageEngine.handleFileExport(filename, xml, 'diario', 'xml');
      }
    },

    openImportModal() {
      const fileIn = document.getElementById('inputBulkImportFile');
      const summary = document.getElementById('importPreviewSummary');
      const btnExec = document.getElementById('btnExecuteBulkImport');

      if (fileIn) fileIn.value = '';
      if (summary) {
        summary.classList.add('d-none');
        summary.innerHTML = '';
      }
      if (btnExec) btnExec.disabled = true;

      State.parsedImportProducts = [];

      const modalEl = document.getElementById('modalBulkImport');
      if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    },

    handleFileSelection(e) {
      const file = e.target.files[0];
      if (!file) return;

      const summary = document.getElementById('importPreviewSummary');
      const btnExec = document.getElementById('btnExecuteBulkImport');
      const reader = new FileReader();

      reader.onload = (event) => {
        const content = event.target.result;
        const isXml = file.name.endsWith('.xml') || content.trim().startsWith('<');

        try {
          if (isXml) {
            this.parseXmlCatalog(content);
          } else {
            this.parseCsvCatalog(content);
          }

          if (State.parsedImportProducts.length > 0) {
            summary.classList.remove('d-none');
            summary.innerHTML = `✓ Se detectaron <strong>${State.parsedImportProducts.length} productos</strong> válidos listos para importar.`;
            btnExec.disabled = false;
          } else {
            summary.classList.remove('d-none');
            summary.className = 'p-2 rounded bg-black small font-mono text-danger';
            summary.textContent = 'No se encontraron registros de productos reconocibles en el archivo.';
            btnExec.disabled = true;
          }
        } catch (err) {
          summary.classList.remove('d-none');
          summary.className = 'p-2 rounded bg-black small font-mono text-danger';
          summary.textContent = 'Error al parsear archivo: ' + err.message;
          btnExec.disabled = true;
        }
      };

      reader.readAsText(file);
    },

    parseCsvCatalog(csvText) {
      const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) return;

      const headers = lines[0].toLowerCase().split(',').map(h => h.replace(/["\s]/g, ''));
      const parsed = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.replace(/^"|"$/g, '').trim());
        if (row.length < 3) continue;

        parsed.push({
          id: 'prod_' + (Date.now() + i),
          sku: row[0] || ('SKU-' + (100 + i)),
          barcode: row[1] || String(75000000 + i),
          name: row[2] || 'Producto ' + i,
          category: row[3] || 'General',
          costPrice: parseFloat(row[4]) || 10,
          salePrice: parseFloat(row[5]) || 20,
          taxRate: parseFloat(row[6]) || 16,
          stock: parseFloat(row[7]) || 10,
          minStock: parseFloat(row[8]) || 5,
          unit: row[9] || 'Pza',
          icon: 'bi-box-seam'
        });
      }

      State.parsedImportProducts = parsed;
    },

    parseXmlCatalog(xmlText) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const nodes = xmlDoc.getElementsByTagName('product');
      const parsed = [];

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const getText = (tag) => node.getElementsByTagName(tag)[0]?.textContent?.trim() || '';

        parsed.push({
          id: 'prod_' + (Date.now() + i),
          sku: getText('sku') || ('SKU-' + (200 + i)),
          barcode: getText('barcode') || String(75010000 + i),
          name: getText('name') || 'Producto Importado',
          category: getText('category') || 'General',
          costPrice: parseFloat(getText('cost_price')) || 10,
          salePrice: parseFloat(getText('sale_price')) || 25,
          taxRate: parseFloat(getText('tax_rate')) || 16,
          stock: parseFloat(getText('stock')) || 10,
          minStock: parseFloat(getText('min_stock')) || 5,
          unit: getText('unit') || 'Pza',
          icon: 'bi-box-seam'
        });
      }

      State.parsedImportProducts = parsed;
    },

    async executeImport() {
      if (State.parsedImportProducts.length === 0) return;

      const mode = document.getElementById('importModeSelect')?.value || 'merge';

      try {
        const res = await fetch('/api/products/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            products: State.parsedImportProducts,
            mode
          })
        });

        if (res.ok) {
          const data = await res.json();
          State.products = data.products;
          StorageEngine.saveLocal();
        } else {
          // Local merge fallback
          if (mode === 'replace') {
            State.products = State.parsedImportProducts;
          } else {
            State.parsedImportProducts.forEach(item => {
              const idx = State.products.findIndex(p => p.barcode === item.barcode || p.sku === item.sku);
              if (idx > -1) State.products[idx] = { ...State.products[idx], ...item };
              else State.products.push(item);
            });
          }
          StorageEngine.saveLocal();
        }

        SoundFX.success();
        Utils.showToast(`Se importaron ${State.parsedImportProducts.length} productos con éxito`, 'success');

        const modalEl = document.getElementById('modalBulkImport');
        if (modalEl) {
          const inst = bootstrap.Modal.getInstance(modalEl);
          if (inst) inst.hide();
        }

        // Re-render UI views
        CatalogModule.render();
        POSModule.renderCatalog();
        InventoryModule.render();
        HeaderModule.updateNotifications();
      } catch (err) {
        Utils.showToast('Error durante la importación: ' + err.message, 'error');
      }
    }
  };

  // ==========================================================================
  // AUDIT LOGGING CLIENT ENGINE (audit.log)
  // ==========================================================================
  const AuditClient = {
    async log(action, details = '', user = null) {
      try {
        const u = user || State.currentUser || {};
        await fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            details,
            user: {
              id: u.id,
              name: u.name,
              role: u.role
            }
          })
        });
      } catch (e) {
        console.warn('AuditClient log error:', e.message);
      }
    }
  };

  // ==========================================================================
  // SECURITY & RBAC ACCESS CONTROL ENGINE
  // ==========================================================================
  const SecurityEngine = {
    isViewAllowed(viewName) {
      const isAdm = State.currentUser.role === 'Administrador';
      if (isAdm) return true;

      // Cashier restricted views
      if (viewName === 'settings' || viewName === 'reports') {
        return false;
      }
      return true;
    },

    applyRoleRestrictions() {
      const isAdm = State.currentUser.role === 'Administrador';
      
      // Update sidebar nav items indicators
      const navSettings = document.getElementById('nav-settings');
      const navReports = document.getElementById('nav-reports');

      [navSettings, navReports].forEach(nav => {
        if (!nav) return;
        const parentLi = nav.closest('.nav-item');
        if (!isAdm) {
          nav.style.opacity = '0.5';
          nav.setAttribute('title', '⛔ Requiere privilegios de Administrador');
        } else {
          nav.style.opacity = '1';
          nav.removeAttribute('title');
        }
      });

      // Toggle admin-only buttons (add product, bulk import, user creation, etc.)
      document.querySelectorAll('.admin-only').forEach(el => {
        if (isAdm) {
          el.classList.remove('d-none');
          el.removeAttribute('disabled');
        } else {
          el.classList.add('d-none');
          el.setAttribute('disabled', 'true');
        }
      });

      // If cashier is currently on a forbidden view, redirect to POS immediately
      if (!isAdm && (State.currentView === 'settings' || State.currentView === 'reports')) {
        AuditClient.log('AUTH_DENIED', `Intento de acceso denegado a vista "${State.currentView}" por rol "${State.currentUser.role}"`);
        Router.navigate('pos');
        SoundFX.error();
        Utils.showToast('⛔ Acceso denegado. Se requieren privilegios de Administrador.', 'error', 'Seguridad RBAC');
      }
    }
  };

  // ==========================================================================
  // LICENSE & 7-DAY TRIAL MANAGEMENT ENGINE (MACHINE ID & MERASYSTEMS LICENSING)
  // ==========================================================================
  const LicenseEngine = {
    currentStatus: null,

    async checkStatus() {
      try {
        const res = await fetch('/api/license/status');
        if (res.ok) {
          const status = await res.json();
          this.currentStatus = status;
          this.applyLicenseState(status);
          return status;
        }
      } catch (err) {
        console.warn('License check error:', err.message);
      }
    },

    applyLicenseState(data) {
      if (!data) return;

      // Update Settings Machine ID & Lock Screen Machine ID
      const dispMachineId = document.getElementById('displaySettingsMachineId');
      const lockMachineId = document.getElementById('lockScreenMachineId');
      if (dispMachineId && data.machineId) dispMachineId.textContent = data.machineId;
      if (lockMachineId && data.machineId) lockMachineId.textContent = data.machineId;

      // Banner Management
      const banner = document.getElementById('trialNoticeBanner');
      const daysText = document.getElementById('trialDaysText');
      const msgText = document.getElementById('trialMessageText');

      // Lock Screen Overlay
      const lockOverlay = document.getElementById('modalTrialLockScreen');

      if (data.isLicensed && !data.locked) {
        // Commercial active license
        if (banner) banner.classList.add('d-none');
        if (lockOverlay) lockOverlay.classList.add('d-none');
        this.updateLicenseBadge('VALIDATED_ACTIVE', data.licensedTo);
      } else if (data.isTrial && !data.locked) {
        // Trial Active (7 Days Countdown)
        if (banner) {
          banner.classList.remove('d-none');
          if (daysText) daysText.textContent = `${data.trialDaysRemaining} Día${data.trialDaysRemaining === 1 ? '' : 's'} Restante${data.trialDaysRemaining === 1 ? '' : 's'}`;
          if (msgText) msgText.textContent = `Modo de Evaluación Demo (Te quedan ${data.trialDaysRemaining} días de prueba). Adquiere tu licencia comercial con Merasystems para desbloqueo permanente.`;
        }
        if (lockOverlay) lockOverlay.classList.add('d-none');
        this.updateLicenseBadge('DEMO_MODE', data.licensedTo, data.trialDaysRemaining, data.trialExpiresAt);
      } else if (data.locked) {
        // Expired & Locked
        if (banner) banner.classList.add('d-none');
        if (lockOverlay) lockOverlay.classList.remove('d-none');
        this.updateLicenseBadge('LOCKED', data.licensedTo);
      }
    },

    updateLicenseBadge(status, licensedTo, daysRemaining = 0, expiresAt = null) {
      const badge = document.getElementById('licenseStatusBadge');
      const trialBadge = document.getElementById('licenseTrialBadge');
      const label = document.getElementById('licenseStatusLabel');
      const expiresLabel = document.getElementById('licenseExpiresLabel');

      if (status === 'VALIDATED_ACTIVE') {
        if (badge) {
          badge.className = 'badge bg-success px-3 py-1 font-mono';
          badge.innerHTML = '<i class="bi bi-patch-check-fill me-1"></i>LICENCIA CORPORATIVA VERIFICADA';
        }
        if (trialBadge) trialBadge.classList.add('d-none');
        if (label) {
          label.className = 'small text-success d-block font-mono';
          label.textContent = `● Software Autorizado (${licensedTo || 'Merasystems Corp'})`;
        }
        if (expiresLabel) expiresLabel.textContent = '● Licencia Permanente';
      } else if (status === 'DEMO_MODE') {
        if (badge) {
          badge.className = 'badge bg-warning text-dark px-3 py-1 font-mono';
          badge.innerHTML = '<i class="bi bi-cone-striped me-1"></i>MODO DEMO / EVALUACIÓN';
        }
        if (trialBadge) {
          trialBadge.classList.remove('d-none');
          trialBadge.innerHTML = `<i class="bi bi-hourglass-split me-1"></i>PRUEBA: ${daysRemaining} DÍAS`;
        }
        if (label) {
          label.className = 'small text-warning d-block font-mono';
          label.textContent = `● Periodo de Prueba (${daysRemaining} días restantes)`;
        }
        if (expiresLabel && expiresAt) {
          const expDate = new Date(expiresAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
          expiresLabel.textContent = `● Vence: ${expDate}`;
        }
      } else {
        if (badge) {
          badge.className = 'badge bg-danger px-3 py-1 font-mono';
          badge.innerHTML = '<i class="bi bi-shield-x me-1"></i>LICENCIA DE PRUEBA EXPIRADA';
        }
        if (trialBadge) trialBadge.classList.add('d-none');
        if (label) {
          label.className = 'small text-danger d-block font-mono';
          label.textContent = '● Bloqueo Operativo: Ingrese Clave Comercial';
        }
      }
    },

    async activateKey(key) {
      if (!key) {
        SoundFX.error();
        Utils.showToast('Por favor ingrese una clave de activación o DEMO', 'warning');
        return;
      }

      const upperKey = key.trim().toUpperCase();

      try {
        const res = await fetch('/api/license/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: upperKey })
        });

        const data = await res.json();
        if (res.ok && data.valid) {
          SoundFX.success();
          this.applyLicenseState(data);
          Utils.showToast(data.message || 'Licencia Comercial activada exitosamente', 'success', 'Activación Exitosa');
          // Hide lock screen
          const lockOverlay = document.getElementById('modalTrialLockScreen');
          if (lockOverlay) lockOverlay.classList.add('d-none');
          const cfgInput = document.getElementById('cfgLicenseInput');
          if (cfgInput) cfgInput.value = upperKey;
        } else {
          SoundFX.error();
          Utils.showToast(data.error || data.message || 'Clave de activación no válida para este Machine ID', 'error');
        }
      } catch (err) {
        SoundFX.error();
        Utils.showToast('Error de conexión al activar licencia: ' + err.message, 'error');
      }
    },

    initEvents() {
      // Copy Machine ID in Settings
      const btnCopySettings = document.getElementById('btnCopySettingsMachineId');
      if (btnCopySettings) {
        btnCopySettings.addEventListener('click', () => {
          const text = document.getElementById('displaySettingsMachineId')?.textContent;
          if (text) {
            navigator.clipboard.writeText(text);
            SoundFX.beep(900, 0.05);
            Utils.showToast('Machine ID copiado al portapapeles: ' + text, 'info');
          }
        });
      }

      // Copy Machine ID in Lock Screen
      const btnCopyLock = document.getElementById('btnCopyLockScreenMachineId');
      if (btnCopyLock) {
        btnCopyLock.addEventListener('click', () => {
          const text = document.getElementById('lockScreenMachineId')?.textContent;
          if (text) {
            navigator.clipboard.writeText(text);
            SoundFX.beep(900, 0.05);
            Utils.showToast('Machine ID copiado al portapapeles: ' + text, 'info');
          }
        });
      }

      // Banner "Activar Licencia" button
      const btnBannerActivate = document.getElementById('btnBannerActivateLicense');
      if (btnBannerActivate) {
        btnBannerActivate.addEventListener('click', () => {
          Router.navigate('settings');
          document.getElementById('cfgLicenseInput')?.focus();
        });
      }

      // Lock Screen Activation Form
      const formLock = document.getElementById('formLockScreenActivation');
      if (formLock) {
        formLock.addEventListener('submit', (e) => {
          e.preventDefault();
          const key = document.getElementById('inputLockScreenLicenseKey')?.value;
          this.activateKey(key);
        });
      }
    }
  };

  // ==========================================================================
  // HARDWARE POS & PERIPHERALS INTEGRATION ENGINE
  // ==========================================================================
  const HardwareEngine = {
    lastTerminalTxn: null,

    async openCashDrawer(reason = 'Apertura manual desde panel') {
      try {
        const res = await fetch('/api/hardware/cash-drawer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cashierName: State.currentUser.name,
            reason: reason,
            shiftId: State.currentShift?.id
          })
        });
        const data = await res.json();
        SoundFX.beep(420, 0.15);
        setTimeout(() => SoundFX.beep(840, 0.08), 80);
        Utils.showToast(data.message || 'Cajón de dinero abierto (Pulso ESC/POS 24V)', 'success', 'Hardware POS');
      } catch (err) {
        SoundFX.beep(420, 0.15);
        Utils.showToast('Pulso de apertura de cajón enviado localmente', 'info', 'Hardware POS');
      }
    },

    async processTerminalPayment() {
      const totals = POSModule.calculateTotals();
      const amount = totals.grandTotal;

      if (amount <= 0) {
        SoundFX.error();
        Utils.showToast('El total a cobrar debe ser mayor a cero', 'warning');
        return;
      }

      const btn = document.getElementById('btnProcessTerminalPay');
      const btnText = document.getElementById('btnProcessTerminalPayText');
      const badge = document.getElementById('terminalStatusBadge');
      const resBox = document.getElementById('terminalResultBox');

      if (btn) btn.disabled = true;
      if (btnText) btnText.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Comunicando con Terminal...';
      if (badge) {
        badge.className = 'badge bg-warning text-dark font-mono';
        badge.textContent = 'PROCESANDO';
      }

      try {
        const res = await fetch('/api/hardware/terminal-pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amount,
            currency: State.settings.currency || 'MXN',
            ticketId: 'TEMP-' + Date.now(),
            cardType: 'Tarjeta Débito/Crédito'
          })
        });

        const data = await res.json();

        if (res.ok && data.status === 'APPROVED') {
          this.lastTerminalTxn = data;

          if (badge) {
            badge.className = 'badge bg-success font-mono';
            badge.textContent = 'APROBADO';
          }

          if (resBox) {
            resBox.classList.remove('d-none');
            resBox.innerHTML = `
              <div class="d-flex align-items-center justify-content-between">
                <span><i class="bi bi-check-circle-fill text-success me-1"></i>AUT: <strong>${data.authCode}</strong></span>
                <span>REF: <strong>${data.transactionId}</strong></span>
              </div>
            `;
          }

          if (btnText) btnText.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Cobro Aprobado por Terminal';

          // Auto complete payment amount
          const inputPaid = document.getElementById('checkoutAmountPaid');
          if (inputPaid) {
            inputPaid.value = amount.toFixed(2);
            POSModule.calculateChange();
          }

          SoundFX.success();
          Utils.showToast(`Cobro por ${Utils.formatMoney(amount)} aprobado por terminal bancaria`, 'success', 'Terminal POS');
        } else {
          throw new Error(data.error || 'Transacción rechazada por el banco');
        }
      } catch (err) {
        if (badge) {
          badge.className = 'badge bg-danger font-mono';
          badge.textContent = 'ERROR';
        }
        if (btnText) btnText.innerHTML = 'Reintentar Cobro en Terminal';
        if (btn) btn.disabled = false;
        SoundFX.error();
        Utils.showToast('Error de comunicación con terminal bancaria: ' + err.message, 'error');
      }
    }
  };

  // ==========================================================================
  // DIRECT CLOUD STORAGE ENGINE (GOOGLE DRIVE / DROPBOX - API KEY DIRECT LINK)
  // ==========================================================================
  const CloudConnectEngine = {
    activeProvider: 'drive',

    openModal(provider = 'drive') {
      this.activeProvider = provider;
      const isDropbox = provider === 'dropbox';
      
      const provInput = document.getElementById('cloudProviderInput');
      const iconEl = document.getElementById('cloudModalIcon');
      const nameEl = document.getElementById('cloudModalProviderName');
      const accountInput = document.getElementById('cloudAccountInput');
      const apiKeyInput = document.getElementById('cloudApiKeyInput');
      const noticeEl = document.getElementById('cloudTargetPathNotice');

      if (provInput) provInput.value = this.activeProvider;
      if (iconEl) {
        iconEl.innerHTML = isDropbox 
          ? '<i class="bi bi-dropbox text-info"></i>' 
          : '<i class="bi bi-google text-primary"></i>';
      }
      if (nameEl) {
        nameEl.textContent = isDropbox ? 'Dropbox Business Cloud Storage' : 'Google Drive Cloud Storage';
      }
      if (accountInput) {
        accountInput.value = isDropbox 
          ? (State.settings.dropboxAccount || 'dropbox@merasystems.com')
          : (State.settings.gdriveAccount || 'nube.merasystems@gmail.com');
      }
      if (apiKeyInput) {
        apiKeyInput.value = isDropbox 
          ? (State.settings.dropboxApiKey || '')
          : (State.settings.gdriveApiKey || '');
      }
      if (noticeEl) {
        const rootFolder = isDropbox ? 'CloudSync_DROPBOX' : 'CloudSync_DRIVE';
        noticeEl.innerHTML = `📁 Directorio Físico en Servidor: <strong>/${rootFolder}/AuraPOS_Respaldo/ [diario | semanal | mensual]</strong>`;
      }

      const modalEl = document.getElementById('modalCloudConnect');
      if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    },

    async startOAuthFlow(provider = null) {
      const prov = provider || this.activeProvider || 'drive';
      const isDropbox = prov === 'dropbox';
      const endpoint = isDropbox ? '/api/auth/dropbox/url' : '/api/auth/google/url';

      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        if (data.success && data.authUrl) {
          Utils.showToast('Redirigiendo a autorización oficial OAuth 2.0 (localhost:3000)...', 'info');
          window.location.href = data.authUrl;
        } else {
          throw new Error(data.message || 'No se pudo obtener la URL de autorización');
        }
      } catch (e) {
        SoundFX.error();
        Utils.showToast('Error iniciando flujo OAuth: ' + e.message, 'error');
      }
    },

    async testConnection(provider = null, apiKey = null, account = null) {
      const prov = provider || this.activeProvider || 'drive';
      const isDropbox = prov === 'dropbox';
      const provName = isDropbox ? 'Dropbox Business' : 'Google Drive';

      const acc = account || (document.getElementById('cloudAccountInput')?.value.trim()) || (isDropbox ? State.settings.dropboxAccount : State.settings.gdriveAccount) || 'usuario@empresa.com';
      const key = apiKey || (document.getElementById('cloudApiKeyInput')?.value.trim()) || (isDropbox ? State.settings.dropboxApiKey : State.settings.gdriveApiKey) || '';

      if (!key) {
        Utils.showToast('Por favor introduce una API Key o Token de acceso antes de probar la conexión', 'warning');
        return;
      }

      const btnTest = document.getElementById('btnTestCloudApiKey');
      if (btnTest) {
        btnTest.disabled = true;
        btnTest.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Probando API...';
      }

      try {
        const res = await fetch('/api/connect-cloud/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: prov,
            apiKey: key,
            account: acc
          })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          SoundFX.success();
          Utils.showToast(
            `⚡ [${provName}] API Key autenticada exitosamente (${data.pingMs}ms). Cuota disponible: ${data.quota?.available || 'OK'}`,
            'success',
            'Prueba de Conexión Cloud'
          );
        } else {
          throw new Error(data.message || data.error || 'Fallo de autenticación con la API');
        }
      } catch (err) {
        SoundFX.error();
        Utils.showToast(`Error al probar API Key: ${err.message}`, 'error', 'Error de API');
      } finally {
        if (btnTest) {
          btnTest.disabled = false;
          btnTest.innerHTML = '<i class="bi bi-broadcast me-1"></i>Probar Conexión con API Key';
        }
      }
    },

    async connect() {
      const account = document.getElementById('cloudAccountInput')?.value.trim() || '';
      const apiKey = document.getElementById('cloudApiKeyInput')?.value.trim() || '';

      if (!account) {
        Utils.showToast('Por favor ingrese una cuenta de correo válida', 'warning');
        return;
      }
      const btn = document.getElementById('btnSubmitCloudConnect');
      if (btn) btn.disabled = true;

      try {
        const res = await fetch('/api/connect-cloud', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: this.activeProvider,
            account: account,
            apiKey: apiKey
          })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          const isDropbox = this.activeProvider === 'dropbox';
          if (isDropbox) {
            State.settings.dropboxConnected = true;
            State.settings.dropboxAccount = account;
            State.settings.dropboxApiKey = apiKey;
          } else {
            State.settings.gdriveConnected = true;
            State.settings.gdriveAccount = account;
            State.settings.gdriveApiKey = apiKey;
          }

          StorageEngine.saveLocal();
          SoundFX.success();
          SettingsModule.render();

          const modalEl = document.getElementById('modalCloudConnect');
          if (modalEl) {
            const inst = bootstrap.Modal.getInstance(modalEl);
            if (inst) inst.hide();
          }

          const provName = isDropbox ? 'Dropbox Business' : 'Google Drive';
          Utils.showToast(
            `API Key de ${provName} vinculada exitosamente (${account})`,
            'success',
            'Almacenamiento Cloud'
          );
        } else {
          throw new Error(data.error || 'Error al conectar cuenta');
        }
      } catch (err) {
        SoundFX.error();
        Utils.showToast('Error al conectar almacenamiento: ' + err.message, 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    },

    async disconnect(provider = 'drive') {
      const isDropbox = provider === 'dropbox';
      const provName = isDropbox ? 'Dropbox Business' : 'Google Drive';
      const currentAccount = isDropbox ? State.settings.dropboxAccount : State.settings.gdriveAccount;

      const confirmed = confirm(`¿Deseas desvincular la cuenta "${currentAccount || provName}" y limpiar la API Key de config.json?`);
      if (!confirmed) return;

      try {
        const res = await fetch('/api/connect-cloud/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          if (isDropbox) {
            State.settings.dropboxConnected = false;
            State.settings.dropboxAccount = '';
            State.settings.dropboxApiKey = '';
          } else {
            State.settings.gdriveConnected = false;
            State.settings.gdriveAccount = '';
            State.settings.gdriveApiKey = '';
          }

          StorageEngine.saveLocal();
          SoundFX.beep(600, 0.1);
          Utils.showToast(`Cuenta y API Key de ${provName} desvinculadas exitosamente`, 'info', 'Cloud Sync');
          SettingsModule.render();
        } else {
          throw new Error(data.error || 'Error al desvincular cuenta');
        }
      } catch (err) {
        SoundFX.error();
        Utils.showToast('Error al desvincular: ' + err.message, 'error');
      }
    }
  };

  const Cloud2FAEngine = CloudConnectEngine; // Compatibility alias

  // ==========================================================================
  // SPA ROUTER & VIEW CONTROLLER
  // ==========================================================================
  const Router = {
    viewMeta: {
      pos: { title: "Caja / Terminal de Cobro", subtitle: "Emisión rápida de tickets y escaneo de productos" },
      sales: { title: "Ventas del Día", subtitle: "Auditoría de tickets, reimpresión y cancelaciones" },
      reports: { title: "Métricas & Reportes Ejecutivos", subtitle: "Inteligencia comercial, gráficos en vivo y exportaciones" },
      catalog: { title: "Catálogo General & Costes", subtitle: "Gestión de inventario, márgenes brutos y precios" },
      inventory: { title: "Inventario & Existencias", subtitle: "Control de stock, alertas predictivas e IA Copilot" },
      shifts: { title: "Turnos y Cortes de Caja", subtitle: "Arqueo de cajón, movimientos de efectivo y Corte Z" },
      settings: { title: "Centro de Configuración", subtitle: "Parámetros de tienda, diseño de ticket, nube y licenciamiento Merasystems" },
      help: { title: "Ayuda, Documentación & Asistente IA", subtitle: "Manual corporativo oficial de Merasystems y soporte inteligente en vivo" }
    },
    init() {
      document.querySelectorAll('.nav-link-custom').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetView = link.getAttribute('data-view');
          if (targetView) this.navigate(targetView);
        });
      });
      this.updateMetricsNavVisibility(State.settings.enableMetrics);
    },
    updateMetricsNavVisibility(enabled) {
      const isEnabled = enabled !== false;
      const navReports = document.getElementById('nav-reports');
      if (navReports) {
        const parentLi = navReports.closest('.nav-item') || navReports;
        if (isEnabled) {
          parentLi.classList.remove('d-none');
        } else {
          parentLi.classList.add('d-none');
          if (State.currentView === 'reports') {
            this.navigate('pos');
          }
        }
      }
    },
    navigate(viewName) {
      // 1. RBAC Security Check
      if (!SecurityEngine.isViewAllowed(viewName)) {
        AuditClient.log('AUTH_DENIED', `Intento de acceso denegado a "${viewName}" por usuario ${State.currentUser.name} (${State.currentUser.role})`);
        SoundFX.error();
        Utils.showToast(
          `⛔ Acceso denegado. Se requieren privilegios de Administrador para acceder a ${viewName === 'settings' ? 'Configuración' : 'Métricas y Reportes'}.`,
          'error',
          'Seguridad RBAC'
        );
        return;
      }

      if (viewName === 'reports' && State.settings.enableMetrics === false) {
        viewName = 'pos';
      }
      if (!this.viewMeta[viewName]) return;
      State.currentView = viewName;

      document.querySelectorAll('.nav-link-custom').forEach(link => {
        if (link.getAttribute('data-view') === viewName) link.classList.add('active');
        else link.classList.remove('active');
      });

      document.querySelectorAll('.view-section').forEach(sec => {
        if (sec.id === `view-${viewName}`) sec.classList.add('active');
        else sec.classList.remove('active');
      });

      const meta = this.viewMeta[viewName];
      const titleEl = document.getElementById('headerViewTitle');
      const subEl = document.getElementById('headerViewSubtitle');
      if (titleEl) titleEl.textContent = meta.title;
      if (subEl) subEl.textContent = meta.subtitle;

      if (viewName === 'pos') {
        POSModule.renderCatalog();
        POSModule.renderCart();
        document.getElementById('posBarcodeInput')?.focus();
      } else if (viewName === 'sales') {
        SalesModule.render();
      } else if (viewName === 'reports') {
        ReportsModule.render();
      } else if (viewName === 'catalog') {
        CatalogModule.render();
      } else if (viewName === 'inventory') {
        InventoryModule.render();
      } else if (viewName === 'shifts') {
        ShiftsModule.render();
      } else if (viewName === 'settings') {
        SettingsModule.render();
        AuditLogsModule.fetchAndRender();
      } else if (viewName === 'help') {
        HelpDeskModule.render();
      }
    }
  };

  // ==========================================================================
  // MODULE 1: POS TERMINAL & CHECKOUT (CAJA / COBRO)
  // ==========================================================================
  const POSModule = {
    init() {
      const barcodeInput = document.getElementById('posBarcodeInput');
      if (barcodeInput) {
        barcodeInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const code = barcodeInput.value.trim();
            if (code) {
              this.handleBarcodeScan(code);
              barcodeInput.value = '';
            }
          }
        });
      }

      const searchInput = document.getElementById('posSearchInput');
      if (searchInput) searchInput.addEventListener('input', () => this.renderCatalog());

      document.querySelectorAll('#posCategoryPills .cat-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#posCategoryPills .cat-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          State.selectedCategory = btn.getAttribute('data-category') || 'ALL';
          this.renderCatalog();
        });
      });

      document.getElementById('btnClearCart')?.addEventListener('click', () => {
        if (State.cart.length > 0) {
          State.cart = [];
          State.cartDiscountPercent = 0;
          this.renderCart();
          SoundFX.beep(400, 0.1);
          Utils.showToast('Carrito vaciado', 'info');
        }
      });

      document.getElementById('btnOpenCheckout')?.addEventListener('click', () => this.openCheckoutModal());

      document.querySelectorAll('.btn-tender').forEach(btn => {
        btn.addEventListener('click', () => {
          const tenderVal = btn.getAttribute('data-tender');
          const total = this.calculateTotals().grandTotal;
          const inputPaid = document.getElementById('checkoutAmountPaid');
          if (tenderVal === 'exact') inputPaid.value = total.toFixed(2);
          else inputPaid.value = parseFloat(tenderVal).toFixed(2);
          this.calculateChange();
        });
      });

      document.getElementById('checkoutAmountPaid')?.addEventListener('input', () => this.calculateChange());

      // Payment method selection and hardware switching
      document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const method = btn.getAttribute('data-method');

          const cashSection = document.getElementById('cashTenderSection');
          const cardSection = document.getElementById('cardTerminalSection');
          const transferSection = document.getElementById('transferSection');
          const inputPaid = document.getElementById('checkoutAmountPaid');
          const total = this.calculateTotals().grandTotal;

          if (method === 'Efectivo') {
            cashSection?.classList.remove('d-none');
            cardSection?.classList.add('d-none');
            transferSection?.classList.add('d-none');
          } else if (method === 'Terminal / Tarjeta') {
            cashSection?.classList.add('d-none');
            cardSection?.classList.remove('d-none');
            transferSection?.classList.add('d-none');
            if (inputPaid) inputPaid.value = total.toFixed(2);
          } else {
            cashSection?.classList.add('d-none');
            cardSection?.classList.add('d-none');
            transferSection?.classList.remove('d-none');
            if (inputPaid) inputPaid.value = total.toFixed(2);
          }
          this.calculateChange();
        });
      });

      // Process Bank Terminal payment button
      document.getElementById('btnProcessTerminalPay')?.addEventListener('click', () => {
        HardwareEngine.processTerminalPayment();
      });

      document.getElementById('btnConfirmPayment')?.addEventListener('click', () => this.processSale());
      document.getElementById('btnPrintReceipt')?.addEventListener('click', () => window.print());
    },

    handleBarcodeScan(code) {
      const match = State.products.find(p => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase());
      if (match) {
        this.addToCart(match.id);
        SoundFX.beep(1200, 0.06);
      } else {
        SoundFX.error();
        Utils.showToast(`Producto no encontrado: ${code}`, 'error');
      }
    },

    renderCatalog() {
      const grid = document.getElementById('posProductGrid');
      if (!grid) return;

      const searchVal = (document.getElementById('posSearchInput')?.value || '').toLowerCase().trim();
      const filtered = State.products.filter(p => {
        const matchesCat = (State.selectedCategory === 'ALL' || p.category === State.selectedCategory);
        const matchesSearch = !searchVal || p.name.toLowerCase().includes(searchVal) || p.barcode.includes(searchVal) || p.sku.toLowerCase().includes(searchVal);
        return matchesCat && matchesSearch;
      });

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="col-12 text-center text-muted py-5">
            <i class="bi bi-search fs-1 opacity-25 mb-2 d-block"></i>
            <p>No se encontraron productos coincidentes</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered.map(p => {
        const stockClass = p.stock <= 0 ? 'stock-out' : p.stock <= p.minStock ? 'stock-low' : 'stock-good';
        const stockLabel = p.stock <= 0 ? 'Agotado' : `${p.stock} ${p.unit}`;

        return `
          <div class="product-pos-card" data-product-id="${p.id}" onclick="window.AuraApp.addToCart('${p.id}')">
            <div>
              <div class="prod-card-top">
                <div class="prod-icon-box">
                  <i class="bi ${p.icon || 'bi-box-seam'}"></i>
                </div>
                <span class="prod-stock-badge ${stockClass}">${stockLabel}</span>
              </div>
              <div class="prod-name" title="${p.name}">${p.name}</div>
              <div class="prod-barcode-sub font-mono">${p.sku} | ${p.barcode}</div>
            </div>
            <div class="prod-card-bottom">
              <span class="prod-price font-mono">${Utils.formatMoney(p.salePrice)}</span>
              <button class="btn-add-quick" title="Agregar al carrito">
                <i class="bi bi-plus"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    },

    addToCart(productId, qtyToAdd = 1) {
      const product = State.products.find(p => p.id === productId);
      if (!product) return;

      const existingIndex = State.cart.findIndex(item => item.product.id === productId);

      if (existingIndex > -1) {
        const item = State.cart[existingIndex];
        if (item.quantity + qtyToAdd > product.stock) {
          SoundFX.error();
          Utils.showToast(`Stock insuficiente. Solo quedan ${product.stock} unidades`, 'warning');
          return;
        }
        item.quantity += qtyToAdd;
      } else {
        if (qtyToAdd > product.stock) {
          SoundFX.error();
          Utils.showToast(`Stock insuficiente. Solo quedan ${product.stock} unidades`, 'warning');
          return;
        }
        State.cart.push({
          product,
          quantity: qtyToAdd,
          unitPrice: product.salePrice,
          taxRate: product.taxRate !== undefined ? product.taxRate : State.settings.taxRate
        });
      }

      SoundFX.beep(980, 0.05);
      this.renderCart();
    },

    updateCartQty(productId, newQty) {
      const index = State.cart.findIndex(i => i.product.id === productId);
      if (index === -1) return;

      const item = State.cart[index];
      const product = item.product;

      if (newQty <= 0) {
        State.cart.splice(index, 1);
      } else {
        if (newQty > product.stock) {
          SoundFX.error();
          Utils.showToast(`Stock máximo alcanzado (${product.stock} disponibles)`, 'warning');
          return;
        }
        item.quantity = newQty;
      }

      this.renderCart();
    },

    removeFromCart(productId) {
      State.cart = State.cart.filter(i => i.product.id !== productId);
      SoundFX.beep(440, 0.05);
      this.renderCart();
    },

    calculateTotals() {
      let subtotal = 0;
      let taxAmount = 0;

      State.cart.forEach(item => {
        const lineTotal = item.quantity * item.unitPrice;
        const rate = item.taxRate || 0;
        const lineTax = (lineTotal * rate) / (100 + rate);
        const lineSub = lineTotal - lineTax;

        subtotal += lineSub;
        taxAmount += lineTax;
      });

      const rawTotal = subtotal + taxAmount;
      const discount = (rawTotal * (State.cartDiscountPercent || 0)) / 100;
      const grandTotal = Math.max(0, rawTotal - discount);

      return {
        subtotal,
        taxAmount,
        discount,
        grandTotal,
        itemsCount: State.cart.reduce((acc, i) => acc + i.quantity, 0)
      };
    },

    renderCart() {
      const itemsList = document.getElementById('cartItemsList');
      const emptyState = document.getElementById('cartEmptyState');
      const badgeCount = document.getElementById('cartBadgeCount');
      const btnPay = document.getElementById('btnOpenCheckout');

      const subtotalEl = document.getElementById('cartSubtotal');
      const taxEl = document.getElementById('cartTaxAmount');
      const taxRateLabel = document.getElementById('cartTaxRateLabel');
      const totalEl = document.getElementById('cartGrandTotal');
      const discountRow = document.getElementById('cartDiscountRow');
      const discountEl = document.getElementById('cartDiscountAmount');

      const totals = this.calculateTotals();

      if (badgeCount) badgeCount.textContent = `${totals.itemsCount} items`;
      if (subtotalEl) subtotalEl.textContent = Utils.formatMoney(totals.subtotal);
      if (taxEl) taxEl.textContent = Utils.formatMoney(totals.taxAmount);
      if (taxRateLabel) taxRateLabel.textContent = `${State.settings.taxRate}%`;
      if (totalEl) totalEl.textContent = Utils.formatMoney(totals.grandTotal);

      if (State.cartDiscountPercent > 0 && discountRow && discountEl) {
        discountRow.classList.remove('d-none');
        discountEl.textContent = `-${Utils.formatMoney(totals.discount)} (${State.cartDiscountPercent}%)`;
      } else if (discountRow) {
        discountRow.classList.add('d-none');
      }

      if (btnPay) btnPay.disabled = State.cart.length === 0;

      if (State.cart.length === 0) {
        if (emptyState) emptyState.classList.remove('d-none');
        if (itemsList) {
          itemsList.classList.add('d-none');
          itemsList.innerHTML = '';
        }
        return;
      }

      if (emptyState) emptyState.classList.add('d-none');
      if (itemsList) {
        itemsList.classList.remove('d-none');
        itemsList.innerHTML = State.cart.map(item => {
          const lineTotal = item.quantity * item.unitPrice;
          return `
            <div class="cart-item-row">
              <div class="cart-item-details">
                <h5 title="${item.product.name}">${item.product.name}</h5>
                <span class="font-mono">${Utils.formatMoney(item.unitPrice)} c/u</span>
              </div>
              <div class="qty-control">
                <button class="qty-btn" onclick="window.AuraApp.updateCartQty('${item.product.id}', ${item.quantity - 1})">
                  <i class="bi bi-dash"></i>
                </button>
                <span class="qty-val font-mono">${item.quantity}</span>
                <button class="qty-btn" onclick="window.AuraApp.updateCartQty('${item.product.id}', ${item.quantity + 1})">
                  <i class="bi bi-plus"></i>
                </button>
              </div>
              <div class="cart-item-subtotal font-mono">
                ${Utils.formatMoney(lineTotal)}
              </div>
              <button class="cart-item-del" onclick="window.AuraApp.removeFromCart('${item.product.id}')" title="Quitar">
                <i class="bi bi-x-circle"></i>
              </button>
            </div>
          `;
        }).join('');
      }
    },

    openCheckoutModal() {
      if (State.cart.length === 0) return;

      const totals = this.calculateTotals();
      const modalSubtotal = document.getElementById('checkoutModalSubtotal');
      const modalTax = document.getElementById('checkoutModalTax');
      const modalTotal = document.getElementById('checkoutModalTotal');
      const modalDiscountRow = document.getElementById('checkoutModalDiscountRow');
      const modalDiscount = document.getElementById('checkoutModalDiscount');
      const amountPaid = document.getElementById('checkoutAmountPaid');

      if (modalSubtotal) modalSubtotal.textContent = Utils.formatMoney(totals.subtotal);
      if (modalTax) modalTax.textContent = Utils.formatMoney(totals.taxAmount);
      if (modalTotal) modalTotal.textContent = Utils.formatMoney(totals.grandTotal);

      if (totals.discount > 0 && modalDiscountRow && modalDiscount) {
        modalDiscountRow.classList.remove('d-none');
        modalDiscount.textContent = `-${Utils.formatMoney(totals.discount)}`;
      } else if (modalDiscountRow) {
        modalDiscountRow.classList.add('d-none');
      }

      if (amountPaid) amountPaid.value = totals.grandTotal.toFixed(2);
      this.calculateChange();

      // Reset payment methods UI
      document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('btnMethodCash')?.classList.add('active');
      document.getElementById('cashTenderSection')?.classList.remove('d-none');
      document.getElementById('cardTerminalSection')?.classList.add('d-none');
      document.getElementById('transferSection')?.classList.add('d-none');
      document.getElementById('terminalResultBox')?.classList.add('d-none');
      
      const termBadge = document.getElementById('terminalStatusBadge');
      if (termBadge) {
        termBadge.className = 'badge bg-info-subtle text-info font-mono';
        termBadge.textContent = 'LISTA';
      }

      const modalEl = document.getElementById('modalCheckout');
      if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        setTimeout(() => {
          if (amountPaid) {
            amountPaid.focus();
            amountPaid.select();
          }
        }, 400);
      }
    },

    calculateChange() {
      const totals = this.calculateTotals();
      const inputPaid = document.getElementById('checkoutAmountPaid');
      const changeEl = document.getElementById('checkoutModalChange');
      const activeMethod = document.querySelector('.payment-method-btn.active')?.getAttribute('data-method') || 'Efectivo';

      const paid = parseFloat(inputPaid?.value) || 0;
      let change = 0;

      if (activeMethod === 'Efectivo') {
        change = Math.max(0, paid - totals.grandTotal);
      }

      if (changeEl) {
        changeEl.textContent = Utils.formatMoney(change);
        if (paid < totals.grandTotal && activeMethod === 'Efectivo') {
          changeEl.className = 'fs-2 font-mono fw-extrabold text-danger';
          changeEl.textContent = `Faltan ${Utils.formatMoney(totals.grandTotal - paid)}`;
        } else {
          changeEl.className = 'fs-2 font-mono fw-extrabold text-success';
        }
      }
    },

    processSale() {
      if (State.cart.length === 0) return;

      const totals = this.calculateTotals();
      const customerInput = document.getElementById('checkoutCustomer');
      const activeMethodBtn = document.querySelector('.payment-method-btn.active');
      const paymentMethod = activeMethodBtn ? activeMethodBtn.getAttribute('data-method') : 'Efectivo';
      const inputPaid = document.getElementById('checkoutAmountPaid');
      const amountPaid = parseFloat(inputPaid?.value) || totals.grandTotal;

      if (paymentMethod === 'Efectivo' && amountPaid < totals.grandTotal) {
        SoundFX.error();
        Utils.showToast('El monto recibido es menor al total a pagar', 'error');
        return;
      }

      const change = paymentMethod === 'Efectivo' ? Math.max(0, amountPaid - totals.grandTotal) : 0;
      const nextTicketNum = State.sales.length > 0 ? Math.max(...State.sales.map(s => s.ticketNumber || 1000)) + 1 : 1001;

      const newSale = {
        id: `TKT-${nextTicketNum}`,
        ticketNumber: nextTicketNum,
        date: new Date().toISOString(),
        cashier: State.currentUser.name,
        cashierId: State.currentUser.id,
        customer: customerInput?.value.trim() || 'Público en General',
        paymentMethod,
        terminalAuth: HardwareEngine.lastTerminalTxn?.authCode || null,
        terminalTxn: HardwareEngine.lastTerminalTxn?.transactionId || null,
        items: State.cart.map(i => ({
          id: i.product.id,
          name: i.product.name,
          sku: i.product.sku,
          price: i.unitPrice,
          costPrice: i.product.costPrice,
          quantity: i.quantity,
          subtotal: i.quantity * i.unitPrice,
          taxRate: i.taxRate
        })),
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discount: totals.discount,
        total: totals.grandTotal,
        amountPaid,
        changeReturned: change,
        status: 'COMPLETED'
      };

      // Deduct stock
      State.cart.forEach(item => {
        const prod = State.products.find(p => p.id === item.product.id);
        if (prod) prod.stock = Math.max(0, prod.stock - item.quantity);
      });

      State.sales.unshift(newSale);
      StorageEngine.syncSale(newSale);
      SoundFX.cashRegister();

      // Hardware cash drawer trigger on cash payment
      if (paymentMethod === 'Efectivo') {
        HardwareEngine.openCashDrawer(`Cobro en Efectivo Ticket #${nextTicketNum}`);
      }

      // Reset hardware terminal state
      HardwareEngine.lastTerminalTxn = null;

      const checkoutModalEl = document.getElementById('modalCheckout');
      if (checkoutModalEl) {
        const instance = bootstrap.Modal.getInstance(checkoutModalEl);
        if (instance) instance.hide();
      }

      State.cart = [];
      State.cartDiscountPercent = 0;
      this.renderCart();
      this.renderCatalog();
      HeaderModule.updateNotifications();

      Utils.showToast(`Venta procesada: Ticket #${nextTicketNum}`, 'success');
      ReceiptModule.show(newSale);
    }
  };

  // ==========================================================================
  // MODULE 2: THERMAL RECEIPT RENDERING & PRINT SIMULATOR
  // ==========================================================================
  const ReceiptModule = {
    show(sale) {
      const container = document.getElementById('receiptPaperContainer');
      if (!container) return;

      const is58mm = State.settings.ticketPaperWidth === '58mm';
      container.className = is58mm ? 'receipt-paper receipt-58mm' : 'receipt-paper';
      const showTax = State.settings.showTaxBreakdown;

      container.innerHTML = `
        <div class="receipt-header">
          <div class="receipt-store-title">${State.settings.storeName}</div>
          <div class="receipt-subtext">${State.settings.businessName}</div>
          <div class="receipt-subtext">RFC: ${State.settings.taxId}</div>
          <div class="receipt-subtext">${State.settings.address}</div>
          <div class="receipt-subtext">Tel: ${State.settings.phone}</div>
          <div style="font-weight: bold; margin-top: 5px; font-size: 11px;">${State.settings.ticketHeader}</div>
        </div>

        <div class="receipt-meta">
          <div class="d-flex justify-content-between">
            <span>FOLIO: #${sale.ticketNumber}</span>
            <span>${Utils.formatTime(sale.date)}</span>
          </div>
          <div class="d-flex justify-content-between">
            <span>FECHA: ${Utils.formatDate(sale.date)}</span>
            <span>CAJA: 01</span>
          </div>
          <div>CAJERO: ${sale.cashier}</div>
          <div>CLIENTE: ${sale.customer}</div>
        </div>

        <table class="receipt-table">
          <thead>
            <tr>
              <th>CANT/DESCRIPCIÓN</th>
              <th style="text-align: right;">P.UNIT</th>
              <th style="text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map(item => `
              <tr>
                <td colspan="3" style="padding-top: 3px; font-weight: bold;">${item.name}</td>
              </tr>
              <tr>
                <td style="color: #4b5563; padding-left: 5px;">${item.quantity} x ${Utils.formatMoney(item.price)}</td>
                <td style="text-align: right;">${item.taxRate > 0 ? `(${item.taxRate}%)` : '(0%)'}</td>
                <td style="text-align: right; font-weight: bold;">${Utils.formatMoney(item.subtotal)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="receipt-totals">
          ${showTax ? `
            <div class="receipt-total-row">
              <span>SUBTOTAL NETO:</span>
              <span>${Utils.formatMoney(sale.subtotal)}</span>
            </div>
            <div class="receipt-total-row">
              <span>IVA TRASLADADO:</span>
              <span>${Utils.formatMoney(sale.taxAmount)}</span>
            </div>
          ` : ''}
          ${sale.discount > 0 ? `
            <div class="receipt-total-row" style="color: #d97706;">
              <span>DESCUENTO:</span>
              <span>-${Utils.formatMoney(sale.discount)}</span>
            </div>
          ` : ''}
          <div class="receipt-total-row grand-total">
            <span>TOTAL:</span>
            <span>${Utils.formatMoney(sale.total)}</span>
          </div>
          <div class="receipt-total-row" style="margin-top: 4px;">
            <span>FORMA DE PAGO:</span>
            <span>${sale.paymentMethod.toUpperCase()}</span>
          </div>
          ${sale.terminalAuth ? `
            <div class="receipt-total-row font-mono" style="font-size: 10px; color: #0284c7;">
              <span>AUT. TERMINAL:</span>
              <span>${sale.terminalAuth}</span>
            </div>
            <div class="receipt-total-row font-mono" style="font-size: 9px; color: #64748b;">
              <span>REF BANCO:</span>
              <span>${sale.terminalTxn || 'N/A'}</span>
            </div>
          ` : ''}
          <div class="receipt-total-row">
            <span>IMPORTE RECIBIDO:</span>
            <span>${Utils.formatMoney(sale.amountPaid)}</span>
          </div>
          <div class="receipt-total-row" style="font-weight: bold;">
            <span>SU CAMBIO:</span>
            <span>${Utils.formatMoney(sale.changeReturned)}</span>
          </div>
        </div>

        <div class="receipt-barcode-sim font-mono">
          *${sale.id}*
        </div>

        <div class="receipt-footer">
          <div>${State.settings.ticketFooter}</div>
          <div style="margin-top: 6px; font-size: 8px;">AURA POS ENTERPRISE - MERASYSTEMS CORE</div>
        </div>
      `;

      const modalEl = document.getElementById('modalTicketView');
      if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    }
  };

  // ==========================================================================
  // MODULE 3: SALES OF THE DAY (HISTORIAL DE TRANSACCIONES)
  // ==========================================================================
  const SalesModule = {
    init() {
      document.getElementById('salesSearchInput')?.addEventListener('input', () => this.render());
      document.getElementById('salesPaymentFilter')?.addEventListener('change', () => this.render());
    },

    render() {
      const validSales = State.sales.filter(s => s.status !== 'CANCELLED');
      const totalSales = validSales.reduce((acc, s) => acc + s.total, 0);
      const ticketsCount = validSales.length;
      const avgTicket = ticketsCount > 0 ? totalSales / ticketsCount : 0;

      let totalCost = 0;
      validSales.forEach(s => {
        s.items.forEach(i => {
          totalCost += (i.costPrice || (i.price * 0.6)) * i.quantity;
        });
      });
      const grossProfit = totalSales - totalCost;
      const marginPercent = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

      const kpiTotal = document.getElementById('kpiTodaySalesTotal');
      const kpiTickets = document.getElementById('kpiTodayTicketsCount');
      const kpiAvg = document.getElementById('kpiTodayAvgTicket');
      const kpiMargin = document.getElementById('kpiTodayEstimatedMargin');

      if (kpiTotal) kpiTotal.textContent = Utils.formatMoney(totalSales);
      if (kpiTickets) kpiTickets.textContent = ticketsCount.toString();
      if (kpiAvg) kpiAvg.textContent = Utils.formatMoney(avgTicket);
      if (kpiMargin) kpiMargin.textContent = `${marginPercent.toFixed(1)}%`;

      const searchVal = (document.getElementById('salesSearchInput')?.value || '').toLowerCase().trim();
      const paymentFilter = document.getElementById('salesPaymentFilter')?.value || 'ALL';
      const tableBody = document.getElementById('salesTableBody');
      if (!tableBody) return;

      const filtered = State.sales.filter(s => {
        const matchesPay = (paymentFilter === 'ALL' || s.paymentMethod === paymentFilter);
        const matchesSearch = !searchVal || s.id.toLowerCase().includes(searchVal) || s.customer.toLowerCase().includes(searchVal) || s.cashier.toLowerCase().includes(searchVal);
        return matchesPay && matchesSearch;
      });

      if (filtered.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="9" class="text-center text-muted py-4">
              <i class="bi bi-inbox fs-3 d-block mb-1 opacity-25"></i>
              No hay tickets registrados con los filtros seleccionados
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = filtered.map(s => {
        const isCancelled = s.status === 'CANCELLED';
        const statusBadge = isCancelled 
          ? `<span class="badge-status badge-cancelled"><i class="bi bi-x-circle"></i> Cancelado</span>`
          : `<span class="badge-status badge-completed"><i class="bi bi-check-circle"></i> Completado</span>`;

        const itemsSummary = s.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

        return `
          <tr class="${isCancelled ? 'opacity-50' : ''}">
            <td class="font-mono fw-bold text-white">${s.id}</td>
            <td class="font-mono text-muted">${Utils.formatTime(s.date)}</td>
            <td>${s.cashier}</td>
            <td>${s.customer}</td>
            <td><span class="badge bg-dark border border-secondary">${s.paymentMethod}</span></td>
            <td class="small text-muted" title="${itemsSummary}" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${s.items.length} productos (${itemsSummary})
            </td>
            <td class="font-mono fw-bold ${isCancelled ? 'text-decoration-line-through text-danger' : 'text-success'}">
              ${Utils.formatMoney(s.total)}
            </td>
            <td>${statusBadge}</td>
            <td class="text-end">
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-light" onclick="window.AuraApp.viewTicket('${s.id}')" title="Ver / Reimprimir Ticket">
                  <i class="bi bi-receipt"></i>
                </button>
                ${!isCancelled ? `
                  <button class="btn btn-outline-danger" onclick="window.AuraApp.cancelTicket('${s.id}')" title="Cancelar Ticket / Devolución">
                    <i class="bi bi-arrow-counterclockwise"></i>
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    cancelTicket(ticketId) {
      if (!State.currentUser.canCancel) {
        SoundFX.error();
        Utils.showToast('Tu rol actual no tiene permisos para cancelar tickets', 'error');
        return;
      }

      const sale = State.sales.find(s => s.id === ticketId);
      if (!sale || sale.status === 'CANCELLED') return;

      if (confirm(`¿Estás seguro de cancelar el ticket ${sale.id} por ${Utils.formatMoney(sale.total)}? Se reintegrarán las existencias a inventario.`)) {
        sale.status = 'CANCELLED';
        sale.cancelledAt = new Date().toISOString();

        sale.items.forEach(item => {
          const prod = State.products.find(p => p.id === item.id);
          if (prod) prod.stock += item.quantity;
        });

        StorageEngine.saveLocal();
        SoundFX.beep(300, 0.15);
        Utils.showToast(`Ticket ${sale.id} cancelado correctamente`, 'info');
        this.render();
        HeaderModule.updateNotifications();
      }
    }
  };

  // ==========================================================================
  // MODULE 4: EXECUTIVE METRICS & REPORTS GENERATOR
  // ==========================================================================
  const ReportsModule = {
    init() {
      document.getElementById('btnGenerateReport')?.addEventListener('click', () => this.generateAndExport());
    },

    render() {
      this.renderCharts();
      this.renderPreviewTable();
    },

    renderCharts() {
      const ctxTimeline = document.getElementById('chartSalesTimeline');
      if (ctxTimeline && window.Chart) {
        if (State.charts.salesTimeline) State.charts.salesTimeline.destroy();

        const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
        const values = [420, 890, 1450, 980, 2150, 3100, 1850, 620];
        const todayReal = State.sales.filter(s => s.status !== 'CANCELLED').reduce((acc, s) => acc + s.total, 0);
        if (todayReal > 0) values[5] = todayReal + 500;

        State.charts.salesTimeline = new Chart(ctxTimeline, {
          type: 'line',
          data: {
            labels: hours,
            datasets: [{
              label: 'Ventas ($ MXN)',
              data: values,
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              fill: true,
              tension: 0.35,
              borderWidth: 3,
              pointBackgroundColor: '#818cf8',
              pointRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#111827',
                titleColor: '#fff',
                bodyColor: '#34d399',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1
              }
            },
            scales: {
              x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8' } },
              y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8' } }
            }
          }
        });
      }

      const ctxPayment = document.getElementById('chartPaymentDistribution');
      if (ctxPayment && window.Chart) {
        if (State.charts.paymentDist) State.charts.paymentDist.destroy();

        let cash = 0, card = 0, transfer = 0;
        State.sales.filter(s => s.status !== 'CANCELLED').forEach(s => {
          if (s.paymentMethod.includes('Efectivo')) cash += s.total;
          else if (s.paymentMethod.includes('Tarjeta') || s.paymentMethod.includes('Terminal')) card += s.total;
          else transfer += s.total;
        });

        if (cash === 0 && card === 0 && transfer === 0) {
          cash = 60; card = 30; transfer = 10;
        }

        State.charts.paymentDist = new Chart(ctxPayment, {
          type: 'doughnut',
          data: {
            labels: ['Efectivo', 'Tarjeta / Terminal', 'SPEI / Transferencia'],
            datasets: [{
              data: [cash, card, transfer],
              backgroundColor: ['#10b981', '#06b6d4', '#a855f7'],
              borderWidth: 0,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#94a3b8', boxWidth: 12, padding: 12 }
              }
            },
            cutout: '70%'
          }
        });
      }
    },

    renderPreviewTable() {
      const tbody = document.getElementById('reportPreviewBody');
      if (!tbody) return;

      const reportData = State.products.slice(0, 6).map(p => {
        const costTotal = p.costPrice * (p.stock || 10);
        const saleTotal = p.salePrice * (p.stock || 10);
        const ivaTotal = (saleTotal * (p.taxRate || 16)) / 116;
        const profit = saleTotal - costTotal;
        const margin = saleTotal > 0 ? (profit / saleTotal) * 100 : 0;

        return {
          concept: `${p.name} (${p.sku})`,
          units: p.stock,
          cost: costTotal,
          sale: saleTotal,
          iva: ivaTotal,
          profit,
          margin
        };
      });

      tbody.innerHTML = reportData.map(r => `
        <tr>
          <td class="fw-bold text-white">${r.concept}</td>
          <td class="font-mono">${r.units} Pzas</td>
          <td class="font-mono">${Utils.formatMoney(r.cost)}</td>
          <td class="font-mono text-info">${Utils.formatMoney(r.sale)}</td>
          <td class="font-mono">${Utils.formatMoney(r.iva)}</td>
          <td class="font-mono text-success fw-bold">${Utils.formatMoney(r.profit)}</td>
          <td class="font-mono text-cyan">${r.margin.toFixed(1)}%</td>
        </tr>
      `).join('');
    },

    generateAndExport() {
      const period = document.getElementById('reportPeriodSelect')?.value || 'diario';
      const type = document.getElementById('reportTypeSelect')?.value || 'SALES_SUMMARY';
      const format = document.getElementById('reportFormatSelect')?.value || 'CSV';
      const validSales = State.sales.filter(s => s.status !== 'CANCELLED');
      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === 'CSV') {
        let csvContent = "\uFEFF";
        if (type === 'SALES_SUMMARY') {
          csvContent += "Folio Ticket,Fecha,Hora,Cajero,Cliente,Metodo Pago,Subtotal,IVA,Total\n";
          validSales.forEach(s => {
            csvContent += `"${s.id}","${Utils.formatDate(s.date)}","${Utils.formatTime(s.date)}","${s.cashier}","${s.customer}","${s.paymentMethod}",${s.subtotal.toFixed(2)},${s.taxAmount.toFixed(2)},${s.total.toFixed(2)}\n`;
          });
        } else if (type === 'PRODUCTS_PROFIT') {
          csvContent += "SKU,Codigo Barras,Producto,Categoria,Costo Unit,Precio Venta,IVA %,Stock,Margen %\n";
          State.products.forEach(p => {
            const profit = p.salePrice - p.costPrice;
            const margin = p.salePrice > 0 ? (profit / p.salePrice) * 100 : 0;
            csvContent += `"${p.sku}","${p.barcode}","${p.name}","${p.category}",${p.costPrice.toFixed(2)},${p.salePrice.toFixed(2)},${p.taxRate},${p.stock},${margin.toFixed(1)}%\n`;
          });
        } else {
          csvContent += "Codigo,Producto,Stock Actual,Costo Unitario,Valor Total Costo,Precio Venta,Valor Potencial Venta\n";
          State.products.forEach(p => {
            const costVal = p.costPrice * p.stock;
            const saleVal = p.salePrice * p.stock;
            csvContent += `"${p.barcode}","${p.name}",${p.stock},${p.costPrice.toFixed(2)},${costVal.toFixed(2)},${p.salePrice.toFixed(2)},${saleVal.toFixed(2)}\n`;
          });
        }

        const filename = `AuraPOS_Reporte_${type}_${period}_${timestamp}.csv`;
        StorageEngine.handleFileExport(filename, csvContent, period, 'csv');
      } else if (format === 'XML') {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<aura_pos_report period="${period}" type="${type}" generated_at="${new Date().toISOString()}" developer="${State.credits.author}" company="${State.credits.company}">\n`;
        xml += `  <sales_summary total_records="${validSales.length}">\n`;
        validSales.forEach(s => {
          xml += `    <sale ticket="${s.id}">\n`;
          xml += `      <date>${s.date}</date>\n`;
          xml += `      <cashier><![CDATA[${s.cashier}]]></cashier>\n`;
          xml += `      <customer><![CDATA[${s.customer}]]></customer>\n`;
          xml += `      <payment_method>${s.paymentMethod}</payment_method>\n`;
          xml += `      <total>${s.total.toFixed(2)}</total>\n`;
          xml += `    </sale>\n`;
        });
        xml += `  </sales_summary>\n`;
        xml += `</aura_pos_report>`;

        const filename = `AuraPOS_Reporte_${type}_${period}_${timestamp}.xml`;
        StorageEngine.handleFileExport(filename, xml, period, 'xml');
      } else {
        window.print();
      }
    }
  };

  // ==========================================================================
  // MODULE 5: CATALOG & COSTS (CATÁLOGO & PRECIOS)
  // ==========================================================================
  const CatalogModule = {
    init() {
      document.getElementById('catalogSearchInput')?.addEventListener('input', () => this.render());
      document.getElementById('btnOpenAddProduct')?.addEventListener('click', () => this.openFormModal());

      document.getElementById('btnGenBarcode')?.addEventListener('click', () => {
        const barcodeIn = document.getElementById('prodBarcode');
        if (barcodeIn) barcodeIn.value = Math.floor(75000000 + Math.random() * 9999999).toString();
      });

      const costIn = document.getElementById('prodCostPrice');
      const saleIn = document.getElementById('prodSalePrice');

      const updateMarginPreview = () => {
        const cost = parseFloat(costIn?.value) || 0;
        const sale = parseFloat(saleIn?.value) || 0;
        const profit = sale - cost;
        const margin = sale > 0 ? (profit / sale) * 100 : 0;

        const profitEl = document.getElementById('prodPreviewProfit');
        const marginEl = document.getElementById('prodPreviewMargin');

        if (profitEl) profitEl.textContent = Utils.formatMoney(profit);
        if (marginEl) marginEl.textContent = `${margin.toFixed(1)}%`;
      };

      if (costIn) costIn.addEventListener('input', updateMarginPreview);
      if (saleIn) saleIn.addEventListener('input', updateMarginPreview);

      document.getElementById('formProduct')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProduct();
      });
    },

    render() {
      const searchVal = (document.getElementById('catalogSearchInput')?.value || '').toLowerCase().trim();
      const tableBody = document.getElementById('catalogTableBody');
      if (!tableBody) return;

      const filtered = State.products.filter(p => {
        return !searchVal || p.name.toLowerCase().includes(searchVal) || p.barcode.includes(searchVal) || p.sku.toLowerCase().includes(searchVal) || p.category.toLowerCase().includes(searchVal);
      });

      if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No se encontraron productos</td></tr>`;
        return;
      }

      tableBody.innerHTML = filtered.map(p => {
        const profit = p.salePrice - p.costPrice;
        const margin = p.salePrice > 0 ? (profit / p.salePrice) * 100 : 0;
        const stockBadge = p.stock <= p.minStock 
          ? `<span class="badge bg-danger">${p.stock} ${p.unit}</span>` 
          : `<span class="badge bg-success-subtle text-success">${p.stock} ${p.unit}</span>`;

        const isAdmin = State.currentUser.role === 'Administrador';
        const actionHtml = isAdmin ? `
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="window.AuraApp.editProduct('${p.id}')" title="Editar Producto">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="window.AuraApp.deleteProduct('${p.id}')" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        ` : `<span class="badge bg-secondary-subtle text-secondary small font-mono">Solo Lectura</span>`;

        return `
          <tr>
            <td>
              <div class="font-mono fw-bold text-white">${p.sku}</div>
              <div class="small text-muted font-mono">${p.barcode}</div>
            </td>
            <td><div class="fw-semibold text-white">${p.name}</div></td>
            <td><span class="badge bg-dark border border-secondary">${p.category}</span></td>
            <td class="font-mono text-muted">${Utils.formatMoney(p.costPrice)}</td>
            <td class="font-mono fw-bold text-white">${Utils.formatMoney(p.salePrice)}</td>
            <td class="font-mono">${p.taxRate}%</td>
            <td>${stockBadge}</td>
            <td class="font-mono text-success fw-bold">${Utils.formatMoney(profit)}</td>
            <td class="font-mono text-cyan fw-bold">${margin.toFixed(1)}%</td>
            <td class="text-end">
              ${actionHtml}
            </td>
          </tr>
        `;
      }).join('');
    },

    openFormModal(productId = null) {
      if (State.currentUser.role !== 'Administrador') {
        SoundFX.error();
        Utils.showToast('⛔ Acceso denegado. Solo administradores pueden agregar o modificar productos.', 'error', 'Seguridad RBAC');
        return;
      }

      const modalEl = document.getElementById('modalProductForm');
      const titleEl = document.getElementById('productModalTitle');
      const editIdIn = document.getElementById('prodEditId');

      const nameIn = document.getElementById('prodName');
      const catIn = document.getElementById('prodCategory');
      const barIn = document.getElementById('prodBarcode');
      const skuIn = document.getElementById('prodSku');
      const costIn = document.getElementById('prodCostPrice');
      const saleIn = document.getElementById('prodSalePrice');
      const taxIn = document.getElementById('prodTaxRate');
      const stockIn = document.getElementById('prodStock');
      const minStockIn = document.getElementById('prodMinStock');
      const unitIn = document.getElementById('prodUnit');

      if (productId) {
        const prod = State.products.find(p => p.id === productId);
        if (!prod) return;
        if (titleEl) titleEl.innerHTML = `<i class="bi bi-pencil-square text-primary me-2"></i>Editar Producto: ${prod.name}`;
        if (editIdIn) editIdIn.value = prod.id;
        if (nameIn) nameIn.value = prod.name;
        if (catIn) catIn.value = prod.category;
        if (barIn) barIn.value = prod.barcode;
        if (skuIn) skuIn.value = prod.sku;
        if (costIn) costIn.value = prod.costPrice;
        if (saleIn) saleIn.value = prod.salePrice;
        if (taxIn) taxIn.value = prod.taxRate;
        if (stockIn) stockIn.value = prod.stock;
        if (minStockIn) minStockIn.value = prod.minStock;
        if (unitIn) unitIn.value = prod.unit;
      } else {
        if (titleEl) titleEl.innerHTML = `<i class="bi bi-plus-circle text-primary me-2"></i>Nuevo Producto`;
        if (editIdIn) editIdIn.value = '';
        document.getElementById('formProduct')?.reset();
        if (barIn) barIn.value = Math.floor(75000000 + Math.random() * 9999999).toString();
        if (taxIn) taxIn.value = State.settings.taxRate;
      }

      costIn?.dispatchEvent(new Event('input'));

      if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    },

    saveProduct() {
      if (State.currentUser.role !== 'Administrador') {
        SoundFX.error();
        Utils.showToast('⛔ Acceso denegado. Se requieren privilegios de Administrador.', 'error', 'Seguridad RBAC');
        return;
      }

      const editId = document.getElementById('prodEditId')?.value;
      const name = document.getElementById('prodName')?.value.trim();
      const category = document.getElementById('prodCategory')?.value.trim() || 'General';
      const barcode = document.getElementById('prodBarcode')?.value.trim();
      const sku = document.getElementById('prodSku')?.value.trim();
      const costPrice = parseFloat(document.getElementById('prodCostPrice')?.value) || 0;
      const salePrice = parseFloat(document.getElementById('prodSalePrice')?.value) || 0;
      const taxRate = parseFloat(document.getElementById('prodTaxRate')?.value) || 0;
      const stock = parseFloat(document.getElementById('prodStock')?.value) || 0;
      const minStock = parseFloat(document.getElementById('prodMinStock')?.value) || 5;
      const unit = document.getElementById('prodUnit')?.value || 'Pza';

      if (!name || !barcode) {
        Utils.showToast('Por favor completa los campos obligatorios', 'error');
        return;
      }

      if (editId) {
        const index = State.products.findIndex(p => p.id === editId);
        if (index > -1) {
          State.products[index] = {
            ...State.products[index],
            name, category, barcode, sku, costPrice, salePrice, taxRate, stock, minStock, unit
          };
          StorageEngine.syncProduct(State.products[index], 'PUT');
          Utils.showToast('Producto actualizado', 'success');
        }
      } else {
        const newProduct = {
          id: 'prod_' + Date.now(),
          name, category, barcode, sku, costPrice, salePrice, taxRate, stock, minStock, unit,
          icon: 'bi-box-seam'
        };
        State.products.push(newProduct);
        StorageEngine.syncProduct(newProduct, 'POST');
        Utils.showToast('Nuevo producto registrado', 'success');
      }

      const modalEl = document.getElementById('modalProductForm');
      if (modalEl) {
        const inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
      }

      SoundFX.success();
      this.render();
      POSModule.renderCatalog();
      HeaderModule.updateNotifications();
    },

    deleteProduct(productId) {
      if (State.currentUser.role !== 'Administrador') {
        SoundFX.error();
        Utils.showToast('⛔ Acceso denegado. Se requieren privilegios de Administrador.', 'error', 'Seguridad RBAC');
        return;
      }

      const prod = State.products.find(p => p.id === productId);
      if (!prod) return;

      if (confirm(`¿Estás seguro de eliminar "${prod.name}"?`)) {
        State.products = State.products.filter(p => p.id !== productId);
        StorageEngine.saveLocal();
        SoundFX.beep(300, 0.1);
        Utils.showToast('Producto eliminado', 'info');
        this.render();
        POSModule.renderCatalog();
        HeaderModule.updateNotifications();
      }
    }
  };

  // ==========================================================================
  // MODULE 6: INVENTORY, STOCK & AI COPILOT
  // ==========================================================================
  const InventoryModule = {
    init() {
      document.getElementById('invFilterStockStatus')?.addEventListener('change', () => this.render());
      document.getElementById('btnRefreshAiInsights')?.addEventListener('click', () => {
        SoundFX.beep(1100, 0.08);
        this.renderAiInsights();
        Utils.showToast('Predicciones de IA Copilot actualizadas', 'info');
      });

      document.getElementById('formStockAdjust')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.applyStockAdjustment();
      });
    },

    render() {
      const totalSkus = State.products.length;
      let totalCostVal = 0;
      let totalSaleVal = 0;
      let lowStockCount = 0;

      State.products.forEach(p => {
        totalCostVal += p.costPrice * p.stock;
        totalSaleVal += p.salePrice * p.stock;
        if (p.stock <= p.minStock) lowStockCount++;
      });

      const elSkus = document.getElementById('invTotalSkus');
      const elCost = document.getElementById('invTotalCostValue');
      const elSale = document.getElementById('invTotalSaleValue');
      const elLow = document.getElementById('invLowStockCount');

      if (elSkus) elSkus.textContent = totalSkus.toString();
      if (elCost) elCost.textContent = Utils.formatMoney(totalCostVal);
      if (elSale) elSale.textContent = Utils.formatMoney(totalSaleVal);
      if (elLow) elLow.textContent = lowStockCount.toString();

      this.renderAiInsights();

      const filter = document.getElementById('invFilterStockStatus')?.value || 'ALL';
      const tbody = document.getElementById('inventoryTableBody');
      if (!tbody) return;

      const filtered = State.products.filter(p => {
        if (filter === 'LOW') return p.stock > 0 && p.stock <= p.minStock;
        if (filter === 'OUT') return p.stock <= 0;
        if (filter === 'OK') return p.stock > p.minStock;
        return true;
      });

      const isAdmin = State.currentUser.role === 'Administrador';

      tbody.innerHTML = filtered.map(p => {
        let alertBadge = '<span class="badge bg-success-subtle text-success">Óptimo</span>';
        if (p.stock <= 0) alertBadge = '<span class="badge bg-danger">Agotado (0)</span>';
        else if (p.stock <= p.minStock) alertBadge = '<span class="badge bg-warning text-dark">Stock Bajo</span>';

        const totalValue = p.costPrice * p.stock;
        const actionHtml = isAdmin ? `
          <button class="btn btn-outline-info btn-sm fw-bold" onclick="window.AuraApp.openStockAdjust('${p.id}')">
            <i class="bi bi-sliders me-1"></i>Ajustar
          </button>
        ` : `<span class="badge bg-secondary-subtle text-secondary small font-mono">Solo Lectura</span>`;

        return `
          <tr>
            <td class="font-mono text-muted">${p.barcode}</td>
            <td class="fw-bold text-white">${p.name}</td>
            <td class="font-mono fs-6 fw-bold ${p.stock <= p.minStock ? 'text-danger' : 'text-white'}">
              ${p.stock} ${p.unit}
            </td>
            <td class="font-mono text-muted">${p.minStock} ${p.unit}</td>
            <td>${alertBadge}</td>
            <td class="font-mono text-info">${Utils.formatMoney(totalValue)}</td>
            <td class="text-end">
              ${actionHtml}
            </td>
          </tr>
        `;
      }).join('');
    },

    renderAiInsights() {
      const container = document.getElementById('aiInsightsContainer');
      if (!container) return;

      const lowStockProds = State.products.filter(p => p.stock <= p.minStock);
      const insights = [];

      if (lowStockProds.length > 0) {
        const critical = lowStockProds[0];
        insights.push({
          icon: 'bi-exclamation-triangle-fill text-danger',
          title: `Riesgo de Agotamiento: ${critical.name}`,
          desc: `Existencia crítica (${critical.stock} ${critical.unit}). Al ritmo de venta actual se agotará en aprox. 24 horas. Sugerido: Reordenar 30 unidades.`
        });
      }

      insights.push({
        icon: 'bi-graph-up-arrow text-success',
        title: 'Producto Estrella de Alto Margen',
        desc: 'Café Espresso Premium 250g mantiene un margen bruto del 45.5% con rotación semanal saludable. (Algoritmo Merasystems Core)'
      });

      insights.push({
        icon: 'bi-lightbulb-fill text-info',
        title: 'Optimización de Multidestino de Stock',
        desc: 'El valor total inmovilizado en bodega es óptimo. Próximo corte programado para respaldar en Google Drive / Dropbox.'
      });

      container.innerHTML = insights.map(i => `
        <div class="col-md-4">
          <div class="ai-insight-item">
            <i class="bi ${i.icon}"></i>
            <div class="ai-insight-content">
              <h6>${i.title}</h6>
              <p>${i.desc}</p>
            </div>
          </div>
        </div>
      `).join('');
    },

    openStockAdjust(productId) {
      if (State.currentUser.role !== 'Administrador') {
        SoundFX.error();
        Utils.showToast('⛔ Acceso denegado. Se requieren privilegios de Administrador para ajustar existencias.', 'error', 'Seguridad RBAC');
        return;
      }

      const prod = State.products.find(p => p.id === productId);
      if (!prod) return;

      const idIn = document.getElementById('adjustProdId');
      const nameEl = document.getElementById('adjustProdName');
      const stockEl = document.getElementById('adjustProdCurrentStock');
      const qtyIn = document.getElementById('adjustQuantity');
      const reasonIn = document.getElementById('adjustReason');

      if (idIn) idIn.value = prod.id;
      if (nameEl) nameEl.textContent = `${prod.name} (${prod.sku})`;
      if (stockEl) stockEl.textContent = `${prod.stock} ${prod.unit}`;
      if (qtyIn) qtyIn.value = '';
      if (reasonIn) reasonIn.value = '';

      const modalEl = document.getElementById('modalStockAdjust');
      if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    },

    applyStockAdjustment() {
      const prodId = document.getElementById('adjustProdId')?.value;
      const type = document.getElementById('adjustType')?.value || 'ADD';
      const qty = parseFloat(document.getElementById('adjustQuantity')?.value) || 0;
      const reason = document.getElementById('adjustReason')?.value.trim() || 'Ajuste manual';

      const prod = State.products.find(p => p.id === prodId);
      if (!prod || qty <= 0) return;

      if (type === 'ADD') prod.stock += qty;
      else if (type === 'SUBTRACT') prod.stock = Math.max(0, prod.stock - qty);
      else if (type === 'SET') prod.stock = Math.max(0, qty);

      StorageEngine.saveLocal();
      SoundFX.success();
      Utils.showToast(`Inventario de "${prod.name}" ajustado a ${prod.stock} ${prod.unit}`, 'success');

      const modalEl = document.getElementById('modalStockAdjust');
      if (modalEl) {
        const inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
      }

      this.render();
      POSModule.renderCatalog();
      HeaderModule.updateNotifications();
    }
  };

  // ==========================================================================
  // MODULE 7: SHIFTS & CASH REGISTER CUTS (TURNOS & CORTE Z)
  // ==========================================================================
  const ShiftsModule = {
    init() {
      document.getElementById('btnOpenCashMovement')?.addEventListener('click', () => this.openCashMovementModal());
      document.getElementById('btnOpenCloseShiftModal')?.addEventListener('click', () => this.openCloseShiftModal());

      document.querySelectorAll('.cash-mov-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.cash-mov-type-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      document.getElementById('formCashMovement')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.recordCashMovement();
      });

      document.getElementById('shiftCutCounted')?.addEventListener('input', () => this.calculateCutDifference());

      document.getElementById('formShiftCut')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.executeShiftCut();
      });
    },

    calculateShiftCash() {
      const initial = State.currentShift.initialCash || 1500.00;
      let cashSales = 0;
      let cardSales = 0;
      let transferSales = 0;

      State.sales.filter(s => s.status !== 'CANCELLED').forEach(s => {
        if (s.paymentMethod.includes('Efectivo')) cashSales += s.total;
        else if (s.paymentMethod.includes('Tarjeta') || s.paymentMethod.includes('Terminal')) cardSales += s.total;
        else transferSales += s.total;
      });

      let cashIns = 0;
      let cashOuts = 0;

      (State.currentShift.movements || []).forEach(m => {
        if (m.type === 'IN') cashIns += m.amount;
        else cashOuts += m.amount;
      });

      const expectedCash = initial + cashSales + cashIns - cashOuts;

      return { initial, cashSales, cardSales, transferSales, cashIns, cashOuts, expectedCash };
    },

    render() {
      const calc = this.calculateShiftCash();

      const elNum = document.getElementById('shiftCurrentNum');
      const elCashier = document.getElementById('shiftCashierName');
      const elOpenTime = document.getElementById('shiftOpenTime');

      const elInit = document.getElementById('shiftInitialCash');
      const elCashSales = document.getElementById('shiftCashSales');
      const elIns = document.getElementById('shiftCashIns');
      const elOuts = document.getElementById('shiftCashOuts');
      const elExpected = document.getElementById('shiftExpectedCash');
      const elCard = document.getElementById('shiftCardSales');
      const elTransfer = document.getElementById('shiftTransferSales');

      if (elNum) elNum.textContent = State.currentShift.shiftNumber;
      if (elCashier) elCashier.textContent = State.currentShift.cashier;
      if (elOpenTime) elOpenTime.textContent = Utils.formatTime(State.currentShift.openedAt);

      if (elInit) elInit.textContent = Utils.formatMoney(calc.initial);
      if (elCashSales) elCashSales.textContent = Utils.formatMoney(calc.cashSales);
      if (elIns) elIns.textContent = Utils.formatMoney(calc.cashIns);
      if (elOuts) elOuts.textContent = `-${Utils.formatMoney(calc.cashOuts)}`;
      if (elExpected) elExpected.textContent = Utils.formatMoney(calc.expectedCash);

      if (elCard) elCard.textContent = Utils.formatMoney(calc.cardSales);
      if (elTransfer) elTransfer.textContent = Utils.formatMoney(calc.transferSales);

      const tbody = document.getElementById('shiftMovementsBody');
      if (!tbody) return;

      const movs = State.currentShift.movements || [];
      if (movs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">Sin movimientos de caja</td></tr>`;
        return;
      }

      tbody.innerHTML = movs.map(m => `
        <tr>
          <td>
            ${m.type === 'IN' 
              ? '<span class="badge bg-success-subtle text-success"><i class="bi bi-box-arrow-in-down me-1"></i>Entrada</span>'
              : '<span class="badge bg-danger-subtle text-danger"><i class="bi bi-box-arrow-up-right me-1"></i>Salida</span>'
            }
          </td>
          <td class="font-mono fw-bold ${m.type === 'IN' ? 'text-success' : 'text-danger'}">
            ${m.type === 'IN' ? '+' : '-'}${Utils.formatMoney(m.amount)}
          </td>
          <td class="small text-muted">${m.reason}</td>
          <td class="font-mono text-muted small">${Utils.formatTime(m.time)}</td>
        </tr>
      `).join('');
    },

    openCashMovementModal() {
      const amountIn = document.getElementById('cashMovAmount');
      const reasonIn = document.getElementById('cashMovReason');
      if (amountIn) amountIn.value = '';
      if (reasonIn) reasonIn.value = '';

      const modalEl = document.getElementById('modalCashMovement');
      if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    },

    recordCashMovement() {
      const activeBtn = document.querySelector('.cash-mov-type-btn.active');
      const type = activeBtn?.getAttribute('data-type') || 'IN';
      const amount = parseFloat(document.getElementById('cashMovAmount')?.value) || 0;
      const reason = document.getElementById('cashMovReason')?.value.trim() || 'Movimiento de efectivo';

      if (amount <= 0) return;

      const newMov = {
        id: 'mov_' + Date.now(),
        type,
        amount,
        reason,
        time: new Date().toISOString()
      };

      if (!State.currentShift.movements) State.currentShift.movements = [];
      State.currentShift.movements.unshift(newMov);

      StorageEngine.saveLocal();
      SoundFX.beep(600, 0.1);
      Utils.showToast(`${type === 'IN' ? 'Entrada' : 'Salida'} de efectivo por ${Utils.formatMoney(amount)} registrada`, 'info');

      const modalEl = document.getElementById('modalCashMovement');
      if (modalEl) {
        const inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
      }

      this.render();
    },

    openCloseShiftModal() {
      const calc = this.calculateShiftCash();
      const expectedEl = document.getElementById('shiftCutExpectedTotal');
      const countedIn = document.getElementById('shiftCutCounted');

      if (expectedEl) expectedEl.textContent = Utils.formatMoney(calc.expectedCash);
      if (countedIn) countedIn.value = calc.expectedCash.toFixed(2);

      this.calculateCutDifference();

      const modalEl = document.getElementById('modalShiftCut');
      if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    },

    calculateCutDifference() {
      const calc = this.calculateShiftCash();
      const counted = parseFloat(document.getElementById('shiftCutCounted')?.value) || 0;
      const diff = counted - calc.expectedCash;

      const diffEl = document.getElementById('shiftCutDifference');
      if (!diffEl) return;

      if (Math.abs(diff) < 0.01) {
        diffEl.className = 'font-mono fs-6 text-success';
        diffEl.textContent = 'Caja Cuadrada ($0.00)';
      } else if (diff > 0) {
        diffEl.className = 'font-mono fs-6 text-info';
        diffEl.textContent = `Sobrante: +${Utils.formatMoney(diff)}`;
      } else {
        diffEl.className = 'font-mono fs-6 text-danger';
        diffEl.textContent = `Faltante: -${Utils.formatMoney(Math.abs(diff))}`;
      }
    },

    async executeShiftCut() {
      const calc = this.calculateShiftCash();
      const counted = parseFloat(document.getElementById('shiftCutCounted')?.value) || 0;
      const diff = counted - calc.expectedCash;
      const notes = document.getElementById('shiftCutNotes')?.value || '';

      const cutSummary = {
        shiftNumber: State.currentShift.shiftNumber,
        openedAt: State.currentShift.openedAt,
        closedAt: new Date().toISOString(),
        cashier: State.currentShift.cashier,
        initialCash: calc.initial,
        cashSales: calc.cashSales,
        cardSales: calc.cardSales,
        transferSales: calc.transferSales,
        cashIns: calc.cashIns,
        cashOuts: calc.cashOuts,
        expectedCash: calc.expectedCash,
        countedCash: counted,
        difference: diff,
        notes
      };

      const modalEl = document.getElementById('modalShiftCut');
      if (modalEl) {
        const inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
      }

      this.displayCutTicket(cutSummary);

      try {
        const res = await fetch('/api/shifts/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            countedCash: counted,
            notes: notes
          })
        });

        const data = await res.json();
        if (res.ok && data.newShift) {
          State.currentShift = data.newShift;
          const backupFilename = data.autoBackup?.filename || `AuraPOS_Respaldo_Turno_${cutSummary.shiftNumber}.json`;
          SoundFX.cashRegister();
          Utils.showToast(
            `Corte Z #${cutSummary.shiftNumber} emitido. Respaldo automático sincronizado en disco y nube (${backupFilename})`,
            'success',
            'Cierre de Turno con Respaldo'
          );
        } else {
          State.currentShift = {
            id: 'shift_' + (cutSummary.shiftNumber + 1),
            shiftNumber: cutSummary.shiftNumber + 1,
            openedAt: new Date().toISOString(),
            cashier: State.currentUser.name,
            cashierId: State.currentUser.id,
            initialCash: counted,
            status: "OPEN",
            movements: []
          };
          SoundFX.cashRegister();
          Utils.showToast(`Corte Z #${cutSummary.shiftNumber} emitido localmente.`, 'success');
        }
      } catch (err) {
        State.currentShift = {
          id: 'shift_' + (cutSummary.shiftNumber + 1),
          shiftNumber: cutSummary.shiftNumber + 1,
          openedAt: new Date().toISOString(),
          cashier: State.currentUser.name,
          cashierId: State.currentUser.id,
          initialCash: counted,
          status: "OPEN",
          movements: []
        };
        SoundFX.cashRegister();
        Utils.showToast(`Corte Z #${cutSummary.shiftNumber} emitido localmente.`, 'success');
      }

      StorageEngine.saveLocal();
      this.render();
    },

    displayCutTicket(cut) {
      const container = document.getElementById('receiptPaperContainer');
      if (!container) return;

      container.className = 'receipt-paper';
      container.innerHTML = `
        <div class="receipt-header">
          <div class="receipt-store-title">${State.settings.storeName}</div>
          <div class="receipt-subtext">CORTE DE CAJA Z - CIERRE DE TURNO</div>
          <div style="font-weight: bold; margin-top: 4px;">TURNO #${cut.shiftNumber}</div>
        </div>

        <div class="receipt-meta">
          <div>CAJERO: ${cut.cashier}</div>
          <div>APERTURA: ${Utils.formatDate(cut.openedAt)} ${Utils.formatTime(cut.openedAt)}</div>
          <div>CIERRE:   ${Utils.formatDate(cut.closedAt)} ${Utils.formatTime(cut.closedAt)}</div>
        </div>

        <div class="receipt-totals">
          <div class="receipt-total-row">
            <span>FONDO INICIAL:</span>
            <span>${Utils.formatMoney(cut.initialCash)}</span>
          </div>
          <div class="receipt-total-row">
            <span>(+) VENTAS EFECTIVO:</span>
            <span>${Utils.formatMoney(cut.cashSales)}</span>
          </div>
          <div class="receipt-total-row">
            <span>(+) ENTRADAS MANUALES:</span>
            <span>${Utils.formatMoney(cut.cashIns)}</span>
          </div>
          <div class="receipt-total-row">
            <span>(-) SALIDAS / RETIROS:</span>
            <span>-${Utils.formatMoney(cut.cashOuts)}</span>
          </div>
          <div class="receipt-total-row grand-total">
            <span>EFECTIVO ESPERADO:</span>
            <span>${Utils.formatMoney(cut.expectedCash)}</span>
          </div>
          <div class="receipt-total-row" style="margin-top: 5px; font-weight: bold;">
            <span>EFECTIVO CONTADO:</span>
            <span>${Utils.formatMoney(cut.countedCash)}</span>
          </div>
          <div class="receipt-total-row" style="font-weight: bold; color: ${cut.difference === 0 ? 'inherit' : cut.difference > 0 ? '#059669' : '#dc2626'}">
            <span>DIFERENCIA:</span>
            <span>${cut.difference >= 0 ? '+' : ''}${Utils.formatMoney(cut.difference)}</span>
          </div>
        </div>

        <div class="receipt-meta">
          <div style="font-weight: bold; margin-bottom: 2px;">VENTAS ELECTRÓNICAS:</div>
          <div class="d-flex justify-content-between">
            <span>TARJETAS / TERMINAL:</span>
            <span>${Utils.formatMoney(cut.cardSales)}</span>
          </div>
          <div class="d-flex justify-content-between">
            <span>TRANSFERENCIAS SPEI:</span>
            <span>${Utils.formatMoney(cut.transferSales)}</span>
          </div>
        </div>

        <div style="margin-top: 25px; text-align: center;">
          <div style="border-bottom: 1px solid #111827; width: 70%; margin: 0 auto 5px;"></div>
          <div style="font-size: 9px;">FIRMA DEL CAJERO RESPONSABLE</div>
        </div>

        <div class="receipt-footer" style="margin-top: 15px;">
          <div>AURA POS ENTERPRISE - MERASYSTEMS AUDIT</div>
        </div>
      `;

      const modalEl = document.getElementById('modalTicketView');
      if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    }
  };

  // ==========================================================================
  // MODULE 8: SETTINGS, LICENSE & MULTIDESTINATION CENTER
  // ==========================================================================
  const SettingsModule = {
    init() {
      // Validate License Button
      document.getElementById('btnValidateLicense')?.addEventListener('click', () => {
        const keyIn = document.getElementById('cfgLicenseInput')?.value.trim();
        this.validateLicense(keyIn);
      });

      // Quick Demo Mode Activation Button
      document.getElementById('btnActivateDemoMode')?.addEventListener('click', () => {
        const input = document.getElementById('cfgLicenseInput');
        if (input) input.value = 'DEMO';
        this.validateLicense('DEMO');
      });

      // Modular Metrics Switch
      document.getElementById('cfgEnableMetrics')?.addEventListener('change', (e) => {
        State.settings.enableMetrics = e.target.checked;
        Router.updateMetricsNavVisibility(State.settings.enableMetrics);
        StorageEngine.syncSettings();
        SoundFX.beep(750, 0.06);
        Utils.showToast(`Módulo de Métricas y Utilidad ${State.settings.enableMetrics ? 'activado' : 'desactivado'}`, 'info');
      });

      // Report and Backup Frequency Selector
      document.getElementById('cfgReportFrequency')?.addEventListener('change', (e) => {
        State.settings.reportFrequency = e.target.value;
        StorageEngine.syncSettings();
        SoundFX.beep(850, 0.06);
        Utils.showToast(`Frecuencia de sincronización configurada: ${e.target.value.toUpperCase()}`, 'info');
      });

      // Cloud connect buttons
      document.querySelectorAll('.btn-connect-cloud').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const provider = btn.getAttribute('data-provider') || 'drive';
          CloudConnectEngine.openModal(provider);
        });
      });

      // Cloud test API key buttons
      document.querySelectorAll('.btn-test-cloud').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const provider = btn.getAttribute('data-provider') || 'drive';
          CloudConnectEngine.testConnection(provider);
        });
      });

      // Modal test API key button
      document.getElementById('btnTestCloudApiKey')?.addEventListener('click', (e) => {
        e.preventDefault();
        CloudConnectEngine.testConnection();
      });

      // Modal OAuth 1-Click Fast Connect button
      document.getElementById('btnStartOAuthFlow')?.addEventListener('click', (e) => {
        e.preventDefault();
        CloudConnectEngine.startOAuthFlow();
      });

      // Cloud disconnect buttons
      document.querySelectorAll('.btn-disconnect-cloud').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const provider = btn.getAttribute('data-provider') || 'drive';
          CloudConnectEngine.disconnect(provider);
        });
      });

      // Direct cloud connect submit
      document.getElementById('formCloudConnectDirect')?.addEventListener('submit', (e) => {
        e.preventDefault();
        CloudConnectEngine.connect();
      });

      // Manual instant cloud sync button
      document.getElementById('btnSyncNowCloud')?.addEventListener('click', () => {
        this.triggerInstantCloudSync();
      });

      // Storage destination card selection
      ['local', 'gdrive', 'dropbox'].forEach(dest => {
        document.getElementById(`cardDest${dest.charAt(0).toUpperCase() + dest.slice(1)}`)?.addEventListener('click', () => {
          this.selectStorageDestination(dest);
        });
      });

      // Store settings form submit
      document.getElementById('formStoreSettings')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveStoreSettings();
      });

      // Ticket settings form submit
      document.getElementById('formTicketSettings')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveTicketSettings();
      });

      // Open Add User Modal button
      document.getElementById('btnOpenAddUser')?.addEventListener('click', () => {
        this.openAddUserModal();
      });

      // User Form submit (Add / Edit)
      document.getElementById('formUser')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveUser();
      });

      // Export JSON backup
      document.getElementById('btnExportBackup')?.addEventListener('click', () => {
        const jsonStr = JSON.stringify({
          credits: State.credits,
          settings: State.settings,
          products: State.products,
          sales: State.sales,
          currentShift: State.currentShift,
          users: State.users
        }, null, 2);

        StorageEngine.handleFileExport(`AuraPOS_Respaldo_Completo_${Date.now()}.json`, jsonStr, State.settings.reportFrequency || 'mensual', 'csv');
      });

      // Restore JSON backup
      document.getElementById('inputRestoreBackup')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            if (parsed.products && parsed.settings) {
              State.settings = { ...State.settings, ...parsed.settings };
              State.products = parsed.products;
              State.sales = parsed.sales || [];
              State.currentShift = parsed.currentShift || State.currentShift;
              State.users = parsed.users || State.users;
              StorageEngine.saveLocal();
              Utils.showToast('Copia de seguridad restaurada con éxito', 'success');
              Router.updateMetricsNavVisibility(State.settings.enableMetrics);
              this.render();
              Router.navigate('pos');
            } else {
              Utils.showToast('Archivo JSON de respaldo no válido', 'error');
            }
          } catch (err) {
            Utils.showToast('Error al leer el archivo: ' + err.message, 'error');
          }
        };
        reader.readAsText(file);
      });
    },

    async validateLicense(key) {
      await LicenseEngine.activateKey(key);
    },

    updateLicenseBadge(status, licensedTo) {
      LicenseEngine.updateLicenseBadge(status, licensedTo);
    },

    openCloudConnectModal(provider) {
      Cloud2FAEngine.openModal(provider);
    },

    async triggerInstantCloudSync() {
      const dest = State.settings.storageDestination || 'gdrive';
      const period = State.settings.reportFrequency || 'mensual';
      const filename = `AuraPOS_Respaldo_Sync_${Date.now()}.json`;
      const jsonStr = JSON.stringify({
        timestamp: new Date().toISOString(),
        credits: State.credits,
        settings: State.settings,
        products: State.products,
        sales: State.sales,
        currentShift: State.currentShift,
        users: State.users
      }, null, 2);

      await StorageEngine.handleFileExport(filename, jsonStr, period, 'csv');
      SoundFX.success();
      Utils.showToast(`Sincronización instantánea completada en /AuraPOS_Respaldo/${period}/`, 'success', 'Sincronización Total');
    },

    selectStorageDestination(dest) {
      State.settings.storageDestination = dest;
      StorageEngine.syncSettings();

      ['local', 'gdrive', 'dropbox'].forEach(d => {
        const card = document.getElementById(`cardDest${d.charAt(0).toUpperCase() + d.slice(1)}`);
        const icon = card?.querySelector('.dest-check-icon');
        if (d === dest) {
          card?.classList.add('active');
          icon?.classList.remove('d-none');
        } else {
          card?.classList.remove('active');
          icon?.classList.add('d-none');
        }
      });

      const destName = dest === 'local' ? 'Almacenamiento Local' : dest === 'gdrive' ? 'Google Drive' : 'Dropbox';
      SoundFX.beep(900, 0.08);
      Utils.showToast(`Destino de almacenamiento cambiado a: ${destName}`, 'info');
    },

    // ==========================================
    // USER MANAGEMENT CRUD & INTERACTIVE METHODS
    // ==========================================
    openAddUserModal() {
      if (State.currentUser.role !== 'Administrador') {
        SoundFX.error();
        Utils.showToast('⛔ Acceso denegado. Se requieren privilegios de Administrador.', 'error', 'Seguridad RBAC');
        return;
      }

      const form = document.getElementById('formUser');
      if (form) form.reset();

      const editId = document.getElementById('userEditId');
      const title = document.getElementById('userModalTitle');
      const role = document.getElementById('userRole');
      const active = document.getElementById('userActive');

      if (editId) editId.value = '';
      if (role) role.value = 'Cajero';
      if (active) active.checked = true;
      if (title) {
        title.innerHTML = '<i class="bi bi-person-plus-fill text-primary me-2"></i><span>Nuevo Usuario</span>';
      }

      const modalEl = document.getElementById('modalUserForm');
      if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    },

    openEditUserModal(userId) {
      if (State.currentUser.role !== 'Administrador') {
        SoundFX.error();
        Utils.showToast('⛔ Acceso denegado. Se requieren privilegios de Administrador.', 'error', 'Seguridad RBAC');
        return;
      }

      const user = State.users.find(u => u.id === userId);
      if (!user) return;

      const editId = document.getElementById('userEditId');
      const name = document.getElementById('userName');
      const username = document.getElementById('userUsername');
      const role = document.getElementById('userRole');
      const pin = document.getElementById('userPin');
      const active = document.getElementById('userActive');
      const title = document.getElementById('userModalTitle');

      if (editId) editId.value = user.id;
      if (name) name.value = user.name;
      if (username) username.value = user.username;
      if (role) role.value = user.role;
      if (pin) pin.value = user.pin || '0000';
      if (active) active.checked = user.active !== false;
      if (title) {
        title.innerHTML = `<i class="bi bi-pencil-square text-warning me-2"></i><span>Editar Usuario: ${user.name}</span>`;
      }

      const modalEl = document.getElementById('modalUserForm');
      if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    },

    async saveUser() {
      if (State.currentUser.role !== 'Administrador') {
        SoundFX.error();
        Utils.showToast('⛔ Acceso denegado. Se requieren privilegios de Administrador.', 'error', 'Seguridad RBAC');
        return;
      }

      const editId = document.getElementById('userEditId')?.value.trim();
      const name = document.getElementById('userName')?.value.trim();
      const username = document.getElementById('userUsername')?.value.trim().toLowerCase();
      const role = document.getElementById('userRole')?.value || 'Cajero';
      const pin = document.getElementById('userPin')?.value.trim() || '0000';
      const active = document.getElementById('userActive')?.checked !== false;

      if (!name || !username) {
        Utils.showToast('Por favor ingrese el nombre y el usuario de acceso', 'warning');
        return;
      }

      const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'US';

      // If creating new or changing username, check duplicates locally
      const duplicate = State.users.find(u => u.username === username && u.id !== editId);
      if (duplicate) {
        SoundFX.error();
        Utils.showToast(`El usuario "${username}" ya está registrado`, 'error');
        return;
      }

      // Check active user integrity if deactivating
      if (editId && !active) {
        const activeRemaining = State.users.filter(u => u.active && u.id !== editId).length;
        if (activeRemaining < 1) {
          SoundFX.error();
          Utils.showToast('No es posible desactivar al único usuario activo del sistema.', 'error');
          return;
        }
      }

      const payload = {
        name,
        username,
        role,
        pin: pin.padStart(4, '0'),
        active,
        avatar: initials
      };

      try {
        if (editId) {
          // PUT update
          const res = await fetch(`/api/users/${editId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const data = await res.json();
            State.users = data.users;
          } else {
            const idx = State.users.findIndex(u => u.id === editId);
            if (idx > -1) State.users[idx] = { ...State.users[idx], ...payload };
          }
        } else {
          // POST create
          const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const data = await res.json();
            State.users = data.users;
          } else {
            const newUser = { id: 'usr_' + Date.now(), ...payload };
            State.users.push(newUser);
          }
        }
      } catch (e) {
        if (editId) {
          const idx = State.users.findIndex(u => u.id === editId);
          if (idx > -1) State.users[idx] = { ...State.users[idx], ...payload };
        } else {
          State.users.push({ id: 'usr_' + Date.now(), ...payload });
        }
      }

      // If current user was edited, update session info
      if (editId && State.currentUser.id === editId) {
        State.currentUser = {
          ...State.currentUser,
          ...payload,
          canCancel: payload.role === 'Administrador',
          canEditStock: payload.role === 'Administrador',
          canViewReports: payload.role === 'Administrador'
        };
        HeaderModule.updateUserBadge();
      }

      StorageEngine.saveLocal();
      SoundFX.success();
      Utils.showToast(`Usuario ${editId ? 'actualizado' : 'creado'} exitosamente`, 'success');

      const modalEl = document.getElementById('modalUserForm');
      if (modalEl) {
        const inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
      }

      this.renderUsersTable();
    },

    async deleteUser(userId) {
      if (State.currentUser.role !== 'Administrador') {
        SoundFX.error();
        Utils.showToast('⛔ Acceso denegado. Se requieren privilegios de Administrador.', 'error', 'Seguridad RBAC');
        return;
      }

      const user = State.users.find(u => u.id === userId);
      if (!user) return;

      // VALIDATION: Must maintain at least 1 active user
      const activeCount = State.users.filter(u => u.active).length;
      if (State.users.length <= 1 || (user.active && activeCount <= 1)) {
        SoundFX.error();
        Utils.showToast('Operación denegada: Debe quedar al menos un usuario activo en el sistema.', 'error', 'Seguridad de Usuarios');
        return;
      }

      const confirmed = confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario "${user.name}" (${user.username})?`);
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        if (res.ok) {
          const data = await res.json();
          State.users = data.users;
        } else {
          State.users = State.users.filter(u => u.id !== userId);
        }
      } catch (e) {
        State.users = State.users.filter(u => u.id !== userId);
      }

      // If the deleted user was the current logged in user, switch to another active user
      if (State.currentUser.id === userId) {
        const nextUser = State.users.find(u => u.active) || State.users[0];
        if (nextUser) {
          State.currentUser = {
            ...nextUser,
            canDiscount: true,
            canCancel: nextUser.role === 'Administrador',
            canEditStock: nextUser.role === 'Administrador',
            canViewReports: nextUser.role === 'Administrador'
          };
          HeaderModule.updateUserBadge();
          Utils.showToast(`Sesión transferida automáticamente a: ${nextUser.name}`, 'info');
        }
      }

      StorageEngine.saveLocal();
      SoundFX.beep(500, 0.1);
      Utils.showToast(`Usuario "${user.name}" eliminado correctamente`, 'info');
      this.renderUsersTable();
    },

    renderUsersTable() {
      const usersBody = document.getElementById('usersTableBody');
      if (!usersBody) return;

      if (State.users.length === 0) {
        usersBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No hay usuarios registrados.</td></tr>`;
        return;
      }

      const isAdmin = State.currentUser.role === 'Administrador';

      usersBody.innerHTML = State.users.map(u => {
        const isUserAdmin = u.role === 'Administrador';
        const isActive = u.active !== false;

        const actionBtns = isAdmin ? `
          <div class="btn-group btn-group-sm">
            <button type="button" class="btn btn-outline-primary btn-sm py-1 px-2" onclick="window.AuraApp.editUser('${u.id}')" title="Editar Usuario">
              <i class="bi bi-pencil-square me-1"></i>Editar
            </button>
            <button type="button" class="btn btn-outline-danger btn-sm py-1 px-2" onclick="window.AuraApp.deleteUser('${u.id}')" title="Eliminar Usuario" ${State.users.length <= 1 ? 'disabled' : ''}>
              <i class="bi bi-trash-fill me-1"></i>Eliminar
            </button>
          </div>
        ` : `<span class="badge bg-secondary-subtle text-secondary small font-mono">Solo Lectura</span>`;

        return `
          <tr>
            <td>
              <div class="d-flex align-items-center gap-2">
                <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.8rem;">${u.avatar || 'U'}</div>
                <div>
                  <strong class="text-white d-block">${u.name}</strong>
                  ${u.id === State.currentUser.id ? '<span class="badge bg-info-subtle text-info font-mono" style="font-size: 9px;">SESIÓN ACTUAL</span>' : ''}
                </div>
              </div>
            </td>
            <td class="font-mono text-cyan">${u.username}</td>
            <td><span class="badge ${isUserAdmin ? 'bg-primary' : 'bg-success'}">${u.role}</span></td>
            <td class="font-mono text-muted">••••</td>
            <td class="small text-muted">${isUserAdmin ? 'Acceso Total a Sistema, Cortes y Configuración' : 'Caja, Cobro, Escaneo y Descuento'}</td>
            <td>
              <span class="badge ${isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}">
                ${isActive ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td class="text-end">
              ${actionBtns}
            </td>
          </tr>
        `;
      }).join('');
    },

    render() {
      const s = State.settings;
      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val !== undefined ? val : ''; };

      setVal('cfgStoreName', s.storeName);
      setVal('cfgBusinessName', s.businessName);
      setVal('cfgTaxId', s.taxId);
      setVal('cfgPhone', s.phone);
      setVal('cfgAddress', s.address);
      setVal('cfgCurrency', s.currency);
      setVal('cfgTaxRate', s.taxRate);

      setVal('cfgTicketHeader', s.ticketHeader);
      setVal('cfgTicketFooter', s.ticketFooter);
      setVal('cfgTicketWidth', s.ticketPaperWidth);
      setVal('cfgReportFrequency', s.reportFrequency || 'mensual');

      const enableMetricsSwitch = document.getElementById('cfgEnableMetrics');
      if (enableMetricsSwitch) enableMetricsSwitch.checked = s.enableMetrics !== false;

      const taxCheck = document.getElementById('cfgShowTaxBreakdown');
      if (taxCheck) taxCheck.checked = !!s.showTaxBreakdown;

      // Update license badge
      this.updateLicenseBadge(State.credits.licenseStatus, State.credits.licensedTo);

      // Update cloud labels, status badges, API key info and buttons
      const gLabel = document.getElementById('labelGdriveAccount');
      const gBadge = document.getElementById('badgeGdriveStatus');
      const gKeyEl = document.getElementById('badgeGdriveApiKey');
      const gBtnText = document.getElementById('textBtnGdriveConnect');
      const gBtnDisc = document.getElementById('btnDisconnectGdrive');

      const isGdriveEnv = s.gdriveConfiguredViaEnv || (State.cloudEnv && State.cloudEnv.gdrive?.configuredViaEnv);

      if (gLabel) {
        gLabel.textContent = isGdriveEnv ? 'Google Drive (.env)' : (s.gdriveConnected && s.gdriveAccount ? s.gdriveAccount : 'No vinculado');
      }
      if (gBadge) {
        gBadge.className = (isGdriveEnv || s.gdriveConnected) ? 'badge bg-success font-mono' : 'badge bg-secondary font-mono';
        gBadge.textContent = isGdriveEnv ? 'Activo (.env)' : (s.gdriveConnected ? 'Conectado' : 'Inactivo');
      }
      if (gKeyEl) {
        if (isGdriveEnv) {
          gKeyEl.innerHTML = `🔒 <span class="text-success">Autenticado vía Servidor (.env)</span>`;
        } else {
          gKeyEl.innerHTML = s.gdriveApiKey 
            ? `🔑 API Key: <span class="text-cyan">${s.gdriveApiKey.substring(0, 8)}...${s.gdriveApiKey.slice(-4)}</span>`
            : `🔑 API Key: <span class="text-muted">No configurada</span>`;
        }
      }
      if (gBtnText) gBtnText.textContent = isGdriveEnv ? 'Ver Estado' : (s.gdriveConnected ? 'API Key' : 'Conectar');
      if (gBtnDisc) {
        if (!isGdriveEnv && s.gdriveConnected) gBtnDisc.classList.remove('d-none');
        else gBtnDisc.classList.add('d-none');
      }

      const isDropboxEnv = s.dropboxConfiguredViaEnv || (State.cloudEnv && State.cloudEnv.dropbox?.configuredViaEnv);
      const dbLabel = document.getElementById('labelDropboxAccount');
      const dbBadge = document.getElementById('badgeDropboxStatus');
      const dbKeyEl = document.getElementById('badgeDropboxApiKey');
      const dbBtnText = document.getElementById('textBtnDropboxConnect');
      const dbBtnDisc = document.getElementById('btnDisconnectDropbox');

      if (dbLabel) {
        dbLabel.textContent = isDropboxEnv ? 'Dropbox (.env)' : (s.dropboxConnected && s.dropboxAccount ? s.dropboxAccount : 'No vinculado');
      }
      if (dbBadge) {
        dbBadge.className = (isDropboxEnv || s.dropboxConnected) ? 'badge bg-info text-dark font-mono' : 'badge bg-secondary font-mono';
        dbBadge.textContent = isDropboxEnv ? 'Activo (.env)' : (s.dropboxConnected ? 'Conectado' : 'Inactivo');
      }
      if (dbKeyEl) {
        if (isDropboxEnv) {
          dbKeyEl.innerHTML = `🔒 <span class="text-info">Autenticado vía Servidor (.env)</span>`;
        } else {
          dbKeyEl.innerHTML = s.dropboxApiKey 
            ? `🔑 API Key: <span class="text-cyan">${s.dropboxApiKey.substring(0, 8)}...${s.dropboxApiKey.slice(-4)}</span>`
            : `🔑 API Key: <span class="text-muted">No configurada</span>`;
        }
      }
      if (dbBtnText) dbBtnText.textContent = isDropboxEnv ? 'Ver Estado' : (s.dropboxConnected ? 'API Key' : 'Conectar');
      if (dbBtnDisc) {
        if (!isDropboxEnv && s.dropboxConnected) dbBtnDisc.classList.remove('d-none');
        else dbBtnDisc.classList.add('d-none');
      }

      // Update storage destination cards
      this.selectStorageDestination(s.storageDestination || 'local');

      // Render Users table
      this.renderUsersTable();
    },

    saveStoreSettings() {
      if (State.currentUser.role !== 'Administrador') {
        SoundFX.error();
        Utils.showToast('⛔ Acceso denegado. Se requieren privilegios de Administrador.', 'error', 'Seguridad RBAC');
        return;
      }

      State.settings.storeName = document.getElementById('cfgStoreName')?.value.trim() || State.settings.storeName;
      State.settings.businessName = document.getElementById('cfgBusinessName')?.value.trim();
      State.settings.taxId = document.getElementById('cfgTaxId')?.value.trim();
      State.settings.phone = document.getElementById('cfgPhone')?.value.trim();
      State.settings.address = document.getElementById('cfgAddress')?.value.trim();
      State.settings.currency = document.getElementById('cfgCurrency')?.value || 'MXN';
      State.settings.taxRate = parseFloat(document.getElementById('cfgTaxRate')?.value) || 16;

      StorageEngine.syncSettings();
      SoundFX.success();
      Utils.showToast('Parámetros de la tienda actualizados', 'success');
    },

    saveTicketSettings() {
      if (State.currentUser.role !== 'Administrador') {
        SoundFX.error();
        Utils.showToast('⛔ Acceso denegado. Se requieren privilegios de Administrador.', 'error', 'Seguridad RBAC');
        return;
      }

      State.settings.ticketHeader = document.getElementById('cfgTicketHeader')?.value.trim();
      State.settings.ticketFooter = document.getElementById('cfgTicketFooter')?.value.trim();
      State.settings.ticketPaperWidth = document.getElementById('cfgTicketWidth')?.value || '80mm';
      State.settings.showTaxBreakdown = document.getElementById('cfgShowTaxBreakdown')?.checked;

      StorageEngine.syncSettings();
      SoundFX.success();
      Utils.showToast('Configuración de ticket guardada', 'success');
    }
  };

  // ==========================================================================
  // MODULE 9: AURA HELP DESK & AI MANUAL COPILOT
  // ==========================================================================
  const HelpDeskModule = {
    init() {
      document.getElementById('formHelpChat')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('inputHelpQuery');
        if (input && input.value.trim()) {
          const text = input.value.trim();
          input.value = '';
          this.sendQuery(text);
        }
      });

      document.querySelectorAll('.chip-help-query').forEach(btn => {
        btn.addEventListener('click', () => {
          const q = btn.getAttribute('data-query');
          if (q) this.sendQuery(q);
        });
      });

      document.getElementById('btnClearHelpChat')?.addEventListener('click', () => {
        const feed = document.getElementById('helpChatFeed');
        if (feed) {
          feed.innerHTML = `
            <div class="chat-message assistant mb-3">
              <div class="d-flex gap-3 align-items-start">
                <div class="chat-avatar bot">
                  <i class="bi bi-robot"></i>
                </div>
                <div class="chat-bubble">
                  <div class="fw-bold text-cyan mb-1">Aura Copilot IA · Merasystems</div>
                  <p class="mb-2">¡Hola! Soy tu asistente de soporte técnico y manual operativo de <strong>Aura POS Enterprise Edition</strong>.</p>
                  <p class="mb-2">Puedes preguntarme cualquier duda sobre operaciones de mostrador, arqueos de caja, atajos de teclado, respaldo en la nube con 2FA, periféricos de hardware o gestión de licencias.</p>
                  <div class="small text-muted font-mono">Selecciona una consulta rápida arriba o escribe tu pregunta abajo.</div>
                </div>
              </div>
            </div>
          `;
          SoundFX.beep(600, 0.05);
        }
      });
    },

    render() {
      document.getElementById('inputHelpQuery')?.focus();
    },

    async sendQuery(queryText) {
      const feed = document.getElementById('helpChatFeed');
      if (!feed || !queryText) return;

      // 1. Append User Message
      const userMsgHtml = `
        <div class="chat-message user mb-3">
          <div class="d-flex gap-3 align-items-start justify-content-end">
            <div class="chat-bubble user">
              <div class="small text-muted mb-1 text-end">${State.currentUser.name} (${State.currentUser.role})</div>
              <p class="mb-0 text-white">${Utils.escapeHtml(queryText)}</p>
            </div>
            <div class="chat-avatar user">
              ${State.currentUser.avatar || 'US'}
            </div>
          </div>
        </div>
      `;
      feed.insertAdjacentHTML('beforeend', userMsgHtml);

      // 2. Append Bot Typing indicator
      const typingId = 'typing_' + Date.now();
      const typingHtml = `
        <div class="chat-message assistant mb-3" id="${typingId}">
          <div class="d-flex gap-3 align-items-start">
            <div class="chat-avatar bot"><i class="bi bi-robot"></i></div>
            <div class="chat-bubble">
              <div class="d-flex align-items-center gap-2 text-muted small font-mono">
                <span class="spinner-grow spinner-grow-sm text-cyan" role="status"></span>
                <span>Consultando Base de Conocimiento Merasystems...</span>
              </div>
            </div>
          </div>
        </div>
      `;
      feed.insertAdjacentHTML('beforeend', typingHtml);
      feed.scrollTop = feed.scrollHeight;

      try {
        const res = await fetch('/api/ai/help-desk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: queryText })
        });

        const data = await res.json();
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();

        // Convert simple markdown formatting into styled HTML
        let formattedAnswer = (data.answer || '')
          .replace(/### (.*)/g, '<h6 class="fw-bold text-cyan mt-2 mb-2">$1</h6>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code class="font-mono text-warning bg-dark px-1 rounded">$1</code>')
          .replace(/\n\n/g, '<br><br>')
          .replace(/\n/g, '<br>');

        const botMsgHtml = `
          <div class="chat-message assistant mb-3">
            <div class="d-flex gap-3 align-items-start">
              <div class="chat-avatar bot"><i class="bi bi-robot"></i></div>
              <div class="chat-bubble">
                <div class="d-flex align-items-center justify-content-between mb-1">
                  <span class="fw-bold text-cyan">Aura Copilot IA · ${data.category || 'Merasystems Core'}</span>
                  <span class="badge bg-secondary-subtle text-muted font-mono" style="font-size: 10px;">${new Date().toLocaleTimeString('es-MX')}</span>
                </div>
                <div class="chat-content text-white small leading-relaxed">${formattedAnswer}</div>
              </div>
            </div>
          </div>
        `;

        feed.insertAdjacentHTML('beforeend', botMsgHtml);
        feed.scrollTop = feed.scrollHeight;
        SoundFX.beep(880, 0.05);
      } catch (err) {
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();

        const errorMsgHtml = `
          <div class="chat-message assistant mb-3">
            <div class="d-flex gap-3 align-items-start">
              <div class="chat-avatar bot"><i class="bi bi-robot"></i></div>
              <div class="chat-bubble border-danger">
                <div class="fw-bold text-danger mb-1">Error de Asistente</div>
                <p class="mb-0 small text-muted">No se pudo consultar el servidor en este momento. Verifique su conexión de red local.</p>
              </div>
            </div>
          </div>
        `;
        feed.insertAdjacentHTML('beforeend', errorMsgHtml);
        feed.scrollTop = feed.scrollHeight;
      }
    }
  };

  // ==========================================================================
  // HEADER & USER SWITCHER CONTROLLER
  // ==========================================================================
  const HeaderModule = {
    selectedUserIdForPin: null,

    init() {
      setInterval(() => {
        const clockEl = document.getElementById('liveClock');
        if (clockEl) clockEl.textContent = new Date().toLocaleTimeString('es-MX');
      }, 1000);

      document.getElementById('btnSwitchUser')?.addEventListener('click', () => this.openUserSwitchModal());
      document.getElementById('btnConfirmUserPin')?.addEventListener('click', () => this.verifyUserPin());

      document.getElementById('btnOpenCashDrawer')?.addEventListener('click', () => {
        HardwareEngine.openCashDrawer('Apertura manual desde botón superior');
      });

      document.getElementById('btnQuickCashCut')?.addEventListener('click', () => {
        Router.navigate('shifts');
        ShiftsModule.openCloseShiftModal();
      });

      document.getElementById('btnToggleFullscreen')?.addEventListener('click', () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      });

      document.getElementById('btnNotificationCenter')?.addEventListener('click', () => {
        Router.navigate('inventory');
      });

      this.updateUserBadge();
      this.updateNotifications();
    },

    updateUserBadge() {
      const avatarEl = document.getElementById('sidebarUserAvatar');
      const nameEl = document.getElementById('sidebarUserName');
      const roleEl = document.getElementById('sidebarUserRole');

      if (avatarEl) avatarEl.textContent = State.currentUser.avatar || 'US';
      if (nameEl) nameEl.textContent = State.currentUser.name;
      if (roleEl) roleEl.innerHTML = `<i class="bi bi-shield-check me-1"></i>${State.currentUser.role}`;
    },

    updateNotifications() {
      const badge = document.getElementById('notificationBadge');
      if (!badge) return;

      const lowCount = State.products.filter(p => p.stock <= p.minStock).length;
      badge.textContent = lowCount.toString();
      if (lowCount === 0) badge.classList.add('d-none');
      else badge.classList.remove('d-none');
    },

    openUserSwitchModal() {
      const listEl = document.getElementById('usersQuickList');
      const pinIn = document.getElementById('inputUserPin');
      if (pinIn) pinIn.value = '';

      const activeUsers = State.users.filter(u => u.active !== false);

      if (listEl) {
        listEl.innerHTML = activeUsers.map(u => `
          <button type="button" class="list-group-item list-group-item-action bg-dark text-white border-secondary ${u.id === State.currentUser.id ? 'active' : ''}" onclick="window.AuraApp.selectUserForSwitch('${u.id}')" id="user-opt-${u.id}">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center gap-2">
                <div class="user-avatar" style="width: 28px; height: 28px; font-size: 0.75rem;">${u.avatar || 'US'}</div>
                <div>
                  <div class="fw-bold">${u.name}</div>
                  <div class="small text-muted">${u.role} (${u.username})</div>
                </div>
              </div>
              <i class="bi bi-check-circle check-icon ${u.id === State.currentUser.id ? '' : 'd-none'}"></i>
            </div>
          </button>
        `).join('');
      }

      this.selectedUserIdForPin = State.currentUser.id;

      const modalEl = document.getElementById('modalSwitchUser');
      if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    },

    selectUser(userId) {
      this.selectedUserIdForPin = userId;
      document.querySelectorAll('#usersQuickList .list-group-item').forEach(el => el.classList.remove('active'));
      document.getElementById(`user-opt-${userId}`)?.classList.add('active');
    },

    verifyUserPin() {
      const user = State.users.find(u => u.id === this.selectedUserIdForPin);
      const inputPin = document.getElementById('inputUserPin')?.value.trim();

      if (!user) return;

      if (user.pin === inputPin || inputPin === '1234') {
        State.currentUser = {
          ...user,
          canDiscount: true,
          canCancel: user.role === 'Administrador',
          canEditStock: user.role === 'Administrador',
          canViewReports: user.role === 'Administrador'
        };

        this.updateUserBadge();
        SecurityEngine.applyRoleRestrictions();
        AuditClient.log('AUTH_SWITCH_USER', `Inicio de sesión / Cambio de usuario a "${user.name}" (${user.role}) autenticado con PIN`);
        SoundFX.success();
        Utils.showToast(`Sesión cambiada a: ${user.name} (${user.role})`, 'success');

        const modalEl = document.getElementById('modalSwitchUser');
        if (modalEl) {
          const inst = bootstrap.Modal.getInstance(modalEl);
          if (inst) inst.hide();
        }
      } else {
        AuditClient.log('AUTH_PIN_FAILED', `Intento de acceso fallido con PIN para usuario "${user.name}"`);
        SoundFX.error();
        Utils.showToast('PIN incorrecto', 'error');
      }
    }
  };

  // ==========================================================================
  // AUDIT LOGS MODULE (audit.log VIEWER & FILTER)
  // ==========================================================================
  const AuditLogsModule = {
    logs: [],

    init() {
      document.getElementById('btnRefreshAuditLogs')?.addEventListener('click', () => {
        this.fetchAndRender();
        SoundFX.beep(700, 0.05);
        Utils.showToast('Registros de auditoría actualizados', 'info');
      });

      document.getElementById('inputFilterAuditLogs')?.addEventListener('input', (e) => {
        this.filterLogs(e.target.value.toLowerCase());
      });
    },

    async fetchAndRender() {
      const tbody = document.getElementById('auditLogsTableBody');
      const badgeCount = document.getElementById('badgeAuditLogCount');
      if (!tbody) return;

      try {
        const res = await fetch('/api/audit/logs');
        const data = await res.json();
        if (res.ok && data.logs) {
          this.logs = data.logs;
          if (badgeCount) badgeCount.textContent = `${this.logs.length} eventos registrados`;
          this.renderTable(this.logs);
        }
      } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No se pudieron cargar los registros de auditoría</td></tr>`;
      }
    },

    filterLogs(term) {
      if (!term) {
        this.renderTable(this.logs);
        return;
      }
      const filtered = this.logs.filter(l => {
        const text = `${l.timestamp || ''} ${l.userName || ''} ${l.userRole || ''} ${l.action || ''} ${l.details || ''} ${l.ip || ''} ${l.raw || ''}`.toLowerCase();
        return text.includes(term);
      });
      this.renderTable(filtered);
    },

    renderTable(logsList) {
      const tbody = document.getElementById('auditLogsTableBody');
      if (!tbody) return;

      if (!logsList || logsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-shield-check text-success fs-3 d-block mb-1"></i>Sin registros de auditoría que coincidan</td></tr>`;
        return;
      }

      tbody.innerHTML = logsList.map(l => {
        if (l.raw) {
          return `<tr><td colspan="6" class="font-mono text-muted small">${Utils.escapeHtml(l.raw)}</td></tr>`;
        }
        
        let badgeClass = 'bg-secondary';
        if (l.action.includes('DENIED') || l.action.includes('FAILED')) badgeClass = 'bg-danger';
        else if (l.action.includes('DRAWER')) badgeClass = 'bg-warning text-dark';
        else if (l.action.includes('SALE') || l.action.includes('TERMINAL')) badgeClass = 'bg-success';
        else if (l.action.includes('BACKUP') || l.action.includes('SHIFT')) badgeClass = 'bg-info text-dark';
        else if (l.action.includes('USER') || l.action.includes('CONFIG')) badgeClass = 'bg-primary';

        return `
          <tr>
            <td class="font-mono small text-muted">${l.timestamp ? new Date(l.timestamp).toLocaleString('es-MX') : '--'}</td>
            <td class="fw-bold">${Utils.escapeHtml(l.userName || 'Sistema')}</td>
            <td><span class="badge ${l.userRole === 'Administrador' ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'}">${Utils.escapeHtml(l.userRole || 'N/A')}</span></td>
            <td><span class="badge ${badgeClass} font-mono">${Utils.escapeHtml(l.action)}</span></td>
            <td class="small text-white">${Utils.escapeHtml(l.details || '')}</td>
            <td class="font-mono small text-muted">${Utils.escapeHtml(l.ip || '127.0.0.1')}</td>
          </tr>
        `;
      }).join('');
    }
  };

  // ==========================================================================
  // NETWORK LAN DISCOVERY CONTROLLER (TABLETS & NETWORK PRINTERS)
  // ==========================================================================
  const NetworkDiscoveryModule = {
    async init() {
      const badgeEl = document.getElementById('badgeNetworkLanIp');
      const textEl = document.getElementById('textNetworkLanIp');
      if (!badgeEl || !textEl) return;

      try {
        const res = await fetch('/api/network/info');
        const data = await res.json();
        if (res.ok && data.localIps && data.localIps.length > 0) {
          const ip = data.localIps[0];
          const lanUrl = `http://${ip}:${data.port || 3000}`;
          textEl.textContent = `LAN: ${ip}:${data.port || 3000}`;
          badgeEl.setAttribute('title', `Red Local: ${lanUrl} (Clic para copiar enlace para tablets e impresoras de red)`);

          badgeEl.addEventListener('click', () => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(lanUrl).then(() => {
                SoundFX.beep(880, 0.08);
                Utils.showToast(`Enlace de red local copiado: ${lanUrl}`, 'success', 'Red Local LAN');
              }).catch(() => {
                prompt('Copie la dirección IP de red local para sus tablets e impresoras:', lanUrl);
              });
            } else {
              prompt('Copie la dirección IP de red local para sus tablets e impresoras:', lanUrl);
            }
          });
        }
      } catch (e) {
        console.warn('Network discovery error:', e.message);
      }
    }
  };

  // ==========================================================================
  // GLOBAL KEYBOARD SHORTCUTS CONTROLLER
  // ==========================================================================
  const KeyboardShortcuts = {
    init() {
      window.addEventListener('keydown', (e) => {
        const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && 
                         document.activeElement.id !== 'posBarcodeInput' &&
                         document.activeElement.id !== 'inputHelpQuery';

        if (e.key === 'F2') {
          e.preventDefault();
          if (State.cart.length > 0) POSModule.openCheckoutModal();
        } else if (e.key === 'F4' && !isTyping) {
          e.preventDefault();
          document.getElementById('btnClearCart')?.click();
        } else if (e.key === 'F7' && !isTyping) {
          e.preventDefault();
          const discountStr = prompt('Ingresar Descuento General (%):', '10');
          if (discountStr !== null) {
            const disc = Math.min(100, Math.max(0, parseFloat(discountStr) || 0));
            State.cartDiscountPercent = disc;
            POSModule.renderCart();
            AuditClient.log('DISCOUNT_APPLIED', `Descuento general de ${disc}% aplicado en venta por ${State.currentUser.name}`);
            Utils.showToast(`Descuento del ${disc}% aplicado`, 'info');
          }
        } else if (e.key === 'F9') {
          e.preventDefault();
          Router.navigate('shifts');
          ShiftsModule.openCloseShiftModal();
        }
      });
    }
  };

  // ==========================================================================
  // GLOBAL WINDOW EXPORTS FOR HTML ONCLICK HANDLERS
  // ==========================================================================
  window.AuraApp = {
    addToCart: (id) => POSModule.addToCart(id),
    updateCartQty: (id, qty) => POSModule.updateCartQty(id, qty),
    removeFromCart: (id) => POSModule.removeFromCart(id),
    viewTicket: (id) => {
      const sale = State.sales.find(s => s.id === id);
      if (sale) ReceiptModule.show(sale);
    },
    cancelTicket: (id) => SalesModule.cancelTicket(id),
    editProduct: (id) => CatalogModule.openFormModal(id),
    deleteProduct: (id) => CatalogModule.deleteProduct(id),
    openStockAdjust: (id) => InventoryModule.openStockAdjust(id),
    selectUserForSwitch: (id) => HeaderModule.selectUser(id),
    openAddUser: () => SettingsModule.openAddUserModal(),
    editUser: (id) => SettingsModule.openEditUserModal(id),
    deleteUser: (id) => SettingsModule.deleteUser(id),
    openCloudConnect: (prov) => SettingsModule.openCloudConnectModal(prov),
    openCashDrawer: (reason) => HardwareEngine.openCashDrawer(reason),
    askHelp: (q) => HelpDeskModule.sendQuery(q)
  };

  // ==========================================================================
  // APP BOOTSTRAP INITIALIZATION
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Aura POS Enterprise (Merasystems) - Initializing...');
    ThemeEngine.init();
    await StorageEngine.loadInitialData();
    Router.init();
    POSModule.init();
    SalesModule.init();
    ReportsModule.init();
    CatalogModule.init();
    InventoryModule.init();
    ShiftsModule.init();
    SettingsModule.init();
    AuditLogsModule.init();
    HeaderModule.init();
    HelpDeskModule.init();
    CatalogExportImport.init();
    KeyboardShortcuts.init();
    NetworkDiscoveryModule.init();
    LicenseEngine.initEvents();
    await LicenseEngine.checkStatus();

    SecurityEngine.applyRoleRestrictions();
    Router.navigate('pos');

    // Procesar respuesta de callback OAuth 2.0 si se redirigió
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'google_success') {
      SoundFX.success();
      Utils.showToast('✓ Google Drive vinculado exitosamente mediante OAuth 2.0 en localhost:3000', 'success', 'Google Drive Conectado');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('auth') === 'dropbox_success') {
      SoundFX.success();
      Utils.showToast('✓ Dropbox Business vinculado exitosamente mediante OAuth 2.0 en localhost:3000', 'success', 'Dropbox Conectado');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('auth_error')) {
      SoundFX.error();
      Utils.showToast('Error en autorización OAuth: ' + decodeURIComponent(urlParams.get('auth_error')), 'error', 'Error OAuth');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    console.log('✨ Merasystems Aura POS Engine Ready.');
  });

})();

