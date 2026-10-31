const contactForm = document.getElementById('contact-form')
const contactStatus = document.getElementById('contact-status')

if (!contactForm || !contactStatus) {
  console.error('The contact form controls are missing from the page.')
} else {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault()
    if (!contactForm.reportValidity()) return

    const formData = new FormData(contactForm)
    const name = String(formData.get('name') || '').trim()
    const email = String(formData.get('email') || '').trim()
    const subject = String(formData.get('subject') || '').replace(/[\r\n]+/g, ' ').trim()
    const message = String(formData.get('message') || '').trim()
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`
    const mailto = new URL('mailto:savagezzzdevlopper@gmail.com')
    mailto.searchParams.set('subject', subject)
    mailto.searchParams.set('body', body)

    contactStatus.textContent = 'Your email app should open with your message. If it does not, email savagezzzdevlopper@gmail.com directly.'
    window.location.href = mailto.href
  })
}
