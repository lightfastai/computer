import { NextRequest, NextResponse } from 'next/server';
import createLightfastComputer from '@lightfast/computer';

const sdk = createLightfastComputer();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sdk.instances.restart(params.id);
    
    if (result.isOk()) {
      return NextResponse.json(result.value);
    } else {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to restart instance:', error);
    return NextResponse.json(
      { error: 'Failed to restart instance' },
      { status: 500 }
    );
  }
}
