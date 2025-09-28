const OPENWEATHER_API_KEY = "029ccee33f2c45d032362d64f0ce0d43";

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const el = (tag, props = {}) => Object.assign(document.createElement(tag), props);

document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initSkillBars();
    Planner.init();
    Weather.init(OPENWEATHER_API_KEY);
    Quiz.init();
});

function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    toggle?.addEventListener('click', () => {
        const vis = links.style.display === 'flex' ? '' : 'flex';
        links.style.display = vis;
    });
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const target = document.querySelector(a.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (window.innerWidth <= 900) document.querySelector('.nav-links').style.display = '';
            }
        });
    });
}

function initSkillBars() {
    const about = document.querySelector('#about');
    if (!about) return;
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                $$('.skill-fill').forEach(s => {
                    const pct = s.style.getPropertyValue('--pct') || '50%';
                    s.style.width = pct;
                });
                obs.disconnect();
            }
        });
    }, { threshold: 0.25 });
    obs.observe(about);
}

const Planner = (() => {
    const LS_KEY = 'hub_tasks_v1';
    let tasks = [];
    const form = $('#task-form');
    const input = $('#task-input');
    const selectPriority = $('#task-priority');
    const listEl = $('#task-list');
    const clearCompletedBtn = $('#clear-completed');
    const clearAllBtn = $('#clear-all');

    function load() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            tasks = raw ? JSON.parse(raw) : [];
        } catch (e) { tasks = []; }
    }
    function save() { localStorage.setItem(LS_KEY, JSON.stringify(tasks)); }
    function render() {
        listEl.innerHTML = '';
        if (tasks.length === 0) {
            const p = el('p', { textContent: 'No tasks yet. Add one above!', className: 'muted' });
            listEl.appendChild(p);
            return;
        }
        tasks.slice().reverse().forEach(t => {
            const li = el('li', { className: 'task-item' + (t.done ? ' completed' : '') });
            const chk = el('input');
            chk.type = 'checkbox';
            chk.checked = !!t.done;
            chk.addEventListener('change', () => {
                t.done = chk.checked; save(); render();
            });
            const title = el('div', { className: 'title' });
            title.innerHTML = `<strong>${escapeHtml(t.text)}</strong><div class="meta">${t.priority} • ${new Date(t.created).toLocaleString()}</div>`;
            const edit = el('button', { textContent: 'Edit', className: 'btn btn-small' });
            edit.addEventListener('click', () => {
                const newText = prompt('Edit task', t.text);
                if (newText !== null && newText.trim() !== '') {
                    t.text = newText.trim(); save(); render();
                }
            });
            const del = el('button', { textContent: 'Delete', className: 'btn btn-small btn-outline' });
            del.addEventListener('click', () => {
                if (confirm('Delete task?')) { tasks = tasks.filter(x => x.id !== t.id); save(); render(); }
            });
            li.appendChild(chk);
            li.appendChild(title);
            li.appendChild(edit);
            li.appendChild(del);
            listEl.appendChild(li);
        });
    }

    function addTask(text, priority = 'normal') {
        const task = { id: Date.now() + Math.random(), text: text.trim(), priority, done: false, created: Date.now() };
        tasks.push(task); save(); render();
    }

    function bind() {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;
            addTask(text, selectPriority.value);
            input.value = '';
        });
        clearCompletedBtn.addEventListener('click', () => {
            tasks = tasks.filter(t => !t.done);
            save(); render();
        });
        clearAllBtn.addEventListener('click', () => {
            if (confirm('Clear all tasks?')) { tasks = []; save(); render(); }
        });
    }

    function init() { load(); bind(); render(); }

    return { init };
})();

const Weather = (() => {
    let apiKey = '';
    const cityInput = $('#city-input');
    const getCityBtn = $('#get-city-weather');
    const getLocationBtn = $('#get-location-weather');
    const output = $('#weather-output');

    function setKey(k) { apiKey = k; }

    function show(msgHtml) { output.innerHTML = msgHtml; }

    async function fetchByCity(city) {
        if (!apiKey) return show('<p class="muted">API key not set. See instructions in app.js</p>');
        try {
            show('<p class="muted">Loading...</p>');
            const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);
            if (!r.ok) throw new Error('City not found');
            const data = await r.json();
            renderWeather(data);
        } catch (err) {
            show(`<p class="muted">Error: ${escapeHtml(err.message)}</p>`);
        }
    }

    async function fetchByCoords(lat, lon) {
        if (!apiKey) return show('<p class="muted">API key not set. See instructions in app.js</p>');
        try {
            show('<p class="muted">Loading...</p>');
            const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
            if (!r.ok) throw new Error('No weather for that location');
            const data = await r.json();
            renderWeather(data);
        } catch (err) {
            show(`<p class="muted">Error: ${escapeHtml(err.message)}</p>`);
        }
    }

    function renderWeather(data) {
        const icon = data.weather?.[0]?.icon;
        const name = data.name;
        const desc = data.weather?.[0]?.description;
        const temp = Math.round(data.main?.temp);
        const humidity = data.main?.humidity;
        const wind = data.wind?.speed;
        output.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center">
        <div style="font-size:40px">${icon ? `<img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${escapeHtml(desc)}"/>` : ''}</div>
        <div>
          <div style="font-weight:700;font-size:18px">${escapeHtml(name)} • ${temp}°C</div>
          <div class="muted">${escapeHtml(desc)} • Humidity: ${humidity}% • Wind: ${wind} m/s</div>
        </div>
      </div>
    `;
    }

    function bind() {
        getCityBtn.addEventListener('click', () => {
            const city = cityInput.value.trim();
            if (!city) { cityInput.focus(); return; }
            fetchByCity(city);
        });
        getLocationBtn.addEventListener('click', () => {
            if (!navigator.geolocation) { show('<p class="muted">Geolocation not supported.</p>'); return; }
            navigator.geolocation.getCurrentPosition(pos => {
                fetchByCoords(pos.coords.latitude, pos.coords.longitude);
            }, err => {
                show('<p class="muted">Location permission denied or unavailable.</p>');
            });
        });
        // quick enter key on cityInput:
        cityInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') getCityBtn.click();
        });
    }

    function init(key = '') {
        setKey(key || '');
        bind();
    }

    return { init };
})();

const Quiz = (() => {
    const startBtn = $('#start-quiz');
    const amountSelect = $('#quiz-amount');
    const categorySelect = $('#quiz-category');
    const area = $('#quiz-area');

    let state = { questions: [], index: 0, score: 0 };

    function buildUrl(amount, category) {
        let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
        if (category) url += `&category=${category}`;
        return url;
    }

    async function start() {
        const amount = parseInt(amountSelect.value) || 10;
        const cat = categorySelect.value || '';
        area.innerHTML = '<p class="muted">Loading questions…</p>';
        try {
            const res = await fetch(buildUrl(amount, cat));
            const json = await res.json();
            if (json.response_code !== 0 || !json.results.length) throw new Error('No questions returned');
            state.questions = json.results.map(q => {
                const answers = shuffle([q.correct_answer, ...q.incorrect_answers]);
                return {
                    question: q.question,
                    category: q.category,
                    correct: q.correct_answer,
                    answers
                };
            });
            state.index = 0; state.score = 0;
            renderQuestion();
        } catch (err) {
            area.innerHTML = `<p class="muted">Error: ${escapeHtml(err.message)}</p>`;
        }
    }

    function renderQuestion() {
        const q = state.questions[state.index];
        area.innerHTML = '';
        const qWrap = el('div', { className: 'question' });
        qWrap.innerHTML = `<div style="font-size:14px;color:var(--muted)">Category: ${escapeHtml(q.category)}</div>
      <h3 style="margin:8px 0">${decodeHtml(q.question)}</h3>`;
        const answersWrap = el('div', { className: 'answers' });
        q.answers.forEach(a => {
            const btn = el('button', { className: 'answer-btn', innerHTML: decodeHtml(a) });
            btn.addEventListener('click', () => onAnswer(a, btn));
            answersWrap.appendChild(btn);
        });
        const progress = el('div', { className: 'muted', textContent: `Question ${state.index + 1} / ${state.questions.length} • Score: ${state.score}` });
        area.appendChild(qWrap);
        area.appendChild(answersWrap);
        area.appendChild(progress);
    }

    function onAnswer(answer, btn) {
        const q = state.questions[state.index];
        const buttons = area.querySelectorAll('.answer-btn');
        buttons.forEach(b => b.disabled = true);
        if (answer === q.correct) {
            btn.classList.add('correct');
            state.score += 1;
        } else {
            btn.classList.add('wrong');
            // highlight correct
            buttons.forEach(b => {
                if (b.innerHTML === decodeHtml(q.correct)) b.classList.add('correct');
            });
        }
        setTimeout(() => {
            state.index += 1;
            if (state.index >= state.questions.length) {
                showResults();
            } else {
                renderQuestion();
            }
        }, 900);
    }

    function showResults() {
        area.innerHTML = `<div style="text-align:center">
      <h3>Quiz complete</h3>
      <p class="muted">Score: ${state.score} / ${state.questions.length}</p>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:8px">
        <button id="retry-quiz" class="btn">Retry</button>
        <button id="new-quiz" class="btn btn-outline">New Quiz</button>
      </div>
    </div>`;
        $('#retry-quiz').addEventListener('click', () => start());
        $('#new-quiz').addEventListener('click', () => {
            area.innerHTML = '';
        });
    }

    function bind() {
        startBtn.addEventListener('click', start);
    }

    function init() { bind(); }

    return { init };
})();

const themeBtn = document.getElementById('theme-toggle');
const storedTheme = localStorage.getItem('hub_theme');
if (storedTheme === 'light') { document.body.classList.add('light'); themeBtn.textContent = '☀️'; }

themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light');
    const isLight = document.body.classList.contains('light');
    localStorage.setItem('hub_theme', isLight ? 'light' : 'dark');
    themeBtn.textContent = isLight ? '☀️' : '🌙';
});

gsap.registerPlugin(ScrollTrigger);

gsap.from('.hero-inner', { opacity: 0, y: 40, duration: 1, ease: 'power3.out' });

document.querySelectorAll('.panel').forEach(panel => {
    gsap.from(panel, {
        opacity: 0, y: 60, duration: 0.8,
        scrollTrigger: {
            trigger: panel,
            start: 'top 80%'
        }
    });
});

function escapeHtml(str = '') {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
function decodeHtml(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
