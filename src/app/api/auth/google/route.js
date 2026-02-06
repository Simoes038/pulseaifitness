import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase";

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

    // ✅ 1. BUSCAR USUÁRIO NO SUPABASE
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name")
      .eq("email", mockEmail)
      .single();

    let finalUser = user;

    // ✅ 2. SE NÃO EXISTE, CRIAR
    if (fetchError && fetchError.code === 'PGRST116') {
      console.log("🆕 [GOOGLE] Criando usuário...");
      
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from("users")
        .insert({
          email: mockEmail,
          password_hash: 'GOOGLE_OAUTH',
          full_name: mockName,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("❌ [GOOGLE] Erro ao criar usuário:", insertError);
        return Response.json(
          { error: "Erro ao criar usuário" },
          { status: 500 }
        );
      }

      finalUser = newUser;
      console.log("✅ [GOOGLE] Usuário criado:", finalUser.id);
    } else if (fetchError) {
      // Outro erro que não seja "not found"
      console.error("❌ [GOOGLE] Erro ao buscar usuário:", fetchError);
      return Response.json(
        { error: "Erro ao buscar usuário" },
        { status: 500 }
      );
    } else {
      console.log("✅ [GOOGLE] Usuário encontrado:", finalUser.id);
      
      // Atualizar last_login
      await supabaseAdmin
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", finalUser.id);
    }

    // ✅ 3. GERAR TOKEN JWT
    const jwtToken = jwt.sign(
      { userId: finalUser.id, email: finalUser.email },
      process.env.JWT_SECRET || "secret-super-seguro-dev",
      { expiresIn: "24h" }
    );

    console.log("🎉 [GOOGLE] Login bem-sucedido:", finalUser.email);

    return Response.json({
      success: true,
      user: { 
        id: finalUser.id, 
        email: finalUser.email, 
        fullName: finalUser.full_name 
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
