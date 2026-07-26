import { useCallback, useEffect, useRef, useState } from 'react';

// Muted autoplay is reliably allowed by browsers (autoplay policies
// target unmuted audio), so the track is already playing silently by
// the time someone taps the toggle — unmuting is instant rather than
// starting playback cold on tap.
export function useAmbientAudio(src) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!src) return undefined;
    const audio = new Audio(src);
    audio.loop = true;
    audio.muted = true;
    audio.volume = 0.35;
    audioRef.current = audio;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [src]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.muted = false;
      audio.play().catch(() => {});
    }
    setPlaying((p) => !p);
  }, [playing]);

  return { playing, toggle };
}
