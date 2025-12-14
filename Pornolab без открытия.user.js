// ==UserScript==
// @name         Pornolab Bulk Downloa
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Скачать все торренты с pornolab.net
// @author       Druidblack
// @match        https://pornolab.net/forum/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Не показываем кнопку на страницах раздачи (viewtopic.php)
  if (/\/viewtopic\.php/.test(location.pathname)) return;

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
    btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    document.body.appendChild(btn);
    return btn;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function toAbsoluteUrl(rel) {
    if (/^https?:\/\//i.test(rel)) return rel;
    const base = location.origin + location.pathname.replace(/\/[^/]*$/, '/');
    return base + rel.replace(/^\.\//, '');
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
    if (simple) {
      return simple[1].trim().replace(/^"|"$/g, '');
    }
    return null;
  }

  async function downloadTorrent(href, index) {
    const url = toAbsoluteUrl(href);
    const resp = await fetch(url, { credentials: 'include' });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
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
    }, 1000);
  }

  async function downloadAllTorrents() {
    const btn = button;

    // Находим все ссылки на торрент-файлы
    const rawLinks = Array.from(
      document.querySelectorAll('a.small.tr-dl.dl-stub[href*="dl.php?t="]')
    ).map(a => a.getAttribute('href'));

    if (!rawLinks.length) {
      alert('Не найдены ссылки на торрент-файлы на этой странице!');
      return;
    }

    // Дедупликация по параметру t=
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
      // Небольшая пауза, чтобы не DDoSить сайт и чтобы браузер успевал обрабатывать загрузки
      await sleep(400);
    }

    btn.textContent = 'Скачать все торренты';
    btn.disabled = false;

    alert(`Готово. Успешно: ${ok}/${total}. Ошибок: ${fail}.`);
  }

  const button = createButton();
  button.addEventListener('click', downloadAllTorrents);
})();
