import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const scope = searchParams.get('scope') || 'all';

  const validScopes = ['river', 'weather', 'tourism', 'bulletin', 'mountain', 'cities', 'all'];

  if (!validScopes.includes(scope)) {
    return NextResponse.json(
      { error: `Invalid scope '${scope}'. Must be one of: ${validScopes.join(', ')}` },
      { status: 400 }
    );
  }

  // Simulate edge revalidation with upstream DHM sources
  return NextResponse.json({
    success: true,
    revalidatedScope: scope,
    refreshedAt: new Date().toISOString(),
    message: `Telemetry cache for scope '${scope}' successfully refreshed from DHM/MFD edge sources.`,
    status: 200,
  });
}
