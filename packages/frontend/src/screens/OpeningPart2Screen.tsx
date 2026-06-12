/**
 * 📁 screens/OpeningPart2Screen.tsx — 오프닝 2부 (배 위·상륙·폐허·숙소 유도)
 * ───────────────────────────────────────────────
 * 📌 역할: 오프닝 1부 [구해주기] → 영입(recruit) 종료 직후 → 본 시퀀스.
 *           배 위 대화·상륙·폐허 인식·숙소 구역 유도까지 VNPlayer 시나리오 1편.
 *
 * 🔗 연결:
 *   - 기획 SoT: 브리핑_프롤로그.md IV·V (확장) + 모듈/오프닝.md (후속 갱신)
 *   - 시나리오: cutscene_opening_part2.json
 *   - 이전: /first-meeting (recruit_X 종료)
 *   - 다음: /heart-island/first (임시 — (D) 작업 후 /opening/part3 으로)
 *
 * 💡 초보자 안내:
 *   - 영입된 1명: useUserStore.recruitedAidongs[0] (오프닝 시퀀스 외에는 직접 영입 X)
 *   - 시나리오 character: '{{result.characterId}}' 동적 치환 (FirstMeeting 패턴과 동일)
 *   - settle_X 컷은 본 단계에서 스킵 — 위치 재배치는 PM 결정 대기
 */
import { Navigate, useNavigate } from 'react-router-dom'
import { Box, Typography, Button } from '@mui/material'
import { VNPlayer } from '@idongworld/vn-runner'
import { getScenarioId } from '@idongworld/gacha'
import type { AidongCharacterId } from '@/stores/userStore'
import { ScreenHeader } from '@/components/ScreenHeader'
import { accountStoreFacade, myAidongStoreFacade } from '@/lib/storeFacades'

export const OpeningPart2Screen = () => {
  const navigate = useNavigate()
  const openingSeen = accountStoreFacade.useOpeningSeen()
  const onboardingComplete = accountStoreFacade.useOnboardingComplete()
  const recruited = myAidongStoreFacade.useRecruitedAidongs()
  const firstAidong = recruited[0] as AidongCharacterId | undefined

  if (onboardingComplete || openingSeen) {
    return <Navigate to="/island" replace />
  }

  if (!firstAidong) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <ScreenHeader category="오프닝 (2부)" title="진입 오류" overlay />
        <Typography sx={{ mt: 8 }}>먼저 첫 만남을 진행해 주세요.</Typography>
        <Button onClick={() => navigate('/first-meeting')} sx={{ mt: 2 }} variant="contained">
          첫 만남으로
        </Button>
      </Box>
    )
  }

  const scenarioId = getScenarioId(firstAidong) ?? firstAidong
  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      <ScreenHeader
        category="오프닝 (2부)"
        title="배·상륙·폐허·숙소 유도"
        subtitle={firstAidong}
        overlay
      />
      <VNPlayer
        scenarioId="cutscene_opening_part2"
        context={{
          result: {
            characterId: firstAidong,
            scenarioId,
          },
        }}
        onComplete={() => navigate('/heart-island/first')}
      />
    </Box>
  )
}
