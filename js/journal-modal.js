(function () {
    const html = `
        <div class="modal journal-modal" id="journalModal" aria-hidden="true">
            <div class="modal__panel modal__panel--wide" role="dialog" aria-modal="true" aria-labelledby="journalTitle">
                <button class="modal__close" data-close="journalModal" aria-label="Закрыть">×</button>
                <p class="modal__eyebrow" id="journalDate">Журнал</p>
                <h2 class="modal__title" id="journalTitle">Заголовок</h2>
                <div class="journal-modal__body" id="journalBody"></div>
            </div>
        </div>
    `;

    const mount = () => {
        if (document.getElementById('journalModal')) return;
        const wrap = document.createElement('div');
        wrap.innerHTML = html;
        document.body.appendChild(wrap);
    };

    const open = (idx) => {
        mount();
        const d = window.ObrazStore.load();
        const item = d.journalPage.items[idx];
        if (!item) return;
        document.getElementById('journalDate').textContent = item.date || 'Журнал';
        document.getElementById('journalTitle').textContent = item.title || '';
        const body = (item.body || item.excerpt || '').trim();
        const html = body
            .split(/\n{2,}/)
            .map(p => `<p>${p.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])).replace(/\n/g, '<br>')}</p>`)
            .join('');
        document.getElementById('journalBody').innerHTML = html || '<p>Полный текст пока не добавлен.</p>';
        const m = document.getElementById('journalModal');
        m.classList.add('is-open');
        m.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    };

    const close = () => {
        const m = document.getElementById('journalModal');
        if (!m) return;
        m.classList.remove('is-open');
        m.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    };

    document.addEventListener('click', (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        const card = t.closest('[data-journal-read]');
        if (card) {
            e.preventDefault();
            open(Number(card.dataset.journalRead));
            return;
        }
        if (t.closest('[data-close="journalModal"]')) { e.preventDefault(); close(); return; }
        if (t.id === 'journalModal') close();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });

    window.ObrazJournalModal = { open, close, rebind: mount };
    document.addEventListener('DOMContentLoaded', mount);
})();
