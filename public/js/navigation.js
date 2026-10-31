const menuToggle = document.getElementById('menu-toggle')
const primaryNavigation = document.getElementById('primary-navigation')

if (!menuToggle || !primaryNavigation) {
  console.error('The mobile navigation controls are missing from the page.')
} else {
  function setMenuOpen(isOpen) {
    menuToggle.setAttribute('aria-expanded', String(isOpen))
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu')
    primaryNavigation.classList.toggle('is-open', isOpen)
  }

  menuToggle.addEventListener('click', () => {
    setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true')
  })

  primaryNavigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenuOpen(false)
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenuOpen(false)
  })

  window.addEventListener('resize', () => {
    if (window.innerWidth > 620) setMenuOpen(false)
  })
}
