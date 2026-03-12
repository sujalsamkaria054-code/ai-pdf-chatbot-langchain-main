import { NextResponse } from 'next/server';
import { getDirectAnswer } from '@/lib/direct-answer';
import { routeQuestion } from '@/lib/router-agent';
import { vectorDatabase } from '@/lib/vector-store';
import { analyzeRetrievedContext } from '@/lib/retrieval-analyzer';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const decision = await routeQuestion(message);

    if (decision.route === 'direct') {
      const response = await getDirectAnswer(message);
      return NextResponse.json({
        route: 'direct',
        response,
      });
    }

    const retrievedDocuments = vectorDatabase.similaritySearch(message, 5);
    const response = await analyzeRetrievedContext(message, retrievedDocuments);

    return NextResponse.json({
      route: 'retrieve',
      response,
    });
  } catch (error) {
    console.error('Chat route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
