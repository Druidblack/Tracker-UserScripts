// ==UserScript==
// @name         RuTracker Bulk Download
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Скачать все торренты со страиницы поиска
// @author       Druidblack
// @match        https://rutracker.org/forum/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Не показываем кнопку на страницах раздачи (viewtopic.php) и на прямой загрузке (dl.php)
  if (/\/viewtopic\.php/i.test(location.pathname)) return;
  if (/\/dl\.php/i.test(location.pathname)) return;

  function createButton() {
    const btn = document.createElement('button');
    btn.textContent = 'Скачать все торренты';
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
    btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    document.body.appendChild(btn);
    return btn;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function toAbsoluteUrl(rel) {
    if (!rel) return rel;
    if (/^https?:\/\//i.test(rel)) return rel;
    if (rel.startsWith('/')) return location.origin + rel;

    // типично на rutracker ссылки вида "dl.php?t=123" относительно /forum/
    const baseDir = location.origin + location.pathname.replace(/\/[^/]*$/, '/');
    return baseDir + rel.replace(/^\.\//, '');
  }

  function parseFilenameFromCD(cd) {
    if (!cd) return null;

    // filename*=UTF-8''%D0%98%D0%BC%D1%8F.torrent
    const star = cd.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
    if (star) {
      try {
        const raw = star[1].trim().replace(/^UTF-8''/i, '').replace(/^"|"$/g, '');
        return decodeURIComponent(raw);
      } catch (_) { /* noop */ }
    }

    // filename="Имя.torrent"
    const simple = cd.match(/filename\s*=\s*"([^"]+)"/i) || cd.match(/filename\s*=\s*([^;]+)/i);
    if (simple) return simple[1].trim().replace(/^"|"$/g, '');
    return null;
  }

  async function downloadTorrent(href, index) {
    const url = toAbsoluteUrl(href);

    const resp = await fetch(url, { credentials: 'include' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    // На всякий случай: если вместо .torrent прилетел HTML (например, редирект/страница ошибки)
    const ct = (resp.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('text/html')) {
      const txt = await resp.text();
      throw new Error('Получен HTML вместо .torrent (возможна необходимость логина/куки/ограничение). ' +
                      `Первые символы: ${txt.slice(0, 80).replace(/\s+/g, ' ')}`);
    }

    const blob = await resp.blob();

    let filename =
      parseFilenameFromCD(resp.headers.get('Content-Disposition') || resp.headers.get('content-disposition')) ||
      `torrent-${index + 1}.torrent`;

    if (!/\.torrent$/i.test(filename)) filename += '.torrent';

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1500);
  }

  function collectTorrentLinks() {
    // RuTracker: чаще всего "a.dl-stub" (иконка скрепки) ведёт на dl.php?t=...
    // На некоторых страницах встречается и tr-dl — поэтому берём всё вместе.
    const selectors = [
      'a.dl-stub[href*="dl.php?t="]',
      'a.tr-dl[href*="dl.php?t="]',
      'a[href*="dl.php?t="]' // fallback, если классы изменены (фильтруем ниже)
    ];

    const anchors = Array.from(document.querySelectorAll(selectors.join(',')));

    // оставляем только нормальные dl.php?t=NNN (чтобы не захватить мусор)
    const rawLinks = anchors
      .map(a => a.getAttribute('href'))
      .filter(href => href && /dl\.php\?t=\d+/.test(href));

    // Дедупликация по t=
    const seen = new Set();
    const torrentLinks = [];

    for (const href of rawLinks) {
      const m = href.match(/(?:\?|&)t=(\d+)/);
      const key = m ? m[1] : href;
      if (!seen.has(key)) {
        seen.add(key);
        torrentLinks.push(href);
      }
    }

    return torrentLinks;
  }

  async function downloadAllTorrents() {
    const btn = button;
    const torrentLinks = collectTorrentLinks();

    if (!torrentLinks.length) {
      alert('Не найдены ссылки на торрент-файлы (dl.php?t=...) на этой странице RuTracker.');
      return;
    }

    btn.disabled = true;
    const total = torrentLinks.length;
    let ok = 0, fail = 0;

    for (let i = 0; i < total; i++) {
      btn.textContent = `Скачиваю ${i + 1}/${total}…`;
      try {
        await downloadTorrent(torrentLinks[i], i);
        ok++;
      } catch (e) {
        console.warn('Ошибка скачивания:', torrentLinks[i], e);
        fail++;
      }
      await sleep(450); // пауза между загрузками
    }

    btn.textContent = 'Скачать все торренты';
    btn.disabled = false;

    alert(`Готово. Успешно: ${ok}/${total}. Ошибок: ${fail}.`);
  }

  const button = createButton();
  button.addEventListener('click', downloadAllTorrents);
})();
