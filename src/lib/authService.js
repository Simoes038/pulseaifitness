// lib/authService.js
// Serviço de autenticação - gerencia login, registro e OAuth

import { validateEmail, validatePassword, sanitizeInput } from "./validation";

/**
 * Verifica se o script do Google foi carregado
 * @returns {boolean} True se Google está disponível
 */
export function isGoogleLoaded() {
  return typeof window !== "undefined" && window.google !== undefined;
}

/**
 * Realiza login ou registro com email e senha
 *
 * @param {string} email - Email do usuário
 * @param {string} password - Senha do usuário
 * @param {boolean} isRegistering - Se é registro (true) ou login (false)
 * @param {string} fullName - Nome completo (obrigatório para registro)
 * @returns {Promise<object>} { success: boolean, error?: string, data?: object }
 */
export async function loginWithEmail(
  email,
  password,
  isRegistering = false,
  fullName = ""
) {
  try {
    // Validações básicas
    if (!email || !password) {
      return {
        success: false,
        error: "Email e senha são obrigatórios",
      };
    }

    // Valida email
    if (!validateEmail(email)) {
      return {
        success: false,
        error: "Email inválido",
      };
    }

    // Se for registro, valida senha forte
    if (isRegistering) {
      if (!validatePassword(password)) {
        return {
          success: false,
          error:
            "Senha deve ter 8+ caracteres, maiúscula, minúscula, número e caractere especial",
        };
      }

      if (!fullName || fullName.trim().length < 3) {
        return {
          success: false,
          error: "Nome completo é obrigatório",
        };
      }
    }

    // Sanitiza inputs
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const sanitizedName = isRegistering ? sanitizeInput(fullName) : "";

    // Prepara dados para o servidor
    const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
    const payload = {
      email: sanitizedEmail,
      password: password, // Nunca sanitizar senhas! (servidor valida)
      ...(isRegistering && { fullName: sanitizedName }),
    };

    // Faz requisição ao servidor
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Inclui cookies (importante para sessões)
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // Verifica resposta
    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Erro ao processar solicitação",
      };
    }

    // Armazena token se fornecido
    if (data.token) {
      if (typeof window !== "undefined") {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
    }

    return {
      success: true,
      data: {
        user: data.user,
        token: data.token,
      },
    };
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return {
      success: false,
      error: "Erro ao processar solicitação. Tente novamente.",
    };
  }
}

/**
 * Realiza login com Google OAuth
 *
 * @param {string} googleToken - JWT token do Google
 * @returns {Promise<object>} { success: boolean, error?: string, data?: object }
 */
export async function loginWithGoogle(googleToken) {
  try {
    if (!googleToken) {
      return {
        success: false,
        error: "Token do Google não fornecido",
      };
    }

    // Envia token do Google para o servidor
    // O servidor irá:
    // 1. Verificar a assinatura do token
    // 2. Extrair dados do usuário
    // 3. Criar/atualizar usuário no banco
    // 4. Retornar token de sessão

    const response = await fetch("/api/auth/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        token: googleToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Erro ao fazer login com Google",
      };
    }

    // Armazena token de sessão
    if (data.token) {
      if (typeof window !== "undefined") {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
    }

    return {
      success: true,
      data: {
        user: data.user,
        token: data.token,
      },
    };
  } catch (error) {
    console.error("Erro no login com Google:", error);
    return {
      success: false,
      error: "Erro ao processar login com Google",
    };
  }
}

/**
 * Faz logout do usuário
 * Limpa tokens e dados locais
 *
 * @returns {Promise<object>} { success: boolean }
 */
export async function logout() {
  try {
    // Notifica servidor
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    // Limpa dados locais
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      sessionStorage.clear();
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    // Mesmo com erro, limpa dados locais
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    }
    return { success: true };
  }
}

/**
 * Obtém dados do usuário do localStorage
 *
 * @returns {object|null} Dados do usuário ou null
 */
export function getCurrentUser() {
  if (typeof window === "undefined") return null;

  const userJson = localStorage.getItem("user");
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

/**
 * Obtém token de autenticação
 *
 * @returns {string|null} Token ou null
 */
export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

/**
 * Verifica se usuário está autenticado
 *
 * @returns {boolean} True se tem token válido
 */
export function isAuthenticated() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("authToken");
}

/**
 * Faz requisição autenticada (inclui token no header)
 *
 * @param {string} url - URL da requisição
 * @param {object} options - Opções do fetch
 * @returns {Promise<Response>} Resposta do fetch
 */
export async function authenticatedFetch(url, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Não autenticado");
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

/**
 * Refresh do token de autenticação
 * Chama endpoint de refresh no servidor
 *
 * @returns {Promise<object>} { success: boolean, token?: string }
 */
export async function refreshToken() {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao renovar token");
    }

    // Armazena novo token
    if (data.token && typeof window !== "undefined") {
      localStorage.setItem("authToken", data.token);
    }

    return {
      success: true,
      token: data.token,
    };
  } catch (error) {
    console.error("Erro ao renovar token:", error);
    return {
      success: false,
    };
  }
}

/**
 * Solicita reset de senha
 *
 * @param {string} email - Email do usuário
 * @returns {Promise<object>} { success: boolean, error?: string }
 */
export async function requestPasswordReset(email) {
  try {
    if (!validateEmail(email)) {
      return {
        success: false,
        error: "Email inválido",
      };
    }

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: sanitizeInput(email.toLowerCase()) }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Erro ao solicitar reset",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Erro ao solicitar reset:", error);
    return {
      success: false,
      error: "Erro ao processar solicitação",
    };
  }
}
