/**
 * packages/backend/src/resources/moduleResourceRegistry.ts
 * ------------------------------------------------------------
 * 역할: customs가 module resource를 읽고 쓸 때 사용할 state field를 명시한다.
 * 연결: moduleResourceAdapter가 moduleId를 보고 dedicated document의 어느 field를 자원 저장소로 볼지 결정한다.
 * 주의: 새 module resource를 customs에 노출할 때는 이름 추론 대신 이 registry에 명시적으로 추가한다.
 */
export type ModuleResourceField = 'localResources' | 'shipInventory' | 'lodgeInventory' | 'resources'

export interface ModuleResourceBinding {
  moduleId: string
  resourceField: ModuleResourceField
  storage: 'dedicated' | 'moduleStates'
}

const DEDICATED_MODULE_RESOURCE_BINDINGS: ModuleResourceBinding[] = [
  { moduleId: 'destination-shell-island', resourceField: 'localResources', storage: 'dedicated' },
  { moduleId: 'lodge', resourceField: 'lodgeInventory', storage: 'dedicated' },
  { moduleId: 'route-neighbor', resourceField: 'localResources', storage: 'dedicated' },
  { moduleId: 'ship', resourceField: 'shipInventory', storage: 'dedicated' },
  { moduleId: 'zone-garden', resourceField: 'localResources', storage: 'dedicated' },
  { moduleId: 'zone-oasis', resourceField: 'localResources', storage: 'dedicated' },
  { moduleId: 'zone-memory', resourceField: 'localResources', storage: 'dedicated' },
  { moduleId: 'zone-mine', resourceField: 'localResources', storage: 'dedicated' },
]

const bindingMap = new Map(
  DEDICATED_MODULE_RESOURCE_BINDINGS.map((binding) => [binding.moduleId, binding]),
)

export function listModuleResourceBindings(): ModuleResourceBinding[] {
  return [...DEDICATED_MODULE_RESOURCE_BINDINGS]
}

export function getModuleResourceBinding(moduleId: string): ModuleResourceBinding {
  return bindingMap.get(moduleId) ?? {
    moduleId,
    resourceField: 'resources',
    storage: 'moduleStates',
  }
}
