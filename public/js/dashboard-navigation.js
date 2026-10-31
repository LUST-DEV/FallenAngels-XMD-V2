const dashboardMenuToggle = document.getElementById('dashboard-menu-toggle')
const dashboardNavigation = document.getElementById('dashboard-navigation')

if (!dashboardMenuToggle || !dashboardNavigation) {
  console.error('The dashboard mobile navigation controls are missing from the page.')
} else {
  function setDashboardMenuOpen(isOpen) {
    dashboardMenuToggle.setAttribute('aria-expanded', String(isOpen))
    dashboardMenuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu')
    dashboardNavigation.classList.toggle('is-open', isOpen)
  }

  dashboardMenuToggle.addEventListener('click', () => {
    setDashboardMenuOpen(dashboardMenuToggle.getAttribute('aria-expanded') !== 'true')
  })

  dashboardNavigation.addEventListener('click', (event) => {
    if (event.target.closest('a, button')) setDashboardMenuOpen(false)
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setDashboardMenuOpen(false)
  })

  window.addEventListener('resize', () => {
    if (window.innerWidth > 520) setDashboardMenuOpen(false)
  })
}
