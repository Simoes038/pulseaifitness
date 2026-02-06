export const runtime = "nodejs";

import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(request) {
  console.log("🚀 [REGISTER] Requisição recebida");

  try {
    const body = await request.json();
    const { email, password, fullName } = body || {};

    if (!email || !password || !fullName) {
      return Response.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    // senha mínima
    if (password.length < 8) {
      return Response.json(
        { error: "Senha deve ter no mínimo 8 caracteres" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verificar duplicidade no Supabase
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (existingUser) {
      return Response.json(
        { error: "Email já registrado" },
        { status: 409 }
      );
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Criar usuário no Supabase
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        email: normalizedEmail,
        password_hash: passwordHash,
        full_name: fullName,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("🔥 Erro ao inserir usuário:", insertError);
      return Response.json(
        { error: "Erro ao registrar usuário" },
        { status: 500 }
      );
    }

    // Gerar token JWT
    const token = jwt.sign(
      { userId: newUser.id, email: normalizedEmail },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "24h" }
    );

    console.log("✅ Usuário registrado! ID:", newUser.id);

    return Response.json(
      {
        success: true,
        user: {
          id: newUser.id,
          email: normalizedEmail,
          fullName,
        },
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("🔥 Erro no registro:", error);

    return Response.json(
      { error: "Erro ao registrar usuário" },
      { status: 500 }
    );
  }
}
