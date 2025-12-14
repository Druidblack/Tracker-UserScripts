// ==UserScript==
// @name         Rutracker Bulk Download + CtrlClick Only
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Кнопка: скачать все торренты + открыть темы на rutracker.org
// @author       Druidblack
// @match        https://rutracker.org/forum/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- НЕ показываем кнопку на страницах раздачи (viewtopic.php) ---
    if (location.pathname.includes('/viewtopic.php')) return;

    // --- Кнопка ---
    function createButton() {
        const btn = document.createElement('button');
        btn.textContent = 'Скачать все торренты + открыть темы';
        btn.style.position = 'fixed';
        btn.style.top = '20px';
        btn.style.right = '20px';
        btn.style.zIndex = 9999;
        btn.style.padding = '10px 18px';
        btn.style.background = '#287233';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '16px';
        btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        document.body.appendChild(btn);
        return btn;
    }

    function openAllLinks() {
        // Найти все строки таблицы с торрентом
        const rows = Array.from(document.querySelectorAll('tr[data-topic_id]'));
        if (rows.length === 0) {
            alert('Торренты не найдены!');
            return;
        }

        let opened = 0;
        function openNext() {
            if (opened >= rows.length) {
                alert(`Открыто ${opened} торрентов и страниц!`);
                return;
            }

            const row = rows[opened];
            // Ссылка на торрент
            const torrentLink = row.querySelector('a.tr-dl[href^="dl.php?t="]');
            // Ссылка на страницу темы
            const topicLink = row.querySelector('a[href^="viewtopic.php?t="]');

            // Открываем торрент-файл (стандартно)
            if (torrentLink) {
                torrentLink.click();
            }

            // Имитируем Ctrl+Click для открытия в новой вкладке (и чтобы ссылка стала посещённой)
            if (topicLink) {
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    ctrlKey: true // для Windows/Linux, для MacOS можно добавить metaKey
                });
                topicLink.dispatchEvent(event);
            }

            opened++;
            setTimeout(openNext, 400); // задержка между действиями
        }
        openNext();
    }

    // --- Запуск ---
    const button = createButton();
    button.addEventListener('click', openAllLinks);

})();
