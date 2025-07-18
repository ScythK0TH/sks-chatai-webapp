import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const apiKey = formData.get('apiKey') as string;
  const language = formData.get('language') as string;
  const model = (formData.get('model') as string) || 'whisper-1';
  if (!file || !apiKey) {
    return NextResponse.json({ error: 'Missing file or API key' }, { status: 400 });
  }
  try {
    const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: (() => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('model', model);
        if (language) fd.append('language', language);
        return fd;
      })(),
    });
    if (!openaiRes.ok) {
      return NextResponse.json({ error: await openaiRes.text() }, { status: 500 });
    }
    const data = await openaiRes.json();
    return NextResponse.json({ text: data.text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 