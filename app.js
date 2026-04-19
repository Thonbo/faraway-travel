// Faraway — planner flow + timeline

(() => {

  // ============================================
  //  State
  // ============================================
  const state = {
    currentStep: 1,          // 1, 2, 3
    vibe: null,              // 'warm' | 'city' | 'cold'
    region: null,
    activity: null,
    startDate: null,         // Date
    endDate: null,
    // timeline
    dayPx: 14,               // px per day
    totalDays: 365 * 3,      // 3 years horizon
    trackPadDays: 60,        // buffer at each end — lets the selection protrude halfway past the edge
    people: 2,               // travellers count
  };
  const PEOPLE_MIN = 1;
  const PEOPLE_MAX = 12;

  // ============================================
  //  Utilities
  // ============================================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const startOfDay = d => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
  const fmtDate = d => d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
  const fmtDateShort = d => d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const today = startOfDay(new Date());

  // Timeline anchor = today - 14 days (so "today" is never at the far left)
  const anchor = addDays(today, -14);

  // Default trip: 30 days from now, 7 nights
  state.startDate = addDays(today, 30);
  state.endDate = addDays(today, 37);

  // ============================================
  //  Planner flow
  // ============================================

  const nextBtn = $('#btn-next');
  const backBtn = $('#btn-back');
  const summaryText = $('#summary-text');

  function showStep(step, branch) {
    state.currentStep = step;

    $$('.step').forEach(el => el.classList.remove('is-active'));

    let target;
    if (step === 2) {
      target = $(`.step[data-step="2"][data-branch="${branch || state.vibe}"]`);
    } else {
      target = $(`.step[data-step="${step}"]:not([data-branch])`);
    }
    if (target) target.classList.add('is-active');

    // progress bar
    $$('.planner__track li').forEach(li => {
      const n = +li.dataset.progress;
      li.classList.toggle('is-active', n === step);
      li.classList.toggle('is-done', n < step);
    });

    backBtn.disabled = step === 1;
    updateSummary();
    updateNextBtn();

    if (step === 3) {
      requestAnimationFrame(() => {
        buildTimeline();
        centerTimelineOnSelection();
      });
    }
  }

  function updateSummary() {
    const parts = [];
    if (state.vibe) parts.push(vibeLabel(state.vibe));
    if (state.region) parts.push(regionLabel(state.region));
    if (state.activity) parts.push(activityLabel(state.activity));
    if (state.currentStep === 3 && state.startDate && state.endDate) {
      const nights = daysBetween(state.startDate, state.endDate);
      parts.push(`${fmtDateShort(state.startDate)} – ${fmtDateShort(state.endDate)} · ${nights} nights`);
      const p = state.people;
      parts.push(`${p} ${p === 1 ? 'traveller' : 'travellers'}`);
    }
    summaryText.textContent = parts.length ? parts.join(' · ') : 'Pick a vibe to begin';
  }

  function updateNextBtn() {
    if (state.currentStep === 1) {
      nextBtn.disabled = !state.vibe;
      nextBtn.textContent = 'Next →';
    } else if (state.currentStep === 2) {
      nextBtn.disabled = !(state.region || state.activity);
      nextBtn.textContent = 'Next →';
    } else {
      nextBtn.disabled = !(state.startDate && state.endDate);
      nextBtn.textContent = 'Find my trip ✺';
    }
  }

  function vibeLabel(v) {
    return { warm:'Somewhere warm', city:'A city', cold:'Somewhere cold' }[v];
  }
  function regionLabel(r) {
    return {
      'mediterranean':'Mediterranean',
      'se-asia':'Southeast Asia',
      'caribbean':'Caribbean',
      'africa-warm':'Africa',
      'oceania':'Oceania',
      'south-america-warm':'South America',
      'europe-city':'Old Europe',
      'asia-city':'Asia',
      'americas-city':'The Americas',
      'mideast-city':'Middle East',
      'africa-city':'Africa',
      'oceania-city':'Oceania'
    }[r] || r;
  }
  function activityLabel(a) {
    return {
      ski:'Skiing',
      wildlife:'Arctic wildlife',
      aurora:'Northern lights',
      cabin:'Cabin & fire',
      sport:'Active adventure',
      'city-cold':'Cold cozy city'
    }[a] || a;
  }

  const safeUpdateSelectionPhoto = () => {
    if (typeof updateSelectionPhoto === 'function' && document.getElementById('tl-selection')) {
      updateSelectionPhoto();
    }
  };

  // Vibe click
  $$('.vibe').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.vibe').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      state.vibe = btn.dataset.vibe;
      state.region = null;
      state.activity = null;
      safeUpdateSelectionPhoto();
      updateSummary();
      updateNextBtn();
      setTimeout(() => showStep(2), 380);
    });
  });

  // Chip click
  $$('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.chip-grid');
      $$('.chip', parent).forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      state.region = btn.dataset.region;
      safeUpdateSelectionPhoto();
      updateSummary();
      updateNextBtn();
      setTimeout(() => showStep(3), 380);
    });
  });

  // Activity click
  $$('.activity').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.activity').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      state.activity = btn.dataset.activity;
      safeUpdateSelectionPhoto();
      updateSummary();
      updateNextBtn();
      setTimeout(() => showStep(3), 380);
    });
  });

  // Next / Back
  nextBtn.addEventListener('click', () => {
    if (state.currentStep === 1 && state.vibe) {
      showStep(2);
    } else if (state.currentStep === 2) {
      showStep(3);
      // render timeline now (deferred until first open so viewport width exists)
      setTimeout(() => { buildTimeline(); centerTimelineOnSelection(); }, 40);
    } else if (state.currentStep === 3) {
      // finish — scroll to bento
      document.getElementById('bento').scrollIntoView({ behavior:'smooth' });
    }
  });

  backBtn.addEventListener('click', () => {
    if (state.currentStep === 3) showStep(2);
    else if (state.currentStep === 2) showStep(1);
  });

  // ============================================
  //  Timeline
  // ============================================
  const tlViewport = $('#tl-viewport');
  const tlTrack    = $('#tl-track');
  const tlMonths   = $('#tl-months');
  const tlRuler    = $('#tl-ruler');
  const tlSelection= $('#tl-selection');
  const tlHandleS  = $('#tl-handle-start');
  const tlHandleE  = $('#tl-handle-end');
  const tlToday    = $('#tl-today');
  const tlStartTxt = $('#tl-start');
  const tlEndTxt   = $('#tl-end');
  const tlStartDisplay = $('#tl-start-display');
  const tlStartD = $('#tl-start-d'), tlStartM = $('#tl-start-m'), tlStartY = $('#tl-start-y');
  const tlEndDisplay   = $('#tl-end-display');
  const tlEndD = $('#tl-end-d'), tlEndM = $('#tl-end-m'), tlEndY = $('#tl-end-y');
  const tlPeopleCount = $('#tl-people-count');
  const tlPeopleUnit  = $('#tl-people-display .timeline__travellers-unit');
  const tlPeopleInput = $('#tl-people');
  const tlPeopleMinus = $('#tl-people-minus');
  const tlPeoplePlus  = $('#tl-people-plus');

  let timelineBuilt = false;

  function dateToPx(date) {
    // +trackPadDays so anchor sits past a leading buffer; selection can protrude into buffer
    return (state.trackPadDays + daysBetween(anchor, date)) * state.dayPx;
  }

  function pxToDate(px) {
    const days = Math.round(px / state.dayPx) - state.trackPadDays;
    return addDays(anchor, days);
  }

  function buildTimeline() {
    if (timelineBuilt) return;
    timelineBuilt = true;

    const width = (state.totalDays + 2 * state.trackPadDays) * state.dayPx;
    tlTrack.style.width = width + 'px';

    // Month labels
    tlMonths.innerHTML = '';
    let cursor = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    while (cursor < addDays(anchor, state.totalDays)) {
      const isYearFirst = cursor.getMonth() === 0;
      const px = dateToPx(cursor);
      const label = document.createElement('div');
      label.className = 'timeline__month-label' + (isYearFirst ? ' is-year-first' : '');
      label.style.left = px + 'px';
      label.innerHTML = `
        <span class="timeline__month-label-year">${cursor.getFullYear()}</span>
        <span>${MONTHS[cursor.getMonth()]}</span>
      `;
      tlMonths.appendChild(label);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    // Ruler — a tick per week, thicker per month
    tlRuler.innerHTML = '';
    for (let d = 0; d < state.totalDays; d++) {
      const date = addDays(anchor, d);
      const dow = date.getDay();
      const dom = date.getDate();
      let cls = '';
      if (dom === 1) cls = 'is-month';
      else if (dow === 1) cls = 'is-week';
      else continue;
      const tick = document.createElement('div');
      tick.className = `timeline__tick ${cls}`;
      tick.style.left = dateToPx(date) + 'px';
      tlRuler.appendChild(tick);
    }

    // Today marker
    tlToday.style.left = dateToPx(today) + 'px';

    // Initial selection
    renderSelection();

    // Wire up dragging
    attachDrag(tlHandleS, 'start');
    attachDrag(tlHandleE, 'end');
    attachDrag(tlSelection, 'grip');  // whole box is the grip

    // Editable inputs — typing a date updates the timeline
    const clampDate = d => {
      const min = anchor;
      const max = addDays(anchor, state.totalDays - 1);
      if (d < min) return new Date(min);
      if (d > max) return new Date(max);
      return d;
    };
    // Auto-advance focus as the user types each pair of digits
    const autoAdvance = (el, next) => {
      el.addEventListener('input', () => {
        el.value = el.value.replace(/\D/g, '').slice(0, +el.maxLength);
        const row = el.closest('.timeline__dmy');
        if (row) row.classList.remove('is-invalid');
        if (el.value.length >= +el.maxLength && next) next.focus();
      });
    };
    autoAdvance(tlStartD, tlStartM);
    autoAdvance(tlStartM, tlStartY);
    autoAdvance(tlStartY, null);
    autoAdvance(tlEndD, tlEndM);
    autoAdvance(tlEndM, tlEndY);
    autoAdvance(tlEndY, null);

    // Select-all on focus for quick retyping
    [tlStartD, tlStartM, tlStartY, tlEndD, tlEndM, tlEndY].forEach(el => {
      el.addEventListener('focus', () => el.select());
    });

    // Build a Date from the three fields; commit on change/blur
    const commit = (which) => {
      const isStart = which === 'start';
      const dEl = isStart ? tlStartD : tlEndD;
      const mEl = isStart ? tlStartM : tlEndM;
      const yEl = isStart ? tlStartY : tlEndY;
      const row = dEl.closest('.timeline__dmy');
      const d = parseInt(dEl.value, 10);
      const m = parseInt(mEl.value, 10);
      let y = parseInt(yEl.value, 10);
      if (isNaN(d) || isNaN(m) || isNaN(y)) { row.classList.add('is-invalid'); return; }
      if (y < 100) y += 2000;
      if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2200) {
        row.classList.add('is-invalid');
        return;
      }
      const dt = new Date(y, m - 1, d);
      if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
        row.classList.add('is-invalid');
        return;
      }
      row.classList.remove('is-invalid');
      let next = clampDate(startOfDay(dt));
      if (isStart) {
        if (next >= state.endDate) next = addDays(state.endDate, -1);
        state.startDate = next;
      } else {
        if (next <= state.startDate) next = addDays(state.startDate, 1);
        state.endDate = next;
      }
      renderSelection(); renderReadout(); centerTimelineOnSelection();
    };
    [tlStartD, tlStartM, tlStartY].forEach(el => el.addEventListener('change', () => commit('start')));
    [tlEndD, tlEndM, tlEndY].forEach(el =>   el.addEventListener('change', () => commit('end')));
    // Smart paste: pasting "19/05/2026" or "19 May 2026" into any field of a row
    // fills all three.
    const hookPaste = (row, which) => {
      row.addEventListener('paste', ev => {
        const txt = (ev.clipboardData || window.clipboardData)?.getData('text') || '';
        const parsed = parseDateInput(txt);
        if (!parsed) return;
        ev.preventDefault();
        let next = clampDate(parsed);
        if (which === 'start') {
          if (next >= state.endDate) next = addDays(state.endDate, -1);
          state.startDate = next;
        } else {
          if (next <= state.startDate) next = addDays(state.startDate, 1);
          state.endDate = next;
        }
        renderSelection(); renderReadout(); centerTimelineOnSelection();
      });
    };
    hookPaste(tlStartD.closest('.timeline__dmy'), 'start');
    hookPaste(tlEndD.closest('.timeline__dmy'), 'end');

    updateSelectionPhoto();
    renderReadout();
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function renderSelection() {
    const sPx = dateToPx(state.startDate);
    const ePx = dateToPx(state.endDate);
    const w = Math.max(28, ePx - sPx);
    tlSelection.style.left = sPx + 'px';
    tlSelection.style.width = w + 'px';
    // When the box is too narrow, collapse to just the big day number
    tlSelection.dataset.compact = w < 90 ? 'true' : 'false';
  }

  const pad2 = n => String(n).padStart(2, '0');
  function renderReadout() {
    const s = state.startDate, e = state.endDate;
    tlStartDisplay.textContent = fmtDate(s);
    tlEndDisplay.textContent   = fmtDate(e);
    const setIfIdle = (el, v) => { if (document.activeElement !== el) el.value = v; };
    setIfIdle(tlStartD, pad2(s.getDate()));
    setIfIdle(tlStartM, pad2(s.getMonth() + 1));
    setIfIdle(tlStartY, pad2(s.getFullYear() % 100));
    setIfIdle(tlEndD, pad2(e.getDate()));
    setIfIdle(tlEndM, pad2(e.getMonth() + 1));
    setIfIdle(tlEndY, pad2(e.getFullYear() % 100));
    // Clear any invalid state on the containing rows
    [tlStartD.closest('.timeline__dmy'), tlEndD.closest('.timeline__dmy')].forEach(r => r && r.classList.remove('is-invalid'));
    tlStartTxt.value = `${s.getFullYear()}-${pad2(s.getMonth()+1)}-${pad2(s.getDate())}`;
    tlEndTxt.value   = `${e.getFullYear()}-${pad2(e.getMonth()+1)}-${pad2(e.getDate())}`;
    const n = daysBetween(state.startDate, state.endDate);
    const gripLabel = document.getElementById('tl-grip-label');
    if (gripLabel) gripLabel.textContent = String(n);
    renderPeople();
    updateSummary();
  }

  const tlTravellersIcon = $('#tl-travellers-icon');
  const tlSelectionPeople = $('#tl-selection-people');
  const tlSelectionPeopleIcon = $('#tl-selection-people-icon');
  const tlSelectionPeopleNum = $('#tl-selection-people-num');

  // Vibe/region (or activity) → Unsplash photo that represents the trip
  const SELECTION_PHOTOS = {
    // warm
    'warm:mediterranean'       : '1570077188670-e3a8d69ac5ff',
    'warm:se-asia'             : '1537996194471-e657df975ab4',
    'warm:caribbean'           : '1514282401047-d79a71a590e8',
    'warm:africa-warm'         : '1516426122078-c23e76319801',
    'warm:oceania'             : '1514282401047-d79a71a590e8',
    'warm:south-america-warm'  : '1531685250784-7569952593d2',
    // city
    'city:europe-city'         : '1585208798174-6cedd86e019a',
    'city:asia-city'           : '1540959733332-eab4deabeeaf',
    'city:americas-city'       : '1502602898657-3e91760cbb34',
    'city:mideast-city'        : '1489749798305-4fea3ae63d43',
    'city:africa-city'         : '1489749798305-4fea3ae63d43',
    'city:oceania-city'        : '1506905925346-21bda4d32df4',
    // cold (indexed by activity)
    'cold:ski'                 : '1506710507565-203b9f24669b',
    'cold:wildlife'            : '1547756536-cde3673fa2e5',
    'cold:aurora'              : '1483347756197-71ef80e95f73',
    'cold:cabin'               : '1506905925346-21bda4d32df4',
    'cold:sport'               : '1520769945061-0a448c463865',
    'cold:city-cold'           : '1490349368154-73de9c9bc37c',
  };
  const VIBE_FALLBACK = {
    warm: '1534445867742-43195f401b6c',
    city: '1540959733332-eab4deabeeaf',
    cold: '1520769945061-0a448c463865',
  };

  function updateSelectionPhoto() {
    const key = state.vibe
      ? `${state.vibe}:${state.region || state.activity || ''}`
      : null;
    const id = (key && SELECTION_PHOTOS[key]) || VIBE_FALLBACK[state.vibe] || null;
    if (id) {
      tlSelection.style.setProperty('--selection-photo',
        `url('https://images.unsplash.com/photo-${id}?w=900&q=80')`);
    } else {
      tlSelection.style.removeProperty('--selection-photo');
    }
  }
  // Build an SVG showing N overlapping silhouettes. The foreground is a full
  // person; each additional "background" person is just the right-half head
  // arc + right shoulder flank — the same two paths Lucide's users icon uses
  // for its background dude — cloned at an offset so they stack like a crowd.
  function buildTravellersSvg(n) {
    const cx0 = 9;            // foreground center (Lucide users)
    const firstGap = 10;      // foreground → first bg (matches Lucide 2-user layout)
    const restGap  = 6;       // between subsequent bgs (tighter crowd behind)
    const cxFor = i => i === 0 ? cx0 : cx0 + firstGap + (i - 1) * restGap;
    const lastCx = cxFor(n - 1);
    const viewW = Math.max(16, lastCx + 6);

    let parts = '';
    // Backgrounds render first so foreground overlaps them
    for (let i = n - 1; i >= 1; i--) {
      const dx = cxFor(i) - 19;  // offset from Lucide's bg template (cx=19)
      parts += `<path d="M${22+dx} 21v-2a4 4 0 0 0-3-3.87"/>`;
      parts += `<path d="M${16+dx} 3.13a4 4 0 0 1 0 7.75"/>`;
    }
    // Foreground (full silhouette)
    parts += `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>`;
    parts += `<circle cx="9" cy="7" r="4"/>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewW} 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${parts}</svg>`;
  }

  function renderPeople() {
    const p = state.people;
    tlPeopleCount.textContent = String(p);
    tlPeopleUnit.textContent = p === 1 ? 'traveller' : 'travellers';
    tlPeopleInput.value = String(p);
    tlPeopleMinus.disabled = p <= PEOPLE_MIN;
    tlPeoplePlus.disabled  = p >= PEOPLE_MAX;
    tlTravellersIcon.innerHTML = buildTravellersSvg(p);
    if (tlSelectionPeopleIcon) {
      tlSelectionPeopleIcon.innerHTML = buildTravellersSvg(Math.min(p, 4));
      tlSelectionPeopleNum.textContent = String(p);
    }
  }
  tlPeopleMinus.addEventListener('click', () => {
    state.people = Math.max(PEOPLE_MIN, state.people - 1);
    renderPeople(); updateSummary();
  });
  tlPeoplePlus.addEventListener('click', () => {
    state.people = Math.min(PEOPLE_MAX, state.people + 1);
    renderPeople(); updateSummary();
  });
  renderPeople();


  // Month name → 1..12 across a dozen languages. Keys normalized lowercase,
  // accents stripped. Lookup matches by startsWith both directions so
  // "mai", "maio", "mayo", "maj", "may" all resolve.
  const MONTH_LOOKUP = {
    jan:1, january:1, januar:1, januari:1, janvier:1, gennaio:1, enero:1, janeiro:1, ocak:1, styczen:1, leden:1,
    feb:2, february:2, februar:2, februari:2, fevrier:2, febbraio:2, febrero:2, fevereiro:2, subat:2, luty:2, unor:2,
    mar:3, march:3, marz:3, mars:3, marzo:3, marco:3, maart:3, mart:3, marzec:3, brezen:3,
    apr:4, april:4, abril:4, aprile:4, avril:4, nisan:4, kwiecien:4, duben:4,
    may:5, maj:5, mei:5, mai:5, maggio:5, mayo:5, maio:5, mayis:5, maj:5, kveten:5,
    jun:6, june:6, juni:6, juin:6, junio:6, junho:6, giugno:6, haziran:6, czerwiec:6, cerven:6,
    jul:7, july:7, juli:7, juillet:7, julio:7, julho:7, luglio:7, temmuz:7, lipiec:7, cervenec:7,
    aug:8, august:8, augustus:8, aout:8, agosto:8, agustos:8, sierpien:8, srpen:8,
    sep:9, sept:9, september:9, septembre:9, septiembre:9, settembre:9, setembro:9, eylul:9, wrzesien:9, zari:9,
    oct:10, october:10, oktober:10, octobre:10, octubre:10, ottobre:10, outubro:10, ekim:10, pazdziernik:10, rijen:10,
    nov:11, november:11, novembre:11, noviembre:11, novembro:11, kasim:11, listopad:11,
    dec:12, december:12, dezember:12, decembre:12, diciembre:12, dicembre:12, dezembro:12, aralik:12, grudzien:12, prosinec:12,
  };
  const WEEKDAY_PREFIX = /^(mon|tue|wed|thu|fri|sat|sun|mån|man|tir|tor|ons|fre|lør|lor|søn|son|lun|mar|mer|jeu|ven|sam|dim|die|mit|don|sam|gio|sab|dom|niedz|pon|wt|sr|cz|pt|sob)[a-zéèêäöüøåáíóú.]*[,\s]+/i;
  const stripAccents = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Parse user-edited text in many locales. Returns a local-time Date or null.
  function parseDateInput(raw) {
    if (!raw) return null;
    let s = String(raw).trim();
    if (!s) return null;

    // Strip an optional weekday prefix ("Tue, ", "Man., ", "Mon ")
    s = s.replace(WEEKDAY_PREFIX, '');

    // Normalize separators and accents
    const norm = stripAccents(s)
      .replace(/[.,\/\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
    const parts = norm.split(' ').filter(Boolean);

    const defaultYear = state.startDate ? state.startDate.getFullYear() : new Date().getFullYear();

    const toMonth = p => {
      const n = parseInt(p, 10);
      if (!isNaN(n) && n >= 1 && n <= 12 && /^\d{1,2}$/.test(p)) return n;
      if (MONTH_LOOKUP[p] != null) return MONTH_LOOKUP[p];
      // prefix match (e.g. "janua" → january)
      const hit = Object.keys(MONTH_LOOKUP).find(k => k.length >= 3 && (k.startsWith(p) || p.startsWith(k)));
      return hit ? MONTH_LOOKUP[hit] : null;
    };
    const toDay = p => {
      if (!/^\d{1,2}$/.test(p)) return null;
      const n = parseInt(p, 10);
      return (n >= 1 && n <= 31) ? n : null;
    };
    const toYear = p => {
      if (!/^\d{2}$|^\d{4}$/.test(p)) return null;
      const n = parseInt(p, 10);
      if (p.length === 4) return (n >= 1900 && n <= 2200) ? n : null;
      return 2000 + n; // YY → 20YY
    };
    const build = (y, m, d) => {
      if (!y || !m || !d) return null;
      const dt = new Date(y, m - 1, d);
      return (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) ? dt : null;
    };

    let result = null;

    if (parts.length === 1) {
      // Try native parse as a last resort for one-word inputs
      const d = new Date(parts[0]);
      if (!isNaN(d)) result = d;
    } else if (parts.length === 2) {
      const [a, b] = parts;
      // "May 19" or "19 May"
      result = build(defaultYear, toMonth(a), toDay(b))
            || build(defaultYear, toMonth(b), toDay(a));
    } else if (parts.length >= 3) {
      const [a, b, c] = parts;
      // DMY — day-month-year (global majority)
      result = build(toYear(c), toMonth(b), toDay(a))
      // MDY — month-day-year (US)
            || build(toYear(c), toMonth(a), toDay(b))
      // YMD — year-month-day (ISO)
            || build(toYear(a), toMonth(b), toDay(c));

      // Disambiguate all-numeric DD/MM vs MM/DD using value hints
      if (!result) {
        const na = parseInt(a, 10), nb = parseInt(b, 10), ny = toYear(c);
        if (!isNaN(na) && !isNaN(nb) && ny) {
          if (na > 12 && nb <= 12)      result = build(ny, nb, na); // must be DMY
          else if (nb > 12 && na <= 12) result = build(ny, na, nb); // must be MDY
          else                          result = build(ny, nb, na); // ambiguous: prefer DMY
        }
      }
    }

    // Final fallback — let the browser try, then try with the year appended
    if (!result) {
      const d = new Date(s);
      if (!isNaN(d)) result = d;
    }
    if (!result) {
      const d = new Date(`${s}, ${defaultYear}`);
      if (!isNaN(d)) result = d;
    }

    return result ? startOfDay(result) : null;
  }

  function centerTimelineOnSelection() {
    // scroll viewport so selection midpoint is centered; shows ±30 days worth
    const midPx = (dateToPx(state.startDate) + dateToPx(state.endDate)) / 2;
    const vw = tlViewport.clientWidth;
    tlViewport.scrollTo({ left: midPx - vw / 2, behavior: 'smooth' });
  }

  // Drag handling — single unified RAF loop (RTS-style edge scroll).
  // Each frame: (1) pan the viewport if cursor is near an edge,
  // then (2) reapply the cursor's content-space position so the
  // dragged element stays pinned under the cursor while the map moves.
  const EDGE_ZONE = 140;        // px from viewport edge where pan begins
  const EDGE_MAX_PX_PER_SEC = 1600; // ~114 days/sec — roughly a season per second

  function attachDrag(el, mode) {
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch {}
      tlSelection.classList.add('is-dragging');

      const vpRect = tlViewport.getBoundingClientRect();
      const startContentX = e.clientX - vpRect.left + tlViewport.scrollLeft;
      const startStart = state.startDate;
      const startEnd   = state.endDate;
      let lastClientX = e.clientX;
      let running = true;
      let lastT = performance.now();
      let panAccum = 0; // fractional px carried between frames (scrollLeft rounds to int)

      const applyFromCursor = () => {
        const curContentX = lastClientX - vpRect.left + tlViewport.scrollLeft;
        const dDays = Math.round((curContentX - startContentX) / state.dayPx);

        if (mode === 'start') {
          let ns = addDays(startStart, dDays);
          if (ns > addDays(state.endDate, -1)) ns = addDays(state.endDate, -1);
          if (ns < anchor) ns = anchor;
          state.startDate = ns;
        } else if (mode === 'end') {
          let ne = addDays(startEnd, dDays);
          if (ne < addDays(state.startDate, 1)) ne = addDays(state.startDate, 1);
          const max = addDays(anchor, state.totalDays - 1);
          if (ne > max) ne = max;
          state.endDate = ne;
        } else if (mode === 'grip') {
          const len = daysBetween(startStart, startEnd);
          // Allow the box to stick halfway past the edge, capped by the track buffer
          const overhang = Math.min(state.trackPadDays, Math.ceil(len / 2));
          let ns = addDays(startStart, dDays);
          let ne = addDays(startEnd, dDays);
          const minStart = addDays(anchor, -overhang);
          const maxEnd   = addDays(anchor, state.totalDays - 1 + overhang);
          if (ns < minStart) { ns = minStart; ne = addDays(ns, len); }
          if (ne > maxEnd)   { ne = maxEnd; ns = addDays(ne, -len); }
          state.startDate = ns;
          state.endDate = ne;
        }
        renderSelection();
        renderReadout();
      };

      const computePan = () => {
        if (lastClientX < vpRect.left + EDGE_ZONE) {
          const dist = Math.max(0, lastClientX - vpRect.left);
          return -((EDGE_ZONE - dist) / EDGE_ZONE) * EDGE_MAX_PX_PER_SEC;
        }
        if (lastClientX > vpRect.right - EDGE_ZONE) {
          const dist = Math.max(0, vpRect.right - lastClientX);
          return ((EDGE_ZONE - dist) / EDGE_ZONE) * EDGE_MAX_PX_PER_SEC;
        }
        return 0;
      };

      const loop = (t) => {
        if (!running) return;
        const dt = Math.min(t - lastT, 50) / 1000;
        lastT = t;

        // 1. Push the map if cursor is near an edge (all drag modes).
        const pan = computePan();
        if (pan !== 0) {
          panAccum += pan * dt;
          if (Math.abs(panAccum) >= 1) {
            const whole = Math.trunc(panAccum);
            panAccum -= whole;
            const max = tlViewport.scrollWidth - tlViewport.clientWidth;
            tlViewport.scrollLeft = Math.max(0, Math.min(max, tlViewport.scrollLeft + whole));
          }
        } else {
          panAccum = 0;
        }

        // 2. Reapply cursor position — stays pinned under the mouse.
        applyFromCursor();

        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);

      const move = ev => {
        lastClientX = ev.clientX;
      };
      const up = () => {
        running = false;
        tlSelection.classList.remove('is-dragging');
        try { el.releasePointerCapture(e.pointerId); } catch {}
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  }

  // Drag-and-throw on the timeline empty area — drag to pan, release to
  // let it coast with momentum (friction decay), like iOS scroll.
  (function enableViewportPan() {
    let panning = false;
    let startX, startScroll;
    let lastX, lastT, velocity = 0;  // px/sec
    let momentumRaf = null;
    let momentumAcc = 0;

    const stopMomentum = () => {
      if (momentumRaf) { cancelAnimationFrame(momentumRaf); momentumRaf = null; }
      momentumAcc = 0;
    };

    tlViewport.addEventListener('pointerdown', e => {
      if (e.target.closest('.timeline__handle,.timeline__selection,.timeline__selection-readout')) return;
      stopMomentum();
      panning = true;
      startX = lastX = e.clientX;
      startScroll = tlViewport.scrollLeft;
      lastT = performance.now();
      velocity = 0;
      try { tlViewport.setPointerCapture(e.pointerId); } catch {}
    });

    tlViewport.addEventListener('pointermove', e => {
      if (!panning) return;
      tlViewport.scrollLeft = startScroll - (e.clientX - startX);
      const now = performance.now();
      const dt = Math.max(1, now - lastT) / 1000;
      const instant = -(e.clientX - lastX) / dt; // scroll velocity in px/sec
      // low-pass filter so one jitter frame doesn't spike momentum
      velocity = velocity * 0.6 + instant * 0.4;
      lastX = e.clientX;
      lastT = now;
    });

    const end = e => {
      if (!panning) return;
      panning = false;
      try { tlViewport.releasePointerCapture(e.pointerId); } catch {}

      // Throw: only if there's meaningful velocity
      if (Math.abs(velocity) < 80) { velocity = 0; return; }

      let v = velocity;
      let lastTick = performance.now();
      const FRICTION = 0.94; // per 16ms — retains 94%, ~50% at 180ms
      const tick = (t) => {
        const ftDt = Math.min(t - lastTick, 50) / 1000;
        lastTick = t;
        // decay
        v *= Math.pow(FRICTION, ftDt * 60);
        if (Math.abs(v) < 20) { momentumRaf = null; return; }
        momentumAcc += v * ftDt;
        if (Math.abs(momentumAcc) >= 1) {
          const whole = Math.trunc(momentumAcc);
          momentumAcc -= whole;
          const max = tlViewport.scrollWidth - tlViewport.clientWidth;
          const next = tlViewport.scrollLeft + whole;
          tlViewport.scrollLeft = Math.max(0, Math.min(max, next));
          if (next < 0 || next > max) { momentumRaf = null; return; }
        }
        momentumRaf = requestAnimationFrame(tick);
      };
      momentumRaf = requestAnimationFrame(tick);
    };
    tlViewport.addEventListener('pointerup', end);
    tlViewport.addEventListener('pointercancel', end);
  })();

  // Mouse wheel → horizontal scroll (so vertical scrolling pans time)
  tlViewport.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      tlViewport.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  // ============================================
  //  Init
  // ============================================
  // Render Lucide icons (replaces <i data-lucide="..."> with inline SVG)
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  } else {
    // Lucide script may still be loading; retry once it's ready
    window.addEventListener('load', () => {
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    });
  }

  // Show step 1 immediately, mark it active
  showStep(1);
  // Pre-build the timeline so it's ready when step 3 appears
  // (deferred so viewport measurement isn't zero)
  window.addEventListener('load', () => {
    // Build when timeline section becomes visible OR when user reaches step 3
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        buildTimeline();
        centerTimelineOnSelection();
        io.disconnect();
      }
    });
    io.observe($('.step--timeline'));
  });

})();
