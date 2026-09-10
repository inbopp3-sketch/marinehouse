
const toggle = document.querySelector('.menu-toggle');
const gnb = document.querySelector('.gnb');
if (toggle && gnb) {
  toggle.addEventListener('click', () => {
    const open = gnb.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}


// Adult verification launch popup
(() => {
  const popup = document.getElementById('adultLaunchPopup');
  if (!popup) return;

  const storageKey = 'mhkAdultLaunchHiddenUntil20260910Blue';
  const closeButtons = popup.querySelectorAll('[data-popup-close]');
  const hideTodayButton = document.getElementById('adultLaunchHideToday');
  let previousFocus = null;

  const closePopup = () => {
    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('popup-open');
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
  };

  const openPopup = () => {
    previousFocus = document.activeElement;
    popup.classList.add('is-open');
    popup.setAttribute('aria-hidden', 'false');
    document.body.classList.add('popup-open');
    const closeButton = popup.querySelector('.launch-popup-close');
    if (closeButton) closeButton.focus();
  };

  let hiddenUntil = 0;
  try {
    hiddenUntil = Number(localStorage.getItem(storageKey) || 0);
  } catch (_) {
    // The popup should still work when browser storage is unavailable.
  }
  if (!Number.isFinite(hiddenUntil) || Date.now() >= hiddenUntil) {
    window.setTimeout(openPopup, 450);
  }

  closeButtons.forEach((button) => button.addEventListener('click', closePopup));

  if (hideTodayButton) {
    hideTodayButton.addEventListener('click', () => {
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      try {
        localStorage.setItem(storageKey, String(tomorrow.getTime()));
      } catch (_) {
        // Closing remains available even if the browser cannot save the choice.
      }
      closePopup();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (!popup.classList.contains('is-open')) return;
    if (event.key === 'Escape') closePopup();
    if (event.key === 'Tab') {
      const focusable = popup.querySelectorAll('a[href], button');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
})();
