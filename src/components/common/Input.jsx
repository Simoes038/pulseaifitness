// Componente de Input robusto e totalmente customizável
// Suporta validação, estados, ícones e mais

import React, { useId, forwardRef } from "react";
import styles from "@/styles/Input.css";

/**
 * Componente Input personalizado
 *
 * @param {string} type - Tipo do input (text, email, password, number, tel, etc)
 * @param {string} label - Label associado ao input
 * @param {string} placeholder - Texto de placeholder
 * @param {string} helperText - Texto de ajuda abaixo do input
 * @param {string} errorMessage - Mensagem de erro (quando houver erro)
 * @param {string} successMessage - Mensagem de sucesso
 * @param {boolean} disabled - Desabilita o input
 * @param {boolean} required - Define como obrigatório
 * @param {string} variant - 'default', 'error', 'success', 'warning'
 * @param {string} size - 'sm', 'base', 'lg'
 * @param {string} iconLeft - Ícone ou elemento para o lado esquerdo
 * @param {string} iconRight - Ícone ou elemento para o lado direito
 * @param {string} className - Classes CSS adicionais
 * @param {object} containerProps - Props adicionais para o container
 * @param {...props} props - Todas as propriedades nativas do input
 */
const Input = forwardRef(
  (
    {
      type = "text",
      label,
      placeholder,
      helperText,
      errorMessage,
      successMessage,
      disabled = false,
      required = false,
      variant = "default",
      size = "base",
      iconLeft,
      iconRight,
      className = "",
      containerProps = {},
      onChange,
      onFocus,
      onBlur,
      value,
      ...props
    },
    ref
  ) => {
    // Gera um ID único para o input (acessibilidade)
    const inputId = useId();
    const uniqueId = props.id || inputId;

    // Define o variant baseado em errorMessage ou successMessage
    let finalVariant = variant;
    if (errorMessage) finalVariant = "error";
    if (successMessage) finalVariant = "success";

    return (
      <div className={`input-container ${className}`} {...containerProps}>
        {/* Label do Input */}
        {label && (
          <label htmlFor={uniqueId} className="input-label">
            {label}
            {required && <span className="input-label-required">*</span>}
          </label>
        )}

        {/* Wrapper para ícones */}
        <div className={`input-wrapper input-wrapper--${size}`}>
          {/* Ícone esquerdo */}
          {iconLeft && (
            <span className="input-icon input-icon--left" aria-hidden="true">
              {iconLeft}
            </span>
          )}

          {/* Input principal */}
          <input
            ref={ref}
            id={uniqueId}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            className={`input input--${finalVariant} input--${size} ${
              iconLeft ? "input--with-icon-left" : ""
            } ${iconRight ? "input--with-icon-right" : ""}`}
            aria-invalid={finalVariant === "error"}
            aria-describedby={
              errorMessage || helperText || successMessage
                ? `${uniqueId}-message`
                : undefined
            }
            {...props}
          />

          {/* Ícone direito */}
          {iconRight && (
            <span className="input-icon input-icon--right" aria-hidden="true">
              {iconRight}
            </span>
          )}
        </div>

        {/* Mensagens (Erro, Sucesso, Ajuda) */}
        {(errorMessage || helperText || successMessage) && (
          <span
            id={`${uniqueId}-message`}
            className={`input-message ${
              errorMessage
                ? "input-message--error"
                : successMessage
                ? "input-message--success"
                : "input-message--helper"
            }`}
            role={errorMessage ? "alert" : "status"}
          >
            {errorMessage || successMessage || helperText}
          </span>
        )}
      </div>
    );
  }
);

// Display name para debugging
Input.displayName = "Input";

export default Input;
