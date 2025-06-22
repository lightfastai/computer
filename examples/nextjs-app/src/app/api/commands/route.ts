import createLightfastComputer from '@lightfast/computer';
import { type NextRequest, NextResponse } from 'next/server';

const sdk = createLightfastComputer();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await sdk.commands.execute(body);

    if (result.isOk()) {
      return NextResponse.json(result.value);
    }
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  } catch (error) {
    console.error('Failed to execute command:', error);
    return NextResponse.json({ error: 'Failed to execute command' }, { status: 500 });
  }
}
