(function () {
    const STORAGE_KEY = 'obraz_chat_state_v2';

    const loadSaved = () => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const p = JSON.parse(raw);
            if (!p || !Array.isArray(p.history)) return null;
            return p;
        } catch (e) { return null; }
    };

    const saved = loadSaved();
    const state = {
        open: false,
        greeted: saved ? !!saved.greeted : false,
        lastTopic: saved ? saved.lastTopic || null : null,
        userName: saved ? saved.userName || null : null,
        history: saved && Array.isArray(saved.history) ? saved.history : []
    };

    const persist = () => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                greeted: state.greeted,
                lastTopic: state.lastTopic,
                userName: state.userName,
                history: state.history.slice(-40)
            }));
        } catch (e) {}
    };

    const clearSaved = () => {
        try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    };

    const ICON_EXPAND = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v6h6M20 10V4h-6M14 4l6 6M10 20l-6-6"/></svg>';
    const ICON_COLLAPSE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10V4h6M20 14v6h-6M14 20l6-6M10 4l-6 6"/></svg>';

    const html = `
        <button class="chat-launcher" id="chatLauncher" aria-label="Открыть помощника">
            <span class="chat-launcher__icon">💬</span>
            <span class="chat-launcher__pulse"></span>
            <span class="chat-launcher__badge">1</span>
        </button>
        <div class="chat-panel" id="chatPanel" aria-hidden="true" role="dialog" aria-label="Помощник по сайту">
            <div class="chat-panel__head">
                <div class="chat-panel__avatar">А</div>
                <div class="chat-panel__who">
                    <p class="chat-panel__name">Помощник Абсолем ПроРост</p>
                    <p class="chat-panel__status"><span class="chat-panel__dot"></span>онлайн · отвечает сразу</p>
                </div>
                <button type="button" class="chat-panel__expand" id="chatExpand" aria-label="Развернуть" title="Развернуть">${ICON_EXPAND}</button>
                <button type="button" class="chat-panel__reset" id="chatReset" aria-label="Начать заново" title="Начать заново">↺</button>
                <button type="button" class="chat-panel__close" id="chatClose" aria-label="Закрыть">×</button>
            </div>
            <div class="chat-panel__body" id="chatBody"></div>
            <div class="chat-panel__suggest" id="chatSuggest"></div>
            <form class="chat-panel__form" id="chatForm">
                <input type="text" id="chatInput" class="chat-panel__input" placeholder="Спросите что-нибудь…" autocomplete="off" aria-label="Сообщение" maxlength="300">
                <button type="submit" class="chat-panel__send" aria-label="Отправить">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </button>
            </form>
        </div>
    `;

    const data = () => window.ObrazStore.load();
    const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const norm = (s) => String(s || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/умеете/g, 'умеешь')
        .replace(/можете/g, 'можешь')
        .replace(/знаете/g, 'знаешь')
        .replace(/хотите/g, 'хочешь')
        .replace(/делаете/g, 'делаешь')
        .replace(/расскажете/g, 'расскажешь')
        .replace(/подскажете/g, 'подскажешь')
        .replace(/поможете/g, 'поможешь')
        .replace(/[^\wа-я\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const scrollToBottom = () => {
        const body = document.getElementById('chatBody');
        if (body) body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
    };

    const setSuggestions = (list) => {
        const box = document.getElementById('chatSuggest');
        if (!box) return;
        const uniq = [...new Set((list || []).filter(Boolean))];
        box.innerHTML = uniq.map(s => `<button type="button" class="chat-suggest" data-suggest="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('');
    };

    const addMsg = (text, who = 'bot', actions = null, persistIt = true) => {
        const body = document.getElementById('chatBody');
        if (!body) return;
        const el = document.createElement('div');
        el.className = `chat-msg chat-msg--${who}`;
        const actionsHtml = (actions && actions.length)
            ? `<div class="chat-msg__actions">${actions.map(a => `<a href="${escapeHtml(a.href)}" class="chat-msg__action">${escapeHtml(a.label)}</a>`).join('')}</div>`
            : '';
        el.innerHTML = `<div class="chat-msg__bubble">${text}${actionsHtml}</div>`;
        body.appendChild(el);
        requestAnimationFrame(() => { el.classList.add('is-visible'); scrollToBottom(); });
        state.history.push({ who, text, actions: actions || null });
        if (persistIt) persist();
    };

    const showTyping = () => {
        const body = document.getElementById('chatBody');
        if (!body) return null;
        const el = document.createElement('div');
        el.className = 'chat-msg chat-msg--bot chat-typing';
        el.innerHTML = `<div class="chat-msg__bubble"><span></span><span></span><span></span></div>`;
        body.appendChild(el);
        requestAnimationFrame(() => { el.classList.add('is-visible'); scrollToBottom(); });
        return el;
    };
    const hideTyping = (el) => {
        if (!el) return;
        el.classList.remove('is-visible');
        setTimeout(() => el.remove(), 200);
    };

    const greetByTime = () => {
        const h = new Date().getHours();
        if (h < 6) return 'Доброй ночи';
        if (h < 12) return 'Доброе утро';
        if (h < 18) return 'Добрый день';
        return 'Добрый вечер';
    };

    const suggestionsDefault = ['Что умеете?', 'Для подростков', 'Смена профессии', 'Сколько встреч?', 'Онлайн?', 'Документы', 'Как записаться?'];

    // === Сценарии ===
    const scenarios = [
        {
            id: 'greet', weight: 10,
            match: (q) => /(^|\s)(привет|здравствуй|здравствуйте|добрый день|добрый вечер|доброе утро|доброй ночи|хай|приветствую|hi|hello)(\s|$)/.test(q),
            reply: () => ({
                text: `${greetByTime()}! Я помощник по сайту «Абсолем ПроРост». Расскажу про направления, услуги, документы и как записаться. С чего начнём?`,
                suggest: suggestionsDefault
            })
        },
        {
            id: 'thanks', weight: 9,
            match: (q) => /(^|\s)(спасибо|благодарю|класс|круто|супер|отлично|спс|пасиб|thanks)(\s|$)/.test(q),
            reply: () => ({ text: 'Рад помочь! Если что-то ещё — спрашивайте.', suggest: ['Как записаться?', 'Документы', 'Отзывы'] })
        },
        {
            id: 'capabilities', weight: 9,
            match: (q) => /(что умеешь|что можешь|чем помочь|что знаешь|возможности|функции|help|умеешь делать|можешь делать)/.test(q),
            reply: () => ({
                text: 'Могу подсказать:<br>• направления и услуги<br>• форматы и как проходит работа<br>• стоимость и длительность<br>• про детей, подростков и взрослых<br>• документы, реквизиты, отзывы, журнал<br>• как записаться',
                suggest: ['Направления', 'Услуги', 'Как проходит?', 'Сколько встреч?', 'Документы', 'Как записаться?']
            })
        },
        {
            id: 'price', weight: 7,
            match: (q) => /(цена|цены|цену|стоимость|стоит|стоят|тариф|прайс|оплат|рубл|руб|деньг|дорого|бюджет|почем|скока|сколько стоит|price|cost)/.test(q),
            reply: () => ({
                text: 'Стоимость консультаций обсуждается индивидуально — зависит от запроса и формата. Оставьте заявку в разделе «Контакты» или напишите на e-mail, и я свяжусь, чтобы обсудить детали.',
                actions: [{ label: 'Оставить заявку', href: 'index.html#contact' }],
                suggest: ['Сколько встреч?', 'Как проходит?', 'Как записаться?']
            })
        },
        {
            id: 'duration', weight: 8,
            match: (q) => /(сколько встреч|сколько занятий|сколько сессий|как долго|сколько по времени|длительн|сколько нужно|сколько консультац)/.test(q),
            reply: (d) => {
                const faq = d.faq.items.find(f => norm(f.q).includes('сколько'));
                return {
                    text: faq ? faq.a : 'Обычно 2–3 встречи для диагностики и стратегии; для подростков с выбором вуза — 4–6 встреч с сопровождением; для взрослых по карьере — индивидуально.',
                    suggest: ['Как проходит?', 'Сколько стоит?', 'Как записаться?']
                };
            }
        },
        {
            id: 'signup', weight: 8,
            match: (q) => /(запис|заявк|консультац|связаться|хочу начать|оставить|как начать|с чего начать)/.test(q),
            reply: (d) => ({
                text: 'Оставьте заявку в разделе «Контакты» — я свяжусь, чтобы обсудить запрос и формат.',
                actions: [
                    { label: 'Оставить заявку', href: 'index.html#contact' },
                    { label: 'Написать на e-mail', href: `mailto:${d.site.email}` }
                ],
                suggest: ['Сколько стоит?', 'Как проходит?', 'Документы']
            })
        },
        {
            id: 'contacts', weight: 7,
            match: (q) => /(контакт|почт|email|телеграм|telegram|tg|ватсап|whatsapp|написать|позвон|связь|номер)/.test(q),
            reply: (d) => ({
                text: `Связаться можно так: e-mail ${d.site.email}, Telegram и WhatsApp — ссылки в футере сайта. Или оставьте заявку в форме «Записаться».`,
                actions: [{ label: 'Оставить заявку', href: 'index.html#contact' }],
                suggest: ['Как записаться?', 'Сколько стоит?']
            })
        },
        {
            id: 'docs', weight: 8,
            match: (q) => /(документ|политик|конфиденц|соглашен|согласие|реквизит|юрид|оферт|лиценз)/.test(q),
            reply: () => ({
                text: 'Все документы — на странице «Документы»: политика конфиденциальности, пользовательское соглашение, согласие на обработку данных и реквизиты. Открываются прямо на сайте.',
                actions: [{ label: 'Открыть документы', href: 'documents.html' }],
                suggest: ['Реквизиты', 'Политика конфиденциальности', 'Как записаться?']
            })
        },
        {
            id: 'reviews', weight: 7,
            match: (q) => /(отзыв|мнен|рекоменд|клиент|говорят|рейтинг)/.test(q),
            reply: () => ({
                text: 'Отзывы клиентов — в разделе «Отзывы». Там же можно оставить свой: после модерации он появится на сайте.',
                actions: [{ label: 'Открыть отзывы', href: 'reviews.html' }],
                suggest: ['Отзывы', 'Как записаться?']
            })
        },
        {
            id: 'journal', weight: 7,
            match: (q) => /(журнал|новост|блог|стать|кейс|заметк|публикац)/.test(q),
            reply: () => ({
                text: 'В разделе «Журнал» — заметки из практики: разборы кейсов, наблюдения о поступлении, карьере и работе с самооценкой. У каждой статьи есть полный текст по кнопке «Читать полностью».',
                actions: [{ label: 'Открыть журнал', href: 'journal.html' }],
                suggest: ['Журнал', 'Для подростков', 'Смена профессии']
            })
        },
        {
            id: 'teen', weight: 7,
            match: (q) => /(подрост|9 класс|10 класс|11 класс|егэ|огэ|школьник|старшекласс|выбор вуза|куда поступать|поступлен|абитуриент|профил)/.test(q),
            reply: (d) => {
                state.lastTopic = 'teen';
                const s = d.directions.items.find(it => norm(it.title).includes('архитектура будущего'))
                    || d.services.items.find(it => norm(it.tag).includes('подрост') || norm(it.title).includes('профориентац'));
                return {
                    text: s
                        ? `<strong>${escapeHtml(s.title)}.</strong><br>${escapeHtml(s.text || '')}`
                        : 'Для подростков — глубинная профориентация: определение профиля в школе, выбор профессии, вуза или СПО, организация профпроб.',
                    suggest: ['Как проходит?', 'Сколько встреч?', 'Сколько стоит?', 'Как записаться?']
                };
            }
        },
        {
            id: 'adult', weight: 7,
            match: (q) => /(взросл|выгоран|смен карьер|карьер|перепрофил|сменить профессию|кризис|устал|junior|middle|senior|карьерный рост)/.test(q),
            reply: (d) => {
                state.lastTopic = 'adult';
                const s = d.directions.items.find(it => norm(it.title).includes('карьерный компас'))
                    || d.services.items.find(it => norm(it.tag).includes('взросл'));
                return {
                    text: s
                        ? `<strong>${escapeHtml(s.title)}.</strong><br>${escapeHtml(s.text || '')}${s.result ? '<br><em>' + escapeHtml(s.result) + '</em>' : ''}`
                        : 'Для взрослых — «Карьерный компас»: аудит опыта, маршрут смены профессии или карьерного роста, работа с выгоранием.',
                    suggest: ['Как проходит?', 'Сколько стоит?', 'Как записаться?']
                };
            }
        },
        {
            id: 'kids', weight: 6,
            match: (q) => /(дети|ребенок|ребён|младш|1 7|1-7|начальная школа|мотивац)/.test(q),
            reply: (d) => {
                state.lastTopic = 'kids';
                const dir = d.directions.items.find(it => norm(it.title).includes('точка роста'));
                const svc = d.services.items.find(it => norm(it.tag).includes('1'));
                return {
                    text: dir
                        ? `<strong>${escapeHtml(dir.title)}.</strong><br>${escapeHtml(dir.text)}${dir.result ? '<br><em>' + escapeHtml(dir.result) + '</em>' : ''}`
                        : (svc ? `<strong>${escapeHtml(svc.title)}.</strong><br>${escapeHtml(svc.text)}` : 'Для детей 1–7 классов — повышение учебной мотивации; для 7–11 лет — «Точка роста»: фундамент здоровой самооценки.'),
                    suggest: ['1–7 классы', 'Точка роста', 'Как проходит?']
                };
            }
        },
        {
            id: 'self', weight: 6,
            match: (q) => /(точка роста|самооценк|идентичн|уверенност|сильные стороны|ценност|мастерская)/.test(q),
            reply: (d) => {
                const dir = d.directions.items.find(it => norm(it.title).includes('точка роста'));
                return {
                    text: dir
                        ? `<strong>${escapeHtml(dir.title)}.</strong><br>${escapeHtml(dir.text)}${dir.result ? '<br><em>' + escapeHtml(dir.result) + '</em>' : ''}`
                        : '«Точка роста (мастерская Я)» — работа с детьми и подростками: устойчивая самооценка, сильные стороны, решения из своей сути.',
                    suggest: ['Для детей', 'Для подростков', 'Как проходит?']
                };
            }
        },
        {
            id: 'directions', weight: 6,
            match: (q) => /(направлен|формат|услуг|чем занима|что предлага|что делаете|что у вас|архитектура будущего|карьерный компас)/.test(q),
            reply: (d) => {
                const list = d.directions.items.map(it => `• ${escapeHtml(it.title)}`).join('<br>');
                return {
                    text: `Работаю по трём направлениям:<br>${list}<br><br>Подробнее — в разделе «Направления» на главной.`,
                    suggest: ['Для детей', 'Для подростков', 'Смена профессии', 'Как проходит?']
                };
            }
        },
        {
            id: 'process', weight: 7,
            match: (q) => /(как проходит|процесс|этап|шаг|как работа|что будет|что входит|диагностик|стратеги|сопровожден)/.test(q),
            reply: (d) => {
                const steps = d.process.steps.map(s => `<strong>${escapeHtml(s.num)}. ${escapeHtml(s.title)}</strong> — ${escapeHtml(s.text)}`).join('<br>');
                return {
                    text: `Работа строится так:<br>${steps}`,
                    suggest: ['Сколько стоит?', 'Сколько встреч?', 'Как записаться?']
                };
            }
        },
        {
            id: 'online', weight: 6,
            match: (q) => /(онлайн|офлайн|город|дистанц)/.test(q),
            reply: () => ({
                text: 'Да, онлайн-формат возможен. Это удобно для клиентов из разных городов и не снижает качество работы.',
                suggest: ['Как проходит?', 'Как записаться?']
            })
        },
        {
            id: 'about', weight: 6,
            match: (q) => /(о себе|кто вы|опыт|образован|стаж|преподав|фото|биограф|об эксперте)/.test(q),
            reply: (d) => ({
                text: escapeHtml(d.about.paragraphs.join(' ')) + ' Подробнее — в разделе «О себе».',
                actions: [{ label: 'Открыть «О себе»', href: 'about.html' }],
                suggest: ['Как проходит?', 'Отзывы']
            })
        },
        {
            id: 'result', weight: 6,
            match: (q) => /(результат|гарант|что получа|обеща)/.test(q),
            reply: (d) => ({
                text: escapeHtml(d.result.text),
                suggest: ['Как проходит?', 'Сколько стоит?', 'Как записаться?']
            })
        },
        {
            id: 'name', weight: 5,
            match: (q) => /(меня зовут|мое имя|моё имя)/.test(q),
            reply: (d, raw) => {
                const m = String(raw).match(/(?:меня зовут|мое имя|моё имя)\s+([А-ЯЁA-Z][а-яёa-z\-]+)/);
                if (m) {
                    state.userName = m[1];
                    persist();
                    return {
                        text: `Приятно познакомиться, ${escapeHtml(state.userName)}! Чем могу помочь?`,
                        suggest: suggestionsDefault
                    };
                }
                return { text: 'Приятно познакомиться! Чем могу помочь?', suggest: suggestionsDefault };
            }
        }
    ];

    const answer = (rawQuery) => {
        const d = data();
        const q = norm(rawQuery);
        if (!q) return { text: 'Напишите вопрос — подскажу по сайту.', suggest: suggestionsDefault };

        const hits = scenarios
            .map(s => ({ s, w: s.match(q, rawQuery) ? s.weight : 0 }))
            .filter(x => x.w > 0)
            .sort((a, b) => b.w - a.w);

        if (hits.length) {
            const r = hits[0].s.reply(d, rawQuery);
            r.suggest = r.suggest || suggestionsDefault;
            return r;
        }

        // Умный fallback: ищем по FAQ, направлениям, услугам, журналу
        const qWords = q.split(' ').filter(w => w.length >= 4);
        const pool = [];
        d.faq.items.forEach(f => pool.push({ title: f.q, text: f.a, url: 'index.html#faq', kind: 'FAQ' }));
        d.directions.items.forEach(it => pool.push({ title: it.title, text: it.text + ' ' + it.result, url: 'index.html#directions', kind: 'Направление' }));
        d.services.items.forEach(it => pool.push({ title: it.title, text: it.text, url: 'index.html#services', kind: 'Услуга' }));
        d.journalPage.items.forEach(it => pool.push({ title: it.title, text: it.excerpt + ' ' + (it.body || ''), url: 'journal.html', kind: 'Журнал' }));

        const scored = pool.map(p => {
            const hay = norm(p.title + ' ' + p.text);
            let score = 0;
            qWords.forEach(w => { if (hay.includes(w)) score += 1; });
            if (norm(p.title).includes(q)) score += 3;
            return { p, score };
        }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

        if (scored.length) {
            const top = scored[0].p;
            return {
                text: `Возможно, вы про это (${escapeHtml(top.kind)}):<br><strong>${escapeHtml(top.title)}</strong><br>${escapeHtml((top.text || '').slice(0, 400))}`,
                actions: [{ label: 'Перейти', href: top.url }],
                suggest: ['Направления', 'Услуги', 'Сколько стоит?', 'Как записаться?']
            };
        }

        return {
            text: 'Не уверен, что понял вопрос. Уточните — или выберите тему ниже:',
            suggest: suggestionsDefault
        };
    };

    const send = (text) => {
        const clean = String(text || '').trim();
        if (!clean) return;
        if (clean.length < 2) { addMsg('Напишите чуть подробнее, пожалуйста.'); return; }

        const lastUser = [...state.history].reverse().find(m => m.who === 'user');
        if (lastUser && norm(lastUser.text) === norm(clean)) return;

        addMsg(escapeHtml(clean), 'user');
        const typing = showTyping();
        const delay = 350 + Math.min(800, clean.length * 12);
        setTimeout(() => {
            hideTyping(typing);
            const r = answer(clean);
            addMsg(r.text, 'bot', r.actions);
            setSuggestions(r.suggest || suggestionsDefault);
            persist();
        }, delay);
    };

    const hideBadge = () => {
        const b = document.querySelector('.chat-launcher__badge');
        if (b) b.classList.add('is-hidden');
    };

    const restoreHistory = () => {
        const body = document.getElementById('chatBody');
        if (!body || !state.history.length) return;
        body.innerHTML = '';
        state.history.forEach(m => {
            const el = document.createElement('div');
            el.className = `chat-msg chat-msg--${m.who} is-visible`;
            const actionsHtml = (m.actions && m.actions.length)
                ? `<div class="chat-msg__actions">${m.actions.map(a => `<a href="${escapeHtml(a.href)}" class="chat-msg__action">${escapeHtml(a.label)}</a>`).join('')}</div>`
                : '';
            el.innerHTML = `<div class="chat-msg__bubble">${m.text}${actionsHtml}</div>`;
            body.appendChild(el);
        });
        requestAnimationFrame(scrollToBottom);
    };

    const openChat = () => {
        state.open = true;
        const p = document.getElementById('chatPanel');
        p.classList.add('is-open');
        p.setAttribute('aria-hidden', 'false');
        document.getElementById('chatLauncher').classList.add('is-hidden');
        hideBadge();
        if (!state.greeted || state.history.length === 0) {
            state.greeted = true;
            setTimeout(() => {
                const greeting = state.userName
                    ? `${greetByTime()}, ${state.userName}! Расскажу про направления, услуги, документы и как записаться. С чего начнём?`
                    : `${greetByTime()}! Я помощник сайта «Абсолем ПроРост». Расскажу про направления, услуги, документы и как записаться. С чего начнём?`;
                addMsg(greeting);
                setSuggestions(suggestionsDefault);
            }, 250);
        } else {
            restoreHistory();
            setSuggestions(suggestionsDefault);
        }
        setTimeout(() => document.getElementById('chatInput').focus(), 320);
    };

    const closeChat = () => {
        state.open = false;
        const p = document.getElementById('chatPanel');
        p.classList.remove('is-open');
        p.setAttribute('aria-hidden', 'true');
        document.getElementById('chatLauncher').classList.remove('is-hidden');
    };

    const resetChat = () => {
        const body = document.getElementById('chatBody');
        if (body) body.innerHTML = '';
        state.history = [];
        state.greeted = false;
        state.lastTopic = null;
        state.userName = null;
        clearSaved();
        setTimeout(() => {
            state.greeted = true;
            addMsg('Начнём заново. Чем могу помочь?');
            setSuggestions(suggestionsDefault);
        }, 100);
    };

    const toggleExpand = () => {
        const p = document.getElementById('chatPanel');
        const btn = document.getElementById('chatExpand');
        if (!p || !btn) return;
        const expanded = p.classList.toggle('is-expanded');
        btn.setAttribute('aria-label', expanded ? 'Свернуть' : 'Развернуть');
        btn.setAttribute('title', expanded ? 'Свернуть' : 'Развернуть');
        btn.innerHTML = expanded ? ICON_COLLAPSE : ICON_EXPAND;
        setTimeout(scrollToBottom, 320);
    };

    const mount = () => {
        if (document.getElementById('chatLauncher')) return;
        const wrap = document.createElement('div');
        wrap.innerHTML = html;
        document.body.appendChild(wrap);

        document.getElementById('chatLauncher').addEventListener('click', openChat);
        document.getElementById('chatClose').addEventListener('click', closeChat);
        document.getElementById('chatReset').addEventListener('click', resetChat);

        const expandBtn = document.getElementById('chatExpand');
        if (expandBtn) expandBtn.addEventListener('click', toggleExpand);

        document.getElementById('chatForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('chatInput');
            const v = input.value;
            input.value = '';
            send(v);
        });

        document.getElementById('chatSuggest').addEventListener('click', (e) => {
            const b = e.target.closest('[data-suggest]');
            if (b) send(b.dataset.suggest);
        });

        document.getElementById('chatBody').addEventListener('click', (e) => {
            const a = e.target.closest('.chat-msg__action');
            if (a) closeChat();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.open) {
                if (document.getElementById('chatPanel').classList.contains('is-expanded')) toggleExpand();
                else closeChat();
            }
        });

        setTimeout(() => {
            const l = document.getElementById('chatLauncher');
            if (l) l.classList.add('is-ready');
        }, 800);
    };

    document.addEventListener('DOMContentLoaded', mount);
})();
