export const runtime = "nodejs";

import { initializeDatabase, dbGet, dbRun } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(request) {
  console.log("🚀 [REGISTER] Requisição recebida");

  try {
    // ✅ garante que o banco e as tabelas existem
    await initializeDatabase();

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

    // verifica duplicidade
    const existingUser = await dbGet(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existingUser) {
      return Response.json(
        { error: "Email já registrado" },
        { status: 409 }
      );
    }

    // hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // cria usuário
    const result = await dbRun(
      "INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)",
      [normalizedEmail, passwordHash, fullName]
    );

    const token = jwt.sign(
      { userId: result.id, email: normalizedEmail },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "24h" }
    );

    console.log("✅ Usuário registrado! ID:", result.id);

    return Response.json(
      {
        success: true,
        user: {
          id: result.id,
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