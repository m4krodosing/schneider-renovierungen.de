/* ==========================================================================
   consent.js — Einwilligung (Cookie-Banner, Einstellungen) + externe Ressourcen

   Aufbau:
   1. Consent-Speicher   – einzige Stelle, die die Auswahl liest/schreibt
   2. Loader             – laden/entladen Google Maps und Google Analytics,
                           lesen die Auswahl nur, ändern sie nie
   3. UI                 – Banner, Einstellungs-Dialog, "Karte laden"-Button
   ========================================================================== */
(() => {
    'use strict';

    /* ---- Konfiguration ------------------------------------------------- */

    const STORAGE_KEY = 'consent_v1';
    const GA_ID = 'G-0THV0417V5';
    const GA_DISABLE_KEY = 'ga-disable-' + GA_ID;

    // Adresse: Hainleinstraße 107, 97464 Niederwerrn.
    // Ändert sich die Adresse, den Embed-Link neu erzeugen:
    // Google Maps → Teilen → Karte einbetten → src-URL hier einsetzen.
    const MAPS_EMBED_URL = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2568.123456!2d10.1846184!3d50.0645105!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a2f76195e80d27%3A0x41564f50977a6a6e!2sHainleinstra%C3%9Fe%20107%2C%2097464%20Niederwerrn!5e0!3m2!1sde!2sde!4v1695000000000';
    const MAPS_TITLE = 'Standort von Malermeisterbetrieb Schneider auf Google Maps';

    /* ---- 1. Consent-Speicher ------------------------------------------- */

    let memoryConsent = null; // Fallback, falls localStorage blockiert ist

    function getConsent() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* Speicher gesperrt oder Inhalt defekt */ }
        return memoryConsent;
    }

    /** Speichert die Auswahl (Teilauswahl wird mit der bisherigen zusammengeführt). */
    function setConsent(choice) {
        const previous = getConsent() || {};
        const consent = {
            necessary: true,
            maps: !!previous.maps,
            analytics: !!previous.analytics,
            ...choice,
            timestamp: new Date().toISOString()
        };
        memoryConsent = consent;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
        } catch (e) { /* nur für diese Sitzung gültig */ }
        return consent;
    }

    /* ---- 2. Loader (ändern nie die Auswahl) ---------------------------- */

    const mapBox = document.getElementById('mapPlaceholder');
    const mapPlaceholderHTML = mapBox ? mapBox.innerHTML : '';
    let mapsLoaded = false;

    function loadMaps() {
        if (mapsLoaded || !mapBox) return;
        const iframe = document.createElement('iframe');
        iframe.title = MAPS_TITLE;
        iframe.referrerPolicy = 'no-referrer-when-downgrade';
        iframe.src = MAPS_EMBED_URL;
        mapBox.replaceChildren(iframe);
        mapsLoaded = true;
    }

    function unloadMaps() {
        if (!mapsLoaded || !mapBox) return;
        mapBox.innerHTML = mapPlaceholderHTML;
        mapsLoaded = false;
    }

    let analyticsLoaded = false;

    function loadAnalytics() {
        window[GA_DISABLE_KEY] = false;
        if (analyticsLoaded) return;
        analyticsLoaded = true;

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', GA_ID, { anonymize_ip: true });
    }

    function stopAnalytics() {
        window[GA_DISABLE_KEY] = true; // verhindert das Senden, falls das Skript schon geladen war
        clearAnalyticsCookies();
    }

    function clearAnalyticsCookies() {
        const names = document.cookie.split(';')
            .map(c => c.split('=')[0].trim())
            .filter(n => n === '_ga' || n.indexOf('_ga_') === 0 || n === '_gid');
        if (!names.length) return;

        const parts = location.hostname.split('.');
        const domains = [''];
        for (let i = 0; i < parts.length - 1; i++) domains.push('.' + parts.slice(i).join('.'));
        names.forEach(name => domains.forEach(domain => {
            document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax' + (domain ? '; domain=' + domain : '');
        }));
    }

    /** Gleicht die geladenen Ressourcen mit der Auswahl ab. */
    function applyConsent(consent) {
        if (consent && consent.maps) loadMaps(); else unloadMaps();
        if (consent && consent.analytics) loadAnalytics(); else stopAnalytics();
    }

    /* ---- 3. UI --------------------------------------------------------- */

    const banner = document.getElementById('cookieBanner');
    const dialog = document.getElementById('consentSettings');
    const mapsCheckbox = document.getElementById('consentMapsCheckbox');
    const analyticsCheckbox = document.getElementById('consentAnalyticsCheckbox');

    function showBanner(show) {
        if (banner) banner.hidden = !show;
    }

    /** Auswahl speichern → Ressourcen abgleichen → Banner schließen. */
    function commit(choice) {
        applyConsent(setConsent(choice));
        showBanner(false);
    }

    function openSettings() {
        if (!dialog) return;
        const consent = getConsent() || {};
        if (mapsCheckbox) mapsCheckbox.checked = !!consent.maps;
        if (analyticsCheckbox) analyticsCheckbox.checked = !!consent.analytics;
        dialog.showModal();
    }

    document.addEventListener('click', event => {
        const trigger = event.target.closest('[data-consent]');
        if (!trigger) return;

        switch (trigger.dataset.consent) {
            case 'accept-all':
                commit({ maps: true, analytics: true });
                break;
            case 'necessary':
                commit({ maps: false, analytics: false });
                break;
            case 'settings':
                openSettings();
                break;
            case 'save':
                commit({
                    maps: !!(mapsCheckbox && mapsCheckbox.checked),
                    analytics: !!(analyticsCheckbox && analyticsCheckbox.checked)
                });
                if (dialog) dialog.close();
                break;
            case 'cancel':
                if (dialog) dialog.close();
                break;
            case 'load-maps':
                // Ausdrückliche Einwilligung durch Klick; der Hinweistext steht direkt über dem Button.
                commit({ maps: true });
                break;
        }
    });

    /* ---- Start ---------------------------------------------------------- */

    window[GA_DISABLE_KEY] = true; // Standard: aus, bis Zustimmung vorliegt
    const stored = getConsent();
    if (stored) {
        applyConsent(stored);
    } else {
        showBanner(true);
    }
})();
