import { NextRequest, NextResponse } from 'next/server';

const N8N_URL = process.env.N8N_URL || 'https://n8n.[your domain].com/webhook/[your webhook URL]';
const N8N_BEARER_TOKEN = process.env.N8N_BEARER_TOKEN || '...';
const N8N_INPUT_FIELD = 'chatInput';
const N8N_RESPONSE_FIELD = 'output';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received request body:', body);
    console.log('N8N URL:', N8N_URL);
    const { message, sessionId } = body;
    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }
    const payload: any = { sessionId };
    payload[N8N_INPUT_FIELD] = message;

    const n8nRes = await fetch(N8N_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${N8N_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!n8nRes.ok) {
      const text = await n8nRes.text();
      return NextResponse.json({ error: `N8N error: ${n8nRes.status} - ${text}` }, { status: 500 });
    }

    const data = await n8nRes.json();
    return NextResponse.json({ reply: data[N8N_RESPONSE_FIELD] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 