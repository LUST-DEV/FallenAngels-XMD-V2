const dashboardThemeToggle = document.getElementById('dashboard-theme-toggle')
const dashboardThemeLabel = document.getElementById('dashboard-theme-label')
const dashboardThemeColor = document.getElementById('dashboard-theme-color')
const dashboardRoot = document.documentElement

function setDashboardTheme(theme, persist = false) {
  const isLight = theme === 'light'
  dashboardRoot.dataset.theme = isLight ? 'light' : 'dark'
  dashboardThemeToggle.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} theme`)
  dashboardThemeToggle.setAttribute('aria-pressed', String(isLight))
  dashboardThemeLabel.textContent = isLight ? 'Dark mode' : 'Light mode'
  dashboardThemeColor.setAttribute('content', isLight ? '#f1f1f3' : '#09090c')

  if (persist) {
    try {
      localStorage.setItem('fxa-theme', dashboardRoot.dataset.theme)
    } catch (error) {
      console.warn('Unable to save the dashboard theme preference.', error)
    }
  }

  document.dispatchEvent(new CustomEvent('dashboard-theme-change'))
}

if (!dashboardThemeToggle || !dashboardThemeLabel || !dashboardThemeColor) {
  console.error('The dashboard theme controls are missing from the page.')
} else {
  setDashboardTheme(dashboardRoot.dataset.theme === 'light' ? 'light' : 'dark')
  dashboardThemeToggle.addEventListener('click', () => {
    setDashboardTheme(dashboardRoot.dataset.theme === 'light' ? 'dark' : 'light', true)
  })
}
