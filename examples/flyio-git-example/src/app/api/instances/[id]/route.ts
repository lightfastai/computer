import { type NextRequest, NextResponse } from 'next/server';
import { getComputer, formatErrorResponse } from '@/lib/computer';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  const result = await getComputer().instances.get(params.id);

  if (result.isOk()) {
    return NextResponse.json(result.value);
  }

  const { data, status } = formatErrorResponse(result.error);
  return NextResponse.json(data, { status });
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  const result = await getComputer().instances.destroy(params.id);

  if (result.isOk()) {
    return NextResponse.json({ success: true });
  }

  const { data, status } = formatErrorResponse(result.error);
  return NextResponse.json(data, { status });
}
