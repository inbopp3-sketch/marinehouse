
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

  const storageKey = 'mhkAdultLaunchHiddenUntil20260721';
  const closeButtons = popup.querySelectorAll('[data-popup-close]');
  const hideTodayButton = document.getElementById('adultLaunchHideToday');

  const closePopup = () => {
    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('popup-open');
  };

  const openPopup = () => {
    popup.classList.add('is-open');
    popup.setAttribute('aria-hidden', 'false');
    document.body.classList.add('popup-open');
    const closeButton = popup.querySelector('.launch-popup-close');
    if (closeButton) closeButton.focus();
  };

  const hiddenUntil = Number(localStorage.getItem(storageKey) || 0);
  if (Date.now() >= hiddenUntil) {
    window.setTimeout(openPopup, 450);
  }

  closeButtons.forEach((button) => button.addEventListener('click', closePopup));

  if (hideTodayButton) {
    hideTodayButton.addEventListener('click', () => {
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      localStorage.setItem(storageKey, String(tomorrow.getTime()));
      closePopup();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && popup.classList.contains('is-open')) closePopup();
  });
})();
