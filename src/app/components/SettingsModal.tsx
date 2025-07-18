'use client';
import React, { useState, useEffect } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import LanguageIcon from '@mui/icons-material/Language';

const TTS_MODELS = [
  { id: 'tts-1', label: 'tts-1' },
  { id: 'tts-1-hd', label: 'tts-1-hd' },
  { id: 'gpt-4o-mini-tts', label: 'gpt-4o-mini-tts' },
];
const TTS_VOICES = [
  { id: 'alloy', label: 'Alloy' },
  { id: 'echo', label: 'Echo' },
  { id: 'fable', label: 'Fable' },
  { id: 'onyx', label: 'Onyx' },
  { id: 'nova', label: 'Nova' },
  { id: 'shimmer', label: 'Shimmer' },
  { id: 'coral', label: 'Coral' },
];
const STT_MODELS = [
  { id: 'whisper-1', label: 'whisper-1' },
  { id: 'gpt-4o', label: 'gpt-4o' },
];
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'th', label: 'ไทย' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
];

export default function SettingsModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [tab, setTab] = useState<'tts' | 'stt'>('tts');
  // TTS
  const [apiKey, setApiKey] = useState('');
  const [voice, setVoice] = useState('alloy');
  const [model, setModel] = useState('tts-1');
  const [language, setLanguage] = useState('en');
  const [instructions, setInstructions] = useState('');
  // STT
  const [sttModel, setSttModel] = useState('whisper-1');
  const [sttLanguage, setSttLanguage] = useState('en');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setApiKey(localStorage.getItem('openai_api_key') || '');
      setVoice(localStorage.getItem('openai_voice') || 'alloy');
      setModel(localStorage.getItem('openai_model') || 'tts-1');
      setLanguage(localStorage.getItem('openai_language') || 'en');
      setInstructions(localStorage.getItem('openai_instructions') || '');
      setSttModel(localStorage.getItem('openai_stt_model') || 'whisper-1');
      setSttLanguage(localStorage.getItem('openai_stt_language') || 'en');
    }
  }, [open]);

  const handleSave = () => {
    localStorage.setItem('openai_api_key', apiKey);
    localStorage.setItem('openai_voice', voice);
    localStorage.setItem('openai_model', model);
    localStorage.setItem('openai_language', language);
    localStorage.setItem('openai_instructions', instructions);
    localStorage.setItem('openai_stt_model', sttModel);
    localStorage.setItem('openai_stt_language', sttLanguage);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="w-full max-w-lg p-8 rounded-2xl shadow-xl border relative animate-fade-in"
        style={{
          background: 'var(--sidebar)',
          border: '1px solid var(--sidebar-border)',
          color: 'var(--foreground)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-xl p-1 transition"
          style={{ color: 'var(--icon-muted)' }}
          title="Close"
          onMouseOver={e => (e.currentTarget.style.color = 'var(--icon)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--icon-muted)')}
        >
          ×
        </button>
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon style={{ fontSize: 32, color: 'var(--icon)' }} />
          <h2 className="text-2xl font-bold tracking-tight">AI Voice Settings</h2>
        </div>
        <div className="flex gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${tab === 'tts' ? 'bg-[var(--sidebar-active)] text-[var(--icon)]' : 'bg-transparent text-[var(--icon-muted)]'}`}
            onClick={() => setTab('tts')}
          >
            TTS
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${tab === 'stt' ? 'bg-[var(--sidebar-active)] text-[var(--icon)]' : 'bg-transparent text-[var(--icon-muted)]'}`}
            onClick={() => setTab('stt')}
          >
            STT
          </button>
        </div>
        {tab === 'tts' ? (
          <div className="space-y-6">
            <div>
              <label className="block mb-2 font-medium flex items-center gap-2">
                <VpnKeyIcon style={{ fontSize: 20, color: 'var(--icon-muted)' }} />
                OpenAI API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                style={{
                  background: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--input-border)',
                }}
                placeholder="sk-..."
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium flex items-center gap-2">
                <RecordVoiceOverIcon style={{ fontSize: 20, color: 'var(--icon-muted)' }} />
                Model
              </label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                style={{
                  background: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--input-border)',
                }}
              >
                {TTS_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-2 font-medium flex items-center gap-2">
                <RecordVoiceOverIcon style={{ fontSize: 20, color: 'var(--icon-muted)' }} />
                Voice
              </label>
              <select
                value={voice}
                onChange={e => setVoice(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                style={{
                  background: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--input-border)',
                }}
              >
                {TTS_VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-2 font-medium flex items-center gap-2">
                <LanguageIcon style={{ fontSize: 20, color: 'var(--icon-muted)' }} />
                Language
              </label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                style={{
                  background: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--input-border)',
                }}
              >
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-2 font-medium">Instructions (Prompt for tone)</label>
              <input
                type="text"
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                style={{
                  background: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--input-border)',
                }}
                placeholder="e.g. Speak in a cheerful and positive tone."
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block mb-2 font-medium flex items-center gap-2">
                <RecordVoiceOverIcon style={{ fontSize: 20, color: 'var(--icon-muted)' }} />
                STT Model
              </label>
              <select
                value={sttModel}
                onChange={e => setSttModel(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                style={{
                  background: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--input-border)',
                }}
              >
                {STT_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-2 font-medium flex items-center gap-2">
                <LanguageIcon style={{ fontSize: 20, color: 'var(--icon-muted)' }} />
                Language
              </label>
              <select
                value={sttLanguage}
                onChange={e => setSttLanguage(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                style={{
                  background: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--input-border)',
                }}
              >
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSave}
            className="font-semibold px-8 py-2 rounded-lg shadow transition"
            style={{
              background: 'var(--icon)',
              color: 'var(--background)',
              border: '1px solid var(--sidebar-border)',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            Save
          </button>
          {saved && <span className="ml-4 text-green-600 font-medium self-center">Saved!</span>}
        </div>
      </div>
    </div>
  );
} 