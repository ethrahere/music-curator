import { Metadata } from 'next';
import { musicStore } from '@/lib/store';
import { generateEmbedMetadata } from '@/lib/farcaster';
import { notFound } from 'next/navigation';

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { id } = await params;
  const track = musicStore.getTrack(id);

  if (!track) {
    return {
      title: 'Track Not Found',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://music-curator.app';
  const embedMetadata = generateEmbedMetadata(track.id, track.artwork, baseUrl);

  return {
    title: `${track.title} - ${track.artist}`,
    description: `Listen to ${track.title} by ${track.artist} on Music Curator`,
    openGraph: {
      title: track.title,
      description: `by ${track.artist}`,
      images: [track.artwork],
      type: 'music.song',
    },
    other: {
      'fc:miniapp': JSON.stringify(embedMetadata),
    },
  };
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id } = await params;
  const track = musicStore.getTrack(id);

  if (!track) {
    notFound();
  }

  // Redirect to player view
  const playerUrl = `/play?trackId=${id}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <div className="w-32 h-32 mx-auto mb-6 relative rounded-xl overflow-hidden">
          <img src={track.artwork} alt={track.title} className="w-full h-full object-cover" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">{track.title}</h1>
        <p className="text-lg text-white/70 mb-6">{track.artist}</p>

        <a
          href={playerUrl}
          className="inline-block w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-white font-semibold transition-all shadow-lg shadow-purple-500/25"
        >
          ▶ Play Track
        </a>

        <div className="mt-6 text-sm text-white/50">
          Shared by {track.sharedBy.username} • {track.tips} tips
        </div>
      </div>
    </div>
  );
}
