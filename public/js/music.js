const audio = document.getElementById('site-music')
const toggle = document.getElementById('music-toggle')
const label = document.getElementById('music-toggle-label')

if (!audio || !toggle || !label) {
  console.error('The site audio controls are missing from the page.')
} else {
  function updateMusicButton(isPlaying) {
    const text = isPlaying ? 'Pause audio' : 'Play audio'
    label.textContent = text
    toggle.setAttribute('aria-label', text)
    toggle.setAttribute('aria-pressed', String(isPlaying))
  }

  function markAudioUnavailable(error) {
    if (error) console.error('Unable to play the site audio.', error)
    else console.error('The site audio file could not be loaded.')
    label.textContent = 'Audio unavailable'
    toggle.setAttribute('aria-label', 'Audio unavailable')
    toggle.disabled = true
  }

  toggle.addEventListener('click', async () => {
    if (!audio.paused) {
      audio.pause()
      return
    }

    try {
      await audio.play()
    } catch (error) {
      markAudioUnavailable(error)
    }
  })

  audio.addEventListener('play', () => updateMusicButton(true))
  audio.addEventListener('pause', () => updateMusicButton(false))
  audio.addEventListener('ended', () => updateMusicButton(false))
  audio.addEventListener('error', () => markAudioUnavailable())
}
