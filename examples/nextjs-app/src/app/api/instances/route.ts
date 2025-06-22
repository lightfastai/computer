import createLightfastComputer from '@lightfast/computer';
import { type NextRequest, NextResponse } from 'next/server';

const sdk = createLightfastComputer();

export async function GET() {
  try {
    const instances = await sdk.instances.list();
    return NextResponse.json(instances);
  } catch (error) {
    console.error('Failed to list instances:', error);
    return NextResponse.json({ error: 'Failed to list instances' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await sdk.instances.create(body);

    if (result.isOk()) {
      return NextResponse.json(result.value);
    }
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  } catch (error) {
    console.error('Failed to create instance:', error);
    return NextResponse.json({ error: 'Failed to create instance' }, { status: 500 });
  }
}
