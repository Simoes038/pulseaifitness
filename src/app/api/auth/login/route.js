export const runtime = "nodejs";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { initializeDatabase, dbGet, dbRun } from "@/lib/db.js";

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
    // garante que o banco está pronto
    await initializeDatabase();

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

    const user = await dbGet(
      "SELECT id, email, password_hash, full_name FROM users WHERE email = ?",
      [normalizedEmail]
    );

    // evita revelar se usuário existe
    if (!user || !user.password_hash) {
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

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "24h" }
    );

    await dbRun(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [user.id]
    );

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