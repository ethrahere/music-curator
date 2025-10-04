import { MusicTrack } from '@/types/music';

// In-memory store for music tracks
class MusicStore {
  private tracks: Map<string, MusicTrack> = new Map();

  addTrack(track: MusicTrack): void {
    this.tracks.set(track.id, track);
  }

  getTrack(id: string): MusicTrack | undefined {
    return this.tracks.get(id);
  }

  getAllTracks(): MusicTrack[] {
    return Array.from(this.tracks.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  incrementTips(id: string): boolean {
    const track = this.tracks.get(id);
    if (track) {
      track.tips += 1;
      this.tracks.set(id, track);
      return true;
    }
    return false;
  }

  getMostTipped(limit = 10): MusicTrack[] {
    return this.getAllTracks()
      .sort((a, b) => b.tips - a.tips)
      .slice(0, limit);
  }

  getRecent(limit = 20): MusicTrack[] {
    return this.getAllTracks().slice(0, limit);
  }
}

// Singleton instance
export const musicStore = new MusicStore();
