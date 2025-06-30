import { type NextRequest, NextResponse } from 'next/server';
import { getComputer } from '@/lib/computer';

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  try {
    const result = await getComputer().instances.stop(params.id);

    if (result.isOk()) {
      return NextResponse.json(result.value);
    }
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  } catch (error) {
    console.error('Failed to stop instance:', error);
    return NextResponse.json({ error: 'Failed to stop instance' }, { status: 500 });
  }
}
