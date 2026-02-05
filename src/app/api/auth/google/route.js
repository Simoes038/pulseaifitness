import jwt from "jsonwebtoken";
import { dbGet, dbRun } from "@/lib/db";  // ✅ IMPORTAÇÃO CORRETA

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return Response.json({ error: "Token não fornecido" }, { status: 400 });
    }

    // ✅ DEMO: Dados mockados (remova depois)
    const mockEmail = "user@google.com";
    const mockName = "Google User";

    console.log("🔍 [GOOGLE] Buscando usuário:", mockEmail);

    // ✅ 1. BUSCAR USUÁRIO (COM AWAIT!)
    let user = await dbGet(
      "SELECT id, email, full_name FROM users WHERE email = ?",
      [mockEmail]
    );

    // ✅ 2. SE NÃO EXISTE, CRIAR (COM AWAIT!)
    if (!user) {
      console.log("🆕 [GOOGLE] Criando usuário...");
      
      const result = await dbRun(
        "INSERT INTO users (email, password_hash, full_name, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
        [mockEmail, 'GOOGLE_OAUTH', mockName]
      );

      // Buscar usuário recém-criado
      user = await dbGet("SELECT id, email, full_name FROM users WHERE id = ?", [result.id]);
      console.log("✅ [GOOGLE] Usuário criado:", user.id);
    } else {
      console.log("✅ [GOOGLE] Usuário encontrado:", user.id);
    }

    // ✅ 3. GERAR TOKEN JWT
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "secret-super-seguro-dev",
      { expiresIn: "24h" }
    );

    console.log("🎉 [GOOGLE] Login bem-sucedido:", user.email);

    return Response.json({
      success: true,
      user: { 
        id: user.id, 
        email: user.email, 
        fullName: user.full_name 
      },
      token: jwtToken,
    }, { status: 200 });

  } catch (error) {
    console.error("❌ [GOOGLE] Erro:", error);
    return Response.json(
      { error: "Erro ao processar login Google" },
      { status: 500 }
    );
  }
}
