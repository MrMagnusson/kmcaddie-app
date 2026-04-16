import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const GCA_KEY = process.env.GOLF_COURSE_API_KEY ?? '';

export interface GCAHoleTee {
  tee_name?: string;
  tee_color?: string;
  distance?: number;       // yards
  distance_meters?: number;
}

export interface GCAHole {
  hole_number: number;
  par: number;
  handicap?: number;
  tees?: GCAHoleTee[];
}

export interface GCACourseDetail {
  id: string;
  club_name?: string;
  course_name?: string;
  city?: string;
  state?: string;
  country?: string;
  holes?: GCAHole[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const key = searchParams.get('key') ?? GCA_KEY;

  if (!id) {
    return NextResponse.json({ error: 'Missing course id' }, { status: 400 });
  }
  if (!key) {
    return NextResponse.json({ error: 'No GolfCourse API key configured.' }, { status: 400 });
  }

  try {
    const url = `https://api.golfcourseapi.com/v1/courses/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Key ${key}`, 'User-Agent': 'KMCaddie/1.0' },
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: `GolfCourseAPI error ${res.status}`, detail: data }, { status: res.status });
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=86400' }, // cache 24h, course data rarely changes
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
