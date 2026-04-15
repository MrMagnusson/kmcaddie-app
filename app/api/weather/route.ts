import { NextRequest, NextResponse } from 'next/server';
import { fetchWeather } from '@/lib/weather';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
  }

  try {
    const weather = await fetchWeather(lat, lon);
    return NextResponse.json(weather, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('Weather fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 });
  }
}
