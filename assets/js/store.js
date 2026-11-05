/* Silondis demo store.
   Keeps products, customers, orders, applications and messages in this browser's localStorage,
   so the site runs on any static host (Vercel) with no database. Tabs in the same browser stay in sync.
   In production this module is the one to replace with calls to the real backend API. */
(function () {
  'use strict';
  var KEY = 'silondis-demo-v2';
  var listeners = [];
  var mem = null; // used when storage is blocked

  function ym(offsetMonths) {
    var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offsetMonths);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function daysAgo(n, hour) {
    var d = new Date(); d.setDate(d.getDate() - n); d.setHours(hour || 10, (n * 17) % 60, 0, 0); return d.toISOString();
  }
  function lot(batch, monthsLeft, qty, loc, status) {
    return { batch: batch, expiry: ym(monthsLeft), qty: qty, loc: loc, status: status || 'available' };
  }

  function seed() {
    var products = [
      { id: 'paracetamol-500', name: 'Paracetamol 500 mg tablets', am: 'ፓራሲታሞል 500 ሚ.ግ', kind: 'OTC', category: 'Pain and fever', form: 'Tablet', pack: '20 tablets', packB2B: 'Box of 50 × 20', retail: 45, wholesale: 1650, gtin: '08900000000011', reorder: 40, storage: 'Store below 25 °C, dry place', lots: [lot('PCM-2509', 22, 180, 'Aisle A · Shelf 4'), lot('PCM-2412', 3, 58, 'Aisle A · Shelf 4')] },
      { id: 'ibuprofen-400', name: 'Ibuprofen 400 mg tablets', am: 'ኢቡፕሮፌን 400 ሚ.ግ', kind: 'OTC', category: 'Pain and fever', form: 'Tablet', pack: '20 tablets', packB2B: 'Box of 50 × 20', retail: 70, wholesale: 2600, gtin: '08900000000028', reorder: 30, storage: 'Store below 25 °C', lots: [lot('IBU-2505', 18, 120, 'Aisle A · Shelf 5')] },
      { id: 'ors', name: 'Oral rehydration salts', am: 'ኦ.አር.ኤስ', kind: 'OTC', category: 'Stomach and digestion', form: 'Sachet', pack: '10 sachets', packB2B: 'Carton of 50 × 10', retail: 60, wholesale: 2400, gtin: '08900000000035', reorder: 30, storage: 'Store below 30 °C, keep sachets sealed', lots: [lot('ORS-2503', 5, 90, 'Aisle D · Pallet 2'), lot('ORS-2508', 21, 150, 'Aisle D · Pallet 3')] },
      { id: 'cetirizine-10', name: 'Cetirizine 10 mg tablets', am: 'ሴቲሪዚን 10 ሚ.ግ', kind: 'OTC', category: 'Cold and allergy', form: 'Tablet', pack: '10 tablets', packB2B: 'Box of 100 × 10', retail: 40, wholesale: 3100, gtin: '08900000000042', reorder: 20, storage: 'Store below 25 °C', lots: [lot('CTZ-2501', 2, 35, 'Aisle B · Shelf 1')] },
      { id: 'vitamin-c', name: 'Vitamin C 500 mg chewable', am: 'ቫይታሚን ሲ 500 ሚ.ግ', kind: 'OTC', category: 'Vitamins', form: 'Chewable tablet', pack: '30 tablets', packB2B: 'Box of 24 × 30', retail: 120, wholesale: 2300, gtin: '08900000000059', reorder: 20, storage: 'Store below 25 °C, keep lid closed', lots: [lot('VTC-2506', 19, 96, 'Aisle C · Shelf 2')] },
      { id: 'zinc-20', name: 'Zinc 20 mg dispersible (children)', am: 'ዚንክ 20 ሚ.ግ (ለሕፃናት)', kind: 'OTC', category: 'Baby and child', form: 'Dispersible tablet', pack: '10 tablets', packB2B: 'Box of 100 × 10', retail: 35, wholesale: 2700, gtin: '08900000000066', reorder: 20, storage: 'Store below 30 °C', lots: [lot('ZNC-2504', 6, 48, 'Aisle C · Shelf 4')] },
      { id: 'bp-monitor', name: 'Digital blood pressure monitor', am: 'የደም ግፊት መለኪያ', kind: 'OTC', category: 'Devices', form: 'Device', pack: '1 device', packB2B: 'Carton of 10', retail: 2800, wholesale: 24000, gtin: '08900000000073', reorder: 3, storage: 'Keep dry; batteries included', lots: [lot('BPM-2507', 56, 14, 'Aisle E · Shelf 1')] },
      { id: 'thermometer', name: 'Digital thermometer', am: 'ዲጂታል ቴርሞሜትር', kind: 'OTC', category: 'Devices', form: 'Device', pack: '1 device', packB2B: 'Box of 20', retail: 350, wholesale: 5600, gtin: '08900000000158', reorder: 5, storage: 'Clean the tip after each use', lots: [lot('THM-2506', 48, 25, 'Aisle E · Shelf 2')] },
      { id: 'amoxicillin-500', name: 'Amoxicillin 500 mg capsules', am: 'አሞክሲሲሊን 500 ሚ.ግ', kind: 'Rx', category: 'Antibiotics', form: 'Capsule', pack: '21 capsules', packB2B: 'Box of 100', retail: 95, wholesale: 980, gtin: '08900000000080', reorder: 25, storage: 'Store below 25 °C', lots: [lot('AMX-2411', 2, 39, 'Aisle B · Shelf 3'), lot('AMX-2507', 20, 110, 'Aisle B · Shelf 3')] },
      { id: 'metformin-500', name: 'Metformin 500 mg tablets', am: 'ሜትፎርሚን 500 ሚ.ግ', kind: 'Rx', category: 'Diabetes care', form: 'Tablet', pack: '60 tablets', packB2B: 'Tin of 1,000', retail: 150, wholesale: 1900, gtin: '08900000000097', reorder: 30, chronic: true, storage: 'Store below 25 °C', lots: [lot('MET-2506', 19, 28, 'Aisle A · Shelf 1')] },
      { id: 'amlodipine-5', name: 'Amlodipine 5 mg tablets', am: 'አምሎዲፒን 5 ሚ.ግ', kind: 'Rx', category: 'Heart and blood pressure', form: 'Tablet', pack: '30 tablets', packB2B: 'Box of 100 × 10', retail: 110, wholesale: 2900, gtin: '08900000000103', reorder: 20, chronic: true, storage: 'Store below 30 °C, protect from light', lots: [lot('AML-2502', 6, 44, 'Aisle A · Shelf 2'), lot('AML-2509', 22, 60, 'Aisle A · Shelf 2')] },
      { id: 'omeprazole-20', name: 'Omeprazole 20 mg capsules', am: 'ኦሜፕራዞል 20 ሚ.ግ', kind: 'Rx', category: 'Stomach and digestion', form: 'Capsule', pack: '28 capsules', packB2B: 'Box of 100', retail: 85, wholesale: 760, gtin: '08900000000110', reorder: 20, storage: 'Store below 25 °C', lots: [lot('OMP-2502', 3, 30, 'Quarantine bay', 'quarantine'), lot('OMP-2508', 21, 75, 'Aisle B · Shelf 2')] },
      { id: 'salbutamol-inhaler', name: 'Salbutamol 100 mcg inhaler', am: 'ሳልቡታሞል መተንፈሻ', kind: 'Rx', category: 'Asthma', form: 'Inhaler', pack: '200 doses', packB2B: 'Carton of 20', retail: 260, wholesale: 4600, gtin: '08900000000127', reorder: 10, chronic: true, storage: 'Store below 30 °C, do not puncture', lots: [lot('SAL-2504', 11, 32, 'Aisle B · Shelf 5')] },
      { id: 'insulin-human', name: 'Insulin, human, 100 IU/ml', am: 'ኢንሱሊን 100 IU/ml', kind: 'Rx', category: 'Diabetes care', form: 'Vial', pack: '10 ml vial', packB2B: 'Box of 10 vials', retail: 420, wholesale: 3800, gtin: '08900000000134', reorder: 8, cold: true, chronic: true, storage: 'Refrigerate at 2 to 8 °C, do not freeze', lots: [lot('INS-2508', 9, 6, 'Cold room · Fridge 1')] },
      { id: 'diazepam-5', name: 'Diazepam 5 mg tablets', am: 'ዲያዜፓም 5 ሚ.ግ', kind: 'Controlled', category: 'Controlled', form: 'Tablet', pack: '10 tablets', packB2B: 'Box of 100', retail: 60, wholesale: 540, gtin: '08900000000141', reorder: 5, storage: 'Locked cabinet; register every dispense', lots: [lot('DZP-2504', 17, 18, 'Locked cabinet')] }
    ];
    var customers = [
      { id: 'cust-kazanchis', name: 'Sample: Kazanchis Community Pharmacy', area: 'Kirkos, Addis Ababa', type: 'Pharmacy', licenceNo: 'EFDA-RP-[sample]-0142', licenceExpiry: ym(8), creditLimit: 250000, creditUsed: 62000, terms: 30, tier: 'Gold' },
      { id: 'cust-piassa', name: 'Sample: Piassa Drug Shop', area: 'Arada, Addis Ababa', type: 'Drug shop', licenceNo: 'EFDA-DS-[sample]-0388', licenceExpiry: ym(3), creditLimit: 80000, creditUsed: 71500, terms: 15, tier: 'Standard' },
      { id: 'cust-adama', name: 'Sample: Adama Family Clinic', area: 'Adama, Oromia', type: 'Clinic', licenceNo: 'EFDA-CL-[sample]-1120', licenceExpiry: ym(14), creditLimit: 150000, creditUsed: 0, terms: 30, tier: 'Silver' },
      { id: 'cust-megenagna', name: 'Sample: Megenagna Pharmacy (licence expired)', area: 'Yeka, Addis Ababa', type: 'Pharmacy', licenceNo: 'EFDA-RP-[sample]-0677', licenceExpiry: ym(-2), creditLimit: 120000, creditUsed: 10000, terms: 30, tier: 'Standard' }
    ];
    var hist = [
      [6, 'retail', 'Sample patient A', [['paracetamol-500', 2], ['ors', 1]]],
      [6, 'b2b', 'cust-kazanchis', [['amoxicillin-500', 10], ['paracetamol-500', 6]]],
      [5, 'retail', 'Sample patient B', [['vitamin-c', 1]]],
      [5, 'b2b', 'cust-adama', [['ors', 4], ['zinc-20', 3]]],
      [4, 'retail', 'Sample patient C', [['bp-monitor', 1]]],
      [3, 'b2b', 'cust-piassa', [['cetirizine-10', 2], ['ibuprofen-400', 2]]],
      [3, 'retail', 'Sample patient D', [['metformin-500', 1]]],
      [2, 'b2b', 'cust-kazanchis', [['omeprazole-20', 5], ['amlodipine-5', 4]]],
      [2, 'retail', 'Sample patient E', [['thermometer', 1], ['paracetamol-500', 1]]],
      [1, 'retail', 'Sample patient F', [['salbutamol-inhaler', 1]]],
      [1, 'b2b', 'cust-adama', [['amoxicillin-500', 6]]]
    ];
    var byId = {}; products.forEach(function (p) { byId[p.id] = p; });
    var cById = {}; customers.forEach(function (c) { cById[c.id] = c; });
    var orders = hist.map(function (h, i) {
      var b2b = h[1] === 'b2b';
      var lines = h[3].map(function (x) { var p = byId[x[0]]; return { productId: p.id, name: p.name, kind: p.kind, qty: x[1], unit: b2b ? p.wholesale : p.retail, picks: [{ batch: p.lots[p.lots.length - 1].batch, expiry: p.lots[p.lots.length - 1].expiry, qty: x[1] }] }; });
      var sub = lines.reduce(function (a, l) { return a + l.qty * l.unit; }, 0);
      var no = 'SO-H' + String(101 + i);
      var created = daysAgo(h[0], 9 + (i % 8));
      return { no: no, channel: h[1], customerId: b2b ? h[2] : null, customer: b2b ? cById[h[2]].name : h[2], phone: b2b ? '' : '09000000' + String(10 + i), lines: lines, status: 'delivered', rx: null,
        slot: b2b ? 'Delivery run' : 'Same-day delivery', payment: b2b ? 'Credit' : (i % 2 ? 'telebirr' : 'Cash on delivery'), paid: true, subtotal: sub, fee: b2b ? 0 : 80, total: sub + (b2b ? 0 : 80), createdAt: created,
        history: [{ status: 'new', at: created }, { status: 'packing', at: created }, { status: 'out_for_delivery', at: created }, { status: 'delivered', at: created }] };
    });
    var now = new Date().toISOString();
    orders.unshift({ no: 'SO-DEMO1', channel: 'retail', customerId: null, customer: 'Sample patient', phone: '0900000000',
      lines: [{ productId: 'amoxicillin-500', name: 'Amoxicillin 500 mg capsules', kind: 'Rx', qty: 1, unit: 95, picks: [{ batch: 'AMX-2411', expiry: ym(2), qty: 1 }] },
              { productId: 'paracetamol-500', name: 'Paracetamol 500 mg tablets', kind: 'OTC', qty: 2, unit: 45, picks: [{ batch: 'PCM-2412', expiry: ym(3), qty: 2 }] }],
      status: 'awaiting_rx', rx: { status: 'pending', file: 'sample-prescription.jpg' }, slot: 'Today, 4 to 6 pm', payment: 'telebirr', paid: true, subtotal: 185, fee: 80, total: 265, createdAt: now,
      history: [{ status: 'awaiting_rx', at: now }] });
    return { v: 2, seededAt: now, products: products, customers: customers, orders: orders, applications: [], messages: [], reminders: [] };
  }

  function read() {
    try { var raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    return mem;
  }
  function write(s) {
    mem = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  var state = read();
  if (!state || state.v !== 2) { state = seed(); write(state); }

  function notify() { listeners.forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } }); }
  window.addEventListener('storage', function (e) { if (e.key === KEY && e.newValue) { try { state = JSON.parse(e.newValue); notify(); } catch (err) {} } });

  window.SilondisStore = {
    get: function () { return state; },
    update: function (fn) { fn(state); write(state); notify(); },
    subscribe: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; },
    reset: function () { state = seed(); write(state); notify(); },
    ym: ym
  };
})();
