// Smooth active header shadow
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  if (!header) return;
  header.classList.toggle('is-scrolled', window.scrollY > 12);
});
