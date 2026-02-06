export const runtime = 'nodejs';

import jwt from 'jsonwebtoken';
import { dbGet } from '@/lib/supabase';
import { generateNutritionResponse } from '@/lib/ai-service';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json(
        { success: false, error: 'Token não fornecido' },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    } catch {
      return Response.json(
        { success: false, error: 'Token inválido' },
        { status: 401 },
      );
    }

    const userId = decoded.userId;

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: 'JSON inválido' },
        { status: 400 },
      );
    }

    const { message } = body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return Response.json(
        { success: false, error: 'Mensagem vazia' },
        { status: 400 },
      );
    }

    let userContext = {};
    try {
      const training = await dbGet(
        'SELECT user_preferences FROM training WHERE user_id = ? LIMIT 1',
        [userId],
      );

      if (training) {
        userContext = {
          training: {
            user_preferences: training.user_preferences
              ? JSON.parse(training.user_preferences)
              : null,
          },
        };
      }
    } catch (err) {
      console.warn(
        '[NUTRITION-CHAT] Erro ao buscar treino (seguindo sem contexto):',
        err,
      );
    }

    const result = await generateNutritionResponse(message, userContext);

    return Response.json(
      {
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[NUTRITION-CHAT] ERRO:', err);
    return Response.json(
      {
        success: false,
        error: 'Erro interno no chat de nutrição',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return Response.json(
    { success: false, error: 'Método não permitido' },
    { status: 405 },
  );
}
