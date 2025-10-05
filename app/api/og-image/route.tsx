import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    const title = searchParams.get('title') || 'Music Track';
    const artist = searchParams.get('artist') || 'Unknown Artist';
    const platform = searchParams.get('platform') || 'music';

    if (!imageUrl) {
      return new Response('Missing image URL', { status: 400 });
    }

    // Generate 3:2 aspect ratio image (1200x800) - optimized for fast loading
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #07110b 0%, #0b1a12 100%)',
            padding: '80px',
          }}
        >
          {/* Left: Album Artwork with glow */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '45%',
            }}
          >
            <div
              style={{
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(127, 212, 168, 0.3)',
                display: 'flex',
              }}
            >
              <img
                src={imageUrl}
                width="500"
                height="500"
                style={{
                  objectFit: 'cover',
                }}
              />
            </div>
          </div>

          {/* Right: Track Info Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '50%',
              background: 'linear-gradient(135deg, #e8f5ed 0%, #d4ebe0 100%)',
              borderRadius: '32px',
              padding: '60px',
              border: '4px solid #2d4a3a',
            }}
          >
            {/* Platform badge */}
            <div
              style={{
                display: 'flex',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  background: 'rgba(143, 216, 167, 0.2)',
                  border: '2px solid rgba(143, 216, 167, 0.4)',
                  borderRadius: '999px',
                  padding: '12px 24px',
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#2d4a3a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {platform}
              </div>
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: 56,
                fontWeight: 'bold',
                color: '#0b1a12',
                marginBottom: '16px',
                lineHeight: '1.2',
                display: '-webkit-box',
                overflow: 'hidden',
              }}
            >
              {title}
            </div>

            {/* Artist */}
            <div
              style={{
                fontSize: 36,
                color: '#2d4a3a',
                marginBottom: '32px',
              }}
            >
              {artist}
            </div>

            {/* Curio branding */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #a8e6c5 0%, #7fd4a8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                }}
              >
                🎵
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: '600',
                  color: '#0b1a12',
                }}
              >
                Curated on Curio
              </div>
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
