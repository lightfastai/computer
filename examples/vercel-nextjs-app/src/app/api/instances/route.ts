import { NextRequest, NextResponse } from 'next/server';
import { computer } from '@/lib/computer';

export async function GET() {
  try {
    const result = await computer.instances.list();
    
    if (result.isOk()) {
      return NextResponse.json({ instances: result.value });
    } else {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, repoUrl } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const result = await computer.instances.create({
      name,
      repoUrl,
    });
    
    if (result.isOk()) {
      return NextResponse.json({ instance: result.value });
    } else {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}