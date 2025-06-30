import { NextRequest, NextResponse } from 'next/server';
import { computer } from '@/lib/computer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceId, command } = body;

    if (!instanceId || !command) {
      return NextResponse.json(
        { error: 'instanceId and command are required' },
        { status: 400 }
      );
    }

    const result = await computer.commands.execute({
      instanceId,
      command,
    });
    
    if (result.isOk()) {
      return NextResponse.json({
        stdout: result.value.stdout,
        stderr: result.value.stderr,
        exitCode: result.value.exitCode,
      });
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