import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Mock authentication
    if (email === 'master@tattopro.com' && password === 'Test123!') {
      return NextResponse.json({
        token: 'jwt-token-' + Date.now(),
        user: {
          id: '1',
          email: 'master@tattopro.com',
          firstName: 'Ivan',
          lastName: 'Petrov',
          role: 'master',
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
