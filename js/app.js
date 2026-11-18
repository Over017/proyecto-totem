/* SkyFlow · Tótem de check-in — aplicación principal (HTML + CSS + JS, sin dependencias). */
(function () {
  'use strict';

  const { RULES, BOOKINGS, SCALE_SEQUENCE, liveDeparture } = window.SKY_DATA;
  const SND = window.SKY_SOUND;
  const I18N = window.SKY_I18N;
  const t = (k, p) => I18N.t(k, p);
  const ICONS = window.ICONS;
  const QRS = window.QRS;

  // ------------------------------------------------------------------ configuración (parámetros de URL para pruebas)
  const params = new URLSearchParams(location.search);
  const SPEED = Math.max(0.1, Number(params.get('speed')) || 1);
  const IDLE_S = Number(params.get('idle')) || 75;
  const IDLE_COUNT_S = Number(params.get('idlecount')) || 20;
  const DONE_S = Number(params.get('done')) || 30;
  const reducedMotion = () => document.body.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = ms => new Promise(r => setTimeout(r, ms / SPEED));
  const raf = () => new Promise(r => requestAnimationFrame(() => r()));

  // ------------------------------------------------------------------ utilidades de marcado
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const icon = (n, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[n] || ''}</svg>`;
  const PLANE_D = 'M50 2 C54 2 56 8 56 14 L56 38 L96 60 L96 68 L56 56 L56 80 L68 90 L68 96 L50 91 L32 96 L32 90 L44 80 L44 56 L4 68 L4 60 L44 38 L44 14 C44 8 46 2 50 2 Z';
  const plane = (cls, rot) => `<svg class="plane ${cls || ''}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="${PLANE_D}" fill="currentColor" transform="rotate(${rot || 0} 50 50)"/></svg>`;
  const logoMark = cls => `<svg class="logo-mark ${cls || ''}" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect width="48" height="48" rx="14" class="lm-bg"/><g transform="translate(7 7) scale(0.34)"><path d="${PLANE_D}" class="lm-fg" transform="rotate(45 50 50)"/></g></svg>`;
  const qr = (key, cls) => { const q = QRS[key]; return `<svg class="qr ${cls || ''}" viewBox="-2 -2 ${q.n + 4} ${q.n + 4}" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${q.n + 4}" height="${q.n + 4}" fill="#fff"/><path d="${q.d}" fill="currentColor"/></svg>`; };
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

  // ------------------------------------------------------------------ estado
  const operator = { qrBooking: 'HJSUDK', nextChecked: null, nextHand: null, declineNext: false, hints: true, hideCursor: params.get('kiosk') === '1' };
  let S;
  function freshState() {
    return {
      screen: 'welcome', history: [],
      a11y: false,
      booking: null, times: null,
      manual: { code: '', last: '', focus: 'code', error: '', tries: 0, busy: false },
      docType: null,
      bags: [], bagSeq: 0,
      scale: { type: 'checked', phase: 'idle', kg: 0 },
      seq: { checked: 0, hand: 0 },
      pay: { method: null, option: null, pin: '', pinTries: 0, locked: false, declined: false, opNumber: null, paidAt: null, amount: 0, miles: 0, receiptPrinted: false, cardPhase: 'wait', appLogin: false },
      qrPhase: 'idle', scanPhase: 'reading', printPhase: 0,
      doneLeft: DONE_S,
    };
  }
  S = freshState();
  let epoch = 0; // invalida tareas asíncronas de pantallas anteriores
  const alive = e => e === epoch;

  // ------------------------------------------------------------------ reglas de equipaje
  const checkedBags = () => S.bags.filter(b => b.type === 'checked');
  const handBags = () => S.bags.filter(b => b.type === 'hand');
  function priceBag(bag, list) {
    const checked = (list || S.bags).filter(b => b.type === 'checked');
    if (bag.type === 'hand') return { cost: 0, kind: 'free', excess: 0 };
    const idx = checked.indexOf(bag);
    const excess = bag.kg > RULES.checkedIncludedKg ? Math.round((bag.kg - RULES.checkedIncludedKg) * 10) / 10 : 0;
    const included = idx < RULES.checkedIncluded;
    const cost = (included ? 0 : RULES.extraBagFee) + (excess ? RULES.excessFee : 0);
    return { cost, kind: included ? 'included' : 'extra', excess };
  }
  const totalOf = list => (list || S.bags).reduce((a, b) => a + priceBag(b, list).cost, 0);
  function previewAdd(type, kg) {
    const bag = { id: -1, type, kg };
    const list = [...S.bags, bag];
    return { price: priceBag(bag, list), total: totalOf(list) };
  }
  function nextWeight(type) {
    const key = type === 'checked' ? 'nextChecked' : 'nextHand';
    if (operator[key] != null) { const v = operator[key]; operator[key] = null; renderOperator(); return v; }
    const seq = SCALE_SEQUENCE[type];
    const v = seq[S.seq[type] % seq.length];
    S.seq[type]++;
    return v;
  }

  // ------------------------------------------------------------------ escenario escalado (resolución fija 1280 × 800)
  const stage = $('#stage');
  let stageScale = 1;
  function fit() {
    stageScale = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
    stage.style.transform = `translate(-50%, -50%) scale(${stageScale})`;
  }
  window.addEventListener('resize', fit);
  fit();
  function stageRect(el) {
    const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    return { x: (r.left - s.left) / stageScale, y: (r.top - s.top) / stageScale, w: r.width / stageScale, h: r.height / stageScale };
  }

  // ------------------------------------------------------------------ pantallas
  const STEPS = ['booking', 'bags', 'payment', 'done'];
  const SCREENS = {
    welcome: { step: null, render: renderWelcome, onEnter: enterWelcome },
    find: { step: 0, footer: { back: true, cancel: true }, render: renderFind },
    manual: { step: 0, footer: { back: true, cancel: true }, render: renderManual },
    doc: { step: 0, footer: { back: true, cancel: true }, render: renderDoc },
    docscan: { step: 0, footer: { cancel: true }, render: renderDocScan, onEnter: enterDocScan, transient: true },
    flight: { step: 0, footer: { back: true, cancel: true }, render: renderFlight },
    bags: { step: 1, footer: { back: true, cancel: true }, render: renderBags },
    pay: { step: 2, footer: { back: true, cancel: true }, render: renderPay },
    card: { step: 2, footer: { cancel: true }, render: renderCard },
    pin: { step: 2, footer: { back: true, cancel: true }, render: renderPin },
    methods: { step: 2, footer: { back: true, cancel: true }, render: renderMethods },
    processing: { step: 2, footer: {}, render: renderProcessing, onEnter: enterProcessing, transient: true, noIdle: true },
    approved: { step: 2, footer: {}, render: renderApproved, onEnter: enterApproved, transient: true },
    printing: { step: 3, footer: {}, render: renderPrinting, onEnter: enterPrinting, transient: true, noIdle: true },
    done: { step: 3, footer: {}, render: renderDone, onEnter: enterDone, noIdle: true },
  };

  const view = $('#view');
  function go(name, opts) {
    opts = opts || {};
    const prev = S.screen;
    if (!opts.back && !opts.reset && !opts.replace && prev !== name && !SCREENS[prev].transient && prev !== 'welcome') S.history.push(prev);
    if (opts.reset) S.history = [];
    S.screen = name;
    epoch++;
    closeModal(true);
    $('#toasts').innerHTML = '';
    const old = view.querySelector('.screen:not(.leaving)');
    const el = document.createElement('section');
    el.className = 'screen screen-' + name + (opts.back ? ' from-back' : '') + ' entering';
    el.dataset.screen = name;
    el.setAttribute('aria-labelledby', 'title-' + name);
    view.appendChild(el);
    SCREENS[name].render(el);
    renderChrome();
    if (old) {
      old.classList.add('leaving');
      old.setAttribute('aria-hidden', 'true');
      old.inert = true;
      setTimeout(() => old.remove(), reducedMotion() ? 0 : 320 / SPEED);
    }
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('entering')));
    const h = $('#title-' + name, el);
    if (h) { h.setAttribute('tabindex', '-1'); setTimeout(() => h.focus({ preventScroll: true }), 30); announce(h.textContent); }
    if (SCREENS[name].onEnter) SCREENS[name].onEnter(epoch);
    bumpIdle();
  }
  function back() {
    const prev = S.history.pop();
    go(prev || 'welcome', { back: true });
  }
  // Redibuja la pantalla actual en el lugar (por ejemplo, al cambiar de idioma)
  function refresh() {
    const el = view.querySelector('.screen:not(.leaving)');
    if (!el) return;
    el.classList.add('no-anim');
    SCREENS[S.screen].render(el);
    renderChrome();
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('no-anim')));
  }
  function redraw() { // redibuja solo el contenido dinámico sin animación de entrada
    const el = view.querySelector('.screen:not(.leaving)');
    if (el) SCREENS[S.screen].render(el, { partial: true });
  }

  // ------------------------------------------------------------------ cabecera y pie
  const header = $('#header'), footer = $('#footer');
  function renderChrome() {
    const sc = SCREENS[S.screen];
    const chrome = sc.step !== null;
    header.hidden = !chrome;
    footer.hidden = !chrome;
    stage.classList.toggle('is-welcome', !chrome);
    if (!chrome) return;
    const skipPay = (S.screen === 'printing' || S.screen === 'done') && S.pay.amount === 0;
    header.innerHTML = `
      <button class="brand tap-plain" type="button" data-op-tap>${logoMark()}<span class="brand-text"><b>SkyFlow</b><small>${t('chrome.checkin')}</small></span></button>
      <ol class="stepper" aria-label="${esc(t('chrome.progress'))}">
        ${STEPS.map((k, i) => {
          const st = i < sc.step ? 'done' : i === sc.step ? 'current' : 'todo';
          return `<li class="step ${st}" ${st === 'current' ? 'aria-current="step"' : ''}>
            <span class="step-dot">${st === 'done' ? icon('check') : `<span>${i + 1}</span>`}</span>
            <span class="step-label">${t('steps.' + k)}${i === 2 && skipPay ? `<em>${t('steps.notNeeded')}</em>` : ''}</span>
          </li>${i < 3 ? `<li class="step-bar ${i < sc.step ? 'full' : ''}" aria-hidden="true"><i></i></li>` : ''}`;
        }).join('')}
      </ol>
      <div class="header-right">
        <span class="clock" aria-hidden="true">${I18N.time(new Date())}</span>
        ${langSwitch()}
      </div>`;
    const f = sc.footer || {};
    footer.innerHTML = `
      <button class="btn soft" type="button" data-act="help">${icon('headset')}<span>${t('chrome.help')}</span></button>
      <div class="footer-right">
        ${f.back ? `<button class="btn secondary" type="button" data-act="back">${icon('arrow-left')}<span>${t('chrome.back')}</span></button>` : ''}
        ${f.cancel ? `<button class="btn danger" type="button" data-act="cancel">${icon('x')}<span>${t('chrome.cancel')}</span></button>` : ''}
      </div>`;
  }
  function langSwitch(cls) {
    return `<div class="lang-switch ${cls || ''}" role="group" aria-label="${esc(t('chrome.language'))}">
      ${icon('globe', 'lang-globe')}
      <button type="button" class="lang-opt ${I18N.lang === 'es' ? 'on' : ''}" data-lang="es" aria-pressed="${I18N.lang === 'es'}" lang="es">ES</button>
      <button type="button" class="lang-opt ${I18N.lang === 'en' ? 'on' : ''}" data-lang="en" aria-pressed="${I18N.lang === 'en'}" lang="en">EN</button>
      <i class="lang-pill" aria-hidden="true"></i>
    </div>`;
  }
  function setLang(lang, silent) {
    if (lang === I18N.lang) return;
    I18N.setLang(lang);
    document.documentElement.lang = lang;
    stage.classList.remove('lang-swap');
    void stage.offsetWidth;
    stage.classList.add('lang-swap');
    refresh();
    const m = currentModal;
    if (m) openModal(m.type, m.data, true);
    renderOperator();
    if (!silent) announce(t('chrome.langChanged'));
  }

  // ------------------------------------------------------------------ 01 · Bienvenida
  let welcomeTimer = null;
  function renderWelcome(el) {
    const other = I18N.lang === 'es' ? 'en' : 'es';
    el.innerHTML = `
      <div class="sky" aria-hidden="true">
        <svg class="sky-deco" viewBox="0 0 1280 800" preserveAspectRatio="none">
          <circle cx="1120" cy="120" r="260" class="halo"/><circle cx="1180" cy="720" r="200" class="halo"/>
          <path class="flight-path" d="M-40 640 C 300 560 560 640 800 470 S 1040 220 1110 190"/>
        </svg>
        <div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div>
        <div class="plane-float">${plane('', 45)}</div>
      </div>
      <div class="w-top">
        <button class="brand on-dark tap-plain" type="button" data-op-tap>${logoMark('light')}<span class="brand-text"><b>SkyFlow</b><small>${t('chrome.checkin')}</small></span></button>
        <div class="w-clock" aria-hidden="true"><b class="clock">${I18N.time(new Date())}</b><span class="w-date">${esc(I18N.dateLong(new Date()))}</span></div>
      </div>
      <div class="w-content">
        <span class="chip glass">${icon('plane-takeoff')}<span>${t('welcome.chip')}</span></span>
        <h1 id="title-welcome" class="w-title"><span class="w-title-main" data-k="welcome.title">${t('welcome.title')}</span>
          <span class="w-title-alt" lang="${other}">${esc(I18N.tIn(other, 'welcome.title'))}</span></h1>
        <p class="w-lead">${t('welcome.lead')}</p>
        <p class="w-choose"><span lang="es">Elige tu idioma</span> · <span lang="en">Choose your language</span></p>
        <div class="w-langs">
          <button type="button" class="btn white xl" data-start="es" lang="es"><span class="flag" aria-hidden="true">ES</span><span>Español</span>${icon('arrow-right', 'go')}</button>
          <button type="button" class="btn outline-white xl" data-start="en" lang="en"><span class="flag" aria-hidden="true">EN</span><span>English</span>${icon('arrow-right', 'go')}</button>
        </div>
        <button type="button" class="btn glass a11y-toggle ${S.a11y ? 'on' : ''}" data-act="a11y" aria-pressed="${S.a11y}">${icon('accessibility')}<span>${t('welcome.a11y')}</span><i class="switch" aria-hidden="true"></i></button>
      </div>
      <div class="w-foot">
        <button class="btn glass" type="button" data-act="help">${icon('headset')}<span>${t('chrome.help')}</span></button>
        <span class="w-loc">${icon('map-pin')}<span>${t('welcome.location')}</span></span>
      </div>`;
  }
  function enterWelcome(e) {
    clearInterval(welcomeTimer);
    // El título alterna idioma mientras el tótem espera, como en los aeropuertos
    welcomeTimer = setInterval(() => {
      if (!alive(e)) { clearInterval(welcomeTimer); return; }
      const h = $('.w-title');
      if (h && !reducedMotion()) h.classList.toggle('flip');
    }, 4200 / SPEED);
  }

  // ------------------------------------------------------------------ 02 · Escanear QR
  function renderFind(el) {
    const ph = S.qrPhase;
    const b = BOOKINGS[operator.qrBooking];
    el.innerHTML = `
      <div class="page-head center">
        <h1 id="title-find">${t('find.title')}</h1>
        <p>${t('find.sub')}</p>
      </div>
      <div class="find-grid">
        <div class="hint-col">${iconBubble('smartphone')}<b>${t('find.phoneTitle')}</b><span>${t('find.phoneText')}</span></div>
        <button type="button" class="card scanner tap ${ph}" data-act="scan" aria-describedby="scan-desc" ${ph !== 'idle' ? 'disabled' : ''}><span id="scan-desc" class="sr-only">${t('find.readerAria')}</span>
          <span class="scanner-view">
            <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
            ${qr('ticket', 'scanner-qr')}
            <span class="scan-line"></span>
            <span class="scan-ok">${icon('check')}</span>
          </span>
          <span class="scanner-title">${ph === 'ok' ? esc(t('find.found', { name: b.firstName + ' ' + b.lastName.charAt(0) + b.lastName.slice(1).toLowerCase() })) : ph === 'scanning' ? t('find.reading') : t('find.readerTitle')}</span>
          <span class="scanner-sub">${ph === 'idle' ? (operator.hints ? t('find.demoHint') : t('find.readerSub')) : ph === 'ok' ? t('find.foundSub') : t('find.readingSub')}</span>
        </button>
        <div class="hint-col">${iconBubble('printer')}<b>${t('find.printTitle')}</b><span>${t('find.printText')}</span></div>
      </div>
      <div class="center-row">
        <button type="button" class="btn secondary lg" data-act="manual" ${ph !== 'idle' ? 'disabled' : ''}>${icon('keyboard')}<span>${t('find.manual')}</span></button>
      </div>`;
  }
  async function scanQR() {
    if (S.qrPhase !== 'idle') return;
    const e = epoch;
    S.qrPhase = 'scanning'; redraw();
    await sleep(1300);
    if (!alive(e)) return;
    loadBooking(operator.qrBooking);
    S.qrPhase = 'ok'; redraw(); SND.play('scan');
    await sleep(1100);
    if (!alive(e)) return;
    S.qrPhase = 'idle';
    go('doc');
  }
  function loadBooking(code) {
    const b = BOOKINGS[code];
    S.booking = b;
    const dep = liveDeparture(b.departureOffsetMin);
    S.times = { dep, boarding: new Date(dep.getTime() - b.boardingBeforeMin * 60000) };
  }

  // ------------------------------------------------------------------ 03 · Ingreso manual
  const KB_ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM-'];
  function renderManual(el, o) {
    const m = S.manual;
    const codeOk = m.code.length === 6, lastOk = norm(m.last).length >= 2;
    const ready = codeOk && lastOk && !m.busy;
    const field = (key, label, value, ph, ic, hint) => `
      <div class="field ${m.focus === key ? 'focus' : ''} ${m.error ? 'error' : ''}">
        <label id="lbl-${key}">${label}</label>
        <button type="button" class="input tap-plain" data-focus="${key}" aria-labelledby="lbl-${key} val-${key}" aria-describedby="hint-${key}">
          ${icon(ic)}
          <span id="val-${key}" class="input-value ${value ? '' : 'ph'} ${key === 'code' ? 'mono' : ''}">${value ? esc(value) : esc(ph)}</span>${m.focus === key ? '<i class="caret"></i>' : ''}
          ${key === 'code' && codeOk ? `<span class="input-ok">${icon('circle-check')}</span>` : ''}
        </button>
        <small id="hint-${key}">${hint}</small>
      </div>`;
    const keyBtn = k => `<button type="button" class="key" data-key="${k}">${k}</button>`;
    const form = `
      <div class="card form-card ${m.shake ? 'shake-once' : ''}">
        ${field('code', t('manual.code'), m.code, t('manual.codePh'), 'ticket', t('manual.codeHint', { n: m.code.length }))}
        ${field('last', t('manual.last'), m.last, t('manual.lastPh'), 'user-round', t('manual.lastHint'))}
        <div class="form-msg ${m.error ? 'is-error' : ''}" role="${m.error ? 'alert' : 'status'}">${icon(m.error ? 'circle-alert' : 'info')}<span>${m.error ? esc(m.error) : t('manual.info')}</span></div>
      </div>`;
    if (o && o.partial) {
      const fc = $('.form-card', el); if (fc) fc.outerHTML = form;
      const vb = $('[data-act="validate"]', el); if (vb) { vb.disabled = !ready; vb.classList.toggle('loading', m.busy); }
      return;
    }
    el.innerHTML = `
      <div class="page-head">
        <h1 id="title-manual">${t('manual.title')}</h1>
        <p>${t('manual.sub')}</p>
      </div>
      <div class="manual-grid">
        ${form}
        <div class="keyboard" role="group" aria-label="${esc(t('manual.keyboard'))}">
          ${KB_ROWS.map((r, i) => `<div class="kb-row">${[...r].map(keyBtn).join('')}${i === 3 ? `<button type="button" class="key wide2" data-key="DEL" aria-label="${esc(t('manual.del'))}">${icon('delete')}<span>${t('manual.del')}</span></button>` : ''}</div>`).join('')}
          <div class="kb-row">
            <button type="button" class="key wide2" data-key="CLR">${t('manual.clear')}</button>
            <button type="button" class="key wide6" data-key="SPACE" aria-label="${esc(t('manual.space'))}">${t('manual.space')}</button>
            <button type="button" class="key wide2 accent" data-key="NEXT">${t('manual.nextField')}</button>
          </div>
        </div>
      </div>
      <div class="manual-actions">
        ${operator.hints ? `<span class="demo-tip">${icon('info')}<span>${t('manual.demoTip')}</span></span>` : '<span></span>'}
        <button type="button" class="btn primary lg ${m.busy ? 'loading' : ''}" data-act="validate" ${ready ? '' : 'disabled'}><span>${t('manual.validate')}</span>${icon('arrow-right')}<i class="spinner" aria-hidden="true"></i></button>
      </div>`;
  }
  function typeKey(k) {
    const m = S.manual;
    if (m.busy) return;
    m.error = '';
    if (k === 'NEXT') m.focus = m.focus === 'code' ? 'last' : 'code';
    else if (k === 'CLR') m[m.focus] = '';
    else if (k === 'DEL') {
      if (!m[m.focus] && m.focus === 'last') m.focus = 'code';
      else m[m.focus] = m[m.focus].slice(0, -1);
    } else if (m.focus === 'code') {
      if (/^[A-Z0-9]$/.test(k) && m.code.length < 6) m.code += k;
      if (m.code.length === 6 && !m.last) m.focus = 'last';
    } else {
      const ch = k === 'SPACE' ? ' ' : k;
      if ((/^[A-ZÑ-]$/.test(ch) || (ch === ' ' && m.last && !m.last.endsWith(' '))) && m.last.length < 24) m.last += ch;
    }
    SND.play('key');
    renderManual(view.querySelector('.screen:not(.leaving)'), { partial: true });
  }
  async function validateManual() {
    const m = S.manual;
    if (m.busy) return;
    const e = epoch;
    m.busy = true; renderManual(view.querySelector('.screen:not(.leaving)'), { partial: true });
    await sleep(900);
    if (!alive(e)) return;
    m.busy = false;
    const b = BOOKINGS[m.code];
    if (b && norm(b.lastName) === norm(m.last)) {
      loadBooking(b.code);
      SND.play('success');
      go('doc');
      return;
    }
    m.tries++;
    m.error = m.tries >= 3 ? t('manual.errorHelp') : t('manual.error');
    SND.play('error');
    m.shake = true;
    renderManual(view.querySelector('.screen:not(.leaving)'), { partial: true });
    m.shake = false;
    announce(m.error);
  }

  // ------------------------------------------------------------------ 04 · Documento
  function renderDoc(el) {
    const b = S.booking;
    const docCard = (type, ic, title, desc) => `
      <button type="button" class="card doc-card tap ${b && b.doc === type ? 'suggested' : ''}" data-doc="${type}">
        ${b && b.doc === type ? `<span class="badge">${t('doc.suggested')}</span>` : ''}
        <span class="doc-icon">${icon(ic)}</span>
        <b>${title}</b><span>${desc}</span>
        <span class="btn-like">${t('doc.select')}${icon('arrow-right')}</span>
      </button>`;
    el.innerHTML = `
      <div class="page-head center">
        <h1 id="title-doc">${t('doc.title')}</h1>
        <p>${t('doc.sub', { name: esc(b.firstName) })}</p>
      </div>
      <div class="doc-grid">
        ${docCard('rut', 'id-card', t('doc.rut'), t('doc.rutDesc'))}
        ${docCard('passport', 'book-open', t('doc.passport'), t('doc.passportDesc'))}
      </div>
      <p class="privacy">${icon('shield-check')}<span>${t('doc.privacy')}</span></p>`;
  }
  function renderDocScan(el) {
    const done = S.scanPhase === 'ok';
    const isRut = S.docType === 'rut';
    el.innerHTML = `
      <div class="page-head center">
        <h1 id="title-docscan">${done ? t('scan.okTitle') : t(isRut ? 'scan.titleRut' : 'scan.titlePassport')}</h1>
        <p>${done ? t('scan.okSub') : t('scan.sub')}</p>
      </div>
      <div class="card scan-card ${done ? 'ok' : ''}">
        <div class="reader">
          <div class="doc-paper ${isRut ? 'rut' : 'passport'}">
            <span class="doc-photo">${icon('user-round')}</span>
            <span class="doc-lines"><i></i><i></i><i></i></span>
          </div>
          <span class="reader-light"></span>
        </div>
        <div class="scan-progress"><i></i></div>
        <p class="scan-status">${icon(done ? 'circle-check' : 'scan-line')}<span>${done ? esc(t('scan.okLine', { doc: S.booking.docMasked, name: S.booking.fullName })) : t('scan.reading')}</span></p>
      </div>`;
  }
  async function enterDocScan(e) {
    S.scanPhase = 'reading';
    await sleep(2600);
    if (!alive(e)) return;
    S.scanPhase = 'ok'; redraw(); SND.play('success');
    await sleep(1500);
    if (!alive(e)) return;
    go('flight');
  }

  // ------------------------------------------------------------------ 05 · Datos del vuelo
  function renderFlight(el) {
    const b = S.booking, L = I18N.lang;
    const fld = (label, value, cls) => `<div class="bp-field ${cls || ''}"><small>${label}</small><b>${value}</b></div>`;
    el.innerHTML = `
      <div class="page-head">
        <h1 id="title-flight">${t('flight.title')}</h1>
        <p>${t('flight.sub')}</p>
      </div>
      <div class="flight-grid">
        <article class="card pass">
          <div class="pass-band">
            <div class="airport"><b>${b.from.code}</b><span>${esc(b.from.city[L])}</span></div>
            <div class="route"><span class="route-line"></span><span class="route-plane">${plane('', 90)}</span><small>${t('flight.duration', { h: b.duration.h, m: b.duration.m })}</small></div>
            <div class="airport right"><b>${b.to.code}</b><span>${esc(b.to.city[L])}</span></div>
          </div>
          <div class="pass-body">
            <div class="bp-row">
              ${fld(t('flight.passenger'), esc(b.fullName), 'grow')}
              ${fld(t('flight.flight'), b.flight)}
              ${fld(t('flight.date'), esc(I18N.dateShort(S.times.dep)))}
              <span class="status-chip"><i></i>${t('flight.onTime')}</span>
            </div>
            <div class="bp-row">
              ${fld(t('flight.departure'), I18N.time(S.times.dep))}
              ${fld(t('flight.boarding'), I18N.time(S.times.boarding))}
              ${fld(t('flight.gate'), b.gate)}
              ${fld(t('flight.seat'), b.seat)}
              ${fld(t('flight.cabin'), esc(b.cabin[L]))}
            </div>
            <div class="pass-cut" aria-hidden="true"></div>
            <small class="eyebrow">${t('flight.allowance')}</small>
            <div class="allow-row">
              <div class="allow">${iconBubble('luggage', 'green')}<div><b>${t('flight.allowChecked', { kg: RULES.checkedIncludedKg })}</b><span class="green">${t('flight.included')}</span></div></div>
              <div class="allow">${iconBubble('briefcase', 'green')}<div><b>${t('flight.allowHand', { kg: RULES.handMaxKg })}</b><span class="green">${t('flight.handFree', { kg: RULES.handMaxKg })}</span></div></div>
            </div>
          </div>
        </article>
        <div class="side-actions">
          <button type="button" class="btn primary xl" data-act="confirm">${icon('check')}<span>${t('flight.confirm')}</span></button>
          <button type="button" class="btn secondary lg" data-act="notMine"><span>${t('flight.notMine')}</span></button>
          <div class="info-card">${icon('info')}<p>${t('flight.next')}</p></div>
        </div>
      </div>`;
  }

  // ------------------------------------------------------------------ 06 · Equipaje
  function renderBags(el, o) {
    const sc = S.scale;
    const nChecked = checkedBags().length, nHand = handBags().length;
    const fullChecked = nChecked >= RULES.maxChecked, fullHand = nHand >= RULES.maxHand;
    const typeFull = sc.type === 'checked' ? fullChecked : fullHand;
    // --- balanza
    let label, bottom, state = '', result = '', actions;
    if (sc.phase === 'weighing') {
      label = t('bags.weighing'); bottom = t('bags.dontMove'); state = 'weighing';
      actions = `<button type="button" class="btn primary lg block" disabled>${icon('scale')}<span>${t('bags.weighingBtn')}</span></button>`;
    } else if (sc.phase === 'result') {
      label = t(sc.type === 'checked' ? 'bags.checkedWeighed' : 'bags.handWeighed');
      const over = sc.type === 'hand' && sc.kg > RULES.handMaxKg;
      const overMax = sc.type === 'checked' && sc.kg > RULES.checkedMaxKg;
      if (overMax) {
        state = 'bad'; bottom = t('bags.overMax', { kg: RULES.checkedMaxKg });
        result = notice('red', 'circle-x', t('bags.overMaxTitle'), t('bags.overMaxText', { kg: RULES.checkedMaxKg }));
        actions = `<button type="button" class="btn primary lg block" data-act="reweigh">${icon('rotate-ccw')}<span>${t('bags.reweigh')}</span></button>`;
      } else if (over) {
        state = 'warn'; bottom = t('bags.overHand', { kg: RULES.handMaxKg });
        const asChecked = previewAdd('checked', sc.kg);
        result = notice('amber', 'triangle-alert', t('bags.overHandTitle', { kg: I18N.kg(sc.kg), max: RULES.handMaxKg }), t('bags.overHandText'));
        actions = `<div class="btn-pair">
          <button type="button" class="btn primary lg" data-act="reweigh">${icon('rotate-ccw')}<span>${t('bags.reweigh')}</span></button>
          <button type="button" class="btn secondary lg two-line" data-act="toChecked" ${fullChecked ? 'disabled' : ''}>${icon('luggage')}<span>${t('bags.toChecked')}</span><small>${fullChecked ? t('bags.noSlots') : '+ ' + I18N.money(asChecked.price.cost)}</small></button>
        </div>`;
      } else {
        state = 'ok';
        const pv = previewAdd(sc.type, sc.kg);
        bottom = sc.type === 'hand' ? t('bags.handOk', { kg: RULES.handMaxKg }) : sc.kg > RULES.checkedIncludedKg ? t('bags.checkedOver', { kg: RULES.checkedIncludedKg }) : t('bags.checkedOk', { kg: RULES.checkedIncludedKg });
        const kindTxt = pv.price.kind === 'free' ? t('bags.kindFree') : pv.price.kind === 'included' ? (pv.price.excess ? t('bags.kindIncludedExcess', { kg: I18N.kg(pv.price.excess) }) : t('bags.kindIncluded')) : (pv.price.excess ? t('bags.kindExtraExcess') : t('bags.kindExtra'));
        result = `<div class="preview ${pv.price.cost ? 'cost' : 'free'}">${icon(pv.price.cost ? 'tag' : 'circle-check')}<span><b>${kindTxt}</b> · ${pv.price.cost ? '+ ' + I18N.money(pv.price.cost) : t('bags.noCost')}</span></div>`;
        actions = `<div class="btn-pair">
          <button type="button" class="btn primary lg" data-act="addBag">${icon('plus')}<span>${t('bags.add')}</span></button>
          <button type="button" class="btn secondary lg icon-only" data-act="reweigh" aria-label="${esc(t('bags.reweigh'))}">${icon('rotate-ccw')}</button>
        </div>`;
      }
    } else {
      label = t('bags.free'); bottom = typeFull ? t(sc.type === 'checked' ? 'bags.limitChecked' : 'bags.limitHand') : t('bags.placeBag');
      actions = `<button type="button" class="btn primary lg block" data-act="weigh" ${typeFull ? 'disabled' : ''}>${icon('scale')}<span>${t('bags.weigh')}</span></button>`;
    }
    const kgShown = sc.phase === 'idle' ? 0 : sc.kg;
    const scaleCard = `
      <div class="card scale-card">
        <h2 class="card-title">${t('bags.what')}</h2>
        <div class="seg ${sc.type}" role="radiogroup" aria-label="${esc(t('bags.what'))}">
          <i class="seg-pill" aria-hidden="true"></i>
          <button type="button" role="radio" aria-checked="${sc.type === 'checked'}" class="seg-opt" data-type="checked" ${sc.phase === 'weighing' ? 'disabled' : ''}>${icon('luggage')}<span>${t('bags.checked')}</span><small>${nChecked}/${RULES.maxChecked}</small></button>
          <button type="button" role="radio" aria-checked="${sc.type === 'hand'}" class="seg-opt" data-type="hand" ${sc.phase === 'weighing' ? 'disabled' : ''}>${icon('briefcase')}<span>${t('bags.hand')}</span><small>${nHand}/${RULES.maxHand}</small></button>
        </div>
        <div class="scale-display ${state}" aria-live="polite">
          <span class="sd-label">${label}</span>
          <span class="sd-value"><b id="scale-num">${I18N.kgNum(kgShown)}</b><small>kg</small></span>
          <span class="sd-bottom">${bottom}</span>
          <span class="sd-plate" aria-hidden="true"></span>
        </div>
        <div class="stability ${state || (sc.phase === 'idle' ? 'idle' : '')}">
          <span class="stab-bar"><i></i></span>
          <span class="stab-text">${icon(state === 'ok' ? 'circle-check' : state === 'warn' ? 'triangle-alert' : state === 'bad' ? 'circle-x' : state === 'weighing' ? 'scale' : 'clock')}<span>${state === 'weighing' ? t('bags.stabilizing') : state ? t('bags.stable') : t('bags.waiting')}</span></span>
        </div>
        <div class="scale-result">${result || `<p class="muted small center">${t('bags.limits', { c: RULES.maxChecked, h: RULES.maxHand })}</p>`}</div>
        <div class="scale-actions">${actions}</div>
      </div>`;
    // --- lista
    const total = totalOf();
    const n = S.bags.length;
    let noticeHtml;
    if (sc.phase === 'result' && sc.type === 'hand' && sc.kg > RULES.handMaxKg) noticeHtml = notice('amber', 'triangle-alert', t('bags.nHandOverTitle'), t('bags.nHandOverText', { kg: RULES.handMaxKg }));
    else if (nHand) noticeHtml = notice('green', 'circle-check', t('bags.nHandTitle'), t('bags.nHandText'));
    else if (fullChecked) noticeHtml = notice('blue', 'info', t('bags.nFullTitle'), t('bags.nFullText'));
    else noticeHtml = notice('blue', 'info', t('bags.nInfoTitle', { kg: RULES.checkedIncludedKg, h: RULES.handMaxKg }), t('bags.nInfoText', { extra: I18N.money(RULES.extraBagFee), excess: I18N.money(RULES.excessFee) }));
    const listCard = `
      <div class="card list-card">
        <div class="list-head">
          <h2 class="card-title">${t('bags.mine')}</h2>
          <span class="chip blue" id="bag-count">${t('bags.count', { n })}</span>
          <span class="muted small push">${t('bags.fare', { c: RULES.checkedIncludedKg, h: RULES.handMaxKg })}</span>
        </div>
        <ul class="bag-list" id="bag-list">${S.bags.map((b, i) => bagRow(b, i)).join('')}${n === 0 ? `<li class="empty">${icon('luggage')}<span>${t('bags.empty')}</span></li>` : ''}</ul>
        <div class="list-notice">${noticeHtml}</div>
        <div class="list-total">
          <span class="muted">${total > 0 ? t('bags.payNext') : t('bags.nothingToPay')}</span>
          <span class="tot-label">${t('bags.total')}</span>
          <b id="bags-total" data-value="${total}">${I18N.money(total)}</b>
        </div>
        <div class="list-actions">
          <button type="button" class="btn secondary" data-act="removeAll" ${n ? '' : 'disabled'}>${icon('trash-2')}<span>${t('bags.removeAll')}</span></button>
          <button type="button" class="btn primary lg" data-act="toPay" ${sc.phase === 'weighing' ? 'disabled' : ''}><span>${total > 0 ? t('bags.continuePay') : n ? t('bags.continueFree') : t('bags.noBags')}</span>${icon(total > 0 ? 'arrow-right' : 'check')}</button>
        </div>
      </div>`;
    if (o && o.partial) {
      const a = $('.scale-card', el), b = $('.list-card', el);
      const prevTotal = Number(($('#bags-total', el) || {}).dataset ? $('#bags-total', el).dataset.value : total);
      a.outerHTML = scaleCard; b.outerHTML = listCard;
      if (prevTotal !== total) tween($('#bags-total', el), prevTotal, total, 600, v => I18N.money(Math.round(v / 100) * 100));
      return;
    }
    el.innerHTML = `
      <h1 id="title-bags" class="sr-only">${t('bags.title')}</h1>
      <div class="bags-grid">${scaleCard}${listCard}</div>`;
  }
  function bagRow(b, i) {
    const p = priceBag(b);
    const idx = b.type === 'checked' ? checkedBags().indexOf(b) + 1 : 0;
    const chip = p.kind === 'free' ? ['green', t('bags.chipFree', { kg: RULES.handMaxKg })] : p.kind === 'included' ? (p.excess ? ['amber', t('bags.chipIncludedExcess', { kg: I18N.kg(p.excess) })] : ['green', t('bags.chipIncluded')]) : (p.excess ? ['amber', t('bags.chipExtraExcess')] : ['blue', t('bags.chipExtra')]);
    return `<li class="bag-row ${b.fresh ? 'fresh' : ''}" data-id="${b.id}"><div class="bag-inner">
      ${iconBubble(b.type === 'hand' ? 'briefcase' : 'luggage')}
      <div class="bag-name"><b>${b.type === 'hand' ? t('bags.handBag') : t('bags.checkedBag', { n: idx })}</b><span>${b.fromHand ? t('bags.fromHand') : t(b.type === 'hand' ? 'bags.cabin' : 'bags.hold')}</span></div>
      <span class="bag-kg">${I18N.kg(b.kg)}</span>
      <span class="chip ${chip[0]}">${chip[1]}</span>
      <b class="bag-cost">${I18N.money(p.cost)}</b>
      <button type="button" class="round-x" data-remove="${b.id}" aria-label="${esc(t('bags.removeOne', { name: b.type === 'hand' ? t('bags.handBag') : t('bags.checkedBag', { n: idx }) }))}">${icon('x')}</button>
    </div></li>`;
  }
  async function weigh(again, keepKg) {
    const sc = S.scale;
    if (sc.phase === 'weighing') return;
    const e = epoch;
    const target = keepKg != null ? keepKg : nextWeight(sc.type);
    sc.phase = 'weighing'; sc.kg = target;
    redraw();
    if (again) announce(t('bags.reweighing'));
    // el número sube, se pasa un poco y se estabiliza (como una balanza real)
    const el = () => $('#scale-num');
    const steps = reducedMotion() ? [[target, 1]] : [[target * 1.08, 900], [target * 0.97, 420], [target + 0.2, 300], [target, 260]];
    let from = 0;
    for (const [to, dur] of steps) {
      await new Promise(res => tween(el(), from, to, dur, v => I18N.kgNum(Math.max(0, v)), res));
      if (!alive(e)) return;
      from = to;
    }
    await sleep(350);
    if (!alive(e)) return;
    sc.phase = 'result';
    redraw();
    SND.play(sc.type === 'hand' && sc.kg > RULES.handMaxKg || sc.kg > RULES.checkedMaxKg ? 'alert' : 'scan');
    announce(t('bags.weighedAnnounce', { kg: I18N.kg(sc.kg) }));
  }
  function addBag(asType) {
    const sc = S.scale;
    const type = asType || sc.type;
    const bag = { id: ++S.bagSeq, type, kg: sc.kg, fromHand: asType === 'checked' && sc.type === 'hand', fresh: true };
    const from = $('.scale-display');
    const fromR = from ? stageRect(from) : null;
    S.bags.push(bag);
    sc.phase = 'idle'; sc.kg = 0;
    // si se llenó este tipo, cambia al otro automáticamente
    if (checkedBags().length >= RULES.maxChecked && handBags().length < RULES.maxHand) sc.type = 'hand';
    if (handBags().length >= RULES.maxHand && checkedBags().length < RULES.maxChecked) sc.type = 'checked';
    redraw();
    SND.play('add');
    const row = $(`.bag-row[data-id="${bag.id}"]`);
    if (row && fromR && !reducedMotion()) flyIcon(type === 'hand' ? 'briefcase' : 'luggage', fromR, stageRect(row));
    setTimeout(() => { bag.fresh = false; }, 50);
    announce(t('bags.addedAnnounce', { total: I18N.money(totalOf()) }));
  }
  function removeBag(id) {
    const i = S.bags.findIndex(b => b.id === id);
    if (i < 0) return;
    const bag = S.bags[i];
    const row = $(`.bag-row[data-id="${id}"]`);
    const doRemove = () => {
      S.bags.splice(S.bags.indexOf(bag), 1);
      redraw();
      SND.play('remove');
      toast(t('bags.removed'), { label: t('bags.undo'), icon: 'undo-2', fn: () => { S.bags.splice(Math.min(i, S.bags.length), 0, Object.assign(bag, { fresh: true })); redraw(); setTimeout(() => { bag.fresh = false; }, 50); SND.play('add'); } });
      announce(t('bags.removedAnnounce', { total: I18N.money(totalOf()) }));
    };
    if (row && !reducedMotion()) { row.classList.add('leaving'); setTimeout(doRemove, 300 / SPEED); } else doRemove();
  }
  function flyIcon(name, a, b) {
    const fx = $('#fx');
    const f = document.createElement('div');
    f.className = 'fly';
    f.innerHTML = icon(name);
    const sx = a.x + a.w / 2 - 28, sy = a.y + a.h / 2 - 28, ex = b.x + 14, ey = b.y + 12;
    f.style.transform = `translate(${sx}px, ${sy}px) scale(1.4)`;
    fx.appendChild(f);
    f.animate([
      { transform: `translate(${sx}px, ${sy}px) scale(1.4)`, opacity: 0 },
      { transform: `translate(${(sx + ex) / 2}px, ${Math.min(sy, ey) - 90}px) scale(1.15)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${ex}px, ${ey}px) scale(0.8)`, opacity: 0.2 },
    ], { duration: 720 / SPEED, easing: 'cubic-bezier(.3,.7,.3,1)' }).onfinish = () => f.remove();
  }

  // ------------------------------------------------------------------ 07 · Pago: detalle y método
  function chargeLines() {
    const lines = [];
    checkedBags().forEach((b, i) => {
      const p = priceBag(b);
      if (p.kind === 'extra') lines.push({ ic: 'luggage', text: t('pay.lineExtra', { n: i + 1, kg: I18N.kg(b.kg) }), amount: RULES.extraBagFee });
      if (p.excess) lines.push({ ic: 'scale', text: t('pay.lineExcess', { n: i + 1, kg: I18N.kg(p.excess) }), amount: RULES.excessFee });
    });
    handBags().forEach(b => lines.push({ ic: 'briefcase', text: t('pay.lineHand', { kg: I18N.kg(b.kg) }), amount: 0 }));
    return lines;
  }
  function renderPay(el) {
    const total = totalOf();
    const acc = S.booking.account;
    const method = (key, ic, title, desc, chips, extra, disabled) => `
      <button type="button" class="card method tap" data-method="${key}" ${disabled ? 'disabled' : ''}>
        ${extra || ''}
        ${iconBubble(ic, key === 'account' ? 'navy' : '', 'lg')}
        <span class="method-text"><b>${title}</b><span>${desc}</span><span class="chips">${chips.map(c => `<i class="chip gray">${c}</i>`).join('')}</span></span>
        ${icon('chevron-right', 'chev')}
      </button>`;
    el.innerHTML = `
      <div class="page-head">
        <h1 id="title-pay">${t('pay.title')}</h1>
        <p>${t('pay.sub')}</p>
      </div>
      <div class="pay-grid">
        <div class="card summary">
          <h2 class="card-title">${t('pay.detail')}</h2>
          <ul class="lines">${chargeLines().map(l => `<li>${icon(l.ic)}<span>${l.text}</span><b class="${l.amount ? '' : 'green'}">${l.amount ? I18N.money(l.amount) : t('pay.free')}</b></li>`).join('')}</ul>
          <div class="sum-total"><span>${t('pay.total')}</span><b>${I18N.money(total)}</b></div>
          <p class="muted small">${t('pay.taxes')}</p>
          <p class="secure">${icon('shield-check')}<span>${t('pay.secure')}</span></p>
        </div>
        <div class="methods">
          ${method('card', 'credit-card', t('pay.card'), t('pay.cardDesc'), [t('pay.debit'), t('pay.credit'), t('pay.contactless')])}
          ${method('account', 'plane-takeoff', t('pay.account'), acc ? t('pay.accountDesc') : t('pay.noAccount'), acc ? [t('pay.savedCards'), t('pay.miles')] : [], acc ? `<span class="badge green">${t('pay.linked')}</span>` : '', !acc)}
          <p class="muted small with-icon">${icon('info')}<span>${t('pay.counter')}</span></p>
        </div>
      </div>`;
  }

  // ------------------------------------------------------------------ 08 · Tarjeta (lector)
  function renderCard(el) {
    const ph = S.pay.cardPhase;
    const total = I18N.money(totalOf());
    const posText = { wait: total, reading: t('card.posReading'), pin: t('card.posPin'), ok: t('card.posOk') }[ph];
    const active = { wait: 0, reading: 0, pin: 1, ok: 2 }[ph];
    const stepCls = i => (i < active || ph === 'ok' ? 'done' : i === active ? 'active' : '');
    el.innerHTML = `
      <div class="page-head">
        <h1 id="title-card">${t('card.title')}</h1>
        <p>${t('card.sub')}</p>
      </div>
      <div class="total-pill">${icon('receipt')}<span>${t('card.total')}</span><b>${total}</b></div>
      ${S.pay.declined ? `<div class="banner red" role="alert">${icon('circle-x')}<div><b>${t('card.declinedTitle')}</b><span>${t('card.declinedText')}</span></div></div>` : ''}
      <div class="card-stage">
        <button type="button" class="pos tap-plain ${ph}" data-act="tapCard" ${ph !== 'wait' ? 'disabled' : ''}><span class="sr-only">${t('card.posAria')}</span>
          <span class="bank-card"><i class="chipc"></i><i class="cline"></i></span>
          <span class="pos-body">
            <span class="pos-screen"><b>${posText}</b>${ph === 'pin' ? '<span class="pos-dots"><i></i><i></i><i></i><i></i></span>' : ''}</span>
            <span class="pos-keys">${'<i></i>'.repeat(12)}</span>
          </span>
          <span class="waves"><i></i><i></i><i></i></span>
          ${operator.hints && ph === 'wait' ? `<span class="tap-hint">${icon('hand')}<span>${t('card.demoHint')}</span></span>` : ''}
        </button>
        <ol class="pos-steps">
          <li class="${stepCls(0)}"><span>1</span>${t('card.step1')}</li>
          <li class="${stepCls(1)}"><span>2</span>${t('card.step2')}</li>
          <li class="${stepCls(2)}"><span>3</span>${t('card.step3')}</li>
        </ol>
      </div>
      <div class="center-row"><button type="button" class="btn secondary" data-act="changeMethod" ${ph !== 'wait' ? 'disabled' : ''}>${icon('arrow-left')}<span>${t('card.change')}</span></button></div>`;
  }
  async function tapCard() {
    if (S.pay.cardPhase !== 'wait') return;
    const e = epoch;
    S.pay.declined = false;
    S.pay.cardPhase = 'reading'; redraw(); SND.play('scan');
    await sleep(1400); if (!alive(e)) return;
    S.pay.cardPhase = 'pin'; redraw();
    for (let i = 0; i < 4; i++) { await sleep(320); if (!alive(e)) return; const d = $$('.pos-dots i')[i]; if (d) d.classList.add('on'); SND.play('key'); }
    await sleep(400); if (!alive(e)) return;
    S.pay.cardPhase = 'ok'; redraw(); SND.play('success');
    await sleep(700); if (!alive(e)) return;
    S.pay.method = 'card'; S.pay.option = 'card';
    go('processing', { replace: true });
  }

  // ------------------------------------------------------------------ 09 · Cuenta: PIN
  function renderPin(el, o) {
    const acc = S.booking.account, p = S.pay;
    const dots = [0, 1, 2, 3].map(i => `<span class="pin-box ${i < p.pin.length ? 'filled' : ''} ${i === p.pin.length && !p.locked ? 'cur' : ''}"><i></i></span>`).join('');
    const left = 3 - p.pinTries;
    const msg = p.locked ? `<p class="pin-msg error" role="alert">${icon('lock')}<span>${t('pin.locked')}</span></p>`
      : p.pinTries ? `<p class="pin-msg error" role="alert">${icon('circle-alert')}<span>${t('pin.wrong', { n: left })}</span></p>`
        : `<p class="pin-msg">${icon('lock')}<span>${t('pin.private')}</span></p>`;
    const accCard = `
      <div class="card account-card ${p.shake ? 'shake-once' : ''} ${p.pinOk ? 'ok' : ''}">
        <div class="acct-head"><span class="avatar">${acc.initials}</span><div><small>${t('pin.linked')}</small><b>${acc.email}</b></div></div>
        <h2 class="card-title">${t('pin.enter')}</h2>
        <div class="pin-row" role="group" aria-label="${esc(t('pin.progress', { n: p.pin.length }))}">${dots}</div>
        ${msg}
        ${p.locked ? `<button type="button" class="btn primary lg block" data-act="payCardInstead">${icon('credit-card')}<span>${t('pin.useCard')}</span></button>`
          : `<button type="button" class="btn primary lg block" data-act="pinOk" ${p.pin.length === 4 ? '' : 'disabled'}><span>${t('pin.login')}</span></button>`}
        <p class="link-like">${t('pin.forgot')}</p>
      </div>`;
    if (o && o.partial) {
      const c = $('.account-card', el); if (c) c.outerHTML = accCard;
      $$('.keypad .key', el).forEach(k => { k.disabled = p.locked; });
      return;
    }
    el.innerHTML = `
      <div class="page-head">
        <h1 id="title-pin">${t('pin.title')}</h1>
        <p>${t('pin.sub')}</p>
      </div>
      <div class="pin-grid">
        ${accCard}
        <div class="keypad" role="group" aria-label="${esc(t('pin.keypad'))}">
          ${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => `<button type="button" class="key big" data-pin="${k}" ${p.locked ? 'disabled' : ''}>${k}</button>`).join('')}
          <button type="button" class="key big small-text" data-pin="DEL" ${p.locked ? 'disabled' : ''} aria-label="${esc(t('manual.del'))}">${icon('delete')}</button>
          <button type="button" class="key big" data-pin="0" ${p.locked ? 'disabled' : ''}>0</button>
          <button type="button" class="key big small-text" data-pin="CLR" ${p.locked ? 'disabled' : ''}>${t('pin.clear')}</button>
        </div>
        <div class="card other-account">
          <b>${t('pin.otherTitle')}</b>
          <span>${t('pin.otherText')}</span>
          <button type="button" class="qr-box tap" data-act="appLogin" aria-label="${esc(t('pin.otherAria'))}">${qr('app')}</button>
          <span class="with-icon blue">${icon('smartphone')}<span>${t('pin.app')}</span></span>
        </div>
      </div>
      ${operator.hints ? `<p class="demo-tip abs">${icon('info')}<span>${t('pin.demoTip', { pin: acc.pin })}</span></p>` : ''}`;
  }
  function pinKey(k) {
    const p = S.pay;
    if (p.locked || p.pinBusy) return;
    if (k === 'DEL') p.pin = p.pin.slice(0, -1);
    else if (k === 'CLR') p.pin = '';
    else if (p.pin.length < 4) p.pin += k;
    SND.play('key');
    renderPin(view.querySelector('.screen:not(.leaving)'), { partial: true });
    if (p.pin.length === 4) setTimeout(() => { if (S.screen === 'pin' && S.pay.pin.length === 4) checkPin(); }, 350 / SPEED);
  }
  async function checkPin() {
    const p = S.pay, acc = S.booking.account;
    if (p.pinBusy || p.locked) return;
    const e = epoch;
    if (p.pin === acc.pin) {
      p.pinBusy = true; p.pinOk = true;
      renderPin(view.querySelector('.screen:not(.leaving)'), { partial: true });
      SND.play('success');
      await sleep(650); if (!alive(e)) return;
      p.pinBusy = false;
      go('methods', { replace: true });
      return;
    }
    p.pinTries++;
    p.pin = '';
    if (p.pinTries >= 3) p.locked = true;
    SND.play('error');
    p.shake = true;
    renderPin(view.querySelector('.screen:not(.leaving)'), { partial: true });
    p.shake = false;
    announce(p.locked ? t('pin.locked') : t('pin.wrong', { n: 3 - p.pinTries }));
  }

  // ------------------------------------------------------------------ 10 · Cuenta: medios guardados
  function milesNeeded() { return Math.ceil(totalOf() / RULES.clpPerMile); }
  function renderMethods(el) {
    const acc = S.booking.account, p = S.pay, total = totalOf();
    const need = milesNeeded(), enough = acc.miles >= need;
    const opts = [...acc.cards.map(c => ({ id: c.id, title: `${c.brand} •••• ${c.last4}`, sub: c.default ? t('methods.default', { exp: c.exp }) : t('methods.expires', { exp: c.exp }), art: c.id })),
      { id: 'miles', title: t('methods.miles'), sub: enough ? t('methods.milesSub', { have: I18N.num(acc.miles), need: I18N.num(need) }) : t('methods.milesShort', { have: I18N.num(acc.miles), need: I18N.num(need) }), art: 'miles', disabled: !enough }];
    if (!opts.some(o => o.id === p.option && !o.disabled)) p.option = acc.cards.find(c => c.default).id;
    const sel = opts.find(o => o.id === p.option);
    const isMiles = sel.id === 'miles';
    el.innerHTML = `
      <div class="page-head">
        <h1 id="title-methods">${t('methods.title', { name: esc(S.booking.firstName) })}</h1>
        <p>${t('methods.sub')}</p>
      </div>
      <div class="methods-grid">
        <div class="options" role="radiogroup" aria-label="${esc(t('methods.sub'))}">
          ${opts.map(o => `
            <button type="button" role="radio" aria-checked="${o.id === sel.id}" class="option tap ${o.id === sel.id ? 'on' : ''}" data-option="${o.id}" ${o.disabled ? 'disabled' : ''}>
              <span class="radio"><i></i></span>
              <span class="mini-card ${o.art}">${o.art === 'miles' ? icon('plane-takeoff') : '<i class="chipc"></i><i class="cline"></i>'}</span>
              <span class="opt-text"><b>${o.title}</b><span>${o.sub}</span></span>
            </button>`).join('')}
          <button type="button" class="btn ghost" data-act="addCard">${icon('plus')}<span>${t('methods.addCard')}</span></button>
        </div>
        <div class="right-col">
          <div class="card pay-summary">
            <small>${isMiles ? t('methods.willDeduct') : t('methods.toPay')}</small>
            <b class="big-amount">${isMiles ? t('methods.milesAmount', { n: I18N.num(need) }) : I18N.money(total)}</b>
            <hr>
            <small>${isMiles ? t('methods.equivalent') : t('methods.chargedTo')}</small>
            <b>${isMiles ? esc(t('methods.milesLeft', { total: I18N.money(total), left: I18N.num(acc.miles - need) })) : sel.title}</b>
            <p class="with-icon muted small">${icon('mail')}<span>${t('methods.receiptTo', { email: acc.email })}</span></p>
            <p class="with-icon muted small">${icon('clock')}<span>${t('methods.history')}</span></p>
          </div>
          <button type="button" class="btn primary xl block" data-act="payAccount">${icon('lock')}<span>${isMiles ? t('methods.payMiles', { n: I18N.num(need) }) : t('methods.pay', { total: I18N.money(total) })}</span></button>
          <p class="muted small center">${t('methods.protected')}</p>
        </div>
      </div>`;
  }

  // ------------------------------------------------------------------ 11 · Procesando
  function renderProcessing(el) {
    const isMiles = S.pay.option === 'miles';
    el.innerHTML = `
      <h1 id="title-processing" class="sr-only">${t('proc.title')}</h1>
      <div class="card processing-card">
        <div class="proc-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" class="track"/><circle cx="60" cy="60" r="50" class="arc"/></svg><span class="proc-icon">${icon(isMiles ? 'plane-takeoff' : 'lock')}</span></div>
        <b class="proc-title">${t('proc.title')}</b>
        <span class="proc-stage" id="proc-stage">${t(isMiles ? 'proc.milesStage1' : 'proc.stage1')}</span>
        <div class="proc-bar"><i id="proc-fill"></i></div>
        <span class="proc-amount">${isMiles ? t('methods.milesAmount', { n: I18N.num(milesNeeded()) }) : I18N.money(totalOf())}</span>
        <small class="muted">${t('proc.wait')}</small>
      </div>`;
  }
  async function enterProcessing(e) {
    const isMiles = S.pay.option === 'miles';
    const stages = isMiles ? ['proc.milesStage1', 'proc.milesStage2', 'proc.stage3'] : ['proc.stage1', 'proc.stage2', 'proc.stage3'];
    S.pay.amount = totalOf();
    const fill = () => $('#proc-fill');
    await raf();
    for (let i = 0; i < stages.length; i++) {
      const st = $('#proc-stage');
      if (st) { st.classList.remove('swap'); void st.offsetWidth; st.classList.add('swap'); st.textContent = t(stages[i]); }
      const f = fill(); if (f) f.style.width = ((i + 1) / stages.length * 100) + '%';
      await sleep(1250); if (!alive(e)) return;
    }
    if (operator.declineNext && S.pay.method === 'card') {
      operator.declineNext = false; renderOperator();
      S.pay.declined = true; S.pay.cardPhase = 'wait';
      SND.play('error');
      go('card', { replace: true });
      return;
    }
    S.pay.opNumber = 'SF-' + String(Math.floor(100000 + Math.random() * 900000));
    S.pay.paidAt = new Date();
    go('approved');
  }

  // ------------------------------------------------------------------ 12 · Pago aprobado
  function renderApproved(el, o) {
    const p = S.pay, acc = S.booking.account;
    if (o && o.partial) {
      const b = $('[data-act="printReceipt"]', el);
      if (b) { b.disabled = p.receiptPrinted; b.innerHTML = `${icon(p.receiptPrinted ? 'check' : 'printer')}<span>${p.receiptPrinted ? t('approved.printed') : t('approved.print')}</span>`; }
      return;
    }
    const isMiles = p.option === 'miles';
    const methodName = p.method === 'card' ? t('approved.cardReader') : isMiles ? t('methods.miles') : (() => { const c = acc.cards.find(x => x.id === p.option); return `${c.brand} •••• ${c.last4}`; })();
    const rows = [
      [t('approved.amount'), isMiles ? t('methods.milesAmount', { n: I18N.num(Math.ceil(p.amount / RULES.clpPerMile)) }) : I18N.money(p.amount), 'strong'],
      [t('approved.method'), methodName],
      [t('approved.op'), p.opNumber],
      [t('approved.date'), `${I18N.dateShort(p.paidAt)} · ${I18N.time(p.paidAt)}`],
    ];
    el.innerHTML = `
      <div class="approved">
        <div class="success-badge"><span class="burst" aria-hidden="true">${'<i></i>'.repeat(10)}</span><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><path d="M30 52 L44 66 L71 37"/></svg></div>
        <h1 id="title-approved">${t('approved.title')}</h1>
        <p class="muted">${acc && p.method !== 'card' ? t('approved.sentTo', { email: acc.email }) : t('approved.printable')}</p>
        <div class="card receipt">${rows.map(r => `<div class="r-row"><span>${r[0]}</span><b class="${r[2] || ''}">${esc(r[1])}</b></div>`).join('')}</div>
        <div class="btn-pair center">
          <button type="button" class="btn secondary lg" data-act="printReceipt" ${p.receiptPrinted ? 'disabled' : ''}>${icon(p.receiptPrinted ? 'check' : 'printer')}<span>${p.receiptPrinted ? t('approved.printed') : t('approved.print')}</span></button>
          <button type="button" class="btn primary lg" data-act="toPrinting"><span>${t('approved.continue')}</span>${icon('arrow-right')}</button>
        </div>
      </div>`;
  }
  function enterApproved() { SND.play('success'); }

  // ------------------------------------------------------------------ 13 · Impresión
  function printItems() {
    const items = [{ kind: 'pass', label: t('print.pass') }];
    checkedBags().forEach((b, i) => items.push({ kind: 'tag', label: t('print.tag', { n: i + 1, total: checkedBags().length }) }));
    return items;
  }
  function renderPrinting(el) {
    const items = printItems();
    el.innerHTML = `
      <div class="page-head center">
        <h1 id="title-printing">${t('print.title')}</h1>
        <p>${t('print.sub')}</p>
      </div>
      <div class="print-stage">
        <div class="printer" aria-hidden="true">
          <span class="printer-label">${t('print.printer')}</span><i class="printer-led"></i>
          <div class="printer-slot"></div>
          <div class="paper-out" id="paper"></div>
        </div>
        <ul class="print-list">${items.map((it, i) => `<li class="${i < S.printPhase ? 'done' : i === S.printPhase ? 'active' : ''}">${icon(it.kind === 'pass' ? 'ticket' : 'tag')}<span>${it.label}</span><i class="pl-state">${i < S.printPhase ? icon('check') : ''}</i></li>`).join('')}</ul>
      </div>`;
  }
  async function enterPrinting(e) {
    S.printPhase = 0;
    const items = printItems();
    for (let i = 0; i < items.length; i++) {
      S.printPhase = i; redraw();
      const paper = $('#paper');
      if (paper) {
        paper.className = 'paper-out ' + items[i].kind;
        paper.innerHTML = items[i].kind === 'pass'
          ? `<span class="pp-band"><b>${S.booking.from.code}</b>${plane('', 90)}<b>${S.booking.to.code}</b></span><span class="pp-lines"><i></i><i></i></span>${qr(S.booking.code, 'pp-qr')}`
          : `<span class="tag-head">SF</span><b>${S.booking.to.code}</b><span class="tag-bar"></span><small>${S.booking.flight}</small>`;
        void paper.offsetWidth; paper.classList.add('go');
      }
      SND.play('print');
      await sleep(1500); if (!alive(e)) return;
    }
    S.printPhase = items.length; redraw();
    SND.play('success');
    await sleep(900); if (!alive(e)) return;
    go('done');
  }

  // ------------------------------------------------------------------ 14 · Listo
  let doneTimer = null;
  function renderDone(el) {
    const b = S.booking, nC = checkedBags().length, nH = handBags().length;
    const steps = [['ticket', nC ? t('done.s1tags', { n: nC }) : t('done.s1'), t('done.s1sub')]];
    if (nC) steps.push(['tag', t('done.s2', { n: nC }), t('done.s2sub')], ['luggage', t('done.s3', { n: nC }), t('done.s3sub')]);
    if (nH) steps.push(['briefcase', t('done.s4'), t('done.s4sub', { kg: RULES.handMaxKg })]);
    steps.push(['door-open', t('done.s5', { time: I18N.time(S.times.boarding), gate: b.gate }), t('done.s5sub')]);
    const R = 22, C = 2 * Math.PI * R;
    el.innerHTML = `
      <div class="done-head">
        <span class="done-check">${icon('check')}</span>
        <div><h1 id="title-done">${t('done.title', { name: esc(b.firstName) })}</h1><p class="muted">${t('done.sub')}</p></div>
      </div>
      <div class="done-grid">
        <div class="card steps-card">
          <h2 class="card-title">${t('done.before')}</h2>
          <ol class="final-steps">${steps.map((s, i) => `<li style="--i:${i}">${iconBubble(s[0])}<span class="num">${i + 1}</span><div><b>${s[1]}</b><span>${s[2]}</span></div></li>`).join('')}</ol>
        </div>
        <div class="right-col">
          <article class="mini-pass">
            <div class="mp-top"><small>${t('done.boardingPass')}</small><span class="mp-brand">${logoMark('light small')}SkyFlow</span></div>
            <div class="mp-route"><b>${b.from.code}</b>${plane('', 90)}<b>${b.to.code}</b></div>
            <span class="mp-name">${esc(b.fullName)} · ${b.flight}</span>
            <div class="mp-fields"><div><small>${t('flight.gate')}</small><b>${b.gate}</b></div><div><small>${t('flight.boarding')}</small><b>${I18N.time(S.times.boarding)}</b></div><div><small>${t('flight.seat')}</small><b>${b.seat}</b></div></div>
            <span class="mp-qr">${qr(b.code)}</span>
          </article>
          ${nC ? `<span class="chip green">${icon('tag')}<span>${t('done.tagsPrinted', { n: nC })}</span></span>` : ''}
          <button type="button" class="btn primary xl block" data-act="finish">${t('done.finish')}</button>
          <p class="countdown"><svg viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="${R}" class="track"/><circle cx="25" cy="25" r="${R}" class="arc" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - S.doneLeft / DONE_S)}"/></svg><span id="done-left">${t('done.countdown', { s: S.doneLeft })}</span></p>
        </div>
      </div>`;
  }
  function enterDone(e) {
    S.doneLeft = DONE_S;
    clearInterval(doneTimer);
    const R = 22, C = 2 * Math.PI * R;
    doneTimer = setInterval(() => {
      if (!alive(e)) { clearInterval(doneTimer); return; }
      S.doneLeft--;
      const l = $('#done-left'), arc = $('.countdown .arc');
      if (l) l.textContent = t('done.countdown', { s: S.doneLeft });
      if (arc) arc.style.strokeDashoffset = C * (1 - S.doneLeft / DONE_S);
      if (S.doneLeft <= 0) { clearInterval(doneTimer); resetSession(); }
    }, 1000 / SPEED);
  }

  // ------------------------------------------------------------------ componentes pequeños
  function iconBubble(name, tone, size) { return `<span class="bubble ${tone || ''} ${size || ''}">${icon(name)}</span>`; }
  function notice(tone, ic, title, text) { return `<div class="notice ${tone}">${iconBubble(ic, tone)}<div><b>${title}</b><span>${text}</span></div></div>`; }
  function tween(el, from, to, dur, fmt, done) {
    if (!el) { if (done) done(); return; }
    if (reducedMotion() || dur <= 0) { el.textContent = fmt(to); if (done) done(); return; }
    const t0 = performance.now(), d = dur / SPEED;
    const ease = x => 1 - Math.pow(1 - x, 3);
    const step = now => {
      const k = Math.min(1, (now - t0) / d);
      const node = el.isConnected ? el : document.getElementById(el.id);
      if (node) node.textContent = fmt(from + (to - from) * ease(k));
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    };
    requestAnimationFrame(step);
  }

  // ------------------------------------------------------------------ modales
  const modalRoot = $('#modal');
  let currentModal = null, idleCountdown = null;
  function openModal(type, data, rerender) {
    currentModal = { type, data };
    const m = MODALS[type](data || {});
    modalRoot.hidden = false;
    modalRoot.innerHTML = `<div class="backdrop" data-modal-close="${m.dismiss ? '1' : ''}"></div>
      <div class="dialog ${m.tone || ''} ${rerender ? 'no-anim' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        ${iconBubble(m.icon, m.tone, 'xl')}
        <h2 id="modal-title">${m.title}</h2>
        <div class="dialog-body">${m.body}</div>
        <div class="dialog-actions">${m.actions}</div>
      </div>`;
    requestAnimationFrame(() => modalRoot.classList.add('open'));
    const first = $('.dialog-actions .btn', modalRoot);
    if (first && !rerender) setTimeout(() => first.focus({ preventScroll: true }), 50);
    if (!rerender && m.onOpen) m.onOpen();
  }
  function closeModal(instant) {
    if (!currentModal) return;
    if (currentModal.type === 'idle') clearInterval(idleCountdown);
    currentModal = null;
    modalRoot.classList.remove('open');
    const done = () => { if (!currentModal) { modalRoot.hidden = true; modalRoot.innerHTML = ''; } };
    if (instant === true) done(); else setTimeout(done, 220 / SPEED);
    bumpIdle();
  }
  const MODALS = {
    help: () => ({
      icon: 'headset', tone: 'blue', title: t('help.title'), dismiss: true,
      body: `<p>${t('help.text')}</p><p class="agent"><i class="pulse-dot"></i><span>${t('help.ticket', { n: '042' })}</span></p>`,
      actions: `<button type="button" class="btn primary lg block" data-modal="close">${t('help.ok')}</button>`,
      onOpen: () => SND.play('alert'),
    }),
    cancel: () => ({
      icon: 'triangle-alert', tone: 'red', title: t('cancel.title'), dismiss: true,
      body: `<p>${t('cancel.text')}</p>`,
      actions: `<button type="button" class="btn secondary lg" data-modal="close">${t('cancel.stay')}</button><button type="button" class="btn danger-solid lg" data-modal="confirmCancel">${t('cancel.yes')}</button>`,
    }),
    removeAll: () => ({
      icon: 'trash-2', tone: 'red', title: t('removeAll.title'), dismiss: true,
      body: `<p>${t('removeAll.text')}</p>`,
      actions: `<button type="button" class="btn secondary lg" data-modal="close">${t('removeAll.no')}</button><button type="button" class="btn danger-solid lg" data-modal="confirmRemoveAll">${t('removeAll.yes')}</button>`,
    }),
    idle: () => ({
      icon: 'timer', tone: 'amber', title: t('idle.title'),
      body: `<p>${t('idle.text')}</p><p class="idle-count"><b id="idle-left">${S.idleLeft}</b><span>${t('idle.seconds')}</span></p>`,
      actions: `<button type="button" class="btn primary lg block" data-modal="close">${t('idle.stay')}</button>`,
    }),
    appLogin: d => ({
      icon: d.ok ? 'user-check' : 'smartphone', tone: d.ok ? 'green' : 'blue', title: d.ok ? t('app.okTitle') : t('app.title'),
      body: `<p>${d.ok ? t('app.okText') : t('app.text')}</p>${d.ok ? '' : '<p class="agent"><i class="pulse-dot"></i><span>' + t('app.waiting') + '</span></p>'}`,
      actions: d.ok ? '' : `<button type="button" class="btn secondary lg block" data-modal="close">${t('app.cancel')}</button>`,
    }),
    addCard: () => ({
      icon: 'credit-card', tone: 'blue', title: t('addCard.title'), dismiss: true,
      body: `<p>${t('addCard.text')}</p>`,
      actions: `<button type="button" class="btn primary lg block" data-modal="close">${t('addCard.ok')}</button>`,
    }),
  };
  async function appLogin() {
    const e = epoch;
    openModal('appLogin', { ok: false });
    await sleep(2800);
    if (!alive(e) || !currentModal || currentModal.type !== 'appLogin') return;
    openModal('appLogin', { ok: true }, true);
    SND.play('success');
    await sleep(1300);
    if (!alive(e) || !currentModal) return;
    closeModal(true);
    S.pay.pinOk = true;
    go('methods', { replace: true });
  }

  // ------------------------------------------------------------------ inactividad
  let idleTimer = null;
  function bumpIdle() {
    clearTimeout(idleTimer);
    if (S.screen === 'welcome' || SCREENS[S.screen].noIdle || (currentModal && currentModal.type === 'idle')) return;
    idleTimer = setTimeout(showIdle, IDLE_S * 1000 / SPEED);
  }
  function showIdle() {
    if (S.screen === 'welcome' || SCREENS[S.screen].noIdle) return;
    S.idleLeft = IDLE_COUNT_S;
    openModal('idle');
    SND.play('alert');
    clearInterval(idleCountdown);
    idleCountdown = setInterval(() => {
      S.idleLeft--;
      const el = $('#idle-left'); if (el) el.textContent = S.idleLeft;
      if (S.idleLeft <= 0) { clearInterval(idleCountdown); resetSession(); }
    }, 1000 / SPEED);
  }

  // ------------------------------------------------------------------ sesión
  function resetSession() {
    clearInterval(idleCountdown); clearInterval(doneTimer); clearTimeout(idleTimer);
    closeModal(true);
    $('#toasts').innerHTML = '';
    const a11y = false;
    S = freshState();
    S.a11y = a11y;
    document.body.classList.remove('a11y');
    if (I18N.lang !== 'es') { I18N.setLang('es'); document.documentElement.lang = 'es'; }
    go('welcome', { reset: true });
  }

  // ------------------------------------------------------------------ avisos (toast) y lector de pantalla
  function toast(msg, action) {
    const box = $('#toasts');
    box.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${icon('info')}<span>${esc(msg)}</span>${action ? `<button type="button" class="toast-btn">${icon(action.icon || 'undo-2')}<span>${esc(action.label)}</span></button>` : ''}<i class="toast-timer"></i>`;
    box.appendChild(el);
    let gone = false;
    const hide = () => { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => el.remove(), 260 / SPEED); };
    if (action) $('.toast-btn', el).addEventListener('click', () => { action.fn(); hide(); });
    setTimeout(hide, 5000); // duración real (el pasajero necesita tiempo para Deshacer)
  }
  const live = $('#sr-live');
  function announce(msg) { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 60); }

  // ------------------------------------------------------------------ panel de operador (demo)
  const opPanel = $('#operator');
  function renderOperator() {
    if (opPanel.hidden) return;
    const w = (k, v) => `<button type="button" class="op-chip ${operator[k] === v ? 'on' : ''}" data-op-weight="${k}" data-v="${v}">${I18N.kg(v)}</button>`;
    opPanel.innerHTML = `
      <header><b>${icon('settings-2')} Modo operador · demo</b><button type="button" class="op-close" data-op="close" aria-label="Cerrar">${icon('x')}</button></header>
      <section><h3>Lector QR entrega la reserva</h3>
        <label class="op-radio"><input type="radio" name="opqr" value="HJSUDK" ${operator.qrBooking === 'HJSUDK' ? 'checked' : ''}> HJSUDK · Camila Pérez (SCL→LIM, con cuenta)</label>
        <label class="op-radio"><input type="radio" name="opqr" value="QX7M2P" ${operator.qrBooking === 'QX7M2P' ? 'checked' : ''}> QX7M2P · John Smith (SCL→MIA, sin cuenta)</label>
        <p class="op-note">Ingreso manual: HJSUDK + PEREZ · QX7M2P + SMITH · PIN de la cuenta: 1234</p></section>
      <section><h3>Próximo peso de bodega ${operator.nextChecked != null ? '· ' + I18N.kg(operator.nextChecked) : '(secuencia)'}</h3>${w('nextChecked', 18.2)}${w('nextChecked', 24.6)}${w('nextChecked', 33.5)}</section>
      <section><h3>Próximo peso de mano ${operator.nextHand != null ? '· ' + I18N.kg(operator.nextHand) : '(secuencia)'}</h3>${w('nextHand', 8.4)}${w('nextHand', 11.2)}</section>
      <section class="op-toggles">
        <label><input type="checkbox" data-op-toggle="declineNext" ${operator.declineNext ? 'checked' : ''}> Rechazar el próximo pago con tarjeta</label>
        <label><input type="checkbox" data-op-toggle="hints" ${operator.hints ? 'checked' : ''}> Mostrar ayudas de demo</label>
        <label><input type="checkbox" data-op-toggle="sound" ${SND.enabled ? 'checked' : ''}> Sonidos</label>
        <label><input type="checkbox" data-op-toggle="hideCursor" ${operator.hideCursor ? 'checked' : ''}> Ocultar cursor (tótem táctil)</label>
      </section>
      <footer><button type="button" class="op-btn" data-op="fullscreen">${icon('maximize')} Pantalla completa</button><button type="button" class="op-btn" data-op="reset">${icon('refresh-cw')} Reiniciar sesión</button></footer>`;
  }
  function toggleOperator(force) {
    opPanel.hidden = force === undefined ? !opPanel.hidden : !force;
    renderOperator();
  }
  let opTaps = [];
  function opTap() {
    const now = Date.now();
    opTaps = opTaps.filter(x => now - x < 2500);
    opTaps.push(now);
    if (opTaps.length >= 5) { opTaps = []; toggleOperator(); }
  }

  // ------------------------------------------------------------------ eventos
  stage.addEventListener('click', ev => {
    const el = ev.target.closest('button, [data-act], [data-modal-close], input, label');
    if (!el || el.disabled) return;
    const d = el.dataset;
    if (d.opTap !== undefined) { opTap(); return; }
    if (d.start) { if (I18N.lang !== d.start) { I18N.setLang(d.start); document.documentElement.lang = d.start; } go('find'); return; }
    if (d.lang) { setLang(d.lang); return; }
    if (d.modal) {
      if (d.modal === 'close') closeModal();
      else if (d.modal === 'confirmCancel') resetSession();
      else if (d.modal === 'confirmRemoveAll') { S.bags = []; S.scale.phase = 'idle'; closeModal(); redraw(); SND.play('remove'); }
      return;
    }
    if (d.modalClose !== undefined) { if (d.modalClose === '1') closeModal(); return; }
    if (d.focus) { S.manual.focus = d.focus; S.manual.error = ''; SND.play('tap'); renderManual(view.querySelector('.screen:not(.leaving)'), { partial: true }); return; }
    if (d.key) { typeKey(d.key); return; }
    if (d.pin) { pinKey(d.pin); return; }
    if (d.doc) { S.docType = d.doc; go('docscan'); return; }
    if (d.type) { if (S.scale.phase !== 'weighing') { S.scale.type = d.type; S.scale.phase = 'idle'; S.scale.kg = 0; redraw(); } return; }
    if (d.remove) { removeBag(Number(d.remove)); return; }
    if (d.method) { S.pay.method = d.method; if (d.method === 'card') { S.pay.cardPhase = 'wait'; S.pay.declined = false; go('card'); } else { S.pay.pin = ''; go(S.pay.pinOk ? 'methods' : 'pin'); } return; }
    if (d.option) { S.pay.option = d.option; redraw(); return; }
    if (d.op) {
      if (d.op === 'close') toggleOperator(false);
      if (d.op === 'reset') { toggleOperator(false); resetSession(); }
      if (d.op === 'fullscreen') { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen(); }
      return;
    }
    if (d.opWeight) { const v = Number(d.v); operator[d.opWeight] = operator[d.opWeight] === v ? null : v; renderOperator(); return; }
    switch (d.act) {
      case 'help': openModal('help'); break;
      case 'back': back(); break;
      case 'cancel': openModal('cancel'); break;
      case 'a11y': S.a11y = !S.a11y; document.body.classList.toggle('a11y', S.a11y); refresh(); announce(S.a11y ? t('welcome.a11yOn') : t('welcome.a11yOff')); break;
      case 'scan': scanQR(); break;
      case 'manual': go('manual'); break;
      case 'validate': validateManual(); break;
      case 'confirm': S.scale = { type: 'checked', phase: 'idle', kg: 0 }; go('bags'); break;
      case 'notMine': S.booking = null; S.qrPhase = 'idle'; S.history = []; go('find', { back: true }); toast(t('flight.notMineToast')); break;
      case 'weigh': weigh(false); break;
      case 'reweigh': { const sc = S.scale; const over = sc.phase === 'result' && ((sc.type === 'hand' && sc.kg > RULES.handMaxKg) || sc.kg > RULES.checkedMaxKg); const keep = sc.phase === 'result' && !over ? sc.kg : null; sc.phase = 'idle'; weigh(true, keep); break; }
      case 'addBag': addBag(); break;
      case 'toChecked': addBag('checked'); break;
      case 'removeAll': openModal('removeAll'); break;
      case 'toPay': S.pay.amount = totalOf(); if (S.pay.amount > 0) go('pay'); else { S.pay.method = null; go('printing'); } break;
      case 'tapCard': tapCard(); break;
      case 'changeMethod': back(); break;
      case 'pinOk': checkPin(); break;
      case 'payCardInstead': S.pay.method = 'card'; S.pay.cardPhase = 'wait'; go('card'); break;
      case 'appLogin': appLogin(); break;
      case 'addCard': openModal('addCard'); break;
      case 'payAccount': S.pay.method = 'account'; go('processing', { replace: true }); break;
      case 'printReceipt': S.pay.receiptPrinted = true; SND.play('print'); toast(t('approved.printing')); redraw(); break;
      case 'toPrinting': go('printing'); break;
      case 'finish': resetSession(); break;
      default: break;
    }
  });
  opPanel.addEventListener('change', ev => {
    const el = ev.target;
    if (el.name === 'opqr') operator.qrBooking = el.value;
    if (el.dataset.opToggle) {
      const k = el.dataset.opToggle;
      if (k === 'sound') SND.enabled = el.checked;
      else operator[k] = el.checked;
      if (k === 'hideCursor') document.body.classList.toggle('hide-cursor', el.checked);
      if (k === 'hints' && S.screen !== 'welcome') refresh();
    }
  });
  // efecto de onda al tocar + sonido
  stage.addEventListener('pointerdown', ev => {
    bumpIdle();
    const b = ev.target.closest('.btn, .tap, .key, .seg-opt, .option, .lang-opt, .round-x');
    if (!b || b.disabled) return;
    if (!b.classList.contains('key')) SND.play('tap');
    if (reducedMotion()) return;
    const r = b.getBoundingClientRect();
    const size = Math.max(r.width, r.height) / stageScale;
    const rip = document.createElement('span');
    rip.className = 'ripple';
    rip.style.width = rip.style.height = size + 'px';
    rip.style.left = ((ev.clientX - r.left) / stageScale - size / 2) + 'px';
    rip.style.top = ((ev.clientY - r.top) / stageScale - size / 2) + 'px';
    b.appendChild(rip);
    setTimeout(() => rip.remove(), 600);
  });
  document.addEventListener('keydown', ev => {
    bumpIdle();
    if (ev.ctrlKey && ev.shiftKey && (ev.key === 'D' || ev.key === 'd')) { ev.preventDefault(); toggleOperator(); return; }
    if (ev.key === 'Escape' && currentModal && currentModal.type !== 'idle' && currentModal.type !== 'appLogin') { closeModal(); return; }
    if (currentModal) return;
    if (ev.target && ev.target.closest && ev.target.closest('.operator')) return;
    // teclado físico (útil al presentar desde un notebook)
    if (S.screen === 'manual') {
      const k = ev.key;
      if (k === 'Backspace') { ev.preventDefault(); typeKey('DEL'); }
      else if (k === 'Tab') { ev.preventDefault(); typeKey('NEXT'); }
      else if (k === 'Enter') { const b = $('[data-act="validate"]'); if (b && !b.disabled) validateManual(); }
      else if (k === ' ') { ev.preventDefault(); typeKey('SPACE'); }
      else if (k.length === 1) { const up = /ñ/i.test(k) ? 'Ñ' : k === '-' ? '-' : norm(k); if (/^[A-Z0-9Ñ-]$/.test(up)) typeKey(up); }
    } else if (S.screen === 'pin') {
      if (/^[0-9]$/.test(ev.key)) pinKey(ev.key);
      else if (ev.key === 'Backspace') pinKey('DEL');
    }
  });
  ['pointerdown', 'keydown', 'wheel'].forEach(evn => document.addEventListener(evn, () => bumpIdle(), { passive: true }));
  document.addEventListener('contextmenu', ev => { if (!opPanel.contains(ev.target)) ev.preventDefault(); });

  // reloj
  setInterval(() => { $$('.clock').forEach(c => { c.textContent = I18N.time(new Date()); }); const d = $('.w-date'); if (d) d.textContent = I18N.dateLong(new Date()); }, 10000);

  // ------------------------------------------------------------------ inicio
  document.documentElement.lang = I18N.lang;
  if (operator.hideCursor) document.body.classList.add('hide-cursor');
  if (params.get('reduce') === '1') document.body.classList.add('reduce-motion');
  go('welcome', { reset: true });
  stage.setAttribute('aria-busy', 'false');
  // API mínima para pruebas automáticas
  window.SKY_APP = { get state() { return S; }, operator, go, setLang, resetSession, totalOf, priceBag, toggleOperator };
})();
