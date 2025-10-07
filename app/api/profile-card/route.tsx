import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username') || 'Anonymous';
  const pfpUrl = searchParams.get('pfpUrl') || '';
  const tracksShared = searchParams.get('tracksShared') || '0';
  const tipsEarned = searchParams.get('tipsEarned') || '0';
  const successRate = searchParams.get('successRate') || '0';
  const bio = searchParams.get('bio') || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          background: 'linear-gradient(135deg, #07110b 0%, #0b1a12 100%)',
          padding: '60px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Main Card */}
        <div
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #e8f5ed 0%, #d4ebe0 100%)',
            borderRadius: '32px',
            padding: '60px',
            display: 'flex',
            flexDirection: 'column',
            border: '3px solid #a8e6c5',
          }}
        >
          {/* Header with PFP and Username */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              marginBottom: '40px',
            }}
          >
            {/* Profile Picture */}
            {pfpUrl ? (
              <img
                src={pfpUrl}
                alt=""
                width="120"
                height="120"
                style={{
                  borderRadius: '999px',
                  border: '6px solid #a8e6c5',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #a8e6c5 0%, #7fd4a8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  color: '#0b1a12',
                  fontWeight: 'bold',
                }}
              >
                {username.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Username */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontSize: '56px',
                  fontWeight: 'bold',
                  color: '#0b1a12',
                  marginBottom: '8px',
                }}
              >
                @{username}
              </div>
              <div
                style={{
                  fontSize: '28px',
                  color: '#2d4a3a',
                  fontWeight: '600',
                }}
              >
                Music Curator on Curio
              </div>
            </div>
          </div>

          {/* Bio */}
          {bio && (
            <div
              style={{
                fontSize: '24px',
                color: '#2d4a3a',
                marginBottom: '40px',
                lineHeight: '1.5',
              }}
            >
              {bio.substring(0, 150)}{bio.length > 150 ? '...' : ''}
            </div>
          )}

          {/* Stats Grid */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
              marginTop: 'auto',
            }}
          >
            {/* Tracks Shared */}
            <div
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#0b1a12',
                  marginBottom: '8px',
                }}
              >
                {tracksShared}
              </div>
              <div style={{ fontSize: '20px', color: '#2d4a3a' }}>
                Tracks Shared
              </div>
            </div>

            {/* Tips Earned */}
            <div
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#0b1a12',
                  marginBottom: '8px',
                }}
              >
                ${tipsEarned}
              </div>
              <div style={{ fontSize: '20px', color: '#2d4a3a' }}>
                Tips Earned
              </div>
            </div>

            {/* Success Rate */}
            <div
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#0b1a12',
                  marginBottom: '8px',
                }}
              >
                {successRate}%
              </div>
              <div style={{ fontSize: '20px', color: '#2d4a3a' }}>
                Success Rate
              </div>
            </div>
          </div>

          {/* Footer Branding */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '40px',
              fontSize: '20px',
              color: '#2d4a3a',
              fontWeight: '600',
            }}
          >
            🎵 Discover more on Curio
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
