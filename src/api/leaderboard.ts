import { http } from './client'
import type { LeaderboardResponse } from './types'

export async function fetchLeaderboard(category: string): Promise<LeaderboardResponse> {
  const { data } = await http.get<LeaderboardResponse>('/leaderboard/', { params: { category } })
  return data
}
