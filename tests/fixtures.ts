import type {
  AnswerResponse,
  Category,
  LeaderboardResponse,
  QuestionResponse,
  ResultResponse,
  ScoreRow,
  ScoreSubmitted,
  SessionCreated,
} from '@/api/types'

export function makeSession(overrides: Partial<SessionCreated> = {}): SessionCreated {
  return {
    session_id: '8f0c2a7e-1b2c-4d3e-8f90-123456789abc',
    session_token: 'gizli-anahtar',
    category: { slug: 'yazilim', name: 'Yazılım' },
    total_questions: 20,
    time_limit_ms: 5000,
    ...overrides,
  }
}

export function makeQuestion(
  position = 0,
  overrides: Partial<QuestionResponse> = {},
): QuestionResponse {
  return {
    position,
    total_questions: 20,
    question: { id: 100 + position, text: `Soru ${position + 1}?` },
    choices: [
      { id: 1, text: 'Birinci şık' },
      { id: 2, text: 'İkinci şık' },
      { id: 3, text: 'Üçüncü şık' },
      { id: 4, text: 'Dördüncü şık' },
    ],
    time_limit_ms: 5000,
    remaining_ms: 5000,
    current_score: 0,
    ...overrides,
  }
}

export function makeAnswer(overrides: Partial<AnswerResponse> = {}): AnswerResponse {
  return {
    is_correct: true,
    correct_choice_id: 2,
    points: 130,
    total_score: 130,
    timed_out: false,
    is_last: false,
    ...overrides,
  }
}

export function makeResult(overrides: Partial<ResultResponse> = {}): ResultResponse {
  return {
    status: 'finished',
    category: { slug: 'yazilim', name: 'Yazılım' },
    total_questions: 20,
    total_score: 2310,
    correct_count: 17,
    total_response_ms: 63_400,
    ...overrides,
  }
}

export function makeRow(rank: number, overrides: Partial<ScoreRow> = {}): ScoreRow {
  return {
    rank,
    player_name: `Oyuncu ${rank}`,
    score: 3000 - rank * 100,
    correct_count: 20 - rank,
    created_at: '2026-11-02T12:00:00Z',
    ...overrides,
  }
}

export function makeBoard(
  rows: ScoreRow[] = [],
  slug = 'yazilim',
  name = 'Yazılım',
): LeaderboardResponse {
  return { category: { slug, name }, leaderboard: rows }
}

export function makeSubmitted(overrides: Partial<ScoreSubmitted> = {}): ScoreSubmitted {
  return {
    rank: 2,
    in_top_10: true,
    score: 2310,
    leaderboard: [],
    ...overrides,
  }
}

export const categories: Category[] = [
  { slug: 'yazilim', name: 'Yazılım', description: 'Kod', color: '#3B82F6', icon: 'code' },
  { slug: 'fizik', name: 'Fizik', description: 'Enerji', color: '#EC4899', icon: 'atom' },
]
