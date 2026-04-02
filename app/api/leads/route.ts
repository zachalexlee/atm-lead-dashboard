import { NextRequest, NextResponse } from 'next/server';
import { getLeads, addLead } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters = {
      tier: searchParams.get('tier') || undefined,
      businessType: searchParams.get('businessType') || undefined,
      jurisdiction: searchParams.get('jurisdiction') || undefined,
      leadStatus: searchParams.get('leadStatus') || undefined,
      days: searchParams.get('days') ? parseInt(searchParams.get('days')!) : undefined,
      search: searchParams.get('search') || undefined,
    };

    const leads = getLeads(filters);
    
    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const lead = await request.json();
    
    const result = addLead(lead);
    
    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid
    });
  } catch (error: any) {
    console.error('Error adding lead:', error);
    return NextResponse.json(
      { error: 'Failed to add lead' },
      { status: 500 }
    );
  }
}
