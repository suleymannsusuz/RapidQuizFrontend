import { http } from './client'
import type {
  AnswerRequest,
  AnswerResponse,
  QuestionResponse,
  ResultResponse,
  ScoreSubmitRequest,
  ScoreSubmitted,
  SessionCreateRequest,
  SessionCreated,
} from './types'

// Oturum anahtarı `client.ts` içindeki interceptor ile her istekte başlığa eklenir.

export async function startSession(request: SessionCreateRequest): Promise<SessionCreated> {
  const { data } = await http.post<SessionCreated>('/sessions/', { platform: 'web', ...request })
  return data
}

export async function fetchQuestion(sessionId: string): Promise<QuestionResponse> {
  const { data } = await http.get<QuestionResponse>(`/sessions/${sessionId}/question/`)
  return data
}

export async function submitAnswer(
  sessionId: string,
  request: AnswerRequest,
): Promise<AnswerResponse> {
  const { data } = await http.post<AnswerResponse>(`/sessions/${sessionId}/answer/`, request)
  return data
}

export async function fetchResult(sessionId: string): Promise<ResultResponse> {
  const { data } = await http.get<ResultResponse>(`/sessions/${sessionId}/result/`)
  return data
}

export async function submitScore(
  sessionId: string,
  request: ScoreSubmitRequest,
): Promise<ScoreSubmitted> {
  const { data } = await http.post<ScoreSubmitted>(`/sessions/${sessionId}/score/`, request)
  return data
}
