import { NextRequest, NextResponse } from 'next/server';
import { computer, formatErrorResponse } from '@/lib/computer';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await computer.instances.get(params.id);
  
  if (result.isOk()) {
    return NextResponse.json(result.value);
  }
  
  const { data, status } = formatErrorResponse(result.error);
  return NextResponse.json(data, { status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await computer.instances.destroy(params.id);
  
  if (result.isOk()) {
    return NextResponse.json({ success: true });
  }
  
  const { data, status } = formatErrorResponse(result.error);
  return NextResponse.json(data, { status });
}
