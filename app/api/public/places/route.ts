import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input')
  if (!input) return NextResponse.json({ predictions: [] })

  const key = process.env.GOOGLE_MAPS_KEY
  if (!key) {
    // No key configured — return empty, client falls back to manual input
    return NextResponse.json({ predictions: [], hint: 'GOOGLE_MAPS_KEY not set' })
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&language=vi&components=country:vn&types=address&key=${key}`
    const res = await fetch(url)
    const data = await res.json()
    return NextResponse.json({ predictions: data.predictions || [] })
  } catch (e) {
    return NextResponse.json({ predictions: [], error: String(e) })
  }
}
