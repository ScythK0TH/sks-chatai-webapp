'use client';
import React, { useRef, useState, useEffect } from 'react';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import EditIcon from '@mui/icons-material/Edit';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import SettingsModal from './components/SettingsModal';

const WEBHOOK_URL = '/api/n8n-pipe'; // เปลี่ยนจาก URL เดิม

const newSession = () => ({
  id: Date.now().toString(),
  title: 'New Chat',
  messages: [
    { sender: 'bot', text: 'Welcome to AI Chat!' },
  ],
});

function loadSessions() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('chat_sessions') || '[]');
  } catch {
    return [];
  }
}
function saveSessions(sessions: any[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('chat_sessions', JSON.stringify(sessions));
}

const ChatPage = () => {
  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(preferred);
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme, mounted]);

  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentId, setCurrentId] = useState<string>('');
  const [input, setInput] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const voiceTimeoutRef = useRef<any>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const voiceModeRef = useRef(voiceMode);
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  // Load sessions on mount
  useEffect(() => {
    const loaded = loadSessions();
    if (loaded.length === 0) {
      const s = newSession();
      setSessions([s]);
      setCurrentId(s.id);
      saveSessions([s]);
    } else {
      setSessions(loaded);
      setCurrentId(loaded[0].id);
    }
  }, []);
  useEffect(() => { saveSessions(sessions); }, [sessions]);

  const currentSession = sessions.find((s) => s.id === currentId);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages.length]);

  const setCurrentSession = (updater: (s: any) => any) => {
    setSessions((prev) => prev.map((s) => (s.id === currentId ? updater(s) : s)));
  };

  // --- Webhook send function ---
  const sendToWebhook = async (payload: any, isFile = false) => {
    try {
      if (isFile) {
        // n8n pipe ไม่รองรับ file upload
        return { reply: 'File upload not supported in n8n pipe.' };
      } else {
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: payload.message || payload.input,
            sessionId: currentId,
          }),
        });
        if (!response.ok) throw new Error('Webhook error');
        const data = await response.json();
        return data;
      }
    } catch (e) {
      return { reply: 'เกิดข้อผิดพลาดในการเชื่อมต่อ n8n.' };
    }
  };

  // --- Text message send ---
  const handleSend = async () => {
    if (!input.trim() || !currentSession) return;
    setCurrentSession((s: any) => ({
      ...s,
      messages: [...s.messages, { sender: 'user', text: input }],
    }));
    setInput('');
    setIsResponding(true); // เริ่มตอบกลับ
    const res = await sendToWebhook({ message: input });
    setCurrentSession((s: any) => ({
      ...s,
      messages: [...s.messages, { sender: 'bot', text: res.reply }],
    }));
    setIsResponding(false); // ตอบกลับเสร็จ
    if (voiceMode) speakText(res.reply);
  };

  // --- File upload ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSession) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await sendToWebhook(formData, true);
    setCurrentSession((s: any) => ({
      ...s,
      messages: [
        ...s.messages,
        { sender: 'user', text: `📎 Sent file: ${file.name}` },
        { sender: 'bot', text: res.reply },
      ],
    }));
    setUploading(false);
    if (voiceMode) speakText(res.reply);
  };

  // --- Voice mode toggle ---
  const handleVoiceToggle = () => {
    if (voiceMode) {
      setVoiceMode(false);
      setListening(false);
      setSpeaking(false);
      if (recognitionRef.current) recognitionRef.current.abort();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    } else {
      setVoiceMode(true);
    }
  };

  // --- Text-to-Speech (TTS) ---
  const speakText = async (text: string) => {
    const apiKey = localStorage.getItem('openai_api_key') || '';
    const voice = localStorage.getItem('openai_voice') || 'alloy';
    const model = localStorage.getItem('openai_model') || 'tts-1';
    const instructions = localStorage.getItem('openai_instructions') || '';
    if (!apiKey) return alert('Please set your OpenAI API Key in Settings.');
    setSpeaking(true);
    try {
      const res = await fetch('/api/ai-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, apiKey, model, instructions }),
      });
      if (!res.ok) throw new Error('TTS error');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
        // ใช้ ref เช็ค voiceMode ปัจจุบัน
        if (voiceModeRef.current) {
          voiceTimeoutRef.current = setTimeout(() => { if (voiceModeRef.current) startListening(); }, 500);
        }
      };
      audio.play();
    } catch {
      setSpeaking(false);
      alert('TTS failed.');
    }
  };

  // --- Speech-to-Text (STT) ---
  const startListening = () => {
    if (!voiceMode || listening) return;
    const apiKey = localStorage.getItem('openai_api_key') || '';
    const language = localStorage.getItem('openai_stt_language') || 'en';
    const sttModel = localStorage.getItem('openai_stt_model') || 'whisper-1';
    if (!apiKey) {
      alert('Please set your OpenAI API Key in Settings.');
      return;
    }
    if (!('MediaRecorder' in window)) {
      alert('MediaRecorder not supported in this browser.');
      return;
    }
    const chunks: BlobPart[] = [];
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('apiKey', apiKey);
        formData.append('language', language);
        formData.append('model', sttModel);
        setListening(false);
        try {
          const res = await fetch('/api/ai-stt', { method: 'POST', body: formData });
          if (!res.ok) throw new Error('STT error');
          const data = await res.json();
          if (data.text) {
            setCurrentSession((s: any) => ({
              ...s,
              messages: [...s.messages, { sender: 'user', text: data.text }],
            }));
            const reply = await sendToWebhook({ message: data.text });
            setCurrentSession((s: any) => ({
              ...s,
              messages: [...s.messages, { sender: 'bot', text: reply.reply }],
            }));
            speakText(reply.reply);
          }
        } catch (err) {
          setListening(false);
          alert('STT failed. กรุณาตรวจสอบไมโครโฟนและ API Key');
        }
      };
      setListening(true);
      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 6000); // จำกัดเวลาอัด 6 วินาที
    }).catch(() => {
      setListening(false);
      alert('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้งานไมค์');
    });
  };

  // --- Voice mode effect ---
  useEffect(() => {
    if (voiceMode && !listening && !speaking) {
      startListening();
    }
    if (!voiceMode) {
      // หยุด MediaRecorder และปิด stream ทันที
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      setListening(false); // หยุดฟังทันทีเมื่อปิด voiceMode
      setSpeaking(false);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    }
  }, [voiceMode]);

  // --- Sidebar actions ---
  const handleNewChat = () => {
    const s = newSession();
    setSessions((prev) => [s, ...prev]);
    setCurrentId(s.id);
  };
  const handleSelectSession = (id: string) => setCurrentId(id);
  const handleDeleteSession = (id: string) => {
    let idx = sessions.findIndex((s) => s.id === id);
    let newSessions = sessions.filter((s) => s.id !== id);
    setSessions(newSessions);
    if (id === currentId && newSessions.length > 0) {
      setCurrentId(newSessions[Math.max(0, idx - 1)].id);
    } else if (newSessions.length === 0) {
      const s = newSession();
      setSessions([s]);
      setCurrentId(s.id);
    }
  };

  // --- Copy to clipboard ---
  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1200);
  };

  // --- Read aloud (TTS) for bubble ---
  const handleReadAloud = async (text: string) => {
    const apiKey = localStorage.getItem('openai_api_key') || '';
    if (apiKey) {
      try {
        await speakText(text);
        return;
      } catch (e) {
        // ถ้าเกิด error ให้ fallback
      }
    }
    // fallback: ใช้ Web Speech API
    if ('speechSynthesis' in window) {
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = localStorage.getItem('openai_language') || 'th-TH';
      window.speechSynthesis.speak(utter);
    } else {
      alert('Text-to-Speech not supported in this browser.');
    }
  };

  if (!mounted) return null;
  return (
    <div style={{ background: 'var(--background)', color: 'var(--foreground)' }} className="flex h-screen font-sans">
      {/* Sidebar */}
      <aside style={{ background: 'var(--sidebar)', borderRight: `1px solid var(--sidebar-border)` }} className="w-72 flex flex-col shadow-sm">
        <div style={{ borderBottom: '1px solid var(--sidebar-border)' }} className="p-6 flex items-center gap-3">
          <span style={{ color: 'var(--foreground)' }} className="font-bold text-xl tracking-wide">Velura AI</span>
          <button onClick={handleNewChat} title="New chat" style={{ background: 'var(--sidebar-active)' }} className="ml-auto rounded-lg p-2 hover:opacity-80 transition-colors">
            <AddIcon style={{ color: 'var(--icon)' }} />
          </button>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme" style={{ background: 'var(--sidebar-active)' }} className="rounded-lg p-2 ml-2 hover:opacity-80 transition-colors">
            {theme === 'light' ? <Brightness4Icon style={{ color: 'var(--icon)' }} /> : <Brightness7Icon style={{ color: 'var(--icon)' }} />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              style={{ background: s.id === currentId ? 'var(--sidebar-active)' : undefined, color: 'var(--foreground)' }}
              className={`flex items-center rounded-lg mb-1 px-3 py-2 cursor-pointer transition-colors ${s.id === currentId ? 'font-semibold' : 'hover:opacity-80'}`}
              onClick={() => handleSelectSession(s.id)}
            >
              <span className="flex-1 truncate text-base">{s.title}</span>
              <button
                onClick={e => { e.stopPropagation(); handleDeleteSession(s.id); }}
                className="ml-2 p-1 rounded hover:opacity-80"
              >
                <DeleteIcon style={{ color: 'var(--icon-muted)' }} fontSize="small" />
              </button>
            </div>
          ))}
        </div>
        <div style={{ color: 'var(--icon-muted)' }} className="p-4 text-xs text-center">
          <div className="mb-2">
            <button
              style={{ background: 'var(--sidebar-active)', color: 'var(--icon)', border: '1px solid var(--sidebar-border)' }}
              className="w-full px-4 py-2 rounded-lg shadow hover:opacity-80 transition-colors"
              onClick={() => setShowSettings(true)}
            >
              Settings
            </button>
          </div>
          Powered by Velura™
        </div>
      </aside>
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative">
        {/* Chat messages */}
        <div
          className="flex-1 overflow-y-auto px-0 sm:px-0 md:px-0 py-10 md:py-14 flex flex-col gap-4 md:gap-6 custom-scrollbar"
          style={{
            minHeight: 0,
            maxHeight: 'calc(100vh - 96px)', // ปรับ 96px ตามความสูงของ input bar + padding
            overflowY: 'auto'
          }}
        >
          <div className="max-w-2xl w-full mx-auto flex flex-col gap-4 md:gap-6 px-2 sm:px-4 md:px-0">
            {currentSession?.messages.map((msg: any, i: number) => (
              <div key={i} className={`group flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-end`}>
                <span
                  className={`relative inline-block rounded-2xl px-5 py-3 max-w-[80%] md:max-w-[70%] break-words text-base md:text-lg shadow-sm border group ${msg.sender === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}`}
                  style={{
                    background: msg.sender === 'user' ? 'var(--bubble-user)' : 'var(--bubble-bot)',
                    color: 'var(--foreground)',
                    border: `1px solid var(--bubble-border)`
                  }}
                >
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                  <span className={`absolute ${msg.sender === 'user' ? 'right-3' : 'left-3'} -bottom-9 flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <button onClick={() => handleCopy(msg.text, i)} className="p-1 rounded hover:opacity-80" title="Copy">
                      <ContentCopyIcon style={{ color: 'var(--icon-muted)', fontSize: 18 }} fontSize="small" />
                    </button>
                    {msg.sender === 'user' ? (
                      <button className="p-1 rounded hover:opacity-80" title="Edit">
                        <EditIcon style={{ color: 'var(--icon-muted)', fontSize: 18 }} fontSize="small" />
                      </button>
                    ) : (
                      <button onClick={() => handleReadAloud(msg.text)} className="p-1 rounded hover:opacity-80" title="Read aloud">
                        <VolumeUpIcon style={{ color: 'var(--icon-muted)', fontSize: 18 }} fontSize="small" />
                      </button>
                    )}
                    {copiedIdx === i && (
                      <span style={{ background: 'var(--bubble-user)', color: 'var(--icon)' }} className="ml-2 text-xs px-2 py-1 rounded shadow">Copied!</span>
                    )}
                  </span>
                </span>
              </div>
            ))}
            {isResponding && (
              <div className="group flex justify-start items-end">
                <span
                  className="relative inline-block rounded-2xl px-5 py-3 max-w-[80%] md:max-w-[70%] break-words text-base md:text-lg shadow-sm border rounded-bl-md animate-pulse-gradient"
                  style={{
                    background: 'linear-gradient(90deg, var(--bubble-bot-left) 25%, var(--sidebar-active) 50%, var(--bubble-bot-right) 75%)',
                    backgroundSize: '200% 100%',
                    color: 'var(--foreground)',
                    border: `1px solid var(--bubble-border)`
                  }}
                >
                  <span className="opacity-70">Responding...</span>
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
            {listening && voiceMode && (
              <div style={{ color: 'var(--icon-muted)' }} className="text-center font-semibold">Listening...</div>
            )}
            {speaking && voiceMode && (
              <div style={{ color: 'var(--icon-muted)' }} className="text-center font-semibold">Speaking...</div>
            )}
          </div>
        </div>
        {/* Floating Input Bar */}
        <div style={{ background: 'var(--input-bg)', borderTop: '1px solid var(--input-border)' }} className="fixed left-72 right-0 bottom-0 shadow-lg px-4 md:px-12 py-4 flex gap-2 md:gap-4 items-center z-10">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Upload file"
            style={{ background: 'var(--sidebar-active)' }}
            className={`rounded-full p-2 ${uploading ? '' : 'hover:opacity-80'} transition-colors`}
          >
            <AttachFileIcon style={{ color: 'var(--icon)' }} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept="*"
          />
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={voiceMode ? 'Voice mode active...' : 'Type a message'}
            disabled={voiceMode}
            style={{ background: 'var(--input-bg)', color: 'var(--foreground)', border: '1px solid var(--input-border)' }}
            className="flex-1 px-5 py-3 rounded-2xl text-base md:text-lg outline-none focus:opacity-90 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || voiceMode}
            title="Send"
            style={{ background: 'var(--icon)', color: 'var(--background)' }}
            className={`rounded-full p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <SendRoundedIcon />
          </button>
          <button
            onClick={handleVoiceToggle}
            title={voiceMode ? 'Turn off voice mode' : 'Turn on voice mode'}
            style={{ background: 'var(--sidebar-active)' }}
            className={`rounded-full p-2 hover:opacity-80 transition-colors`}
          >
            {voiceMode ? <MicIcon style={{ color: 'var(--icon)' }} /> : <MicOffIcon style={{ color: 'var(--icon-muted)' }} />}
          </button>
        </div>
      </main>
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default ChatPage;
