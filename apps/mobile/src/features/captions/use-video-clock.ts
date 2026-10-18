import { useEvent } from 'expo';
import { useVideoPlayer } from 'expo-video';

/** Plays a video on loop and exposes its time at ~30 updates per second. */
export function useVideoClock(uri: string) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 1 / 30;
    p.play();
  });
  const time = useEvent(player, 'timeUpdate')?.currentTime ?? 0;
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  return {
    player,
    time,
    playing: isPlaying,
    toggle: () => (player.playing ? player.pause() : player.play()),
    seek: (t: number) => player.seekBy(t - player.currentTime),
  };
}
