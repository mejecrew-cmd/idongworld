/**
 * packages/backend/src/repositories/memoryCustomsLogRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import type { CustomsLogDoc } from '../models/CustomsLogModel.js'
import type { CustomsLogInput, CustomsLogRepository } from './customsLogRepository.js'

const logs: CustomsLogDoc[] = []

export const memoryCustomsLogRepository: CustomsLogRepository = {
  async create(input: CustomsLogInput, _session) {
    if (input.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(input.uid, input.idempotencyKey)
      if (existing) return existing
    }
    const log: CustomsLogDoc = { ...input, createdAt: Date.now() }
    logs.push(log)
    return log
  },

  async findByIdempotencyKey(uid, idempotencyKey, _session) {
    return logs.find((log) => log.uid === uid && log.idempotencyKey === idempotencyKey)
  },

  async listByUser(uid, limit = 50) {
    return logs
      .filter((log) => log.uid === uid)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
  },
}






