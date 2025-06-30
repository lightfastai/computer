import { type NextRequest, NextResponse } from 'next/server';
import { computer, formatErrorResponse } from '@/lib/computer';

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  try {
    const result = await computer.instances.restart(params.id);

    if (result.isOk()) {
      return NextResponse.json(result.value);
    }

    const { data, status } = formatErrorResponse(result.error);
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('Failed to restart instance:', error);
    return NextResponse.json({ error: 'Failed to restart instance' }, { status: 500 });
  }
}
