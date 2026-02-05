const GROQ_API_KEY = process.env.GROQ_API_KEY;

/**
 * Mapas de tradução para formato interno
 */
const EXPERIENCE_MAP = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  Iniciante: 'Iniciante',
  'Intermediário': 'Intermediário',
  'Avançado': 'Avançado',
};

const SEX_MAP = {
  masculino: 'Masculino',
  feminino: 'Feminino',
  Masculino: 'Masculino',
  Feminino: 'Feminino',
};

const LOCAL_MAP = {
  academia: 'Academia',
  casa: 'Casa',
  Academia: 'Academia',
  Casa: 'Casa',
};

const GOAL_MAP = {
  ganho_massa: 'Ganho de Massa',
  perda_peso: 'Perda de Peso',
  manter_forma: 'Manter a Forma',
  'Ganho de Massa': 'Ganho de Massa',
  'Perda de Peso': 'Perda de Peso',
  'Manter a Forma': 'Manter a Forma',
};

const TIME_MAP = {
  15: '15 minutos',
  30: '30 minutos',
  60: '1 hora',
  90: '1 hora e 30 minutos',
  120: '2 horas',
};

/**
 * Valida dados do usuário antes de enviar para IA
 * Compatível com múltiplos formatos de entrada
 */
export function validateUserData(formData) {
  const errors = [];

  // Dados pessoais
  if (!formData.altura || formData.altura < 100 || formData.altura > 250) {
    errors.push('Altura inválida (deve estar entre 100 e 250 cm)');
  }

  if (!formData.peso || formData.peso < 30 || formData.peso > 500) {
    errors.push('Peso inválido (deve estar entre 30 e 500 kg)');
  }

  // Medidas corporais (pelo menos as principais)
  if (!formData.biceps || formData.biceps < 10 || formData.biceps > 70) {
    errors.push('Medida de bíceps inválida');
  }

  if (!formData.peitoral || formData.peitoral < 50 || formData.peitoral > 200) {
    errors.push('Medida de peitoral inválida');
  }

  if (!formData.cintura || formData.cintura < 40 || formData.cintura > 200) {
    errors.push('Medida de cintura inválida');
  }

  if (!formData.quadriceps || formData.quadriceps < 30 || formData.quadriceps > 100) {
    errors.push('Medida de quadríceps inválida');
  }

  // Perfil
  const exp = EXPERIENCE_MAP[formData.experiencia];
  const sex = SEX_MAP[formData.sexo];
  const loc = LOCAL_MAP[formData.local];
  const goal = GOAL_MAP[formData.objetivo];

  if (!exp) errors.push('Nível de experiência inválido');
  if (!sex) errors.push('Sexo inválido');
  if (!loc) errors.push('Local de treino inválido');
  if (!formData.diasSemana || formData.diasSemana < 1 || formData.diasSemana > 7) {
    errors.push('Dias por semana inválido (deve estar entre 1 e 7)');
  }
  if (!goal) errors.push('Objetivo inválido');

  // Tempo disponível por dia (em minutos)
  const tempo = formData.tempoDiario || formData.tempo_diario || formData.tempoTreino;
  const tempoNum = tempo ? parseInt(tempo, 10) : null;

  if (!tempoNum || ![15, 30, 60, 90, 120].includes(tempoNum)) {
    errors.push('Tempo diário de treino inválido (escolha entre 15, 30, 60, 90 ou 120 minutos)');
  }

  return errors;
}

/**
 * Normaliza dados do usuário para formato padrão
 */
function normalizeUserData(formData) {
  return {
    altura: Number(formData.altura),
    peso: Number(formData.peso),
    biceps: Number(formData.biceps),
    antebraco: formData.antebraco ? Number(formData.antebraco) : null,
    peitoral: Number(formData.peitoral),
    cintura: Number(formData.cintura),
    ombro: formData.ombro ? Number(formData.ombro) : null,
    quadriceps: Number(formData.quadriceps),
    coxa: formData.coxa ? Number(formData.coxa) : null,
    panturrilha: formData.panturrilha ? Number(formData.panturrilha) : null,
    gluteos: formData.gluteos ? Number(formData.gluteos) : null,
    experiencia: EXPERIENCE_MAP[formData.experiencia] || formData.experiencia,
    sexo: SEX_MAP[formData.sexo] || formData.sexo,
    local: LOCAL_MAP[formData.local] || formData.local,
    diasSemana: parseInt(formData.diasSemana, 10),
    objetivo: GOAL_MAP[formData.objetivo] || formData.objetivo,
    tempoDiario: parseInt(
      formData.tempoDiario || formData.tempo_diario || formData.tempoTreino,
      10,
    ),
  };
}

/**
 * Calcula IMC para contextualizar o treino
 */
export function calculateIMC(altura, peso) {
  const alturaM = altura / 100;
  return parseFloat((peso / (alturaM * alturaM)).toFixed(1));
}

/**
 * Classifica IMC para contexto de treino
 */
export function classifyIMC(imc) {
  if (imc < 18.5) return 'Abaixo do peso';
  if (imc < 25) return 'Peso normal';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidade';
}

/**
 * Cria prompt estruturado e detalhado para a IA
 * Agora levando em conta o tempo disponível por dia
 */
function createTrainingPrompt(formData) {
  const imc = calculateIMC(formData.altura, formData.peso);
  const imcClass = classifyIMC(imc);

  const experienciaLevel = {
    Iniciante: '0-6 meses de experiência',
    'Intermediário': '6-24 meses de experiência',
    'Avançado': '24+ meses de experiência',
  };

  const goalDescription = {
    'Ganho de Massa': 'ganho de massa muscular (hipertrofia)',
    'Perda de Peso': 'perda de peso e definição muscular',
    'Manter a Forma': 'manutenção e tônus muscular',
  };

  const tempo = formData.tempoDiario; // em minutos
  let faixaExercicios = '';
  let focoTempo = '';

  if (tempo <= 15) {
    faixaExercicios =
      '5 a 6 exercícios rápidos, com pouco descanso (30-45 segundos) e foco em intensidade';
    focoTempo =
      'Treino ultra-rápido de 15 minutos, focando em exercícios multiarticulares e circuitos.';
  } else if (tempo <= 30) {
    faixaExercicios =
      '8 a 10 exercícios, descanso moderado (45-60 segundos), combinando compostos e isolados';
    focoTempo =
      'Treino eficiente de 30 minutos, com bom equilíbrio entre volume e intensidade.';
  } else if (tempo <= 60) {
    faixaExercicios = '11 a 14 exercícios, descanso entre 60-90 segundos';
    focoTempo = 'Treino completo de aproximadamente 1 hora, com foco em hipertrofia.';
  } else if (tempo <= 90) {
    faixaExercicios =
      '14 a 17 exercícios, descanso entre 60-90 segundos, podendo incluir técnicas avançadas';
    focoTempo = 'Treino mais longo (1h30), misturando força e hipertrofia.';
  } else {
    faixaExercicios =
      '17 a 20 exercícios, descanso entre 90-120 segundos para movimentos mais pesados';
    focoTempo =
      'Treino bastante completo de até 2 horas, cobrindo grandes grupos musculares.';
  }

  const tempoLegivel = TIME_MAP[tempo] || `${tempo} minutos`;

  const prompt = `Você é um personal trainer especializado em criar planos de treino personalizados. Seu objetivo é criar um treino de alta qualidade, seguro e eficaz.

DADOS BIOMÉTRICOS DO CLIENTE:
- Sexo: ${formData.sexo}
- Altura: ${formData.altura} cm
- Peso: ${formData.peso} kg
- IMC: ${imc} (${imcClass})

MEDIDAS CORPORAIS (cm):
- Bíceps: ${formData.biceps}
${formData.antebraco ? `- Antebraço: ${formData.antebraco}` : ''}
- Peitoral: ${formData.peitoral}
- Cintura: ${formData.cintura}
${formData.ombro ? `- Ombro: ${formData.ombro}` : ''}
- Quadríceps: ${formData.quadriceps}
${formData.coxa ? `- Coxa: ${formData.coxa}` : ''}
${formData.panturrilha ? `- Panturrilha: ${formData.panturrilha}` : ''}
${formData.gluteos ? `- Glúteos: ${formData.gluteos}` : ''}

PERFIL DE TREINO:
- Nível: ${formData.experiencia} (${experienciaLevel[formData.experiencia]})
- Objetivo: ${goalDescription[formData.objetivo]}
- Local de treino: ${formData.local}
- Frequência: ${formData.diasSemana} dias por semana
- Tempo disponível por dia: ${tempoLegivel}

INSTRUÇÕES IMPORTANTES:
1. Crie um plano de treino de EXATAMENTE ${formData.diasSemana} dias.
2. O treino de CADA dia deve caber dentro de ${tempoLegivel}.
3. Para este tempo disponível, utilize aproximadamente ${faixaExercicios}.
4. ${
    formData.local === 'Casa'
      ? 'Use APENAS exercícios de PESO CORPORAL (flexões, agachamentos sem peso, prancha, burpees, polichinelos, abdominais, lunges, mountain climbers) e, NO MÁXIMO, halteres/dumbbells leves (até 10kg). NÃO use barras fixas, barras para supino, máquinas, polias, cabos ou qualquer equipamento de academia.'
      : 'Use todos os equipamentos de academia disponíveis (barras, máquinas, polias, cabos, smith machine, leg press, etc.).'
  }
5. Para nível ${
    formData.experiencia
  }: ${
    formData.experiencia === 'Iniciante'
      ? 'Foque em técnica e adaptação do corpo.'
      : formData.experiencia === 'Intermediário'
      ? 'Aumente volume e intensidade progressivamente.'
      : 'Trabalhe periodização e técnicas avançadas.'
  }
6. Para objetivo ${
    formData.objetivo
  }: ${
    formData.objetivo === 'Ganho de Massa'
      ? 'Priorize exercícios compostos com 6-12 reps.'
      : formData.objetivo === 'Perda de Peso'
      ? 'Inclua cardio e trabalhe com mais repetições.'
      : 'Mantenha volume moderado e consistência.'
  }

ESTRUTURA ESPERADA:

Para cada dia, forneça em FORMATO MARKDOWN COM TABELA:

## DIA [número]: [GRUPO MUSCULAR PRINCIPAL]

| Exercício | Séries | Repetições | Descanso |
|-----------|--------|------------|----------|
| Nome do exercício | X | Y-Z | Xs |

**Observações:** [Dicas específicas de execução e progressão]

IMPORTANTE:
- Use EXATAMENTE este formato com | pipes | para os exercícios.
- Garanta que o volume caiba em ${tempoLegivel} por dia.
- Respeite o foco de tempo: ${focoTempo}.
`;

  return prompt;
}

/**
 * Gera treino usando Groq API com LLaMA 3.3
 */
export async function generateTrainingWithGroq(formData) {
  const startTime = Date.now();

  try {
    console.log('[AI-SERVICE] Iniciando geração de treino...');

    const validationErrors = validateUserData(formData);
    if (validationErrors.length > 0) {
      console.error('[AI-SERVICE] Erros de validação:', validationErrors);
      throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
    }

    const normalizedData = normalizeUserData(formData);
    console.log('[AI-SERVICE] Dados validados e normalizados');

    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY não configurada no ambiente');
    }

    const prompt = createTrainingPrompt(normalizedData);
    console.log('[AI-SERVICE] Chamando Groq API para treino...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Você é um personal trainer especializado. Forneça planos de treino personalizados, seguros e eficazes. Use tabelas Markdown com | pipes | para os exercícios.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 0.95,
      }),
    });

    console.log('[AI-SERVICE] Status Groq treino:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[AI-SERVICE] Erro Groq treino:', response.status, errorData);

      if (response.status === 429) {
        throw new Error('RATE_LIMIT: Muitas requisições. Tente novamente em alguns segundos.');
      }
      if (response.status === 401) {
        throw new Error('AUTH: Chave Groq inválida ou expirada');
      }
      throw new Error(`Groq API retornou status ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Resposta vazia ou inválida da IA');
    }

    const trainingText = data.choices[0].message.content.trim();
    console.log('[AI-SERVICE] Resposta de treino recebida da IA');

    const parsedTraining = parseTrainingToJSON(trainingText);
    console.log(`[AI-SERVICE] Treino parseado: ${parsedTraining.days.length} dias`);

    const result = formatTrainingResult(parsedTraining.days, normalizedData, trainingText);

    const executionTime = Date.now() - startTime;
    console.log(`[AI-SERVICE] Treino gerado com sucesso (${executionTime}ms)`);

    return result;
  } catch (error) {
    console.error('[AI-SERVICE] Erro treino:', error.message);
    throw error;
  }
}

/**
 * Parseia treino em markdown para estrutura JSON
 */
function parseTrainingToJSON(trainingText) {
  try {
    const days = [];

    const diaRegex = /##\s*DIA\s*(\d+):\s*(.+?)(?=##\s*DIA|$)/gis;
    let match;

    while ((match = diaRegex.exec(trainingText)) !== null) {
      const dayNum = parseInt(match[1], 10);
      const dayContent = match[2];

      const grupoMatch = dayContent.match(/DIA\s*\d+:\s*(.+?)\n/i);
      const grupo = grupoMatch ? grupoMatch[1].trim() : `Dia ${dayNum}`;

      const exercicios = [];
      const lines = dayContent.split('\n');
      let inTable = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('Exercício') && line.includes('Séries')) {
          inTable = true;
          i++;
          continue;
        }

        if (inTable && line.includes('|')) {
          const parts = line.split('|').map((p) => p.trim()).filter(Boolean);

          if (parts.length >= 4 && parts[0].toLowerCase() !== 'exercício') {
            const exercicio = {
              exercicio: parts[0],
              series: parseInt(parts[1], 10) || 3,
              repeticoes: parts[2],
              descanso: parseInt(parts[3]?.replace(/\D/g, '') || '60', 10) || 60,
            };
            exercicios.push(exercicio);
          }
        }

        if (inTable && !line.includes('|') && line.trim() !== '') {
          inTable = false;
        }
      }

      if (exercicios.length > 0) {
        days.push({
          dia: dayNum,
          grupo,
          exercicios,
        });
      }
    }

    return {
      success: days.length > 0,
      days,
    };
  } catch (error) {
    console.error('[AI-SERVICE] Erro ao parsear treino:', error);
    return { success: false, days: [] };
  }
}

/**
 * Formata resultado final do treino
 */
function formatTrainingResult(days, userPreferences, rawText) {
  const trainingData = {
    dia1_exercises: days.find((d) => d.dia === 1)?.exercicios || {},
    dia2_exercises: days.find((d) => d.dia === 2)?.exercicios || {},
    dia3_exercises: days.find((d) => d.dia === 3)?.exercicios || {},
    dia4_exercises: days.find((d) => d.dia === 4)?.exercicios || {},
    dia5_exercises: days.find((d) => d.dia === 5)?.exercicios || {},
    dia6_exercises: days.find((d) => d.dia === 6)?.exercicios || {},
    dia7_exercises: days.find((d) => d.dia === 7)?.exercicios || {},
    imc: calculateIMC(userPreferences.altura, userPreferences.peso),
    user_preferences: {
      experiencia: userPreferences.experiencia,
      objetivo: userPreferences.objetivo,
      local: userPreferences.local,
      diasSemana: userPreferences.diasSemana,
      sexo: userPreferences.sexo,
      tempoDiario: userPreferences.tempoDiario,
    },
    raw_text: rawText,
    generated_at: new Date().toISOString(),
  };

  return trainingData;
}

/**
 * Gera treino de fallback em caso de erro
 */
export function generateFallbackTraining(formData) {
  console.warn('[AI-SERVICE] Usando treino de fallback');

  const normalizedData = normalizeUserData(formData);

  const baseTraining = {
    aquecimento: [
      { exercicio: 'Corrida ou caminhada', series: 1, repeticoes: '5 min', descanso: 0 },
      { exercicio: 'Mobilidade dinâmica', series: 1, repeticoes: '5 min', descanso: 0 },
    ],
    cool_down: [
      { exercicio: 'Alongamento estático', series: 1, repeticoes: '10 min', descanso: 0 },
    ],
  };

  let mainExercises = [];

  if (normalizedData.experiencia === 'Iniciante') {
    mainExercises = [
      { exercicio: 'Flexão de braço', series: 3, repeticoes: '8-10', descanso: 60 },
      { exercicio: 'Agachamento corporal', series: 3, repeticoes: '10-12', descanso: 60 },
      { exercicio: 'Prancha', series: 3, repeticoes: '20-30s', descanso: 60 },
    ];
  } else if (normalizedData.experiencia === 'Intermediário') {
    mainExercises = [
      { exercicio: 'Supino com halteres', series: 4, repeticoes: '8-10', descanso: 90 },
      { exercicio: 'Agachamento com peso', series: 4, repeticoes: '8-12', descanso: 90 },
      { exercicio: 'Rosca direta', series: 3, repeticoes: '10-12', descanso: 60 },
    ];
  } else {
    mainExercises = [
      { exercicio: 'Supino com barra', series: 5, repeticoes: '5-8', descanso: 120 },
      { exercicio: 'Agachamento com barra', series: 5, repeticoes: '5-8', descanso: 120 },
      { exercicio: 'Rosca com barra', series: 4, repeticoes: '6-10', descanso: 90 },
    ];
  }

  const treino = [...baseTraining.aquecimento, ...mainExercises, ...baseTraining.cool_down];

  const days = {};
  for (let i = 1; i <= 7; i++) {
    days[`dia${i}_exercises`] = i <= normalizedData.diasSemana ? treino : {};
  }

  return {
    ...days,
    imc: calculateIMC(normalizedData.altura, normalizedData.peso),
    user_preferences: {
      experiencia: normalizedData.experiencia,
      objetivo: normalizedData.objetivo,
      local: normalizedData.local,
      diasSemana: normalizedData.diasSemana,
      sexo: normalizedData.sexo,
      tempoDiario: normalizedData.tempoDiario,
    },
    warning: '⚠️ Treino gerado automaticamente (fallback). Ajuste conforme sua progressão.',
  };
}

/**
 * Gera resposta do NUTRICIONISTA IA usando Groq
 */
export async function generateNutritionResponse(userMessage, userContext = {}) {
  try {
    if (!GROQ_API_KEY) {
      return {
        success: false,
        message: 'Erro: variável GROQ_API_KEY não configurada no ambiente.',
      };
    }

    const contextStr = userContext?.training?.user_preferences
      ? JSON.stringify(userContext.training.user_preferences, null, 2)
      : 'Sem dados de treino cadastrados.';

    const systemPrompt = `
Você é um nutricionista esportivo especializado em musculação e academia.
Responda sempre em português do Brasil, de forma direta, prática e profissional.
Foque em:
- ajustes na dieta para ganho de massa, perda de peso ou manutenção
- exemplos de refeições e distribuição de macros
- recomendações gerais baseadas em evidências
Adapte as respostas ao contexto abaixo quando fizer sentido.

CONTEXT0 DO USUÁRIO (treino e preferências):
${contextStr}
`.trim();

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 800,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    console.log('[AI-SERVICE] Status Groq nutrição:', response.status);

    if (!response.ok) {
      const txt = await response.text();
      console.error('[AI-SERVICE] Erro Groq nutrição:', response.status, txt);
      return {
        success: false,
        message:
          'Tive um problema técnico para responder agora. Tente novamente em alguns segundos ou reformule sua pergunta.',
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return {
        success: false,
        message:
          'Não consegui gerar uma resposta útil dessa vez. Pode reformular a pergunta ou dar mais detalhes?',
      };
    }

    return {
      success: true,
      message: content,
    };
  } catch (err) {
    console.error('[AI-SERVICE] Erro generateNutritionResponse:', err);
    return {
      success: false,
      message:
        'Erro interno ao gerar a resposta de nutrição. Tente novamente em instantes ou verifique sua conexão.',
    };
  }
}
