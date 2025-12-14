// ==UserScript==
// @name         Pornolab Bulk Download + CtrlClick
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Кнопка: скачать все торренты + открыть темы через Ctrl+Click на pornolab.net
// @author       Druidblack
// @match        https://pornolab.net/forum/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Не показываем кнопку на страницах раздачи (viewtopic.php)
    if (/\/viewtopic\.php/.test(location.pathname)) return;

    // Кнопка
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
        // Ищем все ссылки на раздачи
        const topicLinks = Array.from(document.querySelectorAll('a.med.tLink.bold[href*="viewtopic.php?t="]'));
        // Ищем все ссылки на торрент-файлы
        const torrentLinks = Array.from(document.querySelectorAll('a.small.tr-dl.dl-stub[href*="dl.php?t="]'));

        if (!topicLinks.length || !torrentLinks.length) {
            alert('Не найдены ссылки на темы или торрент-файлы!');
            return;
        }

        let opened = 0;
        function openNext() {
            if (opened >= topicLinks.length || opened >= torrentLinks.length) {
                alert(`Открыто ${opened} тем и скачано ${opened} торрентов!`);
                return;
            }

            // Открываем торрент-файл через window.open!
            let torrentHref = torrentLinks[opened].getAttribute('href');
            // абсолютный url
            if (!/^https?:\/\//.test(torrentHref)) {
                torrentHref = location.origin + location.pathname.replace(/\/[^/]*$/, '/') + torrentHref.replace(/^\.\//, '');
            }
            window.open(torrentHref, '_blank');

            // Ctrl+Click по теме
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                ctrlKey: true
            });
            topicLinks[opened].dispatchEvent(event);

            opened++;
            setTimeout(openNext, 400);
        }
        openNext();
    }

    // Запуск
    const button = createButton();
    button.addEventListener('click', openAllLinks);

})();
