(() => {
  const albums = Array.from(document.querySelectorAll('[data-case-album]'));
  if (!albums.length) return;

  // Keep static albums usable when dialog support or JavaScript is absent.
  function revealAlbum() {
    const target = document.getElementById(location.hash.slice(1));
    if (target?.matches('.case-album')) target.open = true;
  }
  if (typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) {
    window.addEventListener('hashchange', revealAlbum);
    revealAlbum();
    return;
  }

  const viewer = document.createElement('dialog');
  viewer.id = 'case-viewer';
  viewer.className = 'case-viewer';
  viewer.setAttribute('aria-labelledby', 'case-viewer-title');
  viewer.innerHTML = `
    <div class="case-viewer__bar">
      <p class="case-viewer__title" id="case-viewer-title"></p>
      <button class="case-viewer__close" type="button" aria-label="설치 사진 닫기">×</button>
    </div>
    <div class="case-viewer__stage"><img class="case-viewer__image" alt=""></div>
    <div class="case-viewer__thumbnails" role="group" aria-label="이 매장의 설치 사진"></div>
    <div class="case-viewer__footer">
      <button class="case-viewer__previous" type="button" aria-label="이전 설치 사진">이전</button>
      <span class="case-viewer__count" role="status" aria-live="polite"></span>
      <button class="case-viewer__next" type="button" aria-label="다음 설치 사진">다음</button>
    </div>`;
  document.body.append(viewer);

  const image = viewer.querySelector('.case-viewer__image');
  const title = viewer.querySelector('.case-viewer__title');
  const count = viewer.querySelector('.case-viewer__count');
  const close = viewer.querySelector('.case-viewer__close');
  const thumbnails = viewer.querySelector('.case-viewer__thumbnails');
  const stage = viewer.querySelector('.case-viewer__stage');
  let photos = [];
  let albumName = '';
  let current = 0;
  let opener = null;
  let touchStart = null;

  function show(index) {
    current = (index + photos.length) % photos.length;
    const link = photos[current];
    image.alt = link.querySelector('img').alt;
    image.src = link.href;
    title.textContent = `${albumName} · ${link.dataset.caseTitle}`;
    count.textContent = `${current + 1} / ${photos.length}`;
    Array.from(thumbnails.children).forEach((button, position) => {
      button.setAttribute('aria-current', String(position === current));
    });
    const active = thumbnails.children[current];
    if (active && viewer.open) {
      const left = active.offsetLeft - thumbnails.offsetLeft;
      if (left < thumbnails.scrollLeft || left + active.offsetWidth > thumbnails.scrollLeft + thumbnails.clientWidth) thumbnails.scrollLeft = left - 8;
    }
  }

  function openAlbum(album, source, index = 0) {
    photos = Array.from(album.querySelectorAll('[data-case-photo]'));
    if (!photos.length) return;
    opener = source;
    albumName = album.dataset.caseName;
    thumbnails.replaceChildren(...photos.map((link, position) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'case-viewer__thumbnail';
      button.setAttribute('aria-label', `${position + 1}번 사진: ${link.dataset.caseTitle}`);
      const preview = document.createElement('img');
      preview.src = link.querySelector('img').src;
      preview.alt = '';
      preview.width = 48;
      preview.height = 64;
      preview.loading = 'lazy';
      button.append(preview);
      button.addEventListener('click', () => show(position));
      return button;
    }));
    viewer.showModal();
    thumbnails.scrollLeft = 0;
    show(index);
    document.documentElement.classList.add('case-viewer-open');
    close.focus();
  }

  albums.forEach((album) => {
    const links = Array.from(album.querySelectorAll('[data-case-photo]'));
    if (!links.length) return;
    album.querySelectorAll('[data-case-open], [data-case-photo]').forEach((link) => {
      link.setAttribute('aria-haspopup', 'dialog');
      link.setAttribute('aria-controls', viewer.id);
      link.addEventListener('click', (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openAlbum(album, link, Math.max(0, links.indexOf(link)));
      });
    });
    album.classList.add('case-gallery-ready');
  });
  function openLinkedAlbum() {
    const target = document.getElementById(location.hash.slice(1));
    if (!target?.matches('.case-album')) return;
    const album = target.closest('[data-case-album]');
    if (album && !viewer.open) openAlbum(album, album.querySelector('[data-case-open]'));
  }
  window.addEventListener('hashchange', openLinkedAlbum);
  openLinkedAlbum();
  close.addEventListener('click', () => viewer.close());
  viewer.querySelector('.case-viewer__previous').addEventListener('click', () => show(current - 1));
  viewer.querySelector('.case-viewer__next').addEventListener('click', () => show(current + 1));
  viewer.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  stage.addEventListener('touchstart', (event) => {
    touchStart = event.touches.length === 1 ? {x: event.touches[0].clientX, y: event.touches[0].clientY} : null;
  }, {passive: true});
  stage.addEventListener('touchend', (event) => {
    if (!touchStart || event.touches.length || !event.changedTouches.length) return;
    const end = event.changedTouches[0];
    const dx = end.clientX - touchStart.x, dy = end.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
  }, {passive: true});
  stage.addEventListener('touchcancel', () => {touchStart = null;}, {passive: true});
  viewer.addEventListener('click', (event) => {
    if (event.target !== viewer) return;
    const rect = viewer.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) viewer.close();
  });
  viewer.addEventListener('close', () => {
    document.documentElement.classList.remove('case-viewer-open');
    touchStart = null;
    if (opener) opener.focus({preventScroll: true});
  });
})();
