import { type NextRequest, NextResponse } from 'next/server';
import { computer, formatErrorResponse } from '@/lib/computer';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await computer.instances.start(params.id);

    if (result.isOk()) {
      return NextResponse.json(result.value);
    }

    const { data, status } = formatErrorResponse(result.error);
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('Failed to start instance:', error);
    return NextResponse.json({ error: 'Failed to start instance' }, { status: 500 });
  }
}
