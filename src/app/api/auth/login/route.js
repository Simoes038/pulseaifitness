export const runtime = "nodejs";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase";

// =============================
// VALIDAÇÕES
// =============================

function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// validação básica (login não deve barrar senha antiga)
function isValidPasswordInput(password) {
  return typeof password === "string" && password.length >= 6;
}

// =============================
// LOGIN
// =============================
export async function POST(request) {
  console.log("🚀 [LOGIN] Requisição recebida");

  try {
    const body = await request.json();
    const { email, password } = body || {};

    console.log("📦 Body recebido:", {
      email,
      hasPassword: !!password,
    });

    // ---------- validações ----------
    if (!email || !password) {
      return Response.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    if (!isValidPasswordInput(password)) {
      return Response.json(
        { error: "Senha inválida" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    console.log("🔍 Buscando usuário:", normalizedEmail);

    // Buscar usuário no Supabase
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, email, password_hash, full_name")
      .eq("email", normalizedEmail)
      .single();

    // Evita revelar se usuário existe
    if (fetchError || !user || !user.password_hash) {
      console.log("❌ Usuário não encontrado");
      return Response.json(
        { error: "Email ou senha incorretos" },
        { status: 401 }
      );
    }

    console.log("🔐 Comparando senha...");
    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      console.log("❌ Senha incorreta");
      return Response.json(
        { error: "Email ou senha incorretos" },
        { status: 401 }
      );
    }

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "24h" }
    );

    // Atualizar last_login no Supabase
    await supabaseAdmin
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    console.log("🎉 Login realizado com sucesso!");

    return Response.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
        },
        token,
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": `authToken=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
        },
      }
    );
  } catch (error) {
    console.error("🔥 ERRO LOGIN:", error);

    return Response.json(
      { error: "Erro ao processar login" },
      { status: 500 }
    );
  }
}
