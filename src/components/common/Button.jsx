// Projeto Novo

"use client";

import { useState, useRef } from "react";
import "@/styles/Button.css";

/**
 * Componente Button - Totalmente personalizável
 *
 * Exemplo de uso básico:
 * <Button>Clique aqui</Button>
 *
 * Com variantes:
 * <Button variant="secondary">Secundário</Button>
 * <Button variant="danger">Perigo</Button>
 *
 * Com ícone (antes):
 * <Button icon={<IconSvg />}>Com ícone</Button>
 *
 * Com ícone (depois):
 * <Button icon={<IconSvg />} iconPosition="right">Com ícone</Button>
 *
 * Com loading (controle externo):
 * const [isLoading, setIsLoading] = useState(false);
 * <Button isLoading={isLoading} onClick={async () => { ... }}>Enviar</Button>
 *
 * Com tamanho customizado:
 * <Button size="small">Pequeno</Button>
 * <Button size="large">Grande</Button>
 */

export default function Button({
  // Conteúdo
  children,
  icon = null,
  iconPosition = "left", // 'left' ou 'right'

  // Comportamento
  onClick,
  disabled = false,
  type = "button",

  // Visual
  variant = "primary", // 'primary', 'secondary', 'danger', 'outline', 'ghost'
  size = "medium", // 'small', 'medium', 'large'
  fullWidth = false,

  // Estado de loading
  isLoading = false,
  loadingText = "Carregando...",

  // Props adicionais (className, data-*, etc)
  ...props
}) {
  // Ref para prevenir cliques duplos durante async operations
  const buttonRef = useRef(null);
  const [internalLoading, setInternalLoading] = useState(false);

  // Determina se o button está em estado de loading
  const isInLoading = isLoading || internalLoading;

  // Manipulador de clique com proteção contra cliques duplos
  const handleClick = async (event) => {
    // Se já está carregando ou desabilitado, não faz nada
    if (isInLoading || disabled) {
      event.preventDefault();
      return;
    }

    // Se não há onClick, apenas retorna
    if (!onClick) {
      return;
    }

    // Marca como carregando se for uma função async
    const isAsyncFunction = onClick.constructor.name === "AsyncFunction";

    if (isAsyncFunction) {
      setInternalLoading(true);
    }

    try {
      // Executa o callback (pode ser sync ou async)
      const result = onClick(event);

      // Se for uma Promise (função async), aguarda
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      // Log do erro - você pode adicionar um toast/snackbar aqui
      console.error("Erro no Button onClick:", error);
      throw error; // Re-lança para o chamador tratar se necessário
    } finally {
      // Remove o estado de loading
      setInternalLoading(false);
    }
  };

  // Classe base
  const baseClass = "button";

  // Cria classes dinâmicas
  const classes = [
    baseClass,
    `button--${variant}`,
    `button--${size}`,
    fullWidth && "button--full-width",
    isInLoading && "button--loading",
    disabled && "button--disabled",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={buttonRef}
      type={type}
      className={classes}
      disabled={disabled || isInLoading}
      onClick={handleClick}
      aria-busy={isInLoading}
      aria-disabled={disabled || isInLoading}
      {...props}
    >
      {/* Container flex para alinhar ícone + texto */}
      <span className="button__content">
        {/* Ícone antes do texto */}
        {icon && iconPosition === "left" && (
          <span className="button__icon button__icon--left" aria-hidden="true">
            {icon}
          </span>
        )}

        {/* Texto ou loading text */}
        <span className="button__text">
          {isInLoading ? loadingText : children}
        </span>

        {/* Ícone depois do texto */}
        {icon && iconPosition === "right" && (
          <span className="button__icon button__icon--right" aria-hidden="true">
            {icon}
          </span>
        )}
      </span>

      {/* Spinner de loading (opcional - você pode customizar) */}
      {isInLoading && (
        <span className="button__spinner" aria-hidden="true">
          <span className="button__spinner-dot"></span>
        </span>
      )}
    </button>
  );
}
