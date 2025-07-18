import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const N8N_FILE_WEBHOOK_URL = process.env.N8N_FILE_WEBHOOK_URL;
  if (!N8N_FILE_WEBHOOK_URL) {
    return NextResponse.json({ error: 'N8N_FILE_WEBHOOK_URL not set in env' }, { status: 500 });
  }
  try {
    const formData = await req.formData();
    // Forward the formData to n8n webhook
    const n8nRes = await fetch(N8N_FILE_WEBHOOK_URL, {
      method: 'POST',
      body: formData,
    });
    if (!n8nRes.ok) {
      const text = await n8nRes.text();
      return NextResponse.json({ error: `n8n error: ${n8nRes.status} - ${text}` }, { status: 500 });
    }
    // Try to parse as JSON, fallback to text
    let data;
    const contentType = n8nRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await n8nRes.json();
    } else {
      data = { reply: await n8nRes.text() };
    }
    console.log('n8n response:', data);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 