/* ==========================================================================
   main.js — Seitenlogik (ohne Cookie/Consent, siehe consent.js)

   1. Header + Scroll-Fortschritt
   2. Mobiles Menü
   3. Portfolio-Filter
   4. FAQ
   5. (frei — rechtliche Seiten sind eigene HTML-Dateien)
   6. Kontaktformular
   7. Einblend-Animation beim Scrollen
   8. Jahreszahl im Footer
   ========================================================================== */
(() => {
    'use strict';

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    /* ---- 1. Header + Scroll-Fortschritt -------------------------------- */

    const header = $('.site-header');
    const progressBar = $('#scrollProgress');
    let scrollTicking = false;

    function onScroll() {
        const y = window.scrollY;
        if (header) header.classList.toggle('scrolled', y > 100);
        if (progressBar) {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            progressBar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
        }
        scrollTicking = false;
    }

    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            scrollTicking = true;
            window.requestAnimationFrame(onScroll);
        }
    }, { passive: true });
    onScroll();

    /* ---- 2. Mobiles Menü ------------------------------------------------ */

    const menuToggle = $('.hamburger');
    const menu = $('#navLinks');

    if (menuToggle && menu) {
        const isOpen = () => menuToggle.getAttribute('aria-expanded') === 'true';

        const setMenu = (open, restoreFocus) => {
            menuToggle.setAttribute('aria-expanded', String(open));
            menuToggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
            menu.classList.toggle('open', open);
            if (!open && restoreFocus) menuToggle.focus();
        };

        menuToggle.addEventListener('click', () => setMenu(!isOpen()));

        // Klick auf einen Menüpunkt schließt das Menü (Scrollen übernimmt CSS)
        menu.addEventListener('click', event => {
            if (event.target.closest('a')) setMenu(false);
        });

        // Klick außerhalb des Headers
        document.addEventListener('click', event => {
            if (isOpen() && !header.contains(event.target)) setMenu(false);
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && isOpen() && !$('dialog[open]')) setMenu(false, true);
        });

        // Wechsel Mobil → Desktop
        window.matchMedia('(min-width: 769px)').addEventListener('change', event => {
            if (event.matches) setMenu(false);
        });
    }

    /* ---- 3. Portfolio-Filter -------------------------------------------- */

    const filterBar = $('.portfolio-filters');
    const portfolioItems = $$('.portfolio-item');

    if (filterBar) {
        filterBar.addEventListener('click', event => {
            const button = event.target.closest('.filter-btn');
            if (!button) return;

            $$('.filter-btn', filterBar).forEach(btn => {
                const active = btn === button;
                btn.classList.toggle('active', active);
                btn.setAttribute('aria-pressed', String(active));
            });

            const category = button.dataset.filter;
            let shown = 0;
            portfolioItems.forEach(item => {
                const match = category === 'alle' || item.dataset.category === category;
                item.hidden = !match;
                if (!match) return;
                item.style.setProperty('--i', shown++);
                item.classList.remove('is-entering');
                void item.offsetWidth; // Animation neu starten
                item.classList.add('is-entering');
            });
        });
    }

    /* ---- 4. FAQ (Akkordeon) --------------------------------------------- */

    const faq = $('.faq-section');

    if (faq) {
        faq.addEventListener('click', event => {
            const button = event.target.closest('.faq-question');
            if (!button) return;

            const item = button.closest('.faq-item');
            const willOpen = !item.classList.contains('open');

            $$('.faq-item.open', faq).forEach(openItem => {
                openItem.classList.remove('open');
                $('.faq-question', openItem).setAttribute('aria-expanded', 'false');
            });

            if (willOpen) {
                item.classList.add('open');
                button.setAttribute('aria-expanded', 'true');
            }
        });
    }

    /* ---- 5. Rechtliche Seiten -------------------------------------------- */
    // Impressum/Datenschutz/AGB sind eigene Seiten (impressum.html, datenschutz.html,
    // agb.html) und benötigen keine Dialog-Logik mehr; normale Links reichen.

    /* ---- 6. Kontaktformular ---------------------------------------------- */

    const form = $('#kontaktForm');

    if (form) {
        const status = $('#formStatus');
        const submitButton = $('.form-button', form);
        const submitLabel = submitButton.textContent;
        const honeypot = form.elements._gotcha;
        const SEND_TIMEOUT_MS = 15000;
        let sending = false;

        form.noValidate = true; // eigene Meldungen; HTML-Attribute bleiben als Fallback ohne JS

        const MESSAGES = {
            vorname: 'Bitte geben Sie Ihren Vornamen ein.',
            nachname: 'Bitte geben Sie Ihren Nachnamen ein.',
            telefon: 'Bitte geben Sie eine gültige Telefonnummer ein (mindestens 6 Ziffern).',
            email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
            leistung: 'Bitte wählen Sie eine Leistung aus.',
            datenschutz: 'Bitte stimmen Sie der Datenschutzerklärung zu.'
        };

        function getError(field) {
            const value = field.value.trim();

            if (field.type === 'checkbox') {
                return field.required && !field.checked ? MESSAGES[field.name] : '';
            }
            if (!value) {
                return field.required ? (MESSAGES[field.name] || 'Bitte füllen Sie dieses Feld aus.') : '';
            }
            if (field.name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
                return MESSAGES.email;
            }
            if (field.name === 'telefon') {
                const digits = value.replace(/\D/g, '').length;
                if (!/^\+?[0-9 ()\/.\-]+$/.test(value) || digits < 6 || digits > 15) return MESSAGES.telefon;
            }
            if (field.minLength > 0 && value.length < field.minLength) {
                return 'Bitte geben Sie mindestens ' + field.minLength + ' Zeichen ein.';
            }
            if (field.maxLength > 0 && value.length > field.maxLength) {
                return 'Bitte höchstens ' + field.maxLength + ' Zeichen eingeben.';
            }
            return '';
        }

        function showFieldError(field) {
            const message = getError(field);
            const output = document.getElementById(field.id + '-error');
            if (output) output.textContent = message;
            if (message) field.setAttribute('aria-invalid', 'true');
            else field.removeAttribute('aria-invalid');
            return message;
        }

        const fields = () => Array.from(form.elements).filter(el => el.name && el.name !== '_gotcha' && el.type !== 'hidden' && el.type !== 'submit');

        function setStatus(message, isError) {
            status.textContent = message;
            status.classList.toggle('is-error', !!isError);
            status.hidden = !message;
        }

        function resetForm() {
            form.reset();
            fields().forEach(field => {
                field.classList.remove('is-filled');
                field.removeAttribute('aria-invalid');
                delete field.dataset.touched;
                const output = document.getElementById(field.id + '-error');
                if (output) output.textContent = '';
            });
        }

        form.addEventListener('input', event => {
            const field = event.target;
            if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
                field.classList.toggle('is-filled', field.type !== 'checkbox' && field.value.trim() !== '');
            }
            if (field.dataset.touched) showFieldError(field);
        });

        form.addEventListener('focusout', event => {
            const field = event.target;
            if (!field.name || field.name === '_gotcha') return;
            field.dataset.touched = '1';
            showFieldError(field);
        });

        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (sending) return; // Doppelklick / erneutes Absenden verhindern

            let firstInvalid = null;
            fields().forEach(field => {
                field.dataset.touched = '1';
                if (showFieldError(field) && !firstInvalid) firstInvalid = field;
            });
            if (firstInvalid) {
                setStatus('Bitte prüfen Sie die markierten Felder.', true);
                firstInvalid.focus();
                return;
            }

            // Honeypot befüllt → Bot: Erfolg vortäuschen, nichts senden
            if (honeypot && honeypot.value) {
                resetForm();
                setStatus('Vielen Dank! Ihre Anfrage wurde erfolgreich versendet. Wir melden uns schnellstmöglich bei Ihnen.', false);
                return;
            }

            sending = true;
            form.setAttribute('aria-busy', 'true');
            submitButton.disabled = true;
            submitButton.textContent = 'Wird gesendet …';
            setStatus('', false);

            const controller = new AbortController();
            const timer = window.setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: { Accept: 'application/json' },
                    signal: controller.signal
                });
                if (!response.ok) throw new Error('HTTP ' + response.status);
                resetForm();
                setStatus('Vielen Dank! Ihre Anfrage wurde erfolgreich versendet. Wir melden uns schnellstmöglich bei Ihnen.', false);
            } catch (error) {
                setStatus('Beim Senden ist leider ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder schreiben Sie uns direkt per E-Mail.', true);
            } finally {
                window.clearTimeout(timer);
                sending = false;
                form.removeAttribute('aria-busy');
                submitButton.disabled = false;
                submitButton.textContent = submitLabel;
            }
        });
    }

    /* ---- 7. Einblenden beim Scrollen -------------------------------------- */
    // Nur Elemente unterhalb des sichtbaren Bereichs bekommen .reveal;
    // ohne JS oder bei "reduzierter Bewegung" bleibt alles sofort sichtbar.

    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const targets = $$('.section');
        $$('.services-grid, .benefits-grid, .timeline, .portfolio-grid').forEach(grid => {
            Array.from(grid.children).forEach((child, index) => {
                child.style.setProperty('--reveal-delay', (index * 0.1) + 's');
                targets.push(child);
            });
        });

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                el.classList.add('is-visible');
                el.addEventListener('animationend', function done(e) {
                    if (e.target !== el) return; // Animationen von Kindelementen ignorieren
                    el.classList.remove('reveal', 'is-visible');
                    el.removeEventListener('animationend', done);
                });
                obs.unobserve(el);
            });
        }, { rootMargin: '0px 0px -60px 0px' });

        targets.forEach(el => {
            if (el.getBoundingClientRect().top < window.innerHeight) return;
            el.classList.add('reveal');
            observer.observe(el);
        });
    }

    /* ---- 8. Jahreszahl ----------------------------------------------------- */

    $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
