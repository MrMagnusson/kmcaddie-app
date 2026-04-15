import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const GCA_KEY = process.env.GOLF_COURSE_API_KEY ?? '';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const key = searchParams.get('key') ?? GCA_KEY;

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
  }
  if (!key) {
    return NextResponse.json({ error: 'No GolfCourse API key configured.' }, { status: 400 });
  }

  try {
    const url = `https://api.golfcourseapi.com/v1/courses/nearby?latitude=${lat}&longitude=${lon}&distance_km=80&key=${key}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'KMCaddie/1.0' } });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: `GolfCourseAPI error ${res.status}`, detail: data }, { status: res.status });
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
