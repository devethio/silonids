/* Silondis app: patient shop, order tracking, pharmacy portal and back office on one shared stock. */
(function () {
  'use strict';
  var Store = window.SilondisStore;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var etb = function (n) { return 'ETB ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var toast = function (m) { window.silondisToast(m); };
  var D = function () { return Store.get(); };

  var S = {
    view: 'shop', lang: window.SilondisLang ? window.SilondisLang.get() : 'am',
    q: '', cat: 'All', cart: [], rxData: null, rxName: '', slot: 'today-pm', pay: 'telebirr', buyer: '', phone: '', remind: true, placed: null,
    trackNo: '', trackPhone: '', trackResult: null,
    b2bId: '', b2bQty: {}, b2bQ: '', b2bDeals: false,
    tab: 'dashboard', stockFilter: 'all', orderFilter: 'open', recv: {}
  };
  try { var saved = JSON.parse(sessionStorage.getItem('silondis-ui') || '{}'); S.buyer = saved.buyer || ''; S.phone = saved.phone || ''; S.b2bId = saved.b2bId || ''; } catch (e) {}
  function remember() { try { sessionStorage.setItem('silondis-ui', JSON.stringify({ buyer: S.buyer, phone: S.phone, b2bId: S.b2bId })); } catch (e) {} }

  var ICON = {
    pill: '<path d="M7 17L17 7a3.5 3.5 0 0 0-5-5L2 12a3.5 3.5 0 0 0 5 5M8 8l5 5"/>',
    rx: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    drop: '<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11"/>',
    cold: '<path d="M12 3v18M5 7l14 10M19 7L5 17"/>',
    device: '<path d="M5 5h14v10H5zM9 19h6M12 15v4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
  };
  var svg = function (k, sz, sw) { return '<svg width="' + (sz || 22) + '" height="' + (sz || 22) + '" viewBox="0 0 24 24" fill="none" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[k] || ICON.pill) + '</svg>'; };

  var T = {
    en: { h: 'Medicines delivered in Addis Ababa', sub: 'Same-day delivery or branch pick-up', search: 'Search medicines', all: 'All', rxTitle: 'Have a prescription?', rxBody: 'Send a photo. A licensed pharmacist checks it before we pack your order.', rxBtn: 'Upload prescription', add: 'Add', needsRx: 'Needs prescription', cart: 'Your order', empty: 'Your cart is empty. Add OTC items, or upload a prescription for prescription-only medicines.', name: 'Your name', phone: 'Phone number', when: 'Delivery', pay: 'Pay with', place: 'Place order', total: 'Total', delivery: 'Delivery', items: 'Items', out: 'Out of stock', details: 'Details' },
    am: { h: 'መድኃኒቶች በአዲስ አበባ ይደርሳሉ', sub: 'በዚያው ቀን ማድረሻ ወይም ከቅርንጫፍ መውሰድ', search: 'መድኃኒት ይፈልጉ', all: 'ሁሉም', rxTitle: 'የሐኪም ማዘዣ አለዎት?', rxBody: 'ፎቶ ይላኩ። ትዕዛዝዎ ከመዘጋጀቱ በፊት ፈቃድ ያለው ፋርማሲስት ያረጋግጠዋል።', rxBtn: 'ማዘዣ ይጫኑ', add: 'ጨምር', needsRx: 'ማዘዣ ያስፈልጋል', cart: 'ትዕዛዝዎ', empty: 'ጋሪዎ ባዶ ነው።', name: 'ስምዎ', phone: 'ስልክ ቁጥር', when: 'ማድረሻ', pay: 'የክፍያ ዘዴ', place: 'ትዕዛዝ ያስገቡ', total: 'ጠቅላላ', delivery: 'ማድረሻ', items: 'ዕቃዎች', out: 'አልቋል', details: 'ዝርዝር' }
  };
  var t = function (k) { return T.en[k] || k; }; // Amharic comes from assets/js/i18n-am.js

  var SLOTS = { 'today-pm': { label: 'Today, 2 to 4 pm', fee: 80 }, 'today-eve': { label: 'Today, 4 to 6 pm', fee: 80 }, 'tomorrow': { label: 'Tomorrow, 9 to 11 am', fee: 60 }, 'pickup': { label: 'Pick up at branch', fee: 0 } };
  var PAYS = { telebirr: 'telebirr', cbe: 'CBE Birr or bank', card: 'Card', cod: 'Cash on delivery' };
  var STATUS = {
    awaiting_rx: { label: 'Awaiting Rx check', cls: 'warn' }, new: { label: 'Received', cls: 'info' }, packing: { label: 'Packing', cls: 'info' },
    out_for_delivery: { label: 'Out for delivery', cls: 'info' }, delivered: { label: 'Delivered', cls: 'ok' }, cancelled: { label: 'Cancelled', cls: 'bad' }
  };
  var NEXT = { new: 'packing', packing: 'out_for_delivery', out_for_delivery: 'delivered' };
  var NEXT_LABEL = { new: 'Start packing', packing: 'Send out', out_for_delivery: 'Mark delivered' };
  var statusPill = function (s) { var v = STATUS[s] || { label: s, cls: 'neutral' }; return '<span class="pill ' + v.cls + '">' + esc(v.label) + '</span>'; };

  /* ---------- stock helpers ---------- */
  function monthsLeft(exp) { var a = String(exp).split('-').map(Number), d = new Date(); return (a[0] - d.getFullYear()) * 12 + (a[1] - (d.getMonth() + 1)); }
  var lotsOf = function (p) { return Array.isArray(p.lots) ? p.lots : []; };
  var sellableLot = function (l) { return l.status !== 'quarantine' && l.qty > 0 && monthsLeft(l.expiry) >= 1; };
  function sellable(p) { return lotsOf(p).filter(sellableLot).reduce(function (a, l) { return a + l.qty; }, 0); }
  function isDeal(p) { return lotsOf(p).some(function (l) { var m = monthsLeft(l.expiry); return sellableLot(l) && m >= 3 && m <= 6; }); }
  function fefo(p, qty) {
    var lots = lotsOf(p).map(function (l) { return Object.assign({}, l); });
    var idx = lots.map(function (l, i) { return i; }).filter(function (i) { return sellableLot(lots[i]); }).sort(function (a, b) { return String(lots[a].expiry).localeCompare(String(lots[b].expiry)); });
    var need = qty, picks = [];
    idx.forEach(function (i) { if (!need) return; var take = Math.min(need, lots[i].qty); lots[i].qty -= take; need -= take; picks.push({ batch: lots[i].batch, expiry: lots[i].expiry, qty: take }); });
    return need ? null : { lots: lots, picks: picks };
  }
  var leftPill = function (n) { return n < 1 ? '<span class="pill bad">Expired</span>' : n <= 3 ? '<span class="pill bad num">' + n + ' mo</span>' : n <= 6 ? '<span class="pill warn num">' + n + ' mo</span>' : '<span class="pill ok num">' + n + ' mo</span>'; };
  var kindPill = function (k) { return k === 'Rx' ? '<span class="pill info">Prescription only</span>' : k === 'Controlled' ? '<span class="pill bad">Controlled</span>' : '<span class="pill neutral">OTC</span>'; };
  var byId = function (id) { return D().products.filter(function (p) { return p.id === id; })[0]; };
  var custById = function (id) { return D().customers.filter(function (c) { return c.id === id; })[0]; };
  var orderBy = function (no) { return D().orders.filter(function (o) { return o.no === no; })[0]; };
  var fmtDate = function (iso) { try { return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  var orderNo = function () { return 'SO-' + Date.now().toString(36).toUpperCase().slice(-5); };
  var iconFor = function (p) { return p.cold ? 'cold' : p.category === 'Devices' ? 'device' : p.kind !== 'OTC' ? 'rx' : p.category === 'Stomach and digestion' ? 'drop' : 'pill'; };

  /* allocate stock first-expiry first-out for every line, or nothing */
  function allocate(s, lines) {
    var plans = [];
    for (var i = 0; i < lines.length; i++) {
      var p = s.products.filter(function (x) { return x.id === lines[i].productId; })[0];
      if (!p) return 'A product is no longer in the catalogue.';
      var plan = fefo(p, lines[i].qty);
      if (!plan) return 'Not enough stock of ' + p.name + '. Lower the quantity.';
      plans.push([p, plan, lines[i]]);
    }
    plans.forEach(function (x) { x[0].lots = x[1].lots; x[2].picks = x[1].picks; });
    return null;
  }
  function release(s, o) {
    (o.lines || []).forEach(function (ln) {
      var p = s.products.filter(function (x) { return x.id === ln.productId; })[0]; if (!p) return;
      (ln.picks || []).forEach(function (pk) { var l = p.lots.filter(function (x) { return x.batch === pk.batch; })[0]; if (l) l.qty += pk.qty; });
    });
  }
  function setStatus(s, no, status, extra) {
    var o = s.orders.filter(function (x) { return x.no === no; })[0]; if (!o) return;
    o.status = status; o.history = (o.history || []).concat([{ status: status, at: new Date().toISOString() }]);
    if (extra) Object.assign(o, extra);
  }

  /* ---------- actions ---------- */
  function placeRetail() {
    if (!S.cart.length) return;
    if (!S.buyer.trim() || !S.phone.trim()) { toast('Add your name and phone number.'); return; }
    var lines = S.cart.map(function (c) { var p = byId(c.id); return { productId: c.id, name: p.name, kind: p.kind, qty: c.qty, unit: p.retail }; });
    var hasRx = lines.some(function (l) { return l.kind !== 'OTC'; });
    if (hasRx && !S.rxData) { toast('Upload your prescription first.'); return; }
    var err = null, no = orderNo(), chronic = lines.filter(function (l) { var p = byId(l.productId); return p && p.chronic; });
    Store.update(function (s) {
      err = allocate(s, lines); if (err) return;
      var sub = lines.reduce(function (a, l) { return a + l.qty * l.unit; }, 0), fee = SLOTS[S.slot].fee, now = new Date().toISOString();
      var st = hasRx ? 'awaiting_rx' : 'new';
      s.orders.unshift({ no: no, channel: 'retail', customerId: null, customer: S.buyer.trim(), phone: S.phone.trim(), lines: lines, status: st, rx: hasRx ? { status: 'pending', file: S.rxName || 'prescription.jpg' } : null,
        slot: SLOTS[S.slot].label, payment: PAYS[S.pay], paid: S.pay !== 'cod', subtotal: sub, fee: fee, total: sub + fee, createdAt: now, history: [{ status: st, at: now }] });
      if (S.remind && chronic.length) {
        var due = new Date(); due.setDate(due.getDate() + 30);
        chronic.forEach(function (l) { s.reminders.unshift({ phone: S.phone.trim(), productId: l.productId, name: l.name, due: due.toISOString().slice(0, 10) }); });
      }
    });
    if (err) { toast(err); return; }
    S.placed = { no: no, hasRx: hasRx, pay: S.pay, remind: S.remind && chronic.length > 0 };
    S.cart = []; S.rxData = null; S.rxName = ''; remember();
    renderShop();
  }
  function placeB2B() {
    var c = custById(S.b2bId); if (!c) return;
    var lines = Object.keys(S.b2bQty).filter(function (id) { return S.b2bQty[id] > 0; }).map(function (id) { var p = byId(id); return { productId: id, name: p.name, kind: p.kind, qty: S.b2bQty[id], unit: p.wholesale }; });
    if (!lines.length) { toast('Enter a quantity for at least one product.'); return; }
    var total = lines.reduce(function (a, l) { return a + l.qty * l.unit; }, 0);
    var avail = (c.creditLimit || 0) - (c.creditUsed || 0);
    if (total > avail) { toast('This order is over the available credit of ' + etb(avail) + '.'); return; }
    var err = null, no = orderNo();
    Store.update(function (s) {
      err = allocate(s, lines); if (err) return;
      var now = new Date().toISOString();
      s.orders.unshift({ no: no, channel: 'b2b', customerId: c.id, customer: c.name, phone: '', lines: lines, status: 'new', rx: null, slot: 'Next delivery run', payment: 'Credit, ' + (c.terms || 30) + ' days', paid: false, subtotal: total, fee: 0, total: total, createdAt: now, history: [{ status: 'new', at: now }] });
      var cc = s.customers.filter(function (x) { return x.id === c.id; })[0]; cc.creditUsed = (cc.creditUsed || 0) + total;
    });
    if (err) { toast(err); return; }
    S.b2bQty = {}; toast('Order ' + no + ' placed on credit.');
  }

  /* ---------- routing ---------- */
  function setRole() { $$('.roles a').forEach(function (a) { if (a.getAttribute('data-role') === S.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
  function route() {
    var h = (location.hash || '').slice(1);
    S.view = ['shop', 'track', 'b2b', 'office'].indexOf(h) >= 0 ? h : 'shop';
    $('#app').innerHTML = ''; setRole(); render(); window.scrollTo(0, 0);
  }
  function render() {
    if (S.view === 'b2b') renderB2B(); else if (S.view === 'office') renderOffice(); else if (S.view === 'track') renderTrack(); else renderShop();
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('silondis:lang', function (e) { S.lang = e.detail; if (S.view === 'shop') { $('#app').innerHTML = ''; renderShop(); } });
  Store.subscribe(function () {
    var ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && ae.type !== 'radio' && ae.type !== 'checkbox') { if (S.view === 'shop' && $('#grid')) drawGrid(); return; }
    if (S.view === 'shop' && $('#shop-root')) { drawGrid(); drawCart(); } else render();
  });

  /* ================= SHOP ================= */
  function renderShop() {
    var app = $('#app'), prods = D().products;
    var cats = ['All'].concat(prods.map(function (p) { return p.category; }).filter(function (c, i, a) { return c !== 'Controlled' && a.indexOf(c) === i; }).sort());
    if (!$('#shop-root')) {
      app.innerHTML = '<div id="shop-root" class="shop"><div class="stack" id="shop-main"></div><aside class="card cart" id="cart" aria-label="Your order"></aside></div>';
      $('#shop-main').innerHTML =
        '<div class="row spread"><div><h1 class="h1" id="shop-h"></h1><p class="muted small" id="shop-sub"></p></div></div>' +
        '<div id="refills"></div>' +
        '<div class="rx-band"><div style="flex:1 1 240px;min-width:0"><h2 class="h2" id="rx-t"></h2><p id="rx-b"></p></div><label class="btn" for="rx-file" id="rx-l"></label><input type="file" id="rx-file" accept="image/*,application/pdf" class="sr"></div>' +
        '<label class="sr" for="q">Search</label><input type="search" id="q" autocomplete="off">' +
        '<div class="chips" id="cats" role="group" aria-label="Categories"></div>' +
        '<div class="grid" id="grid"></div>';
      $('#q').value = S.q;
      $('#q').addEventListener('input', function (e) { S.q = e.target.value; drawGrid(); });
      $('#rx-file').addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0]; if (!f) return;
        S.rxName = f.name;
        if (f.type.indexOf('image/') === 0) { var r = new FileReader(); r.onload = function () { S.rxData = r.result; drawCart(); }; r.readAsDataURL(f); } else { S.rxData = 'file'; drawCart(); }
        toast('Prescription attached. Add the prescribed medicines to your cart.');
      });
    }
    $('#shop-h').textContent = t('h'); $('#shop-sub').textContent = t('sub');
    $('#rx-t').textContent = t('rxTitle'); $('#rx-b').textContent = t('rxBody'); $('#rx-l').textContent = t('rxBtn');
    $('#q').placeholder = t('search');
    $('#cats').innerHTML = cats.map(function (c) { return '<button class="chip" data-act="cat" data-v="' + esc(c) + '" aria-pressed="' + (S.cat === c) + '">' + esc(c === 'All' ? t('all') : c) + '</button>'; }).join('');
    drawRefills(); drawGrid(); drawCart();
  }
  function drawRefills() {
    var el = $('#refills'); if (!el) return;
    var ph = S.phone.trim(); if (!ph) { el.innerHTML = ''; return; }
    var rs = D().reminders.filter(function (r) { return r.phone === ph; }).slice(0, 2);
    el.innerHTML = rs.map(function (r) {
      var days = Math.round((new Date(r.due) - new Date()) / 864e5);
      return '<div class="refill"><span><strong>' + esc(r.name) + '</strong> refill due ' + (days <= 0 ? 'now' : 'in ' + days + ' days') + ' (' + esc(r.due) + ').</span><button class="btn small" data-act="add" data-id="' + esc(r.productId) + '">Add to cart</button></div>';
    }).join('');
  }
  function drawGrid() {
    var q = S.q.trim().toLowerCase();
    var list = D().products.filter(function (p) { return p.kind !== 'Controlled' && (S.cat === 'All' || p.category === S.cat) && (!q || (p.name + ' ' + (p.am || '') + ' ' + p.category).toLowerCase().indexOf(q) >= 0); })
      .sort(function (a, b) { return (a.kind === 'OTC' ? 0 : 1) - (b.kind === 'OTC' ? 0 : 1) || a.name.localeCompare(b.name); });
    $('#grid').innerHTML = list.length ? list.map(function (p) {
      var out = sellable(p) < 1;
      return '<article class="card prod"><button class="thumb" data-act="detail" data-id="' + esc(p.id) + '" aria-label="' + esc(t('details')) + ': ' + esc(p.name) + '">' + svg(iconFor(p), 28) + '</button>' +
        '<div><button class="prod-name" data-act="detail" data-id="' + esc(p.id) + '">' + esc(p.name) + '</button><span class="sub am">' + esc(p.am || '') + '</span><span class="sub">' + esc(p.pack) + '</span></div>' +
        '<div class="row" style="gap:6px">' + (p.kind === 'OTC' ? '<span class="pill neutral">OTC</span>' : '<span class="pill info">' + esc(t('needsRx')) + '</span>') + (p.cold ? '<span class="pill info">2–8 °C</span>' : '') + '</div>' +
        '<div class="foot"><span class="price num">' + etb(p.retail) + '</span>' +
        (out ? '<span class="pill bad">' + esc(t('out')) + '</span>' : '<button class="btn small primary" data-act="add" data-id="' + esc(p.id) + '" aria-label="Add ' + esc(p.name) + '">' + esc(t('add')) + '</button>') + '</div></article>';
    }).join('') : '<div class="card empty" style="grid-column:1/-1">No medicines match that search. Try the generic name, for example paracetamol.</div>';
  }
  function drawCart() {
    var el = $('#cart'); if (!el) return;
    if (S.placed) {
      var pl = S.placed;
      el.innerHTML = '<div class="done-card card"><span class="pill ok" style="align-self:flex-start">Order placed</span><h2 class="h1" style="font-size:22px">' + esc(pl.no) + '</h2>' +
        '<p class="muted">' + (pl.pay === 'cod' ? 'Pay the rider when it arrives.' : 'Payment received (simulated).') + ' ' + (pl.hasRx ? 'A pharmacist will check your prescription before packing.' : 'We are packing it now.') + '</p>' +
        (pl.remind ? '<p class="small muted">We will remind you to refill your chronic medicines in 30 days.</p>' : '') +
        '<div class="row"><a class="btn primary" href="#track" data-act="track-placed" data-id="' + esc(pl.no) + '">Track this order</a><button class="btn" data-act="new-order">New order</button></div></div>';
      return;
    }
    var lines = S.cart.map(function (c) { return { c: c, p: byId(c.id) }; }).filter(function (x) { return x.p; });
    var sub = lines.reduce(function (a, x) { return a + x.c.qty * x.p.retail; }, 0), fee = lines.length ? SLOTS[S.slot].fee : 0;
    var hasRx = lines.some(function (x) { return x.p.kind !== 'OTC'; }), hasChronic = lines.some(function (x) { return x.p.chronic; });
    var h = '<h2 class="h2">' + esc(t('cart')) + '</h2>';
    if (!lines.length) h += '<p class="muted small">' + esc(t('empty')) + '</p>';
    else {
      h += '<div>' + lines.map(function (x) { return '<div class="line"><div style="min-width:0"><div style="font-weight:650">' + esc(x.p.name) + '</div><span class="sub num">' + etb(x.p.retail) + ' each</span></div>' +
        '<div class="qty"><button data-act="dec" data-id="' + esc(x.p.id) + '" aria-label="One less ' + esc(x.p.name) + '">−</button><span class="num" style="min-width:22px;text-align:center">' + x.c.qty + '</span><button data-act="inc" data-id="' + esc(x.p.id) + '" aria-label="One more ' + esc(x.p.name) + '">+</button></div></div>'; }).join('') + '</div>';
      if (hasRx) h += S.rxData ? '<div class="notice ok"><div><strong>Prescription attached</strong><br>' + esc(S.rxName) + '</div></div>' + (S.rxData !== 'file' ? '<img class="rx-preview" alt="Your prescription" src="' + S.rxData + '">' : '')
        : '<div class="notice warn"><div><strong>Prescription needed.</strong> Use “' + esc(t('rxBtn')) + '” to attach it before you order.</div></div>';
      h += '<div class="form-grid"><label class="f" for="buyer">' + esc(t('name')) + '<input type="text" id="buyer" value="' + esc(S.buyer) + '" autocomplete="name"></label><label class="f" for="phone">' + esc(t('phone')) + '<input type="tel" id="phone" value="' + esc(S.phone) + '" placeholder="09…" autocomplete="tel"></label></div>';
      h += '<fieldset style="border:0;padding:0;margin:0" class="stack"><legend class="h3" style="margin-bottom:6px">' + esc(t('when')) + '</legend><div class="opts">' + Object.keys(SLOTS).map(function (k) { return '<label class="opt"><input type="radio" name="slot" value="' + k + '" ' + (S.slot === k ? 'checked' : '') + '>' + esc(SLOTS[k].label) + '</label>'; }).join('') + '</div></fieldset>';
      h += '<fieldset style="border:0;padding:0;margin:0" class="stack"><legend class="h3" style="margin-bottom:6px">' + esc(t('pay')) + '</legend><div class="opts">' + Object.keys(PAYS).map(function (k) { return '<label class="opt"><input type="radio" name="pay" value="' + k + '" ' + (S.pay === k ? 'checked' : '') + '>' + esc(PAYS[k]) + '</label>'; }).join('') + '</div><span class="sub">In the live system, online payments go through Chapa. Here they are simulated.</span></fieldset>';
      if (hasChronic) h += '<label class="chk" for="remind"><input type="checkbox" id="remind" ' + (S.remind ? 'checked' : '') + '>Remind me to refill my long-term medicines in 30 days</label>';
      h += '<div class="stack" style="gap:4px"><div class="row spread small muted"><span>' + esc(t('items')) + '</span><span class="num">' + etb(sub) + '</span></div><div class="row spread small muted"><span>' + esc(t('delivery')) + '</span><span class="num">' + etb(fee) + '</span></div><div class="row spread" style="font-weight:700;font-size:16px"><span>' + esc(t('total')) + '</span><span class="num">' + etb(sub + fee) + '</span></div></div>';
      h += '<button class="btn primary" data-act="place" ' + (hasRx && !S.rxData ? 'disabled' : '') + '>' + esc(t('place')) + (S.pay === 'telebirr' ? ' · telebirr' : '') + '</button>';
    }
    el.innerHTML = h;
    var b = $('#buyer'), ph = $('#phone'), rm = $('#remind');
    if (b) b.addEventListener('input', function (e) { S.buyer = e.target.value; remember(); });
    if (ph) ph.addEventListener('change', function (e) { S.phone = e.target.value; remember(); drawRefills(); });
    if (rm) rm.addEventListener('change', function (e) { S.remind = e.target.checked; });
    $$('input[name=slot]', el).forEach(function (r) { r.addEventListener('change', function (e) { S.slot = e.target.value; drawCart(); }); });
    $$('input[name=pay]', el).forEach(function (r) { r.addEventListener('change', function (e) { S.pay = e.target.value; drawCart(); }); });
  }
  function showDetail(id) {
    var p = byId(id), dlg = $('#product-dialog'); if (!p || !dlg) return;
    var st = sellable(p);
    dlg.innerHTML = '<div class="pd"><div class="row spread" style="align-items:flex-start"><div><h2 class="h1" id="pd-title" style="font-size:22px">' + esc(p.name) + '</h2><span class="sub am" style="font-size:14px">' + esc(p.am || '') + '</span></div><button class="btn small ghost" data-act="close-dialog" aria-label="Close">Close</button></div>' +
      '<div class="row" style="gap:6px">' + kindPill(p.kind) + (p.cold ? '<span class="pill info">Cold chain 2–8 °C</span>' : '') + (st < 1 ? '<span class="pill bad">Out of stock</span>' : '<span class="pill ok">In stock</span>') + '</div>' +
      '<dl><dt>Form</dt><dd>' + esc(p.form || '') + '</dd><dt>Pack</dt><dd>' + esc(p.pack) + '</dd><dt>Category</dt><dd>' + esc(p.category) + '</dd><dt>Storage</dt><dd>' + esc(p.storage || 'As on the label') + '</dd><dt>GTIN</dt><dd class="mono">' + esc(p.gtin || '') + '</dd></dl>' +
      '<div class="notice warn"><div>Take this medicine as your doctor or pharmacist tells you and as the label says. ' + (p.kind !== 'OTC' ? 'It needs a valid prescription, which our pharmacist checks before dispensing.' : 'Ask our pharmacist if you are pregnant, breastfeeding, or take other medicines.') + '</div></div>' +
      '<div class="row spread"><span class="price num" style="font-size:18px">' + etb(p.retail) + '</span>' + (st < 1 ? '' : '<button class="btn primary" data-act="add" data-id="' + esc(p.id) + '" data-close="1">Add to cart</button>') + '</div></div>';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }

  /* ================= TRACK ================= */
  function renderTrack() {
    var r = S.trackResult;
    var steps = ['awaiting_rx', 'new', 'packing', 'out_for_delivery', 'delivered'];
    var stepLabel = { awaiting_rx: 'Prescription check', new: 'Order received', packing: 'Packing by batch', out_for_delivery: 'Out for delivery', delivered: 'Delivered' };
    var res = '';
    if (r === 'none') res = '<div class="notice bad"><div>We could not find an order with that number and phone. Check both and try again.</div></div>';
    else if (r) {
      var o = orderBy(r);
      if (o) {
        var seq = steps.filter(function (s) { return s !== 'awaiting_rx' || o.rx; });
        var at = {}; (o.history || []).forEach(function (h) { at[h.status] = h.at; });
        var cur = seq.indexOf(o.status);
        res = '<div class="card" style="padding:22px;display:flex;flex-direction:column;gap:16px"><div class="row spread"><div><span class="sub">Order</span><b class="h1" style="font-size:22px">' + esc(o.no) + '</b></div>' + statusPill(o.status) + '</div>' +
          (o.status === 'cancelled' ? '<div class="notice bad"><div>This order was cancelled' + (o.rx && o.rx.status === 'rejected' ? ' because the prescription could not be accepted. Our pharmacist will call you.' : '.') + '</div></div>' :
          '<ol class="tl">' + seq.map(function (s, i) { var cls = i < cur || o.status === 'delivered' ? 'done' : i === cur ? 'now' : ''; return '<li class="' + cls + '"><span class="dot">' + (cls === 'done' ? svg('check', 15, 3) : '') + '</span><div><b>' + stepLabel[s] + '</b><span class="sub">' + (at[s] ? esc(fmtDate(at[s])) : i === cur ? 'In progress' : 'Waiting') + '</span></div></li>'; }).join('') + '</ol>') +
          '<div class="stack" style="gap:6px">' + (o.lines || []).map(function (l) { return '<div class="row spread small"><span>' + esc(l.qty) + ' × ' + esc(l.name) + '</span><span class="mono">' + (l.picks || []).map(function (p) { return esc(p.batch); }).join(', ') + '</span></div>'; }).join('') + '</div>' +
          '<div class="row spread" style="border-top:1px solid var(--line);padding-top:12px"><span class="muted">' + esc(o.slot) + ' · ' + esc(o.payment) + '</span><b class="num">' + etb(o.total) + '</b></div></div>';
      }
    }
    var mine = S.phone.trim() ? D().orders.filter(function (o) { return o.channel === 'retail' && o.phone === S.phone.trim(); }).slice(0, 5) : [];
    $('#app').innerHTML = '<div class="two" style="align-items:start"><form class="card" id="track-form" style="padding:22px;display:flex;flex-direction:column;gap:14px" novalidate>' +
      '<h1 class="h1">Track an order</h1><p class="muted">Enter the order number from your confirmation and the phone number you ordered with.</p>' +
      '<div class="form-grid"><label class="f" for="tr-no">Order number<input type="text" id="tr-no" class="mono" placeholder="SO-…" value="' + esc(S.trackNo) + '"></label><label class="f" for="tr-ph">Phone number<input type="tel" id="tr-ph" value="' + esc(S.trackPhone || S.phone) + '"></label></div>' +
      '<button class="btn primary" type="submit" style="align-self:flex-start">Find my order</button>' +
      '<p class="sub">Try the sample order <span class="mono">SO-DEMO1</span> with phone <span class="mono">0900000000</span>.</p>' +
      (mine.length ? '<div class="stack" style="gap:8px;border-top:1px solid var(--line);padding-top:14px"><h2 class="h3">Your recent orders</h2>' + mine.map(function (o) { return '<button type="button" class="btn small" style="justify-content:space-between" data-act="track-pick" data-id="' + esc(o.no) + '"><span class="mono">' + esc(o.no) + '</span>' + statusPill(o.status) + '</button>'; }).join('') + '</div>' : '') +
      '</form><div>' + res + '</div></div>';
    $('#track-form').addEventListener('submit', function (e) {
      e.preventDefault();
      S.trackNo = $('#tr-no').value.trim().toUpperCase(); S.trackPhone = $('#tr-ph').value.trim();
      var o = orderBy(S.trackNo);
      S.trackResult = o && (o.channel === 'b2b' || o.phone === S.trackPhone) ? o.no : 'none';
      renderTrack();
    });
  }

  /* ================= B2B ================= */
  function renderB2B() {
    var d = D();
    if (!d.customers.length) { $('#app').innerHTML = '<div class="card empty">No pharmacy accounts yet. Approve an application in the back office to add one.</div>'; return; }
    if (!custById(S.b2bId)) S.b2bId = d.customers[0].id;
    var c = custById(S.b2bId);
    var licOk = monthsLeft(c.licenceExpiry || '2000-01') >= 0;
    var licSoon = licOk && monthsLeft(c.licenceExpiry) <= 3;
    var avail = (c.creditLimit || 0) - (c.creditUsed || 0);
    var lines = Object.keys(S.b2bQty).filter(function (id) { return S.b2bQty[id] > 0; });
    var total = lines.reduce(function (a, id) { var p = byId(id); return a + (p ? p.wholesale * S.b2bQty[id] : 0); }, 0);
    var deals = d.products.filter(isDeal);
    var q = S.b2bQ.trim().toLowerCase();
    var rows = d.products.filter(function (p) { return (!q || (p.name + ' ' + (p.gtin || '')).toLowerCase().indexOf(q) >= 0) && (!S.b2bDeals || isDeal(p)); });
    var mine = d.orders.filter(function (o) { return o.channel === 'b2b' && o.customerId === c.id; });
    var unpaid = mine.filter(function (o) { return !o.paid && o.status !== 'cancelled'; });
    var last = {}; mine.slice().reverse().forEach(function (o) { (o.lines || []).forEach(function (l) { last[l.productId] = { qty: l.qty, at: o.createdAt }; }); });
    var app = $('#app');
    app.innerHTML = '<div class="stack">' +
      '<div class="row spread" style="align-items:flex-end"><div><h1 class="h1">Quick reorder</h1><p class="muted small">Wholesale prices for licensed pharmacies, drug shops and clinics. Orders by 2 pm go out on today’s run.</p></div>' +
      '<label class="f" for="cust" style="flex:0 1 340px;min-width:240px">Signed in as (demo)<select id="cust">' + d.customers.map(function (x) { return '<option value="' + esc(x.id) + '" ' + (x.id === c.id ? 'selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></label></div>' +
      (licOk ? (licSoon ? '<div class="notice warn"><div><strong>Your EFDA licence expires in ' + esc(c.licenceExpiry) + '.</strong> Send the renewed licence before then to keep ordering.</div></div>' : '') : '<div class="notice bad"><div><strong>Ordering is blocked: the EFDA licence on file expired (' + esc(c.licenceExpiry) + ').</strong> Send the renewed licence to Silondis to reopen the account.</div></div>') +
      '<div class="tiles">' +
      '<div class="card tile"><span class="small muted">EFDA licence</span><span class="v" style="font-size:15px;font-family:var(--font)">' + esc(c.licenceNo || '') + '</span><span class="small">' + (licOk ? '<span class="pill ok">Valid to ' + esc(c.licenceExpiry) + '</span>' : '<span class="pill bad">Expired</span>') + '</span></div>' +
      '<div class="card tile"><span class="small muted">Credit available</span><span class="v num">' + etb(avail) + '</span><span class="small muted num">of ' + etb(c.creditLimit) + ' · ' + esc(c.terms || 30) + '-day terms</span></div>' +
      '<div class="card tile"><span class="small muted">Unpaid invoices</span><span class="v num">' + unpaid.length + '</span><span class="small muted num">' + etb(unpaid.reduce(function (a, o) { return a + o.total; }, 0)) + '</span></div>' +
      '<button class="card tile warn" data-act="deals"><span class="small">Short-expiry deals</span><span class="v num">' + deals.length + ' products</span><span class="small">' + (S.b2bDeals ? 'Showing deals only · show all' : '3 to 6 months left · show only these') + '</span></button>' +
      '</div>' +
      '<label class="sr" for="b2bq">Search the catalogue</label><input type="search" id="b2bq" placeholder="Search by generic name or GTIN" value="' + esc(S.b2bQ) + '">' +
      '<div class="tbl-box"><table class="t"><thead><tr><th>Product</th><th>Pack</th><th>Type</th><th>Last ordered</th><th class="r">Stock</th><th class="r">Your price</th><th>Order qty</th></tr></thead><tbody>' +
      rows.map(function (p) {
        var st = sellable(p), lo = last[p.id];
        return '<tr><td><strong>' + esc(p.name) + '</strong>' + (isDeal(p) ? ' <span class="pill warn">Deal</span>' : '') + '<span class="sub mono">GTIN ' + esc(p.gtin || '') + '</span></td><td>' + esc(p.packB2B || p.pack) + '</td><td>' + kindPill(p.kind) + (p.cold ? ' <span class="pill info">2–8 °C</span>' : '') + '</td>' +
          '<td class="small">' + (lo ? esc(lo.qty) + ' on ' + esc(fmtDate(lo.at).split(',')[0]) + ' <button class="btn small ghost" data-act="again" data-id="' + esc(p.id) + '" data-q="' + esc(lo.qty) + '">Same again</button>' : '<span class="muted">Never</span>') + '</td>' +
          '<td class="r num">' + (st < 1 ? '<span class="pill bad">Out</span>' : st <= (p.reorder || 0) ? '<span class="pill warn">' + st + ' low</span>' : st) + '</td><td class="r num">' + etb(p.wholesale) + '</td>' +
          '<td><label class="sr" for="bq-' + esc(p.id) + '">Quantity of ' + esc(p.name) + '</label><input type="number" min="0" max="' + st + '" id="bq-' + esc(p.id) + '" data-bq="' + esc(p.id) + '" value="' + (S.b2bQty[p.id] || '') + '" style="width:86px" ' + (st < 1 || !licOk ? 'disabled' : '') + '></td></tr>';
      }).join('') + (rows.length ? '' : '<tr><td colspan="7" class="empty">Nothing matches this search.</td></tr>') +
      '</tbody></table></div>' +
      '<div class="card dark-bar" style="padding:16px 20px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between"><div><strong class="num">' + lines.length + ' lines · ' + etb(total) + '</strong><span class="sub">Charged to credit · delivered on the next run</span></div><button class="btn primary" data-act="b2b-place" ' + (!licOk || !lines.length ? 'disabled' : '') + '>Place order</button></div>' +
      '<section class="stack"><div class="row spread"><h2 class="h2">Orders and invoices</h2>' + (unpaid.length ? '<button class="btn small" data-act="pay-balance">Pay balance by telebirr (simulated)</button>' : '') + '</div>' +
      (mine.length ? '<div class="tbl-box"><table class="t"><thead><tr><th>Order</th><th>Placed</th><th>Lines</th><th class="r">Total</th><th>Status</th><th>Invoice</th></tr></thead><tbody>' + mine.slice(0, 8).map(function (o) { return '<tr><td class="mono">' + esc(o.no) + '</td><td>' + esc(fmtDate(o.createdAt)) + '</td><td class="num">' + (o.lines || []).length + '</td><td class="r num">' + etb(o.total) + '</td><td>' + statusPill(o.status) + '</td><td>' + (o.status === 'cancelled' ? '<span class="pill neutral">Void</span>' : o.paid ? '<span class="pill ok">Paid</span>' : '<span class="pill warn">Due</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted small">No orders yet from this account.</p>') +
      '</section></div>';
    $('#cust').addEventListener('change', function (e) { S.b2bId = e.target.value; S.b2bQty = {}; remember(); renderB2B(); });
    $('#b2bq').addEventListener('input', function (e) { S.b2bQ = e.target.value; renderB2B(); var n = $('#b2bq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
    $$('[data-bq]', app).forEach(function (inp) { inp.addEventListener('change', function (e) { var v = Math.max(0, Math.min(Number(e.target.max) || 0, parseInt(e.target.value, 10) || 0)); S.b2bQty[e.target.getAttribute('data-bq')] = v; renderB2B(); }); });
  }

  /* ================= OFFICE ================= */
  function allLots() { var out = []; D().products.forEach(function (p) { lotsOf(p).forEach(function (l) { out.push({ p: p, l: l, m: monthsLeft(l.expiry) }); }); }); return out; }
  function renderOffice() {
    var d = D(), lots = allLots(), live = lots.filter(function (x) { return x.l.qty > 0; });
    var exp3 = live.filter(function (x) { return x.m <= 3 && x.l.status !== 'quarantine'; }).length;
    var low = d.products.filter(function (p) { return sellable(p) <= (p.reorder || 0); }).length;
    var rxWait = d.orders.filter(function (o) { return o.status === 'awaiting_rx'; }).length;
    var open = d.orders.filter(function (o) { return ['delivered', 'cancelled'].indexOf(o.status) < 0; }).length;
    var apps = d.applications.filter(function (a) { return a.status === 'new'; }).length;
    var tabs = [['dashboard', 'Dashboard'], ['orders', 'Orders' + (open ? ' (' + open + ')' : '')], ['stock', 'Stock by batch'], ['receive', 'Receive goods'], ['purchasing', 'Purchasing' + (low ? ' (' + low + ')' : '')], ['customers', 'Customers' + (apps ? ' (' + apps + ' new)' : '')]];
    $('#app').innerHTML = '<div class="stack"><div class="row spread"><div><h1 class="h1">Back office</h1><p class="muted small">Main warehouse, Addis Ababa · picking follows first-expiry, first-out</p></div><div class="row"><button class="btn small" data-act="export">Export EFDA-MVC events</button><button class="btn small ghost" data-act="reset">Reset demo data</button></div></div>' +
      '<div class="tiles">' +
      '<button class="card tile' + (rxWait ? ' warn' : '') + '" data-act="tab" data-v="orders" data-f="rx"><span class="small muted">Prescriptions to check</span><span class="v num">' + rxWait + '</span><span class="small muted">' + open + ' open orders</span></button>' +
      '<button class="card tile' + (exp3 ? ' bad' : '') + '" data-act="stockf" data-v="exp3"><span class="small muted">Lots expiring within 3 months</span><span class="v num">' + exp3 + '</span><span class="small muted">Clear or return</span></button>' +
      '<button class="card tile" data-act="tab" data-v="purchasing"><span class="small muted">Products at reorder point</span><span class="v num">' + low + '</span><span class="small muted">Draft purchase orders</span></button>' +
      '<button class="card tile" data-act="tab" data-v="customers"><span class="small muted">Wholesale applications</span><span class="v num">' + apps + '</span><span class="small muted">Waiting for licence check</span></button>' +
      '</div>' +
      '<div class="tabs" role="tablist">' + tabs.map(function (x) { return '<button role="tab" aria-selected="' + (S.tab === x[0]) + '" data-act="tab" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><div id="tabpane"></div></div>';
    ({ dashboard: drawDash, orders: drawOrders, stock: drawStock, receive: drawReceive, purchasing: drawPurchasing, customers: drawCustomers }[S.tab] || drawDash)();
  }

  function drawDash() {
    var d = D(), days = [], i;
    for (i = 6; i >= 0; i--) { var dt = new Date(); dt.setDate(dt.getDate() - i); days.push(dt.toISOString().slice(0, 10)); }
    var sum = days.map(function (day) { var r = 0, b = 0; d.orders.forEach(function (o) { if (o.status === 'cancelled' || String(o.createdAt).slice(0, 10) !== day) return; if (o.channel === 'b2b') b += o.total; else r += o.total; }); return { day: day, r: r, b: b }; });
    var week = sum.reduce(function (a, x) { return a + x.r + x.b; }, 0);
    var wRetail = sum.reduce(function (a, x) { return a + x.r; }, 0);
    var max = Math.max.apply(null, sum.map(function (x) { return x.r + x.b; }).concat([1]));
    var nice = Math.pow(10, Math.floor(Math.log10(max))); var top = Math.ceil(max / nice) * nice;
    var W = 640, H = 240, L = 64, B = 30, cw = (W - L - 12) / 7;
    var y = function (v) { return H - B - (v / top) * (H - B - 16); };
    var ticks = [0, top / 2, top];
    var bars = sum.map(function (x, k) {
      var x0 = L + k * cw + cw * 0.2, w = cw * 0.6, dayLbl = new Date(x.day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' });
      return '<g><title>' + esc(x.day) + ': retail ' + etb(x.r) + ', wholesale ' + etb(x.b) + '</title>' +
        '<rect x="' + x0 + '" y="' + y(x.b) + '" width="' + w + '" height="' + (H - B - y(x.b)) + '" rx="3" fill="var(--green)"/>' +
        '<rect x="' + x0 + '" y="' + y(x.b + x.r) + '" width="' + w + '" height="' + (y(x.b) - y(x.b + x.r)) + '" rx="3" fill="var(--mint)"/>' +
        '<text x="' + (x0 + w / 2) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="12" fill="var(--muted)">' + dayLbl + '</text></g>';
    }).join('');
    var grid = ticks.map(function (v) { return '<line x1="' + L + '" x2="' + (W - 8) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--line)"/><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-size="11.5" fill="var(--muted)">' + (v >= 1000 ? Math.round(v / 1000) + 'k' : v) + '</text>'; }).join('');
    var tally = {}; d.orders.forEach(function (o) { if (o.status === 'cancelled') return; (o.lines || []).forEach(function (l) { tally[l.name] = (tally[l.name] || 0) + l.qty * l.unit; }); });
    var topP = Object.keys(tally).map(function (k) { return [k, tally[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
    var tmax = topP.length ? topP[0][1] : 1;
    var stockVal = D().products.reduce(function (a, p) { return a + sellable(p) * p.wholesale; }, 0);
    $('#tabpane').innerHTML = '<div class="stack"><div class="tiles">' +
      '<div class="card tile"><span class="small muted">Sales, last 7 days</span><span class="v num">' + etb(week) + '</span><span class="small muted">' + (week ? Math.round(wRetail / week * 100) : 0) + '% retail, the rest wholesale</span></div>' +
      '<div class="card tile"><span class="small muted">Orders today</span><span class="v num">' + d.orders.filter(function (o) { return String(o.createdAt).slice(0, 10) === days[6]; }).length + '</span><span class="small muted">Retail and wholesale</span></div>' +
      '<div class="card tile"><span class="small muted">Sellable stock at cost</span><span class="v num">' + etb(stockVal) + '</span><span class="small muted">Excludes quarantined and expiring lots</span></div>' +
      '</div><div class="two"><div class="card chart" style="padding:18px"><div class="row spread"><h2 class="h2">Sales by day, ETB</h2><div class="legend"><span><i style="background:var(--green)"></i>Wholesale</span><span><i style="background:var(--mint)"></i>Retail</span></div></div>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Sales by day for the last 7 days">' + grid + bars + '</svg></div>' +
      '<div class="card" style="padding:18px;display:flex;flex-direction:column;gap:12px"><h2 class="h2">Top products by sales</h2>' + (topP.length ? topP.map(function (x) { return '<div><div class="row spread small"><span>' + esc(x[0]) + '</span><span class="num">' + etb(x[1]) + '</span></div><div style="height:8px;border-radius:4px;background:var(--sunk);margin-top:5px"><div style="height:100%;width:' + (x[1] / tmax * 100) + '%;border-radius:4px;background:var(--green)"></div></div></div>'; }).join('') : '<p class="muted small">No sales yet.</p>') + '</div></div>' +
      '<p class="muted small">Sample sales history, generated when the demo data was created.</p></div>';
  }

  function drawOrders() {
    var f = S.orderFilter, d = D();
    var list = d.orders.filter(function (o) { return f === 'all' ? true : f === 'rx' ? o.status === 'awaiting_rx' : f === 'b2b' ? o.channel === 'b2b' : ['delivered', 'cancelled'].indexOf(o.status) < 0; });
    var chips = '<div class="chips" role="group" aria-label="Filter orders">' + [['open', 'Open'], ['rx', 'Awaiting Rx check'], ['b2b', 'Wholesale'], ['all', 'All']].map(function (x) { return '<button class="chip" data-act="of" data-v="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var body = list.length ? '<div class="tbl-box"><table class="t"><thead><tr><th>Order</th><th>Customer</th><th>Items and batches</th><th>Delivery and payment</th><th class="r">Total</th><th>Status</th><th>Action</th></tr></thead><tbody>' + list.slice(0, 60).map(function (o) {
      var items = (o.lines || []).map(function (l) { return esc(l.qty) + ' × ' + esc(l.name) + (l.kind !== 'OTC' ? ' <span class="pill info">Rx</span>' : '') + '<span class="sub mono">' + (l.picks || []).map(function (p) { return esc(p.batch) + ' (' + esc(p.qty) + ')'; }).join(', ') + '</span>'; }).join('');
      var act = '';
      if (o.status === 'awaiting_rx') act = '<div class="row" style="gap:6px"><button class="btn small primary" data-act="rx-ok" data-id="' + esc(o.no) + '">Approve Rx</button><button class="btn small danger" data-act="rx-no" data-id="' + esc(o.no) + '">Reject</button></div>';
      else if (NEXT[o.status]) act = '<button class="btn small" data-act="next" data-id="' + esc(o.no) + '">' + NEXT_LABEL[o.status] + '</button>';
      return '<tr><td><span class="mono">' + esc(o.no) + '</span><span class="sub">' + esc(fmtDate(o.createdAt)) + '</span><span class="sub">' + (o.channel === 'b2b' ? 'Wholesale' : 'Retail') + '</span></td>' +
        '<td>' + esc(o.customer) + (o.phone ? '<span class="sub">' + esc(o.phone) + '</span>' : '') + (o.rx ? '<span class="sub">Rx file: ' + esc(o.rx.file || '') + '</span>' : '') + '</td><td>' + items + '</td>' +
        '<td>' + esc(o.slot) + '<span class="sub">' + esc(o.payment) + (o.paid ? ' · paid' : '') + '</span></td><td class="r num">' + etb(o.total) + '</td><td>' + statusPill(o.status) + '</td><td>' + act + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="card empty">No orders in this list. Place one from the Shop or the Pharmacy portal and it appears here.</div>';
    $('#tabpane').innerHTML = '<div class="stack">' + chips + body + '</div>';
  }

  function drawStock() {
    var f = S.stockFilter, rows = allLots().filter(function (x) { return x.l.qty > 0; });
    var fl = { exp3: function (x) { return x.m <= 3 && x.l.status !== 'quarantine'; }, exp6: function (x) { return x.m > 3 && x.m <= 6 && x.l.status !== 'quarantine'; }, quar: function (x) { return x.l.status === 'quarantine'; }, cold: function (x) { return x.p.cold; }, ctrl: function (x) { return x.p.kind === 'Controlled'; } };
    if (fl[f]) rows = rows.filter(fl[f]);
    rows.sort(function (a, b) { return a.m - b.m; });
    var chips = '<div class="chips" role="group" aria-label="Filter lots">' + [['all', 'All lots'], ['exp3', 'Under 3 months'], ['exp6', '3 to 6 months'], ['cold', 'Cold chain'], ['ctrl', 'Controlled'], ['quar', 'Quarantined']].map(function (x) { return '<button class="chip" data-act="stockf" data-v="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var body = rows.length ? '<div class="tbl-box"><table class="t"><thead><tr><th>Product</th><th>Batch</th><th>Expiry</th><th>Shelf life</th><th>Location</th><th class="r">On hand</th><th>Status</th><th></th></tr></thead><tbody>' + rows.map(function (x) {
      return '<tr><td><strong>' + esc(x.p.name) + '</strong><span class="sub">' + kindPill(x.p.kind) + (x.p.cold ? ' <span class="pill info">2–8 °C</span>' : '') + '</span></td><td class="mono">' + esc(x.l.batch) + '</td><td class="num">' + esc(x.l.expiry) + '</td><td>' + leftPill(x.m) + '</td><td>' + esc(x.l.loc || '') + '</td><td class="r num">' + esc(x.l.qty) + '</td>' +
        '<td>' + (x.l.status === 'quarantine' ? '<span class="pill bad">Quarantined</span>' : x.m < 1 ? '<span class="pill bad">Blocked</span>' : '<span class="pill ok">Available</span>') + '</td>' +
        '<td><button class="btn small ghost" data-act="quar" data-p="' + esc(x.p.id) + '" data-b="' + esc(x.l.batch) + '">' + (x.l.status === 'quarantine' ? 'Release' : 'Quarantine') + '</button></td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="card empty">No lots match this filter.</div>';
    $('#tabpane').innerHTML = '<div class="stack">' + chips + body + '<p class="muted small">Sample lots. In the live system each lot is read from the GS1 DataMatrix code on the pack.</p></div>';
  }

  function drawReceive() {
    var r = S.recv, d = D();
    $('#tabpane').innerHTML = '<div class="two"><form class="card stack" id="recv-form" style="padding:20px" novalidate>' +
      '<h2 class="h2">Receive goods</h2><p class="muted small">Scan the GS1 DataMatrix with a 2D scanner into the first box, or type the details.' + (r.po ? ' Receiving against purchase order <span class="mono">' + esc(r.po) + '</span>.' : '') + '</p>' +
      '<label class="f" for="gs1">Scanned code<input type="text" id="gs1" class="mono" placeholder="(01)08900000000080(17)280731(10)AMX-2607" value="' + esc(r.gs1 || '') + '"></label>' +
      '<div class="form-grid">' +
      '<label class="f" for="r-prod">Product<select id="r-prod">' + d.products.map(function (p) { return '<option value="' + esc(p.id) + '" ' + (r.prod === p.id ? 'selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f" for="r-batch">Batch<input type="text" id="r-batch" class="mono" value="' + esc(r.batch || '') + '"></label>' +
      '<label class="f" for="r-exp">Expiry (YYYY-MM)<input type="text" id="r-exp" class="num" placeholder="2028-06" value="' + esc(r.exp || '') + '"></label>' +
      '<label class="f" for="r-qty">Quantity (packs)<input type="number" id="r-qty" min="1" value="' + esc(r.qty || '') + '"></label>' +
      '<label class="f" for="r-loc">Location<input type="text" id="r-loc" placeholder="Aisle A · Shelf 2" value="' + esc(r.loc || '') + '"></label>' +
      '</div><button class="btn primary" type="submit" style="align-self:flex-start">Add lot to stock</button></form>' +
      '<div class="card stack" style="padding:20px"><h2 class="h2">What happens next</h2><ol class="small" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">' +
      '<li>The lot joins stock and is picked in expiry order.</li><li>Lots with under 1 month left are never sold.</li><li>Lots with 3 to 6 months left show as deals in the pharmacy portal.</li><li>The receipt is included in the EFDA-MVC event export.</li></ol></div></div>';
    $('#gs1').addEventListener('change', function (e) {
      var s = e.target.value.trim(); S.recv.gs1 = s;
      var g = (s.match(/\(01\)(\d{14})/) || [])[1], ex = (s.match(/\(17\)(\d{6})/) || [])[1], b = (s.match(/\(10\)([^()]+)/) || [])[1];
      if (g) { var p = d.products.filter(function (x) { return x.gtin === g; })[0]; if (p) S.recv.prod = p.id; else toast('No product in the catalogue has GTIN ' + g + '.'); }
      if (ex) S.recv.exp = '20' + ex.slice(0, 2) + '-' + ex.slice(2, 4);
      if (b) S.recv.batch = b.trim();
      drawReceive();
    });
    $('#recv-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var prod = $('#r-prod').value, batch = $('#r-batch').value.trim(), exp = $('#r-exp').value.trim(), qty = parseInt($('#r-qty').value, 10), loc = $('#r-loc').value.trim();
      if (!batch || !/^\d{4}-\d{2}$/.test(exp) || !(qty > 0)) { toast('Enter a batch, an expiry as YYYY-MM and a quantity.'); return; }
      if (monthsLeft(exp) < 1) { toast('This batch expires within a month. Do not accept it into stock.'); return; }
      var po = S.recv.po, name = '';
      Store.update(function (s) {
        var p = s.products.filter(function (x) { return x.id === prod; })[0]; name = p.name;
        var same = p.lots.filter(function (l) { return l.batch === batch; })[0];
        if (same) { same.qty += qty; same.receivedAt = new Date().toISOString(); } else p.lots.push({ batch: batch, expiry: exp, qty: qty, loc: loc || 'Receiving bay', status: 'available', receivedAt: new Date().toISOString() });
        if (po) { var o = (s.purchaseOrders || []).filter(function (x) { return x.no === po; })[0]; if (o) o.status = 'received'; }
      });
      S.recv = {}; toast(qty + ' packs of ' + name + ' added as batch ' + batch + '.');
    });
  }

  function drawPurchasing() {
    var d = D(), pos = d.purchaseOrders || [];
    var need = d.products.filter(function (p) { return sellable(p) <= (p.reorder || 0); });
    $('#tabpane').innerHTML = '<div class="stack"><div class="stack" style="gap:8px"><h2 class="h2">Suggested reorders</h2><p class="muted small">Products at or below their reorder point. The suggestion brings stock up to three times the reorder point.</p></div>' +
      (need.length ? '<div class="tbl-box"><table class="t"><thead><tr><th>Product</th><th class="r">Sellable now</th><th class="r">Reorder point</th><th class="r">Suggested</th><th class="r">Cost</th><th></th></tr></thead><tbody>' + need.map(function (p) {
        var sug = Math.max(1, (p.reorder || 0) * 3 - sellable(p)), pending = pos.some(function (o) { return o.productId === p.id && o.status === 'ordered'; });
        return '<tr><td><strong>' + esc(p.name) + '</strong><span class="sub">' + esc(p.packB2B || p.pack) + '</span></td><td class="r num">' + sellable(p) + '</td><td class="r num">' + esc(p.reorder) + '</td><td class="r num">' + sug + '</td><td class="r num">' + etb(sug * p.wholesale * 0.8) + '</td><td>' + (pending ? '<span class="pill info">On order</span>' : '<button class="btn small primary" data-act="po" data-id="' + esc(p.id) + '" data-q="' + sug + '">Create purchase order</button>') + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="muted small">Cost shown at an assumed 80% of the wholesale price, for the demo.</p>' : '<div class="card empty">Every product is above its reorder point.</div>') +
      '<h2 class="h2">Purchase orders</h2>' + (pos.length ? '<div class="tbl-box"><table class="t"><thead><tr><th>PO</th><th>Product</th><th class="r">Qty</th><th>Created</th><th>Status</th><th></th></tr></thead><tbody>' + pos.map(function (o) { return '<tr><td class="mono">' + esc(o.no) + '</td><td>' + esc(o.name) + '</td><td class="r num">' + esc(o.qty) + '</td><td>' + esc(fmtDate(o.createdAt)) + '</td><td>' + (o.status === 'received' ? '<span class="pill ok">Received</span>' : '<span class="pill info">Ordered</span>') + '</td><td>' + (o.status === 'ordered' ? '<button class="btn small" data-act="po-recv" data-id="' + esc(o.no) + '">Receive</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted small">No purchase orders yet.</p>') + '</div>';
  }

  function drawCustomers() {
    var d = D(), apps = d.applications || [], msgs = d.messages || [];
    $('#tabpane').innerHTML = '<div class="stack">' +
      '<h2 class="h2">Wholesale applications</h2>' + (apps.length ? '<div class="tbl-box"><table class="t"><thead><tr><th>Ref</th><th>Business</th><th>Licence</th><th>Contact</th><th>Payment</th><th>Status</th><th></th></tr></thead><tbody>' + apps.map(function (a) {
        var ok = /^\d{4}-\d{2}$/.test(a.licenceExpiry || '') && monthsLeft(a.licenceExpiry) >= 0;
        return '<tr><td class="mono">' + esc(a.ref) + '</td><td><strong>' + esc(a.business) + '</strong><span class="sub">' + esc(a.type) + ' · ' + esc(a.area) + '</span></td><td class="mono">' + esc(a.licence) + '<span class="sub">to ' + esc(a.licenceExpiry) + ' ' + (ok ? '<span class="pill ok">Valid</span>' : '<span class="pill bad">Expired</span>') + '</span></td><td>' + esc(a.contact) + '<span class="sub">' + esc(a.phone) + '</span></td><td>' + esc(a.payment) + '<span class="sub">' + esc(a.volume) + '</span></td><td>' + (a.status === 'approved' ? '<span class="pill ok">Approved</span>' : a.status === 'declined' ? '<span class="pill bad">Declined</span>' : '<span class="pill warn">New</span>') + '</td>' +
          '<td>' + (a.status === 'new' ? '<div class="row" style="gap:6px"><button class="btn small primary" data-act="app-ok" data-id="' + esc(a.ref) + '" ' + (ok ? '' : 'disabled') + '>Approve</button><button class="btn small danger" data-act="app-no" data-id="' + esc(a.ref) + '">Decline</button></div>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card empty">No applications yet. Submit one from the <a href="contact.html#wholesale">contact page</a> and it appears here.</div>') +
      '<h2 class="h2">Accounts</h2><div class="tbl-box"><table class="t"><thead><tr><th>Account</th><th>Licence</th><th class="r">Credit used</th><th class="r">Limit</th><th>Terms</th></tr></thead><tbody>' + d.customers.map(function (c) { var ok = monthsLeft(c.licenceExpiry) >= 0; return '<tr><td><strong>' + esc(c.name) + '</strong><span class="sub">' + esc(c.type || '') + ' · ' + esc(c.area || '') + '</span></td><td class="mono">' + esc(c.licenceNo) + '<span class="sub">to ' + esc(c.licenceExpiry) + ' ' + (ok ? '' : '<span class="pill bad">Expired</span>') + '</span></td><td class="r num">' + etb(c.creditUsed) + '</td><td class="r num">' + etb(c.creditLimit) + '</td><td>' + esc(c.terms) + ' days · ' + esc(c.tier) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<h2 class="h2">Messages</h2>' + (msgs.length ? '<div class="stack" style="gap:10px">' + msgs.slice(0, 12).map(function (m) { return '<div class="card" style="padding:14px 16px"><div class="row spread"><b>' + esc(m.name || m.organisation || '') + '</b><span class="sub">' + esc(m.ref) + ' · ' + esc(fmtDate(m.createdAt)) + '</span></div><span class="sub">' + esc(m.kind === 'tender' ? 'Tender enquiry' + (m.reference ? ' · ' + m.reference : '') : m.topic || '') + ' · ' + esc(m.phone || '') + '</span><p style="margin-top:6px;white-space:pre-line">' + esc(m.message || '') + '</p></div>'; }).join('') + '</div>' : '<p class="muted small">No messages yet.</p>') + '</div>';
  }

  function exportEvents() {
    var d = D(), events = [];
    d.products.forEach(function (p) { lotsOf(p).forEach(function (l) { if (l.receivedAt) events.push({ type: 'ObjectEvent', bizStep: 'receiving', eventTime: l.receivedAt, gtin: p.gtin, lot: l.batch, expiry: l.expiry, quantity: l.qty, readPoint: 'Silondis main warehouse' }); }); });
    d.orders.forEach(function (o) { if (o.status === 'cancelled') return; (o.lines || []).forEach(function (ln) { var p = byId(ln.productId); (ln.picks || []).forEach(function (pk) { events.push({ type: 'ObjectEvent', bizStep: o.status === 'delivered' ? (o.channel === 'b2b' ? 'receiving_by_customer' : 'dispensing') : 'shipping', eventTime: o.createdAt, gtin: p ? p.gtin : '', lot: pk.batch, expiry: pk.expiry, quantity: pk.qty, destination: o.customer, order: o.no }); }); }); });
    var blob = new Blob([JSON.stringify({ format: 'EPCIS-style event list (demo)', generatedAt: new Date().toISOString(), events: events }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'silondis-efda-events.json'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast(events.length + ' events exported.');
  }

  /* ---------- clicks ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-act'), v = b.getAttribute('data-v'), id = b.getAttribute('data-id');
    if (a === 'cat') { S.cat = v; renderShop(); }
    else if (a === 'detail') { showDetail(id); }
    else if (a === 'close-dialog') { $('#product-dialog').close(); }
    else if (a === 'add' || a === 'inc') {
      var p = byId(id), c = S.cart.filter(function (x) { return x.id === id; })[0], have = c ? c.qty : 0;
      if (have + 1 > sellable(p)) { toast('Only ' + sellable(p) + ' in stock.'); return; }
      S.placed = null;
      if (c) c.qty++; else S.cart.push({ id: id, qty: 1 });
      if (b.getAttribute('data-close')) $('#product-dialog').close();
      if (S.view !== 'shop') location.hash = '#shop'; else drawCart();
      if (a === 'add') toast(p.name + ' added to your order.');
    }
    else if (a === 'dec') { var cc = S.cart.filter(function (x) { return x.id === id; })[0]; if (cc) { cc.qty--; if (cc.qty <= 0) S.cart = S.cart.filter(function (x) { return x.id !== id; }); } drawCart(); }
    else if (a === 'place') { placeRetail(); }
    else if (a === 'new-order') { S.placed = null; drawCart(); }
    else if (a === 'track-placed') { S.trackNo = id; S.trackPhone = S.phone; S.trackResult = id; S.placed = null; }
    else if (a === 'track-pick') { S.trackNo = id; S.trackPhone = S.phone; S.trackResult = id; renderTrack(); }
    else if (a === 'deals') { S.b2bDeals = !S.b2bDeals; renderB2B(); }
    else if (a === 'again') { S.b2bQty[id] = Math.min(sellable(byId(id)), Number(b.getAttribute('data-q')) || 1); renderB2B(); }
    else if (a === 'b2b-place') { placeB2B(); }
    else if (a === 'pay-balance') {
      var cust = custById(S.b2bId), paid = 0;
      Store.update(function (s) { s.orders.forEach(function (o) { if (o.customerId === cust.id && !o.paid && o.status !== 'cancelled') { o.paid = true; paid += o.total; } }); var x = s.customers.filter(function (y) { return y.id === cust.id; })[0]; x.creditUsed = Math.max(0, (x.creditUsed || 0) - paid); });
      toast(etb(paid) + ' paid by telebirr (simulated). Credit released.');
    }
    else if (a === 'tab') { S.tab = v; if (b.getAttribute('data-f')) S.orderFilter = b.getAttribute('data-f'); renderOffice(); }
    else if (a === 'stockf') { S.tab = 'stock'; S.stockFilter = v; renderOffice(); }
    else if (a === 'of') { S.orderFilter = v; drawOrders(); }
    else if (a === 'next') { Store.update(function (s) { var o = s.orders.filter(function (x) { return x.no === id; })[0]; if (o && NEXT[o.status]) setStatus(s, id, NEXT[o.status]); }); }
    else if (a === 'rx-ok') { Store.update(function (s) { setStatus(s, id, 'packing', { rx: { status: 'approved', file: (orderBy(id).rx || {}).file } }); }); toast('Prescription approved. Order ' + id + ' moves to packing.'); }
    else if (a === 'rx-no') { Store.update(function (s) { var o = s.orders.filter(function (x) { return x.no === id; })[0]; if (!o) return; release(s, o); setStatus(s, id, 'cancelled', { rx: { status: 'rejected', file: (o.rx || {}).file } }); }); toast('Prescription rejected. Stock returned to its batches.'); }
    else if (a === 'quar') { Store.update(function (s) { var p2 = s.products.filter(function (x) { return x.id === b.getAttribute('data-p'); })[0]; var l = p2.lots.filter(function (x) { return x.batch === b.getAttribute('data-b'); })[0]; if (l) l.status = l.status === 'quarantine' ? 'available' : 'quarantine'; }); }
    else if (a === 'po') { var pp = byId(id), no = 'PO-' + Date.now().toString(36).toUpperCase().slice(-5); Store.update(function (s) { s.purchaseOrders = s.purchaseOrders || []; s.purchaseOrders.unshift({ no: no, productId: id, name: pp.name, qty: Number(b.getAttribute('data-q')), status: 'ordered', createdAt: new Date().toISOString() }); }); toast('Purchase order ' + no + ' created.'); }
    else if (a === 'po-recv') { var po = (D().purchaseOrders || []).filter(function (x) { return x.no === id; })[0]; S.recv = { po: po.no, prod: po.productId, qty: po.qty }; S.tab = 'receive'; renderOffice(); }
    else if (a === 'app-ok') {
      Store.update(function (s) { var ap = s.applications.filter(function (x) { return x.ref === id; })[0]; if (!ap) return; ap.status = 'approved';
        var terms = /30/.test(ap.payment) ? 30 : /15/.test(ap.payment) ? 15 : 0;
        s.customers.push({ id: 'cust-' + ap.ref.toLowerCase(), name: ap.business, area: ap.area, type: ap.type, licenceNo: ap.licence, licenceExpiry: ap.licenceExpiry, creditLimit: terms ? 50000 : 0, creditUsed: 0, terms: terms || 0, tier: 'Standard' }); });
      toast('Account opened. It can now order in the Pharmacy portal.');
    }
    else if (a === 'app-no') { Store.update(function (s) { var ap = s.applications.filter(function (x) { return x.ref === id; })[0]; if (ap) ap.status = 'declined'; }); }
    else if (a === 'export') { exportEvents(); }
    else if (a === 'reset') {
      if (b.getAttribute('data-armed')) { Store.reset(); S.cart = []; S.placed = null; toast('Demo data reset.'); }
      else { b.setAttribute('data-armed', '1'); b.textContent = 'Click again to reset'; setTimeout(function () { if (b.isConnected) { b.removeAttribute('data-armed'); b.textContent = 'Reset demo data'; } }, 4000); }
    }
  });
  var dlg = $('#product-dialog');
  if (dlg) dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

  route();
})();
