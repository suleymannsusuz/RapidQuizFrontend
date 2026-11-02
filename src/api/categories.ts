import { http } from './client'
import type { Category } from './types'

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await http.get<Category[]>('/categories/')
  return data
}
