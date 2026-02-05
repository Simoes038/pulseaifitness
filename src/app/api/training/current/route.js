export const runtime = "nodejs";

import { dbGet } from "@/lib/db";
import jwt from "jsonwebtoken";

export async function GET(request) {
  try {
    // ===== TOKEN =====
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json(
        { error: "Token não fornecido" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "dev-secret"
      );
    } catch {
      return Response.json(
        { error: "Token inválido" },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // ===== BUSCAR TREINO =====
    const training = await dbGet(
      `SELECT * FROM training WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    // Usuário novo → sem treino ainda
    if (!training) {
      return Response.json(null, { status: 200 });
    }

    // ✅ RETORNO NO FORMATO NOVO QUE O FRONTEND ESPERA
    const diasSemana = training.diasSemana || 5;
    
    const response = {
      id: training.id,
      user_id: training.user_id,
      diasSemana: diasSemana, // ✅ NOVO
      current_day: training.current_day || 1,
      generated_at: training.generated_at,
      ai_model: training.ai_model,
      user_preferences: training.user_preferences
        ? JSON.parse(training.user_preferences)
        : {},
      plan: {} // ✅ NOVO FORMATO
    };

    // ✅ Preencher apenas os dias até diasSemana
    for (let dia = 1; dia <= diasSemana; dia++) {
      const dayField = `day${dia}_exercises`;
      response.plan[dia] = training[dayField] 
        ? JSON.parse(training[dayField]) 
        : [];
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
