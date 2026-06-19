import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Proof-of-purchase claims are not part of the current Rounds MVP.' },
    { status: 410 },
  )
}
