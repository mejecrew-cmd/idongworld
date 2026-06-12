/**
 * 📁 my-island/i18n/index.ts
 */
import ko from './ko.json'
import en from './en.json'
import type { ModuleI18n } from '@idongworld/core'

const i18n: ModuleI18n = {
  moduleId: 'my-island',
  namespace: 'my-island',
  resources: { ko, en },
}

export default i18n
