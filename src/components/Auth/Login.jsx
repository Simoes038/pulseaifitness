'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { validateEmail, validatePassword } from '@/lib/validation';
import { loginWithEmail, loginWithGoogle } from '@/lib/authService';

export default function LoginPage() {
  const router = useRouter();
  const googleButtonRef = useRef(null);

  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [googleError, setGoogleError] = useState('');

  useEffect(() => {
    const loadGoogleScript = () => {
      if (window.google) {
        initializeGoogle();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.body.appendChild(script);
    };

    loadGoogleScript();
  }, []);

  const initializeGoogle = () => {
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      callback: handleGoogleResponse,
      ux_mode: 'popup',
    });

    if (googleButtonRef.current) {
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: isRegistering ? 'signup_with' : 'signin_with',
      });
    }
  };

  const handleGoogleResponse = async (response) => {
    if (!response.credential) return;

    setIsLoading(true);
    setGoogleError('');

    try {
      const result = await loginWithGoogle(response.credential);

      if (result.success) {
        setSuccessMessage('✓ Login realizado!');
        setTimeout(() => router.push('/dashboard'), 1000);
      } else {
        setGoogleError(result.error);
      }
    } catch {
      setGoogleError('Erro ao autenticar com Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateField = (field, value) => {
    switch (field) {
      case 'email':
        if (!value) return 'Email obrigatório';
        if (!validateEmail(value)) return 'Email inválido';
        break;

      case 'password':
        if (!value) return 'Senha obrigatória';
        if (!isRegistering && value.length < 6)
          return 'Senha mínima: 6 caracteres';
        if (isRegistering && !validatePassword(value))
          return 'Senha fraca';
        break;

      case 'confirmPassword':
        if (isRegistering && value !== formData.password)
          return 'Senhas não coincidem';
        break;

      case 'fullName':
        if (isRegistering && value.trim().length < 3)
          return 'Nome inválido';
        break;
    }

    return null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: validateField(name, value),
      }));
    }
  };

  const handleInputBlur = (e) => {
    const { name, value } = e.target;

    setTouched((prev) => ({ ...prev, [name]: true }));

    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  const validateForm = () => {
    const fields = isRegistering
      ? ['fullName', 'email', 'password', 'confirmPassword']
      : ['email', 'password'];

    const newErrors = {};

    fields.forEach((field) => {
      const err = validateField(field, formData[field]);
      if (err) newErrors[field] = err;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setErrorMessage('Corrija os erros.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = isRegistering
        ? await loginWithEmail(
            formData.email,
            formData.password,
            true,
            formData.fullName
          )
        : await loginWithEmail(formData.email, formData.password, false);

      if (result.success) {
        setSuccessMessage('Login realizado!');
        setTimeout(() => router.push('/dashboard'), 1200);
      } else {
        setErrorMessage(result.error);
      }
    } catch {
      setErrorMessage('Erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsRegistering(!isRegistering);
    setErrors({});
    setTouched({});
    setErrorMessage('');
    setSuccessMessage('');
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
    });
  };

  return (
    <div style={styles.wrapper}>
      {/* Gradiente de fundo */}
      <div style={styles.backgroundGradient}></div>

      {/* Container principal */}
      <div style={styles.container}>
        {/* Card esquerdo - Info (visível apenas em desktop) */}
        <div style={styles.infoSection} className="info-section">
          <div style={styles.infoBrand}>
            <div style={styles.brandIcon}>💪</div>
            <h2 style={styles.infoBrandTitle}>PULSE AI</h2>
            <p style={styles.infoBrandSubtitle}>Fitness Inteligente</p>
          </div>

          <div style={styles.infoContent}>
            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>🤖</span>
              <p>Treinos gerados com IA</p>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>📊</span>
              <p>Acompanhamento inteligente</p>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoIcon}>⚡</span>
              <p>Resultados personalizados</p>
            </div>
          </div>

          <p style={styles.infoCopyright}>
            © 2026 PULSE AI Fitness. Seu treino, nossa inteligência.
          </p>
        </div>

        {/* Card direito - Formulário */}
        <div style={styles.formSection} className="form-section">
          <div style={styles.formCard} className="form-card">
            {/* Cabeçalho */}
            <div style={styles.formHeader}>
              <h1 style={styles.formTitle}>
                PULSE AI <span style={styles.fitnessBadge}>FITNESS</span>
              </h1>
              <p style={styles.formSubtitle}>
                {isRegistering
                  ? 'Crie sua conta e comece agora'
                  : 'Seu treino inteligente começa aqui'}
              </p>
            </div>

            {/* Alertas */}
            {successMessage && (
              <div style={styles.alertSuccess}>
                <span style={styles.alertIcon}>✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div style={styles.alertError}>
                <span style={styles.alertIcon}>⚠</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {googleError && (
              <div style={styles.alertError}>
                <span style={styles.alertIcon}>✕</span>
                <span>{googleError}</span>
              </div>
            )}

            {/* Formulário */}
            <form style={styles.form} onSubmit={handleSubmit}>
              {isRegistering && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nome completo</label>
                  <input
                    style={{
                      ...styles.input,
                      borderColor: errors.fullName && touched.fullName ? '#dc2626' : '#404854',
                    }}
                    name="fullName"
                    placeholder="João Silva"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                  />
                  {errors.fullName && touched.fullName && (
                    <span style={styles.errorText}>{errors.fullName}</span>
                  )}
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  style={{
                    ...styles.input,
                    borderColor: errors.email && touched.email ? '#dc2626' : '#404854',
                  }}
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                />
                {errors.email && touched.email && (
                  <span style={styles.errorText}>{errors.email}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Senha</label>
                <input
                  style={{
                    ...styles.input,
                    borderColor: errors.password && touched.password ? '#dc2626' : '#404854',
                  }}
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                />
                {errors.password && touched.password && (
                  <span style={styles.errorText}>{errors.password}</span>
                )}
              </div>

              {isRegistering && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Confirmar senha</label>
                  <input
                    style={{
                      ...styles.input,
                      borderColor: errors.confirmPassword && touched.confirmPassword ? '#dc2626' : '#404854',
                    }}
                    type="password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                  />
                  {errors.confirmPassword && touched.confirmPassword && (
                    <span style={styles.errorText}>{errors.confirmPassword}</span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  ...styles.submitButton,
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? '⏳ Processando...' : isRegistering ? 'Criar Conta' : 'Entrar'}
              </button>
            </form>

            {/* Divider */}
            <div style={styles.divider}>
              <div style={styles.dividerLine}></div>
              <span style={styles.dividerText}>Ou continue com</span>
              <div style={styles.dividerLine}></div>
            </div>

            {/* Google Button */}
            <div style={styles.googleButton} ref={googleButtonRef}></div>

            {/* Toggle */}
            <div style={styles.toggle}>
              <p style={styles.toggleText}>
                {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
              </p>
              <button
                type="button"
                onClick={toggleAuthMode}
                style={styles.toggleButton}
              >
                {isRegistering ? 'Fazer login' : 'Criar conta'}
              </button>
            </div>

            {/* Footer Links */}
            <div style={styles.footerLinks}>
              <Link href="https://www.mpf.mp.br/servicos/lgpd/o-que-e-a-lgpd" style={styles.link}>
                Privacidade
              </Link>
              <span style={styles.linkSeparator}>•</span>
              <Link href="https://portaldatransparencia.gov.br/termos-de-uso" style={styles.link}>
                Termos
              </Link>
              <span style={styles.linkSeparator}>•</span>
              <Link href="https://wa.me/5538984268482?text=Estou%20com%20problemas%20para%20acessar%20o%20PULSE%20AI%20FITNESS" style={styles.link}>
                Suporte
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        /* Desktop - 1024px+ */
        @media (min-width: 1024px) {
          .info-section {
            display: flex !important;
          }
        }

        /* Tablet - 768px a 1023px */
        @media (max-width: 1023px) and (min-width: 768px) {
          .info-section {
            display: none !important;
          }

          .form-card {
            max-width: 100% !important;
            padding: clamp(24px, 4vw, 40px) !important;
          }
        }

        /* Mobile grande - 481px a 767px */
        @media (max-width: 767px) and (min-width: 481px) {
          .info-section {
            display: none !important;
          }

          .form-card {
            max-width: 100% !important;
            padding: clamp(20px, 3vw, 32px) !important;
            border-radius: 16px !important;
          }
        }

        /* Mobile pequeno - até 480px */
        @media (max-width: 480px) {
          .info-section {
            display: none !important;
          }

          .form-card {
            max-width: 100% !important;
            padding: 16px !important;
            border-radius: 16px !important;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
          }

          h1 {
            font-size: 20px !important;
          }

          label {
            font-size: 11px !important;
          }

          input {
            font-size: 13px !important;
            padding: 10px 12px !important;
          }

          button {
            font-size: 14px !important;
            padding: 10px 12px !important;
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .form-card {
          animation: slideIn 0.6s ease-out;
        }

        /* Hover effects para desktop */
        @media (hover: hover) {
          button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
          }

          input:focus {
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
          }
        }

        /* Touch devices */
        @media (hover: none) {
          button:active:not(:disabled) {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1f2e',
    position: 'relative',
    overflow: 'hidden',
    padding: 'max(12px, min(5vw, 24px))',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 20% 50%, rgba(220, 38, 38, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
    pointerEvents: 'none',
  },

  container: {
    display: 'flex',
    gap: 'clamp(20px, 5vw, 40px)',
    maxWidth: '1200px',
    width: '100%',
    position: 'relative',
    zIndex: 1,
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Seção Info (esquerda)
  infoSection: {
    flex: '1 1 40%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    color: '#e5e7eb',
    minWidth: '300px',
    minHeight: '500px',
  },

  infoBrand: {
    textAlign: 'center',
  },

  brandIcon: {
    fontSize: 'clamp(36px, 8vw, 48px)',
    marginBottom: '16px',
  },

  infoBrandTitle: {
    fontSize: 'clamp(22px, 5vw, 32px)',
    fontWeight: '700',
    margin: '0 0 8px 0',
    color: '#ffffff',
    letterSpacing: '-0.5px',
  },

  infoBrandSubtitle: {
    fontSize: 'clamp(12px, 3vw, 16px)',
    color: '#9ca3af',
    margin: '0',
  },

  infoContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(16px, 3vw, 24px)',
  },

  infoItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  },

  infoIcon: {
    fontSize: 'clamp(20px, 4vw, 24px)',
    minWidth: 'clamp(20px, 4vw, 24px)',
  },

  infoCopyright: {
    fontSize: 'clamp(10px, 2vw, 12px)',
    color: '#6b7280',
    textAlign: 'center',
    margin: '0',
    lineHeight: '1.5',
  },

  // Seção Formulário (direita)
  formSection: {
    flex: '1 1 50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minWidth: '300px',
  },

  formCard: {
    background: '#252d3d',
    borderRadius: '20px',
    padding: 'clamp(20px, 4vw, 48px)',
    width: '100%',
    maxWidth: '420px',
    minWidth: '280px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
    border: '1px solid #353f4f',
  },

  formHeader: {
    marginBottom: 'clamp(20px, 4vw, 32px)',
    textAlign: 'center',
  },

  formTitle: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(18px, 5vw, 28px)',
    fontWeight: '700',
    color: '#ffffff',
  },

  fitnessBadge: {
    color: '#dc2626',
    fontWeight: '700',
  },

  formSubtitle: {
    margin: '0',
    fontSize: 'clamp(11px, 3vw, 14px)',
    color: '#9ca3af',
    lineHeight: '1.4',
  },

  // Alertas
  alertSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: 'clamp(10px, 2vw, 12px) clamp(12px, 3vw, 16px)',
    marginBottom: '20px',
    borderRadius: '12px',
    backgroundColor: '#10b98100',
    color: '#10b981',
    fontSize: 'clamp(12px, 2vw, 14px)',
    border: '1px solid #10b98140',
  },

  alertError: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: 'clamp(10px, 2vw, 12px) clamp(12px, 3vw, 16px)',
    marginBottom: '20px',
    borderRadius: '12px',
    backgroundColor: '#dc262600',
    color: '#dc2626',
    fontSize: 'clamp(12px, 2vw, 14px)',
    border: '1px solid #dc262640',
  },

  alertIcon: {
    fontSize: '16px',
    fontWeight: 'bold',
    minWidth: '16px',
  },

  // Formulário
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(12px, 2vw, 16px)',
    marginBottom: '24px',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  label: {
    fontSize: 'clamp(10px, 2vw, 13px)',
    fontWeight: '600',
    color: '#d1d5db',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  input: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2.5vw, 16px)',
    borderRadius: '10px',
    border: '2px solid #404854',
    backgroundColor: '#1f2839',
    color: '#ffffff',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    width: '100%',
  },

  errorText: {
    fontSize: 'clamp(10px, 2vw, 12px)',
    color: '#dc2626',
    fontWeight: '500',
  },

  submitButton: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2.5vw, 16px)',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: 'clamp(12px, 2.5vw, 15px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '8px',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
    width: '100%',
  },

  // Divider
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
  },

  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#404854',
  },

  dividerText: {
    fontSize: 'clamp(11px, 2.5vw, 13px)',
    color: '#9ca3af',
    whiteSpace: 'nowrap',
  },

  googleButton: {
    marginBottom: '24px',
  },

  // Toggle
  toggle: {
    textAlign: 'center',
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid #353f4f',
  },

  toggleText: {
    margin: '0 0 12px 0',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    color: '#9ca3af',
  },

  toggleButton: {
    background: 'transparent',
    border: '2px solid #3b82f6',
    color: '#3b82f6',
    padding: 'clamp(8px, 1.5vw, 10px) clamp(16px, 3vw, 20px)',
    borderRadius: '8px',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: '100%',
  },

  // Footer Links
  footerLinks: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    fontSize: 'clamp(10px, 2vw, 12px)',
    flexWrap: 'wrap',
  },

  link: {
    color: '#3b82f6',
    textDecoration: 'none',
    transition: 'color 0.3s ease',
  },

  linkSeparator: {
    color: '#6b7280',
  },
};''