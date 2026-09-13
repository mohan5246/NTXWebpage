const button = document.querySelector('.menu-toggle');
const navigation = document.querySelector('nav');
button?.addEventListener('click', () => {
  const open = navigation.classList.toggle('open');
  button.setAttribute('aria-expanded', open);
});
document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => navigation.classList.remove('open')));
