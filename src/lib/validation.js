// lib/validation.js
// Funções de validação para o formulário de login

/**
 * Valida se um email é válido
 * Usa regex para validar o formato básico
 *
 * @param {string} email - Email a validar
 * @returns {boolean} True se email é válido
 */
export function validateEmail(email) {
  // Regex simples para validação de email
  // Para produção, considere usar uma biblioteca como validator.js
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida se uma senha é forte
 * Requisitos:
 * - Mínimo 8 caracteres
 * - Pelo menos 1 maiúscula
 * - Pelo menos 1 minúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 caractere especial (!@#$%^&*)
 *
 * @param {string} password - Senha a validar
 * @returns {boolean} True se senha é forte
 */
export function validatePassword(password) {
  // Verifica se tem pelo menos 8 caracteres
  if (password.length < 8) {
    return false;
  }

  // Verifica se tem maiúscula
  if (!/[A-Z]/.test(password)) {
    return false;
  }

  // Verifica se tem minúscula
  if (!/[a-z]/.test(password)) {
    return false;
  }

  // Verifica se tem número
  if (!/[0-9]/.test(password)) {
    return false;
  }

  // Verifica se tem caractere especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false;
  }

  return true;
}

/**
 * Sanitiza entrada de usuário para prevenir XSS
 * Remove caracteres perigosos mantendo espaços válidos
 *
 * @param {string} input - Entrada a sanitizar
 * @returns {string} Entrada sanitizada
 */
export function sanitizeInput(input) {
  // Remove caracteres HTML/script perigosos
  return input
    .replace(/[<>]/g, "") // Remove < e >
    .replace(/javascript:/gi, "") // Remove javascript:
    .replace(/on\w+\s*=/gi, "") // Remove event handlers como onclick=
    .trim();
}

/**
 * Valida nome de usuário
 * Requisitos:
 * - Mínimo 3 caracteres
 * - Máximo 50 caracteres
 * - Apenas letras, números, hífens e underscores
 *
 * @param {string} username - Username a validar
 * @returns {boolean} True se username é válido
 */
export function validateUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
  return usernameRegex.test(username);
}

/**
 * Valida nome completo
 * Requisitos:
 * - Mínimo 3 caracteres
 * - Máximo 100 caracteres
 * - Apenas letras, espaços e caracteres acentuados
 *
 * @param {string} fullName - Nome completo a validar
 * @returns {boolean} True se nome é válido
 */
export function validateFullName(fullName) {
  const nameRegex = /^[a-zA-ZÀ-ÿ\s]{3,100}$/;
  return nameRegex.test(fullName.trim());
}

/**
 * Verifica força da senha e retorna um score
 * Útil para mostrar indicador visual de força
 *
 * @param {string} password - Senha a avaliar
 * @returns {object} { score: number, strength: string }
 * score: 0-4 (0=fraca, 4=muito forte)
 */
export function getPasswordStrength(password) {
  let score = 0;

  // Tamanho
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Tipos de caracteres
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const strengths = ["Muito Fraca", "Fraca", "Média", "Forte", "Muito Forte"];
  const colors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

  return {
    score: Math.min(score, 4),
    strength: strengths[Math.min(score, 4)],
    color: colors[Math.min(score, 4)],
  };
}

/**
 * Valida tokens JWT básico (verifica estrutura)
 * Não valida assinatura - isso deve ser feito no servidor
 *
 * @param {string} token - Token JWT
 * @returns {boolean} True se estrutura é válida
 */
export function validateJWT(token) {
  const parts = token.split(".");

  // JWT deve ter 3 partes separadas por ponto
  if (parts.length !== 3) {
    return false;
  }

  // Tenta fazer decode das partes
  try {
    for (const part of parts) {
      // Valida se é base64 válido
      atob(part);
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Valida se um email já está registrado
 * Faz chamada à API
 *
 * @param {string} email - Email a verificar
 * @returns {Promise<boolean>} True se email já existe
 */
export async function checkEmailExists(email) {
  try {
    const response = await fetch("/api/auth/check-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error("Erro ao verificar email");
    }

    const data = await response.json();
    return data.exists || false;
  } catch (error) {
    console.error("Erro ao verificar email:", error);
    return false;
  }
}
