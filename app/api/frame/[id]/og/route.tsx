import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

interface TrackData {
  id: string;
  song_title: string;
  artist: string;
  curator_fid: number;
  artwork_url: string;
  review?: string;
}

interface CuratorData {
  username: string;
  farcaster_pfp_url: string;
}

interface CuratorScore {
  curator_score: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const logoUrl = new URL('/curio.svg', req.nextUrl.origin).toString(); // @vercel/og requires absolute image URLs
    const starUrl = new URL('/star.png', req.nextUrl.origin).toString();

    // Fetch track data
    const { data: track, error: trackError } = await supabase
      .from('recommendations')
      .select('id, song_title, artist, curator_fid, artwork_url, review')
      .eq('id', id)
      .single();

    if (trackError || !track)
      return new Response('Track not found', { status: 404 });
    const t = track as TrackData;

    // Fetch curator data
    const { data: curator, error: curatorError} = await supabase
      .from('users')
      .select('username, farcaster_pfp_url')
      .eq('farcaster_fid', t.curator_fid)
      .single();

    if (curatorError || !curator)
      return new Response('Curator not found', { status: 404 });
    const c = curator as CuratorData;

    // Fetch curator score separately
    const { data: scoreData } = await supabase
      .from('users')
      .select('curator_score')
      .eq('farcaster_fid', t.curator_fid)
      .single();

    const curatorScore = (scoreData as CuratorScore)?.curator_score || 0;

    // Fetch community PFPs for "share your taste" button
    const { data: communityUsers } = await supabase
      .from('users')
      .select('farcaster_pfp_url')
      .not('farcaster_pfp_url', 'is', null)
      .limit(6);

    const communityPfps = communityUsers?.map(u => u.farcaster_pfp_url).filter(Boolean) || [];

    // ---------- LAYOUT ----------
    const CANVAS_W = 1200;
    const CANVAS_H = 800;

    return new ImageResponse(
      (
        <div
          style={{
            width: `${CANVAS_W}px`,
            height: `${CANVAS_H}px`,
            background: '#ECECEC',
            display: 'flex',
            flexDirection: 'column',
            fontFamily:
              'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, sans-serif',
            position: 'relative',
            padding: '40px',
            gap: '28px',
          }}
        >
          {/* Live Indicator */}
          <div
            style={{
              position: 'absolute',
              top: '32px',
              left: '40px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#F6F6F6',
              padding: '10px 20px',
              borderRadius: '20px',
              boxShadow: '4px 4px 8px #d0d0d0, -4px -4px 8px #ffffff',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '5px',
                background:
                  'radial-gradient(circle at 50% 40%, #FF7B5A 0%, #D94B33 100%)',
                boxShadow: '0 0 8px rgba(243, 108, 91, 0.6)',
              }}
            />
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#5E5E5E',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
              }}
            >
              Curio Radio
            </div>
          </div>

          {/* Top Row - Artwork + Track Info */}
          <div
            style={{
              display: 'flex',
              gap: '28px',
              height: '460px',
            }}
          >
            {/* Left Side - Artwork */}
            <div
              style={{
                width: '460px',
                height: '460px',
                flexShrink: 0,
                display: 'flex',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#F6F6F6',
                  borderRadius: '24px',
                  boxShadow: '12px 12px 24px #d0d0d0, -12px -12px 24px #ffffff',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                }}
              >
                {t.artwork_url ? (
                  <img
                    src={t.artwork_url}
                    width="460"
                    height="460"
                    style={{
                      objectFit: 'cover',
                      width: '100%',
                      height: '100%',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(135deg, #F36C5B 0%, #B8E1C2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '120px',
                    }}
                  >
                    🎵
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Track Info */}
            <div
              style={{
                flex: 1,
                display: 'flex',
              }}
            >
              <div
                style={{
                  background: '#F6F6F6',
                  borderRadius: '24px',
                  boxShadow: '8px 8px 16px #d0d0d0, -8px -8px 16px #ffffff',
                  padding: '44px 40px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    fontSize: '56px',
                    fontWeight: 700,
                    color: '#2E2E2E',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                    marginBottom: '16px',
                    textTransform: 'lowercase',
                    display: 'flex',
                  }}
                >
                  {t.song_title.length > 35 ? t.song_title.substring(0, 35) + '...' : t.song_title}
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    color: '#5E5E5E',
                    fontWeight: 400,
                    textTransform: 'lowercase',
                    marginBottom: '24px',
                    display: 'flex',
                  }}
                >
                  {t.artist}
                </div>
                {t.review && (
                  <div
                    style={{
                      fontSize: '22px',
                      fontStyle: 'italic',
                      color: '#5E5E5E',
                      lineHeight: 1.4,
                      textTransform: 'lowercase',
                      opacity: 0.85,
                      display: 'flex',
                    }}
                  >
                    &ldquo;{t.review.length > 80 ? t.review.substring(0, 80) + '...' : t.review}&rdquo;
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Curator Card - Full Width Below */}
          <div
            style={{
              background: '#F6F6F6',
              borderRadius: '24px',
              boxShadow: '8px 8px 16px #d0d0d0, -8px -8px 16px #ffffff',
              padding: '32px 36px',
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              height: '128px',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F36C5B 0%, #B8E1C2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '36px',
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: '4px 4px 8px rgba(0,0,0,0.1)',
              }}
            >
              {c.farcaster_pfp_url ? (
                <img
                  src={c.farcaster_pfp_url}
                  width="80"
                  height="80"
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                    width: '80px',
                    height: '80px',
                  }}
                />
              ) : (
                (c.username || 'C')[0].toUpperCase()
              )}
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  fontSize: '16px',
                  color: '#5E5E5E',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '2px',
                  display: 'flex',
                }}
              >
                Curated by
              </div>
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 600,
                  color: '#2E2E2E',
                  textTransform: 'lowercase',
                  letterSpacing: '-0.01em',
                  display: 'flex',
                }}
              >
                @{c.username}
              </div>
            </div>
            <div
              style={{
                background: 'rgba(211, 234, 169, 0.25)',
                padding: '14px 24px',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '28px',
                fontWeight: 700,
                color: '#2E2E2E',
                flexShrink: 0,
                boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.08)',
              }}
            >
              <img
                src={starUrl}
                width="40"
                height="40"
                style={{
                  width: '40px',
                  height: '40px',
                }}
              />
              <span>{curatorScore}</span>
            </div>
          </div>

          {/* Branding - Button Row */}
          <div
            style={{
              display: 'flex',
              gap: '28px',
              height: '90px',
            }}
          >
            <div
              style={{
                flex: 1,
                background: '#F6F6F6',
                borderRadius: '18px',
                boxShadow: '6px 6px 12px #d0d0d0, -6px -6px 12px #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '21px 24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                {communityPfps.slice(0, 5).map((pfp, i) => (
                  <div
                    key={i}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid #F6F6F6',
                      marginLeft: i > 0 ? '-14px' : '0',
                      display: 'flex',
                    }}
                  >
                    <img
                      src={pfp}
                      width="48"
                      height="48"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 500,
                  color: '#5E5E5E',
                  letterSpacing: '0.01em',
                  display: 'flex',
                }}
              >
                → share your taste
              </div>
            </div>
            <div
              style={{
                flex: 1,
                background: '#F6F6F6',
                borderRadius: '18px',
                boxShadow: '6px 6px 12px #d0d0d0, -6px -6px 12px #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={logoUrl}
                width="120"
                height="38"
                style={{
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>
        </div>
      ),
      {
        width: CANVAS_W,
        height: CANVAS_H,
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch (e) {
    console.error(e);
    return new Response('OG generation failed', { status: 500 });
  }
}
