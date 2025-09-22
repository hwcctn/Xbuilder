import { webKeys } from '@/utils/spx'

export type KeyboardEventType = 'keydown' | 'keyup'

export type KeyCode = (typeof webKeys)[number]
