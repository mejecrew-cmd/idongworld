/**
 * lodge/i18n/index.ts - i18n 묶음
 */
import ko from './ko.json'
import en from './en.json'
import type { ModuleI18n } from '@idongworld/core'

const i18n: ModuleI18n = {
  moduleId: 'lodge',
  namespace: 'lodge',
  resources: { ko, en },
}

export default i18n
