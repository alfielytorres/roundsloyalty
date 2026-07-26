import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Proof-of-purchase settings are not part of the current Weekends Club MVP.' },
    { status: 410 },
  )
}
