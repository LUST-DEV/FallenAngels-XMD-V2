const { runYouTubeAudio } = require('../youtubeAudio')

module.exports = {
  name: 'audio',
  desc: 'Search YouTube and send an audio preview with a download button',
  async run(context) {
    return runYouTubeAudio(context)
  },
}
