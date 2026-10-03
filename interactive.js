(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  const shuffle = list => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  /* ---------- Hero rotating phrase ---------- */
  const heroWord = document.querySelector('.hero h1 span');
  if (heroWord && !reduceMotion) {
    const heading = heroWord.parentElement;
    const allPhrases = ['impact.', 'websites.', 'apps.', 'AI agents.', 'automation.'];
    let phrases = allPhrases;
    let index = 0;

    // Only rotate through phrases that fit on the existing line, so the hero never changes height.
    const fitPhrases = () => {
      const current = heroWord.textContent;
      heroWord.textContent = allPhrases[0];
      const baseHeight = heading.offsetHeight;
      phrases = allPhrases.filter(phrase => {
        heroWord.textContent = phrase;
        return heading.offsetHeight <= baseHeight;
      });
      heroWord.textContent = current;
    };

    const startRotation = () => {
      fitPhrases();
      window.addEventListener('resize', fitPhrases);
      setInterval(() => {
        if (document.hidden || phrases.length < 2) return;
        index = (index + 1) % phrases.length;
        heroWord.classList.add('swap');
        setTimeout(() => {
          heroWord.textContent = phrases[index];
          heroWord.classList.remove('swap');
        }, 260);
      }, 2600);
    };

    if (document.fonts?.ready) document.fonts.ready.then(startRotation);
    else startRotation();
  }

  /* ---------- Floating dock + panels ---------- */
  const dock = make('div', 'ntx-dock');
  const challengeFab = make('button', 'ntx-fab ntx-fab-challenge', '⚡ Challenge NTX');
  const talkFab = make('button', 'ntx-fab ntx-fab-talk', '💬 Talk to NTX');
  challengeFab.type = talkFab.type = 'button';
  dock.append(challengeFab, talkFab);
  document.body.append(dock);

  let openPanel = null;

  const createPanel = (title, subtitle) => {
    const root = make('section', 'ntx-panel');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', title);

    const head = make('header', 'ntx-panel-head');
    const heading = make('div');
    heading.append(make('strong', '', title), make('small', '', subtitle));
    const closeButton = make('button', 'ntx-panel-close', '×');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close ' + title);
    head.append(heading, closeButton);

    const body = make('div', 'ntx-panel-body');
    root.append(head, body);
    document.body.append(root);

    let opener = null;
    const panel = {
      root,
      body,
      open() {
        if (openPanel === panel) return;
        openPanel?.close(false);
        opener = document.activeElement;
        openPanel = panel;
        root.classList.add('open');
        dock.classList.add('is-hidden');
        closeButton.focus({ preventScroll: true });
      },
      close(restoreFocus = true) {
        root.classList.remove('open');
        dock.classList.remove('is-hidden');
        if (openPanel === panel) openPanel = null;
        if (restoreFocus) opener?.focus?.({ preventScroll: true });
      }
    };
    closeButton.addEventListener('click', () => panel.close());
    return panel;
  };

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') openPanel?.close();
  });

  /* ---------- Challenge NTX ---------- */
  // First option of each question is the correct one; options are shuffled when shown.
  const QUESTIONS = {
    gk: [
      { q: 'Which company invented the Post-it Note?', o: ['3M', 'IBM', 'Xerox', 'Kodak'] },
      { q: 'What does HTTP stand for?', o: ['HyperText Transfer Protocol', 'High Transfer Text Process', 'Hyperlink Text Tool Protocol', 'Host Transfer Type Protocol'] },
      { q: 'Which planet is known as the Red Planet?', o: ['Mars', 'Venus', 'Jupiter', 'Mercury'] },
      { q: 'Who is often called the "father of the computer"?', o: ['Charles Babbage', 'Thomas Edison', 'Isaac Newton', 'Nikola Tesla'] },
      { q: 'Puducherry was formerly a colony of which country?', o: ['France', 'Portugal', 'Netherlands', 'Denmark'] },
      { q: 'Which language runs natively in web browsers?', o: ['JavaScript', 'Python', 'Java', 'C++'] },
      { q: 'How many bits make one byte?', o: ['8', '4', '16', '10'] }
    ],
    math: [
      { q: 'What is 12 × 12?', o: ['144', '124', '132', '154'] },
      { q: 'What is 15% of 200?', o: ['30', '15', '25', '35'] },
      { q: 'What comes next: 2, 4, 8, 16, ?', o: ['32', '24', '20', '30'] },
      { q: 'Binary 1010 equals which decimal number?', o: ['10', '8', '12', '5'] },
      { q: 'What is the square root of 169?', o: ['13', '11', '12', '14'] },
      { q: 'What is (7 × 8) − 6?', o: ['50', '48', '52', '56'] },
      { q: 'What is 2 to the power of 10?', o: ['1024', '512', '1000', '2048'] }
    ],
    puzzle: [
      { q: 'I have keys but no locks, and space but no room. What am I?', o: ['A keyboard', 'A piano', 'A map', 'A safe'] },
      { q: 'What comes next: J, F, M, A, M, ?', o: ['J', 'A', 'S', 'N'] },
      { q: 'A farmer has 17 sheep. All but 9 run away. How many are left?', o: ['9', '8', '17', '0'] },
      { q: 'Which is the odd one out: 3, 5, 11, 14, 17?', o: ['14', '3', '11', '17'] },
      { q: 'The more you take, the more you leave behind. What are they?', o: ['Footsteps', 'Photos', 'Breaths', 'Coins'] },
      { q: '5 machines make 5 parts in 5 minutes. How long do 100 machines take to make 100 parts?', o: ['5 minutes', '100 minutes', '20 minutes', '1 minute'] },
      { q: 'What gets wetter the more it dries?', o: ['A towel', 'A sponge', 'The rain', 'Soap'] }
    ]
  };

  const CATEGORIES = [
    { id: 'gk', label: '🧠 GK Challenge' },
    { id: 'math', label: '🧮 Math Challenge' },
    { id: 'puzzle', label: '🧩 Puzzle' },
    { id: 'game', label: '🎮 Mini Game', soon: true }
  ];

  const challenge = createPanel('⚡ Challenge NTX', 'Quick brain break — pick one');
  const queues = {};
  const score = { correct: 0, total: 0 };

  const scoreLine = () => make('p', 'ntx-score', `Score ${score.correct} / ${score.total}`);

  const showMenu = () => {
    const grid = make('div', 'ntx-cat-grid');
    CATEGORIES.forEach(category => {
      const option = make('button', 'ntx-cat', category.label);
      option.type = 'button';
      if (category.soon) {
        option.disabled = true;
        option.append(make('span', 'ntx-soon', 'Coming soon'));
      } else {
        option.addEventListener('click', () => askQuestion(category.id));
      }
      grid.append(option);
    });
    challenge.body.replaceChildren(grid);
    if (score.total) challenge.body.append(scoreLine());
  };

  const askQuestion = categoryId => {
    if (!queues[categoryId]?.length) queues[categoryId] = shuffle(QUESTIONS[categoryId]);
    const question = queues[categoryId].pop();
    const answer = question.o[0];

    const wrap = make('div', 'ntx-question');
    wrap.append(make('p', 'ntx-question-text', question.q));

    const options = make('div', 'ntx-options');
    const feedback = make('div', 'ntx-feedback');
    feedback.setAttribute('aria-live', 'polite');

    shuffle(question.o).forEach(text => {
      const option = make('button', 'ntx-option', text);
      option.type = 'button';
      option.addEventListener('click', () => {
        const correct = text === answer;
        score.total++;
        if (correct) score.correct++;

        options.querySelectorAll('button').forEach(other => {
          other.disabled = true;
          if (other.textContent === answer) other.classList.add('is-correct');
        });
        if (!correct) option.classList.add('is-wrong');

        const next = make('button', 'ntx-next', 'Next Challenge →');
        next.type = 'button';
        next.addEventListener('click', () => askQuestion(categoryId));
        const back = make('button', 'ntx-back', 'All challenges');
        back.type = 'button';
        back.addEventListener('click', showMenu);
        const actions = make('div', 'ntx-feedback-actions');
        actions.append(next, back);

        feedback.replaceChildren(
          make('p', correct ? 'ntx-result is-correct' : 'ntx-result is-wrong',
            correct ? '✓ Correct! Nicely done.' : `✗ Not quite — it's ${answer}.`),
          scoreLine(),
          actions
        );
        next.focus({ preventScroll: true });
      });
      options.append(option);
    });

    wrap.append(options, feedback);
    challenge.body.replaceChildren(wrap);
  };

  showMenu();
  challengeFab.addEventListener('click', () => challenge.open());

  /* ---------- Talk to NTX (predefined responses, no AI API) ---------- */
  const REPLIES = [
    { match: /\b(appointment|booking|schedul)/i, text: 'Absolutely. NTX can build an appointment workflow with online booking, notifications, payments and an AI assistant.' },
    { match: /\b(call|calls|phone|voice)\b/i, text: 'Yes. NTX can set up an AI call assistant that answers common questions, captures enquiries and hands over to your team when a person is needed.' },
    { match: /\b(support|helpdesk|chatbot|customer|faq)/i, text: 'Certainly. NTX can build an AI support assistant that answers customer questions instantly, with ticket routing and a dashboard for your team.' },
    { match: /\b(data entry|manual|excel|spreadsheet|paperwork|form)/i, text: 'Good news — that is very automatable. NTX can capture data from forms and documents, validate it and push it straight into your software.' },
    { match: /\b(report|dashboard|analytics)/i, text: 'Sure. NTX can build live dashboards and scheduled reports, with an AI assistant that summarises the numbers in plain language.' },
    { match: /\b(billing|invoice|payment|gst|fintech|finance)/i, text: 'Yes. NTX can build billing workflows with automatic invoices, payment links, reminders and reconciliation.' },
    { match: /\b(website|web|landing|site)/i, text: 'Absolutely. NTX builds business websites, landing pages and custom web platforms designed around your goals.' },
    { match: /\b(app|apps|android|ios|mobile)\b/i, text: 'Yes. NTX designs and builds Android and mobile applications around real user needs.' },
    { match: /\b(training|class|course|workshop|mentor|career|learn)/i, text: 'NTX offers practical technology classes, workshops, project guidance and career mentoring for students and professionals.' },
    { match: /\b(ai|agent|automat)/i, text: 'That is what we enjoy most. NTX combines AI agents, automation and custom software to take repetitive work off your team.' },
    { match: /\b(price|pricing|cost|quote|budget|how much)/i, text: 'Every project is different, so pricing depends on scope. Share your requirement and NTX will suggest a practical approach and estimate.' },
    { match: /\b(hi|hello|hey|vanakkam)\b/i, text: 'Hello! Tell me what you would like to build or automate.', plain: true }
  ];
  const FALLBACK = 'Thanks for sharing. That sounds like something NTX can help with — from websites and apps to AI agents and automation.';
  const SUGGESTIONS = ['I need an appointment booking system', 'Automate customer support', 'Build a website', 'Training & classes'];

  const talk = createPanel('💬 Talk to NTX', 'Guided preview assistant');
  talk.root.classList.add('ntx-chat');

  const log = make('div', 'ntx-chat-log');
  log.setAttribute('aria-live', 'polite');
  const suggestions = make('div', 'ntx-suggestions');
  const form = make('form', 'ntx-chat-form');
  const input = make('input');
  input.type = 'text';
  input.placeholder = 'Type your requirement…';
  input.maxLength = 200;
  input.setAttribute('aria-label', 'Your message to NTX');
  const send = make('button', '', '↗');
  send.type = 'submit';
  send.setAttribute('aria-label', 'Send message');
  form.append(input, send);
  talk.body.append(log, suggestions, form);

  const addMessage = (text, from) => {
    const message = make('div', 'ntx-msg ntx-msg-' + from, text);
    log.append(message);
    log.scrollTop = log.scrollHeight;
    return message;
  };

  const addContactPrompt = () => {
    const message = addMessage('Would you like to discuss your requirement?', 'ntx');
    const contact = make('a', 'ntx-contact', 'Contact NTX');
    contact.href = '#contact';
    contact.addEventListener('click', () => talk.close(false));
    message.append(contact);
    log.scrollTop = log.scrollHeight;
  };

  const sendMessage = text => {
    text = text.trim();
    if (!text) return;
    addMessage(text, 'user');
    const reply = REPLIES.find(entry => entry.match.test(text));
    const typing = addMessage('…', 'ntx');
    typing.classList.add('is-typing');
    setTimeout(() => {
      typing.classList.remove('is-typing');
      typing.textContent = reply ? reply.text : FALLBACK;
      if (!reply?.plain) addContactPrompt();
    }, 550);
  };

  SUGGESTIONS.forEach(text => {
    const chip = make('button', '', text);
    chip.type = 'button';
    chip.addEventListener('click', () => sendMessage(text));
    suggestions.append(chip);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    sendMessage(input.value);
    input.value = '';
  });

  addMessage('Hi, I\'m the NTX assistant. Tell me what you\'d like to build or automate.', 'ntx');
  talkFab.addEventListener('click', () => talk.open());

  /* ---------- What can NTX automate? ---------- */
  const AUTOMATE = {
    booking: {
      title: 'Appointment Booking',
      agent: 'An AI assistant answers enquiries and books slots around the clock.',
      automation: 'Confirmations, reminders and reschedules go out automatically.',
      software: 'A booking dashboard with calendar, payments and customer history.',
      ask: 'I need an appointment booking system'
    },
    calls: {
      title: 'Customer Calls',
      agent: 'An AI call assistant answers common questions and captures enquiries.',
      automation: 'Missed calls trigger follow-up messages and callback tasks.',
      software: 'A call log with summaries so your team sees every conversation.',
      ask: 'I want to automate customer calls'
    },
    support: {
      title: 'Customer Support',
      agent: 'An AI agent resolves frequent questions instantly, in plain language.',
      automation: 'Complex issues are routed to the right person with full context.',
      software: 'A support desk with tickets, history and response tracking.',
      ask: 'I want to automate customer support'
    },
    data: {
      title: 'Manual Data Entry',
      agent: 'AI reads forms, documents and messages and extracts the details.',
      automation: 'Data is validated and pushed into your systems without retyping.',
      software: 'A simple review screen to approve exceptions in one click.',
      ask: 'I want to remove manual data entry'
    },
    reports: {
      title: 'Reports',
      agent: 'An AI assistant summarises the numbers and answers questions about them.',
      automation: 'Reports are generated and shared on schedule — no copy-paste.',
      software: 'A live dashboard that pulls your data into one clear view.',
      ask: 'I want automated reports and dashboards'
    },
    billing: {
      title: 'Billing',
      agent: 'An AI assistant answers billing queries and flags overdue accounts.',
      automation: 'Invoices, payment links and reminders are sent automatically.',
      software: 'A billing system with payments, records and reconciliation.',
      ask: 'I want to automate billing and invoices'
    },
    other: {
      title: 'Something Else',
      agent: 'We map where an AI agent can take over repetitive conversations or decisions.',
      automation: 'We connect the steps your team repeats every day into one workflow.',
      software: 'We build the custom software that holds it all together.',
      ask: 'I have something else I would like to automate'
    }
  };

  const automateOptions = document.querySelectorAll('.automate-options button');
  const automateResult = document.querySelector('.automate-result');

  const showAutomation = key => {
    const item = AUTOMATE[key];
    if (!item || !automateResult) return;
    automateOptions.forEach(option => option.setAttribute('aria-pressed', option.dataset.problem === key));

    const grid = make('div', 'automate-steps');
    [['AI Agent', item.agent], ['Automation', item.automation], ['Software', item.software]].forEach(([label, text]) => {
      const step = make('div');
      step.append(make('span', '', label), make('p', '', text));
      grid.append(step);
    });

    const cta = make('button', 'button button-primary', 'Talk to NTX ');
    cta.type = 'button';
    cta.append(make('span', '', '→'));
    cta.addEventListener('click', () => {
      talk.open();
      sendMessage(item.ask);
    });

    automateResult.replaceChildren(make('h3', '', item.title), grid, cta);
    automateResult.classList.remove('is-fresh');
    void automateResult.offsetWidth;
    automateResult.classList.add('is-fresh');
  };

  automateOptions.forEach(option => option.addEventListener('click', () => showAutomation(option.dataset.problem)));
  if (automateOptions.length) showAutomation(automateOptions[0].dataset.problem);

  /* ---------- Easter egg: type "ntx" anywhere on the page ---------- */
  let typed = '';
  let toastTimer;
  document.addEventListener('keydown', event => {
    if (event.target.closest('input, textarea') || event.key.length !== 1) return;
    typed = (typed + event.key.toLowerCase()).slice(-3);
    if (typed !== 'ntx') return;
    typed = '';
    let toast = document.querySelector('.ntx-toast');
    if (!toast) {
      toast = make('div', 'ntx-toast', '⚡ Signal found. Think · Build · Learn · Transform.');
      toast.setAttribute('role', 'status');
      document.body.append(toast);
      void toast.offsetWidth;
    }
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  });
})();
