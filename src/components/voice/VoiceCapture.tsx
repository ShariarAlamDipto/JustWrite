import React, { useState, useRef, useCallback, useEffect } from 'react'
import type { VoiceCaptureState } from '@/lib/jw-types'
import { formatDuration } from '@/lib/jw-utils'

interface VoiceCaptureProps {
  isDark: boolean
  /** Called with transcript text once processing finishes */
  onTranscript: (text: string, durationSec: number) => void
  /** Compact mic-button-only mode (used inside editors) */
  compact?: boolean
  className?: string
}

export default function VoiceCapture({ isDark, onTranscript, compact = false, className }: VoiceCaptureProps) {
  const [state, setState] = useState<VoiceCaptureState>({ status: 'idle' })
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationRef = useRef(0)

  // Clean up timer on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const startRecording = useCallback(async () => {
    setState({ status: 'requesting' })
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      durationRef.current = 0

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (timerRef.current) clearInterval(timerRef.current)
        const finalDuration = durationRef.current
        setState({ status: 'processing' })

        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          const formData = new FormData()
          formData.append('audio', blob, 'recording.webm')
          formData.append('segment', 'voice')

          const res = await fetch('/api/voice-entries/transcribe', {
            method: 'POST',
            body: formData,
          })
          if (!res.ok) throw new Error('Transcription failed')
          const { transcript } = await res.json()
          setState({ status: 'done', transcript, durationSec: finalDuration })
          onTranscript(transcript, finalDuration)
        } catch (err) {
          setState({ status: 'error', message: 'Could not transcribe. Try again.' })
        }
      }

      recorder.start(1000)

      // Tick duration every second
      timerRef.current = setInterval(() => {
        durationRef.current += 1
        setState({ status: 'recording', durationSec: durationRef.current })
      }, 1000)

      setState({ status: 'recording', durationSec: 0 })
    } catch {
      setState({ status: 'error', message: 'Microphone access denied.' })
    }
  }, [onTranscript])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
  }, [])

  const reset = () => setState({ status: 'idle' })

  // ── Compact mode: just a mic button ──────────────────────────────────────
  if (compact) {
    const isRecording = state.status === 'recording'
    const isProcessing = state.status === 'processing'

    return (
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={state.status === 'requesting' || isProcessing}
        className={`relative flex items-center justify-center rounded-full
                    transition-all duration-200 active:scale-90 ${className ?? ''}`}
        style={{
          width: 36,
          height: 36,
          background: isRecording
            ? '#e53e3e'
            : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          color: isRecording ? '#fff' : isDark ? '#8A8882' : '#9E9B96',
        }}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording && (
          <span className="absolute inset-0 rounded-full border-2 border-voice animate-pulse-ring" />
        )}
        {isProcessing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" className="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        ) : (
          <MicIcon size={16} active={isRecording} />
        )}
      </button>
    )
  }

  // ── Full mode: expanded recording UI ─────────────────────────────────────
  return (
    <div className={`flex flex-col items-center gap-4 py-6 ${className ?? ''}`}>

      {/* State: idle */}
      {state.status === 'idle' && (
        <>
          <RecordButton isDark={isDark} onPress={startRecording} />
          <p className="text-sm" style={{ color: isDark ? '#636060' : '#9E9B96' }}>
            Tap to record
          </p>
        </>
      )}

      {/* State: requesting mic */}
      {state.status === 'requesting' && (
        <p className="text-sm animate-pulse" style={{ color: isDark ? '#636060' : '#9E9B96' }}>
          Requesting microphone…
        </p>
      )}

      {/* State: recording */}
      {state.status === 'recording' && (
        <>
          <div className="relative flex items-center justify-center">
            {/* Pulse ring */}
            <span className="absolute w-20 h-20 rounded-full border-2 border-voice animate-pulse-ring" />
            <span className="absolute w-28 h-28 rounded-full border border-voice/30 animate-pulse-ring"
                  style={{ animationDelay: '0.3s' }} />
            <RecordButton isDark={isDark} onPress={stopRecording} isRecording />
          </div>

          <div className="flex items-center gap-2">
            {/* Blinking dot */}
            <span className="w-2 h-2 rounded-full bg-voice animate-recording-dot" />
            <span className="text-base font-mono tabular-nums"
                  style={{ color: isDark ? '#F2F0EB' : '#1A1A1A' }}>
              {formatDuration(state.durationSec)}
            </span>
          </div>

          <p className="text-xs" style={{ color: isDark ? '#636060' : '#9E9B96' }}>
            Tap to stop
          </p>
        </>
      )}

      {/* State: processing */}
      {state.status === 'processing' && (
        <>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e53e3e"
                 strokeWidth="2" strokeLinecap="round" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          </div>
          <p className="text-sm animate-pulse" style={{ color: isDark ? '#8A8882' : '#9E9B96' }}>
            Transcribing…
          </p>
        </>
      )}

      {/* State: done */}
      {state.status === 'done' && (
        <>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(56,161,105,0.15)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38a169"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="text-center max-w-xs px-4">
            <p className="text-sm font-medium mb-1" style={{ color: isDark ? '#38a169' : '#276749' }}>
              Transcribed · {formatDuration(state.durationSec)}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: isDark ? '#BDBAB4' : '#4A4845' }}>
              {state.transcript}
            </p>
          </div>
          <button
            onClick={reset}
            className="text-xs px-4 py-2 rounded-xl transition-colors"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              color: isDark ? '#8A8882' : '#9E9B96',
            }}
          >
            Record again
          </button>
        </>
      )}

      {/* State: error */}
      {state.status === 'error' && (
        <>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(229,62,62,0.12)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e53e3e"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="text-sm text-center px-6" style={{ color: '#e53e3e' }}>
            {state.message}
          </p>
          <button
            onClick={reset}
            className="text-xs px-4 py-2 rounded-xl"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              color: isDark ? '#8A8882' : '#9E9B96',
            }}
          >
            Try again
          </button>
        </>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RecordButton({
  isDark, onPress, isRecording = false,
}: { isDark: boolean; onPress: () => void; isRecording?: boolean }) {
  return (
    <button
      onClick={onPress}
      className="flex items-center justify-center w-16 h-16 rounded-full
                 transition-all duration-200 active:scale-90"
      style={{
        background: isRecording ? '#e53e3e' : isDark ? '#F2F0EB' : '#1A1A1A',
        color: isRecording ? '#fff' : isDark ? '#1A1A1A' : '#F2F0EB',
      }}
    >
      {isRecording ? (
        // Square stop icon
        <span className="w-5 h-5 rounded-sm" style={{ background: 'currentColor' }} />
      ) : (
        <MicIcon size={24} active={false} />
      )}
    </button>
  )
}

function MicIcon({ size, active }: { size: number; active: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  )
}
