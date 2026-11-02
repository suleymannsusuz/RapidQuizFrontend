// API tipleri backend'in OpenAPI şemasından üretilen schema.d.ts'ten gelir (npm run gen:api).
// Şemayı elle değiştirme; backend değişince yeniden üret.
import type { components } from './schema'

type Schemas = components['schemas']

export type Category = Schemas['Category']
export type CategoryRef = Schemas['CategoryRef']
export type Platform = Schemas['PlatformEnum']
export type SessionStatus = Schemas['StatusEnum']

export type SessionCreateRequest = Omit<Schemas['SessionCreateRequest'], 'platform'> & {
  platform?: Platform
}
export type SessionCreated = Schemas['SessionCreated']

export type QuestionResponse = Schemas['QuestionResponse']
export type Choice = Schemas['ChoiceRef']

export type AnswerRequest = Schemas['AnswerRequest']
export type AnswerResponse = Schemas['AnswerResponse']

export type ResultResponse = Schemas['ResultResponse']

export type ScoreSubmitRequest = Schemas['ScoreSubmitRequest']
export type ScoreSubmitted = Schemas['ScoreSubmitted']
export type ScoreRow = Schemas['ScoreRow']
export type LeaderboardResponse = Schemas['LeaderboardResponse']

/** Backend'in tüm hatalarda döndüğü tek tip gövde. */
export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details: Record<string, unknown>
  }
}
