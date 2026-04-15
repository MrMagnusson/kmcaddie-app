import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const GCA_KEY = process.env.GOLF_COURSE_API_KEY ?? '';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const key = searchParams.get('key') ?? GCA_KEY;

  if (!q.trim()) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }
  if (!key) {
    return NextResponse.json({ error: 'No GolfCourse API key configured. Add GOLF_COURSE_API_KEY to .env.local or enter it in app Settings.' }, { status: 400 });
  }

  try {
    const url = `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(q)}&key=${key}`;
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
