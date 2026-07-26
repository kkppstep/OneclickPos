import { Volume2, VolumeX } from 'lucide-react';
import { useAmbientAudio } from '../hooks/useAmbientAudio';

// Standard layout's floating toggle. Stage layout uses the same
// useAmbientAudio hook directly, folded into its control cluster
// instead of a separate floating button (see App.jsx / StageControls).
export default function AmbientAudioToggle({ src }) {
  const { playing, toggle } = useAmbientAudio(src);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? 'Mute background music' : 'Play background music'}
      className="fixed right-3.5 top-[100px] z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1C2620] shadow-md"
    >
      {playing ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </button>
  );
}
