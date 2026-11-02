const API = process.env.E2E_API_URL ?? 'http://localhost:8000/api/v1'

/** Testler gerçek backend ister; çalışmıyorsa anlaşılır bir mesajla dur. */
export default async function globalSetup() {
  let categories: unknown
  try {
    const health = await fetch(`${API}/health/`)
    if (!health.ok) throw new Error(`sağlık kontrolü ${health.status} döndü`)
    categories = await (await fetch(`${API}/categories/`)).json()
  } catch (error) {
    throw new Error(
      `Backend'e ulaşılamadı (${API}): ${String(error)}\n` +
        'RapidQuizBackend klasöründe "docker compose up -d" çalıştırıp ' +
        '"docker compose exec web python manage.py migrate && ' +
        'docker compose exec web python manage.py load_questions" komutlarını uygula.',
      { cause: error },
    )
  }
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error('Backend çalışıyor ama kategori yok: "load_questions" komutunu çalıştır.')
  }
}
