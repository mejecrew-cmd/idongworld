/**
 * packages/backend/src/modules/account/routes.ts
 * ------------------------------------------------------------
 * 역할: 모듈 action API의 HTTP route를 정의한다.
 * 연결: frontend action 요청을 받아 uid/payload를 검증하고 module service로 넘긴다.
 * 주의: route에는 복잡한 상태 전이를 넣지 말고 service error를 HTTP 응답으로 변환하는 데 집중한다.
 */
export { accountRouter } from '../../routes/account.js'
export { authRouter } from '../../routes/auth.js'






