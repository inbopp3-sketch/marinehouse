
const toggle = document.querySelector('.menu-toggle');
const gnb = document.querySelector('.gnb');
if (toggle && gnb) {
  toggle.addEventListener('click', () => {
    const open = gnb.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}
