/**
 * packages/backend/src/repositories/mongoCustomsLogRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import { CustomsLogModel, type CustomsLogDoc } from '../models/CustomsLogModel.js'
import type { CustomsLogInput, CustomsLogRepository } from './customsLogRepository.js'

function toCustomsLogDoc(doc: unknown): CustomsLogDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as unknown as CustomsLogDoc
}

export const mongoCustomsLogRepository: CustomsLogRepository = {
  async create(input: CustomsLogInput, session) {
    if (input.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(input.uid, input.idempotencyKey, session)
      if (existing) return existing
    }
    const created = new CustomsLogModel({ ...input, createdAt: Date.now() })
    await created.save({ session })
    return toCustomsLogDoc(created.toObject())
  },

  async findByIdempotencyKey(uid, idempotencyKey, session) {
    const doc = await CustomsLogModel.findOne({ uid, idempotencyKey }).session(session ?? null).lean()
    return doc ? toCustomsLogDoc(doc) : undefined
  },

  async listByUser(uid, limit = 50) {
    const docs = await CustomsLogModel.find({ uid }).sort({ createdAt: -1 }).limit(limit).lean()
    return docs.map(toCustomsLogDoc)
  },
}






