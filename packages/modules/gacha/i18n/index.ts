/**
 * 📁 gacha/i18n/index.ts — i18n 묶음 (ModuleI18n 호환)
 * 📌 PM·작가가 ko.json·en.json 편집. 본 파일은 정적 import + ModuleI18n shape 합성.
 */
import ko from './ko.json'
import en from './en.json'
import type { ModuleI18n } from '@idongworld/core'

const i18n: ModuleI18n = {
  moduleId: 'gacha',
  namespace: 'gacha',
  resources: { ko, en },
}

export default i18n
