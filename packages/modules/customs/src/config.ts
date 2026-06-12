import type { CustomsDeclaration, CustomsRule, CustomsSimulation } from './types.ts'

export interface CustomsHooks {
  onDebit?: (params: { module: string; resource: string; amount: number }) => boolean | Promise<boolean>

  onCredit?: (params: {
    scope: 'global' | 'module'
    module?: string
    resource: string
    amount: number
  }) => void | Promise<void>

  confirmUI?: (sim: CustomsSimulation) => Promise<boolean>

  /**
   * Backend-authoritative apply hook. If it returns true, local debit/credit hooks are skipped.
   */
  applyBackend?: (decl: CustomsDeclaration, sim: CustomsSimulation) => Promise<boolean>

  onLog?: (event: 'register' | 'apply' | 'reject', rule: CustomsRule, detail?: unknown) => void
}

let _hooks: CustomsHooks = {}

export function configure(hooks: CustomsHooks): void {
  _hooks = { ..._hooks, ...hooks }
}

export function getHooks(): CustomsHooks {
  return _hooks
}

export function _resetForTest(): void {
  _hooks = {}
}
