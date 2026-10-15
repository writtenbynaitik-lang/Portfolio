/**
 * DOM ids of the page's sections. Navigation links point at these: #work is
 * the first project's moment in the gallery, #contact the end of the journey
 * in the contact room (or the final section, without the 3D journey).
 */
export const SECTION_ID = {
  top: 'top',
  work: 'work',
  contact: 'contact',
} as const

export type SectionId = (typeof SECTION_ID)[keyof typeof SECTION_ID]

export interface NavItem {
  label: string
  target: SectionId
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Work', target: SECTION_ID.work },
  { label: 'Contact', target: SECTION_ID.contact },
]
