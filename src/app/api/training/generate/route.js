export const runtime = 'nodejs';

import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import { 
  generateTrainingWithGroq, 
  generateFallbackTraining,
  validateUserData 
} from '@/lib/ai-service';

/**
 * POST /api/training/generate
 * Gera novo treino personalizado
 */
export async function POST(request) {
  const startTime = Date.now();
  
  try {
    console.log('\n[TRAINING-GENERATE] ========== INICIANDO GERAÇÃO DE TREINO ==========');

    // ===== 1. VALIDAR TOKEN =====
    console.log('[TRAINING-GENERATE] Validando token...');
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[TRAINING-GENERATE] ❌ Token não fornecido');
      return Response.json(
        { error: 'Token não fornecido', code: 'NO_TOKEN' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let userId;
    
    try {
      // Tentar verificar com Supabase primeiro
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !user) {
        // Fallback para JWT customizado (se ainda estiver em transição)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        userId = decoded.userId;
        console.log(`[TRAINING-GENERATE] ✅ Token JWT customizado válido: ${userId}`);
      } else {
        userId = user.id;
        console.log(`[TRAINING-GENERATE] ✅ Token Supabase válido: ${userId}`);
      }
    } catch (err) {
      console.error('[TRAINING-GENERATE] ❌ Token inválido:', err.message);
      return Response.json(
        { error: 'Token inválido', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    // ===== 2. PARSEAR DADOS DO FORMULÁRIO =====
    console.log('[TRAINING-GENERATE] Recebendo dados do formulário...');
    let formData;
    try {
      formData = await request.json();
      console.log('[TRAINING-GENERATE] ✅ Dados recebidos:', {
        altura: formData.altura,
        peso: formData.peso,
        experiencia: formData.experiencia,
        objetivo: formData.objetivo,
        diasSemana: formData.diasSemana,
        local: formData.local,
        tempoDiario: formData.tempoDiario
      });
    } catch (err) {
      console.error('[TRAINING-GENERATE] ❌ Erro ao fazer parse JSON:', err.message);
      return Response.json(
        { error: 'Dados inválidos', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    // ===== 3. VALIDAR DADOS DO FORMULÁRIO =====
    console.log('[TRAINING-GENERATE] Validando dados do formulário...');
    const validationErrors = validateUserData(formData);
    if (validationErrors.length > 0) {
      console.error('[TRAINING-GENERATE] ❌ Erros de validação:', validationErrors);
      return Response.json(
        { 
          error: 'Dados inválidos',
          details: validationErrors,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }
    console.log('[TRAINING-GENERATE] ✅ Dados validados com sucesso');

    // ===== 4. GERAR TREINO COM IA =====
    console.log('[TRAINING-GENERATE] Iniciando geração com IA Groq...');
    let trainingResult;
    try {
      trainingResult = await generateTrainingWithGroq(formData);
      console.log('[TRAINING-GENERATE] ✅ Treino gerado com sucesso pela IA');
    } catch (aiError) {
      console.warn('[TRAINING-GENERATE] ⚠️ Erro na IA, usando treino fallback:', aiError.message);
      trainingResult = generateFallbackTraining(formData);
      console.log('[TRAINING-GENERATE] ✅ Treino fallback gerado');
    }

    // ===== 5. NORMALIZAR ESTRUTURA DO TREINO =====
    console.log('[TRAINING-GENERATE] Normalizando estrutura do treino...');
    const diasSemana = parseInt(formData.diasSemana);
    const normalizedTraining = {
      diasSemana: diasSemana,
      current_day: 1,
      user_preferences: {
        altura: formData.altura,
        peso: formData.peso,
        experiencia: formData.experiencia,
        sexo: formData.sexo,
        local: formData.local,
        objetivo: formData.objetivo,
        tempoDiario: formData.tempoDiario,
        generated_at: new Date().toISOString()
      },
      plan: {}
    };

    // Normalizar dias gerados pela IA
    for (let dia = 1; dia <= diasSemana; dia++) {
      const diaKey = `dia${dia}_exercises`;
      normalizedTraining.plan[dia] = trainingResult[diaKey] || [];
      console.log(`[TRAINING-GENERATE] Dia ${dia}: ${normalizedTraining.plan[dia].length} exercícios`);
    }

    console.log(`[TRAINING-GENERATE] ✅ Treino normalizado para ${diasSemana} dias`);

    // ===== 6. SALVAR NO SUPABASE =====
    console.log('[TRAINING-GENERATE] Salvando treino no Supabase...');
    
    // Preparar dados para upsert
    const trainingData = {
      user_id: userId,
      current_day: 1,
      dias_semana: diasSemana,
      generated_at: new Date().toISOString(),
      user_preferences: normalizedTraining.user_preferences,
      ai_model: 'groq'
    };

    // Adicionar campos de dias
    for (let dia = 1; dia <= diasSemana; dia++) {
      trainingData[`day${dia}_exercises`] = normalizedTraining.plan[dia] || [];
    }

    // Limpar dias não utilizados (se estava 7 dias e agora é 5, limpar 6 e 7)
    for (let dia = diasSemana + 1; dia <= 7; dia++) {
      trainingData[`day${dia}_exercises`] = null;
    }

    // Upsert (insert ou update)
    const { data: savedTraining, error: upsertError } = await supabaseAdmin
      .from('training')
      .upsert(trainingData, {
        onConflict: 'user_id',
        returning: 'representation'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('[TRAINING-GENERATE] ❌ Erro ao salvar:', upsertError);
      throw new Error(`Erro ao salvar treino: ${upsertError.message}`);
    }

    console.log('[TRAINING-GENERATE] ✅ Treino salvo no Supabase com sucesso');

    // ===== 7. FORMATAR RESPOSTA =====
    const response = {
      success: true,
      training: {
        id: savedTraining.id,
        user_id: savedTraining.user_id,
        diasSemana: savedTraining.dias_semana,
        current_day: savedTraining.current_day,
        generated_at: savedTraining.generated_at,
        ai_model: savedTraining.ai_model,
        user_preferences: savedTraining.user_preferences || {},
        plan: {}
      },
      metadata: {
        executionTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString()
      }
    };

    // Preencher apenas os dias necessários
    for (let dia = 1; dia <= savedTraining.dias_semana; dia++) {
      const dayField = `day${dia}_exercises`;
      response.training.plan[dia] = savedTraining[dayField] || [];
    }

    const executionTime = Date.now() - startTime;
    console.log(`[TRAINING-GENERATE] ✅ TREINO GERADO COM SUCESSO (${executionTime}ms)`);
    console.log(`[TRAINING-GENERATE] Gerado ${savedTraining.dias_semana} dias de treino`);
    console.log('[TRAINING-GENERATE] ========== FIM DA GERAÇÃO ==========\n');

    return Response.json(response, { status: 201 });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[TRAINING-GENERATE] ❌ ERRO CRÍTICO (${executionTime}ms):`, error);
    console.error('[TRAINING-GENERATE] Stack:', error.stack);

    // Determinar tipo de erro
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let userMessage = 'Erro ao gerar treino';

    if (error.message.includes('GROQ_API_KEY')) {
      statusCode = 503;
      errorCode = 'API_KEY_MISSING';
      userMessage = 'Serviço de IA temporariamente indisponível';
    } else if (error.message.includes('rate_limit')) {
      statusCode = 429;
      errorCode = 'RATE_LIMITED';
      userMessage = 'Muitas requisições. Tente novamente em alguns segundos.';
    } else if (error.message.includes('authentication')) {
      statusCode = 503;
      errorCode = 'API_AUTH_ERROR';
      userMessage = 'Erro de autenticação com serviço de IA';
    }

    return Response.json(
      {
        success: false,
        error: userMessage,
        code: errorCode,
        metadata: {
          executionTime: `${executionTime}ms`,
          timestamp: new Date().toISOString()
        }
      },
      { status: statusCode }
    );
  }
}

/**
 * GET /api/training/generate
 * Retorna erro - este endpoint só aceita POST
 */
export async function GET() {
  return Response.json(
    { error: 'Método não permitido', code: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}
