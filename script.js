const button = document.querySelector('.menu-toggle');
const navigation = document.querySelector('nav');
button?.addEventListener('click', () => {
  const open = navigation.classList.toggle('open');
  button.setAttribute('aria-expanded', open);
});
document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => navigation.classList.remove('open')));

const story = document.querySelector('.story');
if (story) {
  if ('IntersectionObserver' in window) {
    const revealStory = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          story.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    revealStory.observe(story);
  } else {
    story.classList.add('in-view');
  }
}
