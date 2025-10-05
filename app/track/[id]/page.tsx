import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { MusicTrack } from '@/types/music';
import Image from 'next/image';

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    // Fetch track from Supabase
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return {
        title: 'Track Not Found',
        description: 'Music track not found on Curio',
      };
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://music-curator.vercel.app';
    const originalArtwork = data.artwork_url || 'https://placehold.co/600x400/1a1a1a/white?text=Music';

    // Generate 3:2 aspect ratio image URL with platform
    const platform = data.platform || 'music';
    const artwork3x2 = `${baseUrl}/api/og-image?url=${encodeURIComponent(originalArtwork)}&title=${encodeURIComponent(data.song_title)}&artist=${encodeURIComponent(data.artist)}&platform=${encodeURIComponent(platform)}`;

    // Generate Mini App metadata (image must be 3:2 aspect ratio)
    const miniAppMetadata = {
      version: '1',
      imageUrl: artwork3x2,
      button: {
        title: '▶ Play',
        action: {
          type: 'launch_frame',
          name: 'Music Player',
          url: `${baseUrl}/play?trackId=${data.id}`,
          splashImageUrl: `${baseUrl}/curio-logo.png`,
          splashBackgroundColor: '#1a1a1a',
        },
      },
    };

    return {
      title: `${data.song_title} - ${data.artist}`,
      description: `Listen to ${data.song_title} by ${data.artist} on Curio`,
      openGraph: {
        title: data.song_title,
        description: `by ${data.artist}`,
        images: [
          {
            url: artwork3x2,
            width: 1200,
            height: 800,
            alt: `${data.song_title} by ${data.artist}`,
          }
        ],
        type: 'music.song',
      },
      twitter: {
        card: 'summary_large_image',
        title: data.song_title,
        description: `by ${data.artist}`,
        images: [artwork3x2],
      },
      other: {
        'fc:miniapp': JSON.stringify(miniAppMetadata),
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Track Not Found',
      description: 'Music track not found on Curio',
    };
  }
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id } = await params;

  // Fetch track from Supabase
  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    notFound();
  }

  const track: MusicTrack = {
    id: data.id,
    url: data.music_url,
    platform: data.platform || 'other',
    title: data.song_title,
    artist: data.artist,
    artwork: data.artwork_url || 'https://placehold.co/600x400/1a1a1a/white?text=Music',
    embedUrl: data.embed_url || '',
    tips: data.tip_count,
    sharedBy: {
      fid: 0,
      username: data.curator_address,
    },
    timestamp: new Date(data.created_at).getTime(),
  };

  if (!track) {
    notFound();
  }

  // Redirect to player view
  const playerUrl = `/play?trackId=${id}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <div className="w-32 h-32 mx-auto mb-6 relative rounded-xl overflow-hidden">
          <Image src={track.artwork} alt={track.title} fill className="object-cover" />
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
