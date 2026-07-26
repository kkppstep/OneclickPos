import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

// Most mobile browsers block audio with sound from autoplaying
// without a user gesture. We still attempt a muted autoplay (so the
// track is primed and ready) and show a toggle either way — tapping
// it plays/pauses and unmutes, which counts as the required gesture.
export default function AmbientAudioToggle({ src, stage }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;
    audio.play().catch(() => {
      // Autoplay blocked — fine, the toggle button below covers it.
    });
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.muted = false;
      audio.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  return (
    <>
      <audio ref={audioRef} src={src} loop muted onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Mute background music' : 'Play background music'}
        className={`fixed right-3.5 z-30 flex h-9 w-9 items-center justify-center rounded-full shadow-md ${
          stage ? 'top-[104px] bg-white/10 text-gray-200 backdrop-blur' : 'top-[100px] bg-white text-[#1C2620]'
        }`}
      >
        {playing ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
    </>
  );
}
