import { type NextRequest, NextResponse } from 'next/server';
import { computer, formatErrorResponse } from '@/lib/computer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await computer.commands.execute(body);

    if (result.isOk()) {
      return NextResponse.json(result.value);
    }
    
    const { data, status } = formatErrorResponse(result.error);
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('Failed to execute command:', error);
    return NextResponse.json({ error: 'Failed to execute command' }, { status: 500 });
  }
}
