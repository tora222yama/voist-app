import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { VoicePost } from '../types';

interface VoicePlayerProps {
  voicePost: VoicePost;
  autoPlay?: boolean;
  compact?: boolean;
  playSignal?: number;
}

export function VoicePlayer({ voicePost, autoPlay = false, compact = false, playSignal = 0 }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState<number>(voicePost.duration ?? 0);
  const [muted, setMuted] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Stable tick reference so the RAF loop always uses the current closure
  const tickRef = useRef<() => void>(() => {});
  tickRef.current = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      const safeDuration = Number.isFinite(d) && d > 0 ? d : (duration || 1);
      setProgress(audioRef.current.currentTime / safeDuration);
    }
    animFrameRef.current = requestAnimationFrame(tickRef.current);
  };

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setLoadError(false);
    cancelAnimationFrame(animFrameRef.current);

    const audio = new Audio(voicePost.audio_url);
    audio.preload = 'metadata';
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else {
        // webm blobs often report Infinity until a seek forces the browser to compute it
        audio.currentTime = 1e101;
      }
    };

    audio.ondurationchange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        audio.currentTime = 0;
      }
    };

    audio.onerror = () => setLoadError(true);

    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
      cancelAnimationFrame(animFrameRef.current);
    };

    if (autoPlay) {
      audio.play()
        .then(() => {
          setIsPlaying(true);
          animFrameRef.current = requestAnimationFrame(tickRef.current);
        })
        .catch(() => {
          // Autoplay blocked by browser — user can tap play manually
        });
    }

    return () => {
      audio.onerror = null;
      audio.onloadedmetadata = null;
      audio.ondurationchange = null;
      audio.pause();
      audio.src = '';
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [voicePost.audio_url, autoPlay]);

  // External play trigger: when playSignal changes (and is non-zero), start playback
  useEffect(() => {
    if (playSignal === 0) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play()
      .then(() => {
        setIsPlaying(true);
        animFrameRef.current = requestAnimationFrame(tickRef.current);
      })
      .catch(() => {});
  }, [playSignal]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      cancelAnimationFrame(animFrameRef.current);
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => {
          setIsPlaying(true);
          animFrameRef.current = requestAnimationFrame(tickRef.current);
        })
        .catch(() => {});
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setProgress(ratio);
  };

  const formatTime = (s: number) => {
    if (!Number.isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loadError) {
    return (
      <div className={`flex items-center gap-2 text-red-400/70 text-xs ${compact ? '' : 'py-1'}`}>
        <AlertCircle size={14} />
        <span>音声を読み込めませんでした</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center text-black flex-shrink-0 hover:bg-amber-300 transition-colors"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <div
          className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer"
          onClick={seek}
        >
          <div
            className="h-full bg-amber-400 rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-white/40 text-xs w-8 text-right">
          {duration ? formatTime(duration * progress) : '0:00'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="w-full h-2 bg-white/20 rounded-full cursor-pointer group"
        onClick={seek}
      >
        <div
          className="h-full bg-amber-400 rounded-full relative"
          style={{ width: `${progress * 100}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-amber-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-amber-400 flex items-center justify-center text-black hover:bg-amber-300 active:scale-95 transition-all"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
          <span className="text-white/60 text-sm">
            {duration ? `${formatTime(duration * progress)} / ${formatTime(duration)}` : '--:--'}
          </span>
        </div>
        <button
          onClick={() => setMuted(!muted)}
          className="text-white/40 hover:text-white/80 transition-colors"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </div>
  );
}
