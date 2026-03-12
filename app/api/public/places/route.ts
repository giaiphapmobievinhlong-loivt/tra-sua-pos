export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input')
  if (!input || input.length < 3) return NextResponse.json({ predictions: [] })

  const key = (process.env.GOONG_API_KEY || '').trim()
  if (!key) return NextResponse.json({ predictions: [], error: 'GOONG_API_KEY not set' })

  try {
    const url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${key}&input=${encodeURIComponent(input)}`
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()

    const predictions = (data.predictions || []).map((p: {
      description: string
      place_id: string
      structured_formatting?: { main_text: string; secondary_text: string }
    }) => ({
      description: p.description,
      place_id: p.place_id,
      main_text: p.structured_formatting?.main_text || p.description,
      secondary_text: p.structured_formatting?.secondary_text || '',
    }))

    return NextResponse.json({ predictions })
  } catch (e) {
    return NextResponse.json({ predictions: [], error: String(e) })
  }
}
