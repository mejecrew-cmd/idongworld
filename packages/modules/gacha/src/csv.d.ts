// 📁 csv.d.ts — Vite raw CSV 임포트 타입 선언 (모듈 단독 typecheck 지원)
declare module '*.csv?raw' {
  const content: string
  export default content
}
