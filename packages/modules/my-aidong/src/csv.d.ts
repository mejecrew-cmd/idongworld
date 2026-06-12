// csv.d.ts
// Vite의 ?raw CSV import를 TypeScript가 이해하도록 선언한다.
// 모듈 패키지 단독 typecheck에서 balance.csv import 오류가 나지 않게 하는 얇은 타입 shim이다.
declare module '*.csv?raw' {
  const content: string
  export default content
}

