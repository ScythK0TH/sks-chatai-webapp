import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { text, voice, apiKey, model, instructions } = await req.json();
  if (!text || !apiKey) {
    return NextResponse.json({ error: 'Missing text or API key' }, { status: 400 });
  }
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'tts-1',
        input: text,
        voice: voice || 'alloy',
        instructions: instructions || undefined,
        response_format: 'mp3',
      }),
    });
    if (!response.ok) {
      return NextResponse.json({ error: await response.text() }, { status: 500 });
    }
    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 