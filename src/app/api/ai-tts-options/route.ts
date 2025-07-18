import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { apiKey } = await req.json();
  if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 400 });
  try {
    // Fetch models
    const modelRes = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const modelData = await modelRes.json();
    // Filter TTS models
    const ttsModels = (modelData.data || []).filter((m: any) => m.id.startsWith('tts-') || m.id.startsWith('gpt-4o-mini-tts'));
    // Fetch voices
    const voicesRes = await fetch('https://api.openai.com/v1/voices', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const voicesData = await voicesRes.json();
    return NextResponse.json({
      models: ttsModels.map((m: any) => ({ id: m.id, object: m.object })),
      voices: voicesData.data || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 