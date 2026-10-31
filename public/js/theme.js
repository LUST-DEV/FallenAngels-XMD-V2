const themeToggle = document.getElementById('theme-toggle')
const themeLabel = document.getElementById('theme-toggle-label')
const themeColor = document.getElementById('theme-color')
const root = document.documentElement

function applyTheme(theme, persist = false) {
  const isLight = theme === 'light'
  root.dataset.theme = isLight ? 'light' : 'dark'
  themeToggle.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} theme`)
  themeToggle.setAttribute('aria-pressed', String(isLight))
  themeLabel.textContent = isLight ? 'Dark mode' : 'Light mode'
  themeColor.setAttribute('content', isLight ? '#f1f1f3' : '#09090c')

  if (persist) {
    try {
      localStorage.setItem('fxa-theme', root.dataset.theme)
    } catch (error) {
      console.warn('Unable to save the theme preference.', error)
    }
  }
}

if (!themeToggle || !themeLabel || !themeColor) {
  console.error('The theme controls are missing from the page.')
} else {
  applyTheme(root.dataset.theme === 'light' ? 'light' : 'dark')
  themeToggle.addEventListener('click', () => {
    applyTheme(root.dataset.theme === 'light' ? 'dark' : 'light', true)
  })
}
