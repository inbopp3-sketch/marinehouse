(() => {
  const links = Array.from(document.querySelectorAll('[data-case-photo]'));
  if (!links.length || typeof HTMLDialogElement === 'undefined') return;

  const viewer = document.createElement('dialog');
  viewer.className = 'case-viewer';
  viewer.setAttribute('aria-labelledby', 'case-viewer-title');
  viewer.innerHTML = `
    <div class="case-viewer__bar">
      <p class="case-viewer__title" id="case-viewer-title"></p>
      <button class="case-viewer__close" type="button" aria-label="설치 사진 닫기">×</button>
    </div>
    <div class="case-viewer__stage"><img class="case-viewer__image" alt=""></div>
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
  let current = 0;
  let opener = null;

  function show(index) {
    current = (index + links.length) % links.length;
    const link = links[current];
    image.alt = link.querySelector('img').alt;
    image.src = link.href;
    title.textContent = link.dataset.caseTitle;
    count.textContent = `${current + 1} / ${links.length}`;
  }

  links.forEach((link, index) => {
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      show(index);
      viewer.showModal();
      document.documentElement.classList.add('case-viewer-open');
      close.focus();
    });
  });
  close.addEventListener('click', () => viewer.close());
  viewer.querySelector('.case-viewer__previous').addEventListener('click', () => show(current - 1));
  viewer.querySelector('.case-viewer__next').addEventListener('click', () => show(current + 1));
  viewer.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  viewer.addEventListener('click', (event) => {
    if (event.target !== viewer) return;
    const rect = viewer.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) viewer.close();
  });
  viewer.addEventListener('close', () => {
    document.documentElement.classList.remove('case-viewer-open');
    if (opener) opener.focus({preventScroll: true});
  });
})();
