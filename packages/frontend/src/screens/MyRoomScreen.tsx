import { useEffect, useState } from 'react'
import { Alert, Box, Chip, LinearProgress, Stack, Typography } from '@mui/material'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'
import { api } from '@/lib/api'
import {
  accountStoreFacade,
  hostStoreFacade,
  myAidongStoreFacade,
} from '@/lib/storeFacades'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export const MyRoomScreen = () => {
  const uid = accountStoreFacade.useFirebaseUid()
  const nickname = accountStoreFacade.useNickname()
  const hostName = accountStoreFacade.useHostName()
  const coins = hostStoreFacade.useCoins()
  const diamonds = hostStoreFacade.useDiamonds()
  const inventory = hostStoreFacade.useInventory()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const affinities = myAidongStoreFacade.useAffinities()
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void api.getMyRoomSummary(uid)
      .then((response) => {
        if (!cancelled) setSummary(response)
      })
      .catch((err) => {
        console.warn('[myroom] failed to load summary', err)
        if (!cancelled) setError('서버 정보를 불러오지 못해 로컬 정보로 표시합니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  const account = asRecord(summary?.account)
  const host = asRecord(summary?.host)
  const aidongs = asRecord(summary?.aidongs)
  const displayName = String(account.hostName ?? hostName ?? account.nickname ?? nickname ?? '내 정보')
  const displayCoins = Number(host.coins ?? coins)
  const displayDiamonds = Number(host.diamonds ?? diamonds)
  const displayAidongs = Array.isArray(aidongs.recruitedAidongs)
    ? aidongs.recruitedAidongs as string[]
    : recruitedAidongs
  const displayInventory = Object.keys(asRecord(host.inventory)).length
    ? asRecord(host.inventory)
    : inventory

  return (
    <Box sx={{ p: 0, pb: 12 }}>
      <ScreenHeader category="마이룸" title="내 정보" subtitle={displayName} showBack />
      <GameStage stageSx={{ px: { xs: 2.5, sm: 3 }, py: 3 }}>
        <Stack spacing={0.75} sx={{ mb: 2 }}>
          <Typography variant="h1" sx={{ fontSize: 22 }}>
            내 정보
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            현재 계정과 마이섬 진행 정보를 확인합니다.
          </Typography>
        </Stack>

        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mb: 2 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 18, mb: 1 }}>
            {displayName}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Chip label={`코인 ${displayCoins}`} />
            <Chip label={`다이아 ${displayDiamonds}`} />
            <Chip label={`아이동 ${displayAidongs.length}`} color="primary" variant="outlined" />
          </Stack>
        </Box>

        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mb: 2 }}>
          <Typography sx={{ fontWeight: 900, mb: 1 }}>
            아이동
          </Typography>
          {displayAidongs.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              아직 함께하는 아이동이 없습니다.
            </Typography>
          ) : (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {displayAidongs.map((id) => {
                const affinity = affinities[id]
                return (
                  <Chip
                    key={id}
                    label={`${id}${affinity ? ` Lv${affinity.level}` : ''}`}
                    color="primary"
                    variant="outlined"
                  />
                )
              })}
            </Stack>
          )}
        </Box>

        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
          <Typography sx={{ fontWeight: 900, mb: 1 }}>
            보유 물품
          </Typography>
          {Object.keys(displayInventory).length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              표시할 보유 물품이 없습니다.
            </Typography>
          ) : (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(displayInventory).map(([id, amount]) => (
                <Chip key={id} label={`${id} ${Number(amount)}`} />
              ))}
            </Stack>
          )}
        </Box>
      </GameStage>
    </Box>
  )
}
