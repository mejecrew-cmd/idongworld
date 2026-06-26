/**
 * packages/frontend/src/screens/StageScreen.tsx
 * ------------------------------------------------------------
 * 역할: 대표 무대의 placeholder 허브 화면을 렌더링한다.
 * 연결: 숙소 데뷔 회의실, 기존 데뷔 스테이지 시퀀스, 후속 stage/debut backend module 후보가 이 화면을 통과한다.
 * 주의: M4에서는 실제 데뷔 결과 계산이나 포토카드 생성 없이 route와 진입 흐름만 확정한다.
 */
import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '@/components/ScreenHeader'
import { AidongSprite } from '@/components/AidongSprite'
import { SIGNATURES } from '@/data/signatures'
import { myAidongStoreFacade } from '@/lib/storeFacades'
import type { AidongCharacterId } from '@/stores/userStore'

const STAGE_NOTES = [
  '대표 무대는 숙소의 데뷔 회의실에서 이어지는 공개 공연 허브입니다.',
  '이번 단계에서는 stage/debut route와 화면 골격만 만들고, 결과 계산은 후속 backend module에서 다룹니다.',
  '데뷔 결과와 포토카드는 다음 단계에서 마이룸 콜렉션과 연결합니다.',
]

function getSignatureIds(): AidongCharacterId[] {
  return Object.keys(SIGNATURES) as AidongCharacterId[]
}

export const StageScreen = () => {
  const navigate = useNavigate()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const equippedOutfit = myAidongStoreFacade.useEquippedOutfit()
  const signatureIds = getSignatureIds()
  const debutCandidates = signatureIds.filter((id) => recruitedAidongs.includes(id))

  return (
    <Box sx={{ pb: 3 }}>
      <ScreenHeader category="대표 무대" title="Stage" subtitle="M4 placeholder" />

      <Box
        sx={{
          position: 'relative',
          minHeight: 220,
          display: 'grid',
          alignItems: 'end',
          p: 2,
          backgroundImage: 'url(/assets/backgrounds/03_Home_05.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(30,22,62,0.16), rgba(20,18,28,0.62))',
          }}
        />
        <Box sx={{ position: 'relative', color: 'white', maxWidth: 680 }}>
          <Typography variant="h1" sx={{ fontSize: { xs: 28, sm: 36 }, fontWeight: 900, mb: 1 }}>
            대표 무대
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.92 }}>
            연습과 데뷔 회의실에서 준비한 Aidong의 첫 공연을 여는 자리입니다.
            지금은 흐름 확인용 placeholder이며, 결과 계산과 포토카드는 다음 작업에서 연결합니다.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2 }}>
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, gap: 1, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h2" sx={{ fontSize: 18, fontWeight: 900 }}>데뷔 후보</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                영입된 Aidong만 데뷔 placeholder 시퀀스를 시작할 수 있어요.
              </Typography>
            </Box>
            <Chip label={`후보 ${debutCandidates.length}`} size="small" color="primary" variant="outlined" />
          </Stack>

          {debutCandidates.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography sx={{ mb: 1 }}>아직 무대에 올릴 Aidong이 없어요.</Typography>
              <Button variant="contained" onClick={() => navigate('/voyage/board')}>항해로 만나러 가기</Button>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5 }}>
              {debutCandidates.map((id) => {
                const signature = SIGNATURES[id]
                return (
                  <Box
                    key={id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 1.5,
                      textAlign: 'center',
                      bgcolor: 'background.default',
                    }}
                  >
                    <AidongSprite character={id} expression="happy" outfit={equippedOutfit[id]} size={118} />
                    <Typography sx={{ fontWeight: 900 }}>{id}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1 }}>
                      {signature.emoji} {signature.name} · 보정 +{signature.bonus}
                    </Typography>
                    <Button fullWidth variant="contained" onClick={() => navigate(`/stage/debut/${id}`)}>
                      데뷔 시작
                    </Button>
                  </Box>
                )
              })}
            </Box>
          )}
        </Box>

        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2 }}>
          <Typography variant="h2" sx={{ fontSize: 17, fontWeight: 900, mb: 1 }}>M4 범위</Typography>
          <Stack spacing={1}>
            {STAGE_NOTES.map((note) => (
              <Typography key={note} variant="body2" sx={{ color: 'text.secondary' }}>
                {note}
              </Typography>
            ))}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
            <Button variant="outlined" onClick={() => navigate('/island/lodge')}>숙소로 돌아가기</Button>
            <Button variant="outlined" onClick={() => navigate('/island/lodge/myroom/collection')}>마이룸 콜렉션</Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  )
}
