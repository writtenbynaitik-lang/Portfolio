/**
 * The contact scene's two actions and where they lead.
 *
 * Each `href` must be a real, working destination: a `mailto:` address, or a
 * web address (opened in a new tab). While an `href` is null the action is
 * still shown, but marked as not yet configured, and nothing about it is
 * clickable.
 */
export interface ContactAction {
  label: string
  href: string | null
  /** What the link does, for assistive technology (the visible label is short). */
  description?: string
}

/** Contact details, as given. */
const EMAIL = 'madebynaitik@gmail.com'
/** +91 87666 39837, in international format, digits only. */
const WHATSAPP = '918766639837'

/** A mailto: link with the address encoded. */
const mailto = (address: string) => `mailto:${encodeURIComponent(address).replace('%40', '@')}`

/** A WhatsApp chat with a number in international format (digits only). */
const whatsApp = (number: string) => `https://wa.me/${number.replace(/\D/g, '')}`

export const CONTACT_ACTIONS: { primary: ContactAction; secondary: ContactAction } = {
  primary: { label: 'Email me', href: mailto(EMAIL), description: EMAIL },
  secondary: { label: 'WhatsApp', href: whatsApp(WHATSAPP), description: 'chat on WhatsApp' },
}

/** Whether a destination is a web address (opened in a new tab) rather than e.g. mailto:. */
export const opensNewTab = (href: string) => /^https?:\/\//i.test(href)
