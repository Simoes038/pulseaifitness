export const runtime = "nodejs";

import { supabaseAdmin } from "@/lib/supabase";
import jwt from "jsonwebtoken";

export async function GET(request) {
  try {
    // ===== VALIDAR TOKEN =====
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json(
        { error: "Token não fornecido" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    let userId;

    try {
      // Tentar validar com Supabase Auth primeiro
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !user) {
        // Fallback para JWT customizado (transição)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
        userId = decoded.userId;
      } else {
        userId = user.id;
      }
    } catch (err) {
      return Response.json(
        { error: "Token inválido" },
        { status: 401 }
      );
    }

    // ===== BUSCAR TREINO NO SUPABASE =====
    const { data: training, error } = await supabaseAdmin
      .from("training")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Erro PGRST116 = not found (usuário sem treino ainda)
    if (error && error.code === 'PGRST116') {
      return Response.json(null, { status: 200 });
    }

    // Outros erros
    if (error) {
      console.error("Erro ao buscar treino no Supabase:", error);
      return Response.json(
        { error: "Erro ao buscar treino" },
        { status: 500 }
      );
    }

    // Usuário novo → sem treino ainda
    if (!training) {
      return Response.json(null, { status: 200 });
    }

    // ✅ RETORNO NO FORMATO QUE O FRONTEND ESPERA
    const diasSemana = training.dias_semana || 5;
    
    const response = {
      id: training.id,
      user_id: training.user_id,
      diasSemana: diasSemana,
      current_day: training.current_day || 1,
      generated_at: training.generated_at,
      ai_model: training.ai_model,
      user_preferences: training.user_preferences || {},
      plan: {}
    };

    // ✅ Preencher apenas os dias até diasSemana
    for (let dia = 1; dia <= diasSemana; dia++) {
      const dayField = `day${dia}_exercises`;
      response.plan[dia] = training[dayField] || [];
    }

    return Response.json(response);

  } catch (error) {
    console.error("Erro ao buscar treino:", error);
    return Response.json(
      { error: "Erro ao buscar treino" },
      { status: 500 }
    );
  }
}
