export const runtime = 'nodejs';

import { dbGet, dbRun } from '@/lib/db';
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
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      console.log(`[TRAINING-GENERATE] ✅ Token válido para usuário: ${decoded.userId}`);
    } catch (err) {
      console.error('[TRAINING-GENERATE] ❌ Token inválido:', err.message);
      return Response.json(
        { error: 'Token inválido', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

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
      diasSemana: diasSemana, // ✅ CAMPO NOVO: número exato de dias
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
      plan: {} // ✅ CAMPO NOVO: objeto com todos os dias
    };

    // Normalizar dias gerados pela IA para o formato correto
    for (let dia = 1; dia <= diasSemana; dia++) {
      const diaKey = `dia${dia}_exercises`;
      normalizedTraining.plan[dia] = trainingResult[diaKey] || [];
      console.log(`[TRAINING-GENERATE] Dia ${dia}: ${normalizedTraining.plan[dia].length} exercícios`);
    }

    console.log(`[TRAINING-GENERATE] ✅ Treino normalizado para ${diasSemana} dias`);

    // ===== 6. SALVAR NO BANCO DE DADOS =====
    console.log('[TRAINING-GENERATE] Salvando treino no banco de dados...');
    
    // Verificar se já existe treino
    const existingTraining = await dbGet(
      'SELECT id FROM training WHERE user_id = ? LIMIT 1',
      [userId]
    );

    // Preparar dados para salvar (só os dias necessários)
    const dayFields = {};
    for (let dia = 1; dia <= diasSemana; dia++) {
      dayFields[`day${dia}_exercises`] = JSON.stringify(normalizedTraining.plan[dia] || []);
    }
    dayFields.current_day = 1;
    dayFields.diasSemana = diasSemana; // ✅ CAMPO NOVO NO BANCO
    dayFields.generated_at = new Date().toISOString();
    dayFields.user_preferences = JSON.stringify(normalizedTraining.user_preferences);
    dayFields.ai_model = 'groq';

    if (existingTraining) {
      console.log('[TRAINING-GENERATE] Atualizando treino existente...');
      
      // UPDATE dinâmico baseado nos dias
      let updateQuery = 'UPDATE training SET ';
      const updateValues = [];
      
      updateQuery += 'current_day = ?, diasSemana = ?, generated_at = ?, ';
      updateValues.push(1, diasSemana, new Date().toISOString());
      
      // Adicionar campos de dias
      for (let dia = 1; dia <= diasSemana; dia++) {
        updateQuery += `day${dia}_exercises = ?, `;
        updateValues.push(JSON.stringify(normalizedTraining.plan[dia] || []));
      }
      
      // Campos fixos
      updateQuery += 'user_preferences = ?, ai_model = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
      updateValues.push(
        JSON.stringify(normalizedTraining.user_preferences),
        'groq',
        userId
      );

      await dbRun(updateQuery, updateValues);
    } else {
      console.log('[TRAINING-GENERATE] Criando novo treino...');
      
      // INSERT dinâmico
      let insertQuery = 'INSERT INTO training (user_id, ';
      const insertValues = [userId];
      
      insertQuery += 'current_day, diasSemana, ';
      insertValues.push(1, diasSemana);
      
      // Campos de dias
      for (let dia = 1; dia <= diasSemana; dia++) {
        insertQuery += `day${dia}_exercises, `;
        insertValues.push(JSON.stringify(normalizedTraining.plan[dia] || []));
      }
      
      // Campos fixos
      insertQuery += 'generated_at, user_preferences, ai_model) VALUES (';
      insertValues.push(new Date().toISOString());
      insertValues.push(JSON.stringify(normalizedTraining.user_preferences));
      insertValues.push('groq');
      
      insertQuery += insertValues.slice(1).map(() => '?').join(',') + ')';

      await dbRun(insertQuery, insertValues);
    }
    console.log('[TRAINING-GENERATE] ✅ Treino salvo no banco com sucesso');

    // ===== 7. BUSCAR TREINO COMPLETO PARA RETORNAR =====
    console.log('[TRAINING-GENERATE] Buscando treino completo...');
    const training = await dbGet(
      'SELECT * FROM training WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!training) {
      console.error('[TRAINING-GENERATE] ❌ Treino não encontrado após salvar');
      return Response.json(
        { error: 'Erro ao recuperar treino', code: 'TRAINING_NOT_FOUND' },
        { status: 500 }
      );
    }

    // ===== 8. FORMATAR RESPOSTA =====
    const response = {
      success: true,
      training: {
        id: training.id,
        user_id: training.user_id,
        diasSemana: training.diasSemana, // ✅ CAMPO NOVO
        current_day: 1,
        generated_at: training.generated_at,
        ai_model: training.ai_model,
        user_preferences: training.user_preferences ? JSON.parse(training.user_preferences) : {},
        plan: {} // ✅ CAMPO NOVO: só os dias necessários
      },
      metadata: {
        executionTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString()
      }
    };

    // Preencher apenas os dias até diasSemana
    for (let dia = 1; dia <= training.diasSemana; dia++) {
      const dayField = `day${dia}_exercises`;
      response.training.plan[dia] = training[dayField] ? JSON.parse(training[dayField]) : [];
    }

    const executionTime = Date.now() - startTime;
    console.log(`[TRAINING-GENERATE] ✅ TREINO GERADO COM SUCESSO (${executionTime}ms)`);
    console.log(`[TRAINING-GENERATE] Gerado ${training.diasSemana} dias de treino`);
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
