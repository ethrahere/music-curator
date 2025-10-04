import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    const title = searchParams.get('title') || 'Music Track';
    const artist = searchParams.get('artist') || 'Unknown Artist';

    if (!imageUrl) {
      return new Response('Missing image URL', { status: 400 });
    }

    // Generate 3:2 aspect ratio image (1200x800)
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
            position: 'relative',
          }}
        >
          {/* Album artwork centered */}
          <img
            src={imageUrl}
            alt="Album artwork"
            style={{
              maxWidth: '80%',
              maxHeight: '80%',
              objectFit: 'contain',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          />

          {/* Overlay with track info at bottom */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '32px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 'bold',
                color: 'white',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 32,
                color: 'rgba(255,255,255,0.8)',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {artist}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 800, // 3:2 aspect ratio
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
