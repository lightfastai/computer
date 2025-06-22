import { NextRequest, NextResponse } from 'next/server';
import createLightfastComputer from '@lightfast/computer';

const sdk = createLightfastComputer();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sdk.instances.get(params.id);
    
    if (result.isOk()) {
      return NextResponse.json(result.value);
    } else {
      return NextResponse.json(
        { error: result.error.message },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Failed to get instance:', error);
    return NextResponse.json(
      { error: 'Failed to get instance' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sdk.instances.destroy(params.id);
    
    if (result.isOk()) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to delete instance:', error);
    return NextResponse.json(
      { error: 'Failed to delete instance' },
      { status: 500 }
    );
  }
}
