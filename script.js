/* Nithiyaa Technologies NTX — site behaviour. No dependencies. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const WHATSAPP = '919150243847';
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } }
  };

  /* ---------- Kural intro: once per session ---------- */
  const playIntro = () => {
    const root = document.documentElement;
    const lines = $$('.kural-line');
    if (!lines.length) return;
    // Keep the full text for assistive technology; animate an aria-hidden copy.
    const segmenter = 'Segmenter' in Intl ? new Intl.Segmenter('ta', { granularity: 'grapheme' }) : null;
    const wrap = (line, build) => {
      const text = line.textContent;
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      const vis = document.createElement('span');
      vis.setAttribute('aria-hidden', 'true');
      build(text, vis);
      line.replaceChildren(sr, vis);
    };
    // Line one: grapheme by grapheme (Tamil clusters are kept whole).
    wrap(lines[0], (text, vis) => {
      const parts = segmenter ? [...segmenter.segment(text)].map(s => s.segment) : text.split(' ').flatMap((w, i, a) => (i < a.length - 1 ? [w, ' '] : [w]));
      const visible = parts.filter(p => p.trim()).length;
      const step = 1.1 / Math.max(visible, 1);
      let i = 0;
      parts.forEach(p => {
        if (!p.trim()) { vis.append(p); return; }
        const g = document.createElement('span');
        g.className = 'g';
        g.style.setProperty('--t', (0.2 + i++ * step).toFixed(3) + 's');
        g.textContent = p;
        vis.append(g);
      });
    });
    // Line two: word by word.
    wrap(lines[1], (text, vis) => {
      text.split(' ').forEach((word, i, all) => {
        const w = document.createElement('span');
        w.className = 'w';
        w.style.setProperty('--t', (1.3 + i * 0.16).toFixed(2) + 's');
        w.textContent = word;
        vis.append(w);
        if (i < all.length - 1) vis.append(' ');
      });
    });
    root.classList.add('intro');
    const finish = () => {
      root.classList.add('intro-done');
      window.setTimeout(() => root.classList.remove('intro', 'intro-done'), 60);
      ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(e => window.removeEventListener(e, finish));
    };
    // Any interaction skips straight to the finished hero; nothing is ever blocked.
    ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(e => window.addEventListener(e, finish, { once: true, passive: true }));
    const onFirstScroll = () => { if (window.scrollY > 60) { finish(); window.removeEventListener('scroll', onFirstScroll); } };
    window.addEventListener('scroll', onFirstScroll, { passive: true });
    window.setTimeout(() => { root.classList.remove('intro'); }, 3900);
    store.set('ntx-intro', '1');
  };
  if (!reduce && !store.get('ntx-intro') && window.scrollY < 40) playIntro();

  /* ---------- Smooth scrolling for in-page links (script, so programmatic scrolls stay instant) ---------- */
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = link.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    history.pushState(null, '', '#' + id);
  });

  /* ---------- Header: glass on scroll, hide on scroll down ---------- */
  const header = $('[data-header]');
  const nav = $('#site-nav');
  const toggle = $('.menu-toggle');
  let lastY = window.scrollY;
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    const menuOpen = nav.classList.contains('is-open');
    header.classList.toggle('is-hidden', !menuOpen && y > 400 && y > lastY + 4);
    if (y < lastY - 4 || y < 400) header.classList.remove('is-hidden');
    lastY = y;
    updateScrollLinked();
    sweepReveals();
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  /* ---------- Mobile menu ---------- */
  const setMenu = open => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
    if (open) $('a', nav).focus();
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => { if (nav.classList.contains('is-open')) setMenu(false); }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });
  document.addEventListener('click', e => {
    if (nav.classList.contains('is-open') && !nav.contains(e.target) && e.target !== toggle) setMenu(false);
  });

  /* ---------- Active navigation link ---------- */
  const navLinks = $$('.site-nav a:not(.nav-cta)');
  if ('IntersectionObserver' in window) {
    const byId = new Map(navLinks.map(a => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(a => a.removeAttribute('aria-current'));
        byId.get(entry.target.id)?.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------- Section entrances, staggered ---------- */
  let pendingReveals = $$('.reveal');
  const revealIn = (el, n) => { el.style.setProperty('--d', (n * 80) + 'ms'); el.classList.add('is-in'); };
  // Called on every scroll frame: anything that has reached the viewport is shown, even after a fast jump.
  function sweepReveals() {
    if (!pendingReveals.length) return;
    const limit = window.innerHeight * 0.94;
    let n = 0;
    pendingReveals = pendingReveals.filter(el => {
      if (el.getBoundingClientRect().top < limit) { revealIn(el, n++); return false; }
      return true;
    });
  }
  if (reduce) {
    pendingReveals.forEach(el => el.classList.add('is-in'));
    pendingReveals = [];
  } else {
    sweepReveals();
  }

  /* ---------- Magnetic calls to action (desktop pointer only) ---------- */
  if (finePointer && !reduce) {
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = `translate(${(dx * 10).toFixed(1)}px, ${(dy * 8).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Tabs ---------- */
  const setupTabs = (list, onSelect) => {
    const tabs = $$('[role="tab"]', list);
    const panel = document.getElementById(tabs[0].getAttribute('aria-controls'));
    const select = (tab, focus) => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', tab.id);
      if (focus) tab.focus();
      onSelect(tab.dataset.tab);
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('keydown', e => {
        const k = e.key;
        let next = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
        if (k === 'ArrowLeft' || k === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (k === 'Home') next = tabs[0];
        if (k === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
  };
  const swapText = (el, text) => {
    if (reduce) { el.textContent = text; return; }
    el.classList.add('is-swapping');
    window.setTimeout(() => { el.textContent = text; el.classList.remove('is-swapping'); }, 220);
  };

  const ARIVINAA = {
    quizzes: 'Timed ten-question quizzes across thirteen categories, from general knowledge and science to programming, history and languages, including quizzes in Tamil. Your first attempt is the one that counts for the leaderboards.',
    chess: 'Chess against Beginner, Intermediate and Pro bots, or a friend on your own clock, with voice across the board. Friends can ask to watch and listen.',
    guess: 'GUESS is multiplayer: five clues, fifteen seconds each. The first correct guess takes the round, and every clue makes it cheaper. Four to twelve players.',
    games: 'Break The Bank, Pen Fight in real 3D, U Know and Quiz Party: quick games to play alone or with friends, each with a guide that explains the rules.'
  };
  const ariList = $('.product-arivinaa [role="tablist"]');
  if (ariList) setupTabs(ariList, key => {
    $$('.product-arivinaa .shot').forEach(img => img.classList.toggle('is-active', img.dataset.shot === key));
    swapText($('#ari-text'), ARIVINAA[key]);
  });

  const PAVAI = {
    consult: ['Consultations', 'Online doctor consultations, with the administration around each consultation handled in the same system.'],
    appts: ['Appointments', "Appointment management for the clinic: the day's bookings and open slots in one place."],
    patients: ['Patients', 'Patient management for the clinic team, alongside appointments and consultations.'],
    payments: ['Payments', 'Digital payment integration for consultation fees, so the clinic can see what has been paid.']
  };
  const pavList = $('.product-pavai [role="tablist"]');
  if (pavList) setupTabs(pavList, key => {
    $$('.product-pavai .view').forEach(v => v.classList.toggle('is-active', v.dataset.view === key));
    $$('.product-pavai .app-nav').forEach(n => n.classList.toggle('is-on', n.dataset.nav === key));
    $('[data-app-title]').textContent = PAVAI[key][0];
    swapText($('#pav-text'), PAVAI[key][1]);
  });

  /* ---------- Services: command list ---------- */
  const svcList = $('#svc-list');
  const svcSearch = $('#svc-search');
  const svcEmpty = $('.command-empty');
  if (svcList) {
    const items = $$(':scope > li', svcList);
    const selectItem = (li, focus) => {
      items.forEach(item => {
        const on = item === li;
        item.classList.toggle('is-selected', on);
        $('.cmd-row', item).setAttribute('aria-expanded', String(on));
      });
      if (focus) $('.cmd-row', li).focus();
    };
    items.forEach(li => {
      const row = $('.cmd-row', li);
      row.addEventListener('click', () => selectItem(li, false));
      row.addEventListener('keydown', e => {
        const visible = items.filter(i => !i.hidden);
        const at = visible.indexOf(li);
        if (e.key === 'ArrowDown' && at < visible.length - 1) { e.preventDefault(); selectItem(visible[at + 1], true); }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (at > 0) selectItem(visible[at - 1], true); else svcSearch.focus();
        }
      });
    });
    // Letter shortcuts while focus is inside the list.
    svcList.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      const hit = items.find(i => !i.hidden && $('kbd', i).textContent.toLowerCase() === e.key.toLowerCase());
      if (hit) { e.preventDefault(); selectItem(hit, true); }
    });
    const filter = () => {
      const words = svcSearch.value.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 1);
      items.forEach(li => {
        const hay = (li.dataset.keys + ' ' + $('.cmd-name', li).textContent).toLowerCase();
        li.hidden = words.length > 0 && !words.some(w => hay.includes(w) || hay.split(' ').some(k => k.startsWith(w) || w.startsWith(k) && k.length > 3));
      });
      const visible = items.filter(i => !i.hidden);
      svcEmpty.hidden = visible.length > 0;
      if (visible.length && !visible.some(i => i.classList.contains('is-selected'))) selectItem(visible[0], false);
    };
    svcSearch.addEventListener('input', filter);
    svcSearch.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') {
        const first = items.find(i => !i.hidden);
        if (first) { e.preventDefault(); selectItem(first, true); }
      }
    });
    selectItem(items[0], false);
  }

  /* ---------- Automation picker ---------- */
  const AUTOMATE = {
    booking: ['Appointment booking', 'An AI assistant answers enquiries and books slots around the clock.', 'Confirmations, reminders and reschedules go out automatically.', 'A booking dashboard with calendar, payments and customer history.'],
    calls: ['Customer calls', 'An AI call assistant answers common questions and captures enquiries.', 'Missed calls trigger follow-up messages and callback tasks.', 'A call log with summaries, so your team sees every conversation.'],
    support: ['Customer support', 'An AI agent resolves frequent questions instantly, in plain language.', 'Complex issues are routed to the right person with full context.', 'A support desk with tickets, history and response tracking.'],
    data: ['Manual data entry', 'AI reads forms, documents and messages and extracts the details.', 'Data is validated and pushed into your systems without retyping.', 'A simple review screen to approve exceptions in one click.'],
    reports: ['Reports', 'An AI assistant summarises the numbers and answers questions about them.', 'Reports are generated and shared on schedule, with no copy and paste.', 'A live dashboard that pulls your data into one clear view.'],
    billing: ['Billing', 'An AI assistant answers billing queries and flags overdue accounts.', 'Invoices, payment links and reminders are sent automatically.', 'A billing system with payments, records and reconciliation.']
  };
  const chips = $$('.chips [data-problem]');
  const flow = $('.flow');
  const flowCta = $('[data-flow-cta]');
  chips.forEach(chip => chip.addEventListener('click', () => {
    const item = AUTOMATE[chip.dataset.problem];
    chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
    const apply = () => {
      $('[data-flow="agent"]').textContent = item[1];
      $('[data-flow="automation"]').textContent = item[2];
      $('[data-flow="software"]').textContent = item[3];
      flowCta.dataset.message = `I'd like to automate: ${item[0].toLowerCase()}.`;
      flow.classList.remove('is-swapping');
    };
    if (reduce) apply(); else { flow.classList.add('is-swapping'); window.setTimeout(apply, 220); }
  }));
  if (flowCta) flowCta.dataset.message = "I'd like to automate: appointment booking.";

  /* ---------- Why NTX: principles ---------- */
  const PRINCIPLES = [
    'We start from the problem in front of you and build the simplest thing that solves it well, not technology for its own sake.',
    'The people who scope your project build it and answer for it. When something breaks, we fix it.',
    'You see working software early and often, so decisions are made with you, not for you.',
    'Tested, secure and documented, so it keeps working long after launch day.',
    'Built so the next feature, the next branch and the next thousand users do not mean starting over.',
    'We keep learning and keep improving what we ship, our own products included.'
  ];
  const principles = $$('.principle');
  const principleText = $('[data-principle-text]');
  let pIndex = 0;
  let pTimer = null;
  const light = i => {
    pIndex = i;
    principles.forEach((b, j) => b.classList.toggle('is-lit', j === i));
    swapText(principleText, PRINCIPLES[i]);
  };
  principles.forEach((b, i) => {
    b.addEventListener('click', () => { window.clearInterval(pTimer); pTimer = null; light(i); });
  });
  if (!reduce && principles.length && 'IntersectionObserver' in window) {
    let userTouched = false;
    principles.forEach(b => b.addEventListener('click', () => { userTouched = true; }));
    const box = $('.principles');
    let paused = false;
    box.addEventListener('pointerenter', () => { paused = true; });
    box.addEventListener('pointerleave', () => { paused = false; });
    box.addEventListener('focusin', () => { paused = true; });
    box.addEventListener('focusout', () => { paused = false; });
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !pTimer && !userTouched) {
        pTimer = window.setInterval(() => { if (!paused && !document.hidden) light((pIndex + 1) % principles.length); }, 3400);
      } else if (!entry.isIntersecting && pTimer) { window.clearInterval(pTimer); pTimer = null; }
    }, { threshold: 0.4 }).observe(box);
  }

  /* ---------- Process slip + manuscript drift (scroll-linked) ---------- */
  const slip = $('[data-slip]');
  const stages = $$('[data-stage]');
  const manuscript = $('.manuscript img');
  function updateScrollLinked() {
    const vh = window.innerHeight;
    if (slip) {
      const r = slip.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / (r.height * 0.8)));
      slip.style.setProperty('--p', p.toFixed(3));
      stages.forEach(stage => {
        const sr = stage.getBoundingClientRect();
        stage.classList.toggle('is-on', sr.top < vh * 0.62);
      });
    }
    if (manuscript && !reduce) {
      const r = manuscript.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const t = (r.top + r.height / 2) / vh - 0.5; // -0.5 .. 0.5
        manuscript.style.setProperty('--drift', (t * -6).toFixed(2) + '%');
      }
    }
  }
  updateScrollLinked();
  window.addEventListener('resize', () => { updateScrollLinked(); sweepReveals(); }, { passive: true });

  /* ---------- Enquiry form ---------- */
  const form = $('#enquiry');
  const interest = $('#f-interest');
  const message = $('#f-msg');
  const done = $('.form-done', form);
  // Any "enquire" link preselects the topic and takes the visitor to the form.
  $$('[data-enquire]').forEach(link => link.addEventListener('click', () => {
    const topic = link.dataset.enquire;
    if ([...interest.options].some(o => o.value === topic || o.text === topic)) interest.value = topic;
    if (link.dataset.message && !message.value.trim()) message.value = link.dataset.message;
    form.classList.remove('is-done');
    done.hidden = true;
    window.setTimeout(() => $('#f-name').focus({ preventScroll: true }), reduce ? 0 : 700);
  }));

  const rules = {
    name: v => (v.trim().length >= 2 ? '' : 'Please tell us your name.'),
    interest: v => (v ? '' : 'Please choose what your enquiry is about.'),
    email: v => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'That email address looks incomplete. You can also leave it empty.'),
    message: v => (v.trim().length >= 10 ? '' : 'Please describe your idea or problem in a sentence or two.')
  };
  const check = field => {
    const rule = rules[field.name];
    if (!rule) return true;
    const msg = rule(field.value);
    const wrap = field.closest('.field');
    wrap.classList.toggle('is-invalid', !!msg);
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    $('.error', wrap).textContent = msg;
    return !msg;
  };
  $$('input, select, textarea', form).forEach(f => {
    f.addEventListener('blur', () => { if (f.value || f.closest('.is-invalid')) check(f); });
    f.addEventListener('input', () => { if (f.closest('.is-invalid')) check(f); });
  });

  const status = $('[data-form-status]', form);
  const setStatus = msg => { status.textContent = msg; status.classList.toggle('is-shown', !!msg); };
  let sending = false;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    setStatus('');
    const via = e.submitter?.value || 'email';
    const fields = $$('input:not(.hp), select, textarea', form);
    const bad = fields.filter(f => !check(f));
    // An emailed enquiry needs an address to reply to.
    const emailField = $('#f-email');
    if (via === 'email' && !emailField.value.trim() && !bad.includes(emailField)) {
      const wrap = emailField.closest('.field');
      wrap.classList.add('is-invalid');
      emailField.setAttribute('aria-invalid', 'true');
      $('.error', wrap).textContent = 'Please add your email so we can reply. Or use the WhatsApp button.';
      bad.push(emailField);
      bad.sort((a, b) => fields.indexOf(a) - fields.indexOf(b));
    }
    if (bad.length) { bad[0].focus(); return; }

    const data = Object.fromEntries(new FormData(form));
    const from = data.org ? `${data.name} (${data.org})` : data.name;
    const doneTitle = $('[data-done-title]', form);
    const doneText = $('[data-done-text]', form);

    if (via === 'whatsapp') {
      const text = `Hello NTX, I'm ${from}.\nEnquiry: ${data.interest}\n\n${data.message.trim()}${data.email ? `\n\nEmail: ${data.email}` : ''}`;
      const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
      const win = window.open(url, '_blank', 'noopener');
      if (!win) window.location.href = url;
      doneTitle.textContent = 'One more step: press Send in WhatsApp.';
      doneText.textContent = 'We opened WhatsApp with your enquiry filled in. It reaches us only after you press Send there.';
      return showDone();
    }

    // Send Enquiry: posted to FormSubmit (free, no account), which emails it to the address in data-endpoint.
    const btn = e.submitter;
    const label = btn ? btn.textContent : '';
    sending = true;
    form.classList.add('is-sending');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          Name: data.name,
          About: data.interest,
          'Business or college': data.org || '-',
          Email: data.email,
          Message: data.message.trim(),
          _subject: `New enquiry: ${data.interest} (${data.name})`,
          _replyto: data.email,
          _template: 'table',
          _captcha: 'false',
          _honey: data._honey || ''
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || String(res.status));
      doneTitle.textContent = 'Thank you. Your enquiry has been sent.';
      doneText.textContent = `We will reply to ${data.email}.`;
      showDone();
    } catch {
      setStatus('Sorry, the enquiry could not be sent just now. Please try again, or use the WhatsApp button.');
    } finally {
      sending = false;
      form.classList.remove('is-sending');
      if (btn) { btn.disabled = false; btn.textContent = label; }
    }
  });
  function showDone() {
    form.classList.add('is-done');
    done.hidden = false;
    done.focus();
  }
  $('[data-form-reset]', form).addEventListener('click', () => {
    form.reset();
    $$('.field', form).forEach(f => f.classList.remove('is-invalid'));
    $$('.error', form).forEach(p => { p.textContent = ''; });
    setStatus('');
    form.classList.remove('is-done');
    done.hidden = true;
    $('#f-name').focus();
  });

  /* ---------- Dock and panels ---------- */
  const dock = $('.dock');
  let openPanel = null;
  let opener = null;
  const closePanel = (restore = true) => {
    if (!openPanel) return;
    openPanel.hidden = true;
    openPanel.classList.remove('is-open');
    openPanel = null;
    dock.classList.remove('is-hidden');
    if (restore) opener?.focus?.();
  };
  const openPanelById = id => {
    const panel = document.getElementById('panel-' + id);
    if (!panel) return;
    if (openPanel && openPanel !== panel) closePanel(false);
    opener = document.activeElement;
    panel.hidden = false;
    panel.classList.add('is-open');
    openPanel = panel;
    dock.classList.add('is-hidden');
    $('[data-close]', panel).focus();
  };
  $$('[data-open]').forEach(b => b.addEventListener('click', () => openPanelById(b.dataset.open)));
  $$('[data-close]').forEach(b => b.addEventListener('click', () => closePanel()));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && openPanel) closePanel(); });
  // Keep the floating buttons off the enquiry form.
  const dockAvoid = [$('#contact'), $('.site-footer')].filter(Boolean);
  if (dockAvoid.length && 'IntersectionObserver' in window) {
    const inView = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => (e.isIntersecting ? inView.add(e.target) : inView.delete(e.target)));
      if (!openPanel) dock.classList.toggle('is-hidden', inView.size > 0);
    }, { threshold: 0.05 });
    dockAvoid.forEach(el => io.observe(el));
  }

  /* ---------- Challenge NTX ---------- */
  const QUESTIONS = {
    gk: [
      ['Which company invented the Post-it Note?', '3M', 'IBM', 'Xerox', 'Kodak'],
      ['What does HTTP stand for?', 'HyperText Transfer Protocol', 'High Transfer Text Process', 'Hyperlink Text Tool Protocol', 'Host Transfer Type Protocol'],
      ['Which planet is known as the Red Planet?', 'Mars', 'Venus', 'Jupiter', 'Mercury'],
      ['Who wrote the Thirukkural?', 'Thiruvalluvar', 'Kambar', 'Avvaiyar', 'Ilango Adigal'],
      ['Puducherry was formerly a colony of which country?', 'France', 'Portugal', 'Netherlands', 'Denmark'],
      ['Which language runs natively in web browsers?', 'JavaScript', 'Python', 'Java', 'C++'],
      ['How many couplets are in the Thirukkural?', '1330', '1000', '1080', '1500']
    ],
    math: [
      ['What is 12 × 12?', '144', '124', '132', '154'],
      ['What is 15% of 200?', '30', '15', '25', '35'],
      ['What comes next: 2, 4, 8, 16, ?', '32', '24', '20', '30'],
      ['Binary 1010 equals which decimal number?', '10', '8', '12', '5'],
      ['What is the square root of 169?', '13', '11', '12', '14'],
      ['What is 2 to the power of 10?', '1024', '512', '1000', '2048']
    ],
    puzzle: [
      ['I have keys but no locks, and space but no room. What am I?', 'A keyboard', 'A piano', 'A map', 'A safe'],
      ['What comes next: J, F, M, A, M, ?', 'J', 'A', 'S', 'N'],
      ['A farmer has 17 sheep. All but 9 run away. How many are left?', '9', '8', '17', '0'],
      ['Which is the odd one out: 3, 5, 11, 14, 17?', '14', '3', '11', '17'],
      ['5 machines make 5 parts in 5 minutes. How long do 100 machines take to make 100 parts?', '5 minutes', '100 minutes', '20 minutes', '1 minute']
    ]
  };
  const CATS = [['gk', 'General knowledge'], ['math', 'Maths'], ['puzzle', 'Puzzles']];
  const chBody = $('[data-challenge]');
  const shuffle = a => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const queues = {};
  const score = { right: 0, total: 0 };
  const scoreLine = () => el('p', 'ch-score', `Score ${score.right} of ${score.total}`);
  const menu = () => {
    const intro = el('p', '', 'A quick brain break. Pick a round:');
    const cats = el('div', 'ch-cats');
    CATS.forEach(([id, label]) => {
      const b = el('button', '', label);
      b.type = 'button';
      b.addEventListener('click', () => ask(id));
      cats.append(b);
    });
    const more = el('p', 'ch-score');
    more.innerHTML = 'Want more? <a href="https://arivinaa.com/quizzes" target="_blank" rel="noopener">Play full quizzes on AriVinaa</a>.';
    chBody.replaceChildren(intro, cats, ...(score.total ? [scoreLine()] : []), more);
  };
  const ask = cat => {
    if (!queues[cat]?.length) queues[cat] = shuffle(QUESTIONS[cat]);
    const [q, answer, ...rest] = queues[cat].pop();
    const opts = el('div', 'ch-options');
    const feedback = el('div', '');
    feedback.setAttribute('aria-live', 'polite');
    shuffle([answer, ...rest]).forEach(text => {
      const b = el('button', '', text);
      b.type = 'button';
      b.addEventListener('click', () => {
        const ok = text === answer;
        score.total++; if (ok) score.right++;
        $$('button', opts).forEach(o => { o.disabled = true; if (o.textContent === answer) o.classList.add('is-correct'); });
        if (!ok) b.classList.add('is-wrong');
        const next = el('button', 'btn btn-primary btn-small', 'Next question');
        next.type = 'button';
        next.addEventListener('click', () => ask(cat));
        const back = el('button', 'link-arrow', 'All rounds');
        back.type = 'button';
        back.addEventListener('click', menu);
        const actions = el('div', 'ch-actions');
        actions.append(next, back);
        feedback.replaceChildren(el('p', ok ? 'ch-result ok' : 'ch-result no', ok ? 'Correct.' : `Not quite — it's ${answer}.`), scoreLine(), actions);
        next.focus();
      });
      opts.append(b);
    });
    chBody.replaceChildren(el('p', 'ch-q', q), opts, feedback);
    $('button', opts).focus();
  };
  if (chBody) menu();
})();
