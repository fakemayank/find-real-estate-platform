/* Small-screen navigation. Existing hash routes and access control stay unchanged. */
(() => {
  const header = document.querySelector('.top');
  const nav = header?.querySelector('nav');
  if (!header || !nav) return;

  nav.id = 'find-mobile-nav';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'mobile-menu-toggle';
  toggle.setAttribute('aria-label', 'Open navigation');
  toggle.setAttribute('aria-controls', nav.id);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
  header.append(toggle);

  const close = () => {
    header.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    toggle.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
  };
  toggle.addEventListener('click', () => {
    if (header.classList.contains('menu-open')) return close();
    header.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation');
    toggle.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) close();
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
  });
  window.addEventListener('popstate', close);
  window.matchMedia('(min-width: 768px)').addEventListener('change', close);
})();
