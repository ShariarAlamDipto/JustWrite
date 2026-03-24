import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';

interface VoiceEntry {
  id: string;
  title: string;
  audio_url?: string;
  audio_duration?: number;
  transcript?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function VoiceEntriesPage() {
  const { user, loading: authLoading, token } = useAuth();
  const [entries, setEntries] = useState<VoiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [transcribingId, setTranscribingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadEntries = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/voice-entries', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setEntries(json.voiceEntries || []);
      }
    } catch (err) {
      console.error('Failed to load voice entries:', err);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (user && token) loadEntries();
  }, [user, token, loadEntries]);

  useEffect(() => {
    if (!authLoading && !user) setLoading(false);
  }, [authLoading, user]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.start(1000);
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      alert('Could not access microphone. Please grant permission.');
    }
  };

  const stopRecording = (): Promise<Blob | null> => {
    if (!mediaRecorderRef.current) return Promise.resolve(null);
    return new Promise((resolve) => {
      mediaRecorderRef.current!.onstop = () => {
        resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
      };
      mediaRecorderRef.current!.stop();
      mediaRecorderRef.current!.stream.getTracks().forEach(t => t.stop());
    });
  };

  const cancelRecording = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
    }
    setRecording(false);
    setRecordingTime(0);
  };

  const saveRecording = async () => {
    if (!token || !user) return;
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const audioBlob = await stopRecording();
    if (!audioBlob || audioBlob.size === 0) { alert('No audio recorded'); return; }

    const title = prompt('Title for your voice note:', `Voice Note ${new Date().toLocaleDateString()}`);
    if (!title) return;

    setUploading(true);
    try {
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(audioBlob);
      });

      const res = await fetch('/api/voice-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title,
          audio_duration: recordingTime,
          metadata: { format: 'webm', recorded_on: 'web', audio_data: base64Audio },
        }),
      });

      if (!res.ok) throw new Error('Save failed');
      const json = await res.json();
      const saved: VoiceEntry = json.voiceEntry;
      setEntries(prev => [saved, ...prev]);
      setUploading(false);

      // Auto-transcribe immediately (don't block UI)
      transcribeEntry(saved.id, audioBlob);
    } catch {
      setUploading(false);
      alert('Failed to save recording.');
    }
  };

  const transcribeEntry = async (entryId: string, blob?: Blob) => {
    if (!token) return;

    // Reconstruct blob from stored base64 if not passed directly
    let audioBlob = blob;
    if (!audioBlob) {
      const entry = entries.find(e => e.id === entryId);
      const b64 = entry?.metadata?.audio_data as string | undefined;
      if (!b64) return;
      const byteString = atob(b64.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      audioBlob = new Blob([ab], { type: 'audio/webm' });
    }

    setTranscribingId(entryId);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      const tRes = await fetch('/api/voice-entries/transcribe', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!tRes.ok) throw new Error('Transcription failed');
      const { transcript } = await tRes.json();

      const pRes = await fetch('/api/voice-entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: entryId, transcript }),
      });
      if (pRes.ok) {
        const patched = await pRes.json();
        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, ...patched.voiceEntry } : e));
        setExpandedId(entryId);
      }
    } catch { /* transcription failure is silent — user can retry */ }
    finally { setTranscribingId(null); }
  };

  const playAudio = (entry: VoiceEntry) => {
    const src = entry.metadata?.audio_data as string | undefined;
    if (!src) return;
    if (currentPlaying === entry.id) {
      audioRef.current?.pause();
      setCurrentPlaying(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.onended = () => setCurrentPlaying(null);
    audio.play();
    setCurrentPlaying(entry.id);
  };

  const deleteEntry = async (id: string) => {
    if (!token || !confirm('Delete this voice entry?')) return;
    try {
      const res = await fetch(`/api/voice-entries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) setEntries(prev => prev.filter(e => e.id !== id));
    } catch { /* ignore */ }
  };

  if (authLoading) return null;

  if (!user) {
    return (
      <>
        <Nav />
        <main className="container" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Voice Entries</h2>
          <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>Please sign in to access voice entries.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="container" style={{ padding: '2rem 1rem 4rem', maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>Voice Entries</h1>

        {/* Recording Control */}
        <div style={{
          padding: '1.5rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          textAlign: 'center',
          marginBottom: '1.5rem',
        }}>
          {recording && (
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff4444', display: 'inline-block', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ff4444' }}>
                {formatTime(recordingTime)}
              </span>
            </div>
          )}

          {uploading ? (
            <div style={{ padding: '1rem', color: 'var(--muted)' }}>Saving...</div>
          ) : recording ? (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={saveRecording} className="btn btn-primary">✓ Save</button>
              <button onClick={cancelRecording} className="btn">✕ Cancel</button>
            </div>
          ) : (
            <>
              <button
                onClick={startRecording}
                aria-label="Start recording"
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'var(--accent)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                  boxShadow: '0 0 24px rgba(0,255,213,0.35)',
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="black">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
              <p style={{ marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.875rem' }}>Tap to record</p>
            </>
          )}
        </div>

        {/* Entries List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : entries.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '3rem 1.5rem',
            background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border)', color: 'var(--muted)',
          }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.3 }}>
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
            <p style={{ marginTop: '1rem' }}>No voice entries yet</p>
            <p style={{ fontSize: '0.875rem' }}>Tap the microphone to start</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {entries.map(entry => {
              const isExpanded = expandedId === entry.id;
              const isTranscribing = transcribingId === entry.id;
              return (
                <div
                  key={entry.id}
                  style={{
                    padding: '1.25rem',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Play button */}
                    <button
                      onClick={() => playAudio(entry)}
                      disabled={!entry.metadata?.audio_data}
                      aria-label={currentPlaying === entry.id ? 'Pause' : 'Play'}
                      style={{
                        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                        background: currentPlaying === entry.id ? 'var(--accent)' : 'var(--border)',
                        border: 'none',
                        cursor: entry.metadata?.audio_data ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {currentPlaying === entry.id
                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="black"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--fg)"><path d="M8 5v14l11-7z"/></svg>
                      }
                    </button>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.title}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', display: 'flex', gap: '0.875rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span>⏱ {entry.audio_duration ? formatTime(entry.audio_duration) : '0:00'}</span>
                        <span>📅 {formatDate(entry.created_at)}</span>
                        {entry.transcript && (
                          <span
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            style={{ cursor: 'pointer', color: 'var(--accent)', userSelect: 'none' }}
                          >
                            {isExpanded ? '▲ hide' : '▼ transcript'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, alignItems: 'center' }}>
                      {isTranscribing && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', padding: '0 0.5rem' }}>
                          Transcribing…
                        </span>
                      )}
                      {!entry.transcript && !isTranscribing && entry.metadata?.audio_data && (
                        <button
                          onClick={() => transcribeEntry(entry.id)}
                          title="Generate transcript"
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            color: 'var(--accent)',
                          }}
                        >
                          Transcribe
                        </button>
                      )}
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        aria-label="Delete"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.4rem', color: 'var(--muted)' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Transcript panel */}
                  {isExpanded && entry.transcript && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.875rem 1rem',
                      background: 'var(--bg)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      fontSize: '0.9rem',
                      lineHeight: 1.65,
                    }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                        Transcript
                      </div>
                      {entry.transcript}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}
