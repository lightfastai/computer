import { NextRequest, NextResponse } from 'next/server';
import { computer } from '@/lib/computer';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await computer.instances.destroy(id);
    
    if (result.isOk()) {
      return NextResponse.json({ success: true });
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