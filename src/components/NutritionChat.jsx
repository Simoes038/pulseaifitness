'use client';

import { useState, useEffect, useRef } from 'react';

export default function NutritionChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content:
        'Oi! Sou seu nutricionista IA 💪 Como posso ajudar na sua dieta hoje?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const text = input;
    const userMessage = { role: 'user', content: text };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('authToken')
        : null;

      const res = await fetch('/api/nutrition/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      const aiText =
        res.ok && data?.message
          ? data.message
          : 'Tive um problema para analisar sua pergunta agora. Tente novamente em alguns segundos.';

      setMessages((prev) => [...prev, { role: 'ai', content: aiText }]);
    } catch (error) {
      console.error('Erro no chat de nutrição:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content:
            'Não consegui falar com o servidor agora (possível erro de rede). Verifique sua conexão e tente novamente.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const styles = {
    container: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      width: 'calc(100vw - 40px)',
      maxWidth: '420px',
      height: 'calc(100vh - 40px)',
      maxHeight: '600px',
      background: 'rgba(37, 45, 61, 0.98)',
      backdropFilter: 'blur(20px)',
      border: '1px solid #353f4f',
      borderRadius: '20px',
      boxShadow: '0 20px 60px rgba(185, 16, 16, 0.4)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '@media (max-width: 480px)': {
        bottom: '10px',
        right: '10px',
        left: '10px',
        width: 'calc(100vw - 20px)',
        height: 'calc(100vh - 20px)',
        maxHeight: 'none',
        borderRadius: '16px',
      },
    },
    header: {
      padding: '20px 24px',
      borderBottom: '1px solid #353f4f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'linear-gradient(135deg, #b91010 0%, #960505 100%)',
      '@media (max-width: 480px)': {
        padding: '16px 20px',
      },
    },
    title: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: 'white',
      margin: 0,
      '@media (max-width: 480px)': {
        fontSize: '16px',
      },
    },
    closeBtn: {
      width: '36px',
      height: '36px',
      background: 'rgba(255,255,255,0.2)',
      color: 'white',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.2s ease',
      backdropFilter: 'blur(10px)',
      '@media (max-width: 480px)': {
        width: '32px',
        height: '32px',
        fontSize: '16px',
      },
    },
    messagesContainer: {
      flex: 1,
      padding: '20px 24px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      scrollbarWidth: 'thin',
      scrollbarColor: '#b91010 #353f4f',
      '@media (max-width: 480px)': {
        padding: '16px 20px',
        gap: '12px',
      },
    },
    message: {
      maxWidth: '85%',
      padding: '12px 16px',
      borderRadius: '18px',
      fontSize: '14px',
      lineHeight: 1.5,
      wordBreak: 'break-word',
      whiteSpace: 'pre-wrap',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'all 0.2s ease',
      '@media (max-width: 480px)': {
        maxWidth: '95%',
        padding: '10px 14px',
        fontSize: '13px',
      },
    },
    userMessage: {
      alignSelf: 'flex-end',
      background: 'linear-gradient(135deg, #b91010 0%, #960505 100%)',
      color: 'white',
    },
    aiMessage: {
      alignSelf: 'flex-start',
      background: '#1f2937',
      color: '#e5e7eb',
      border: '1px solid #374151',
    },
    loadingContainer: {
      display: 'flex',
      gap: '6px',
      padding: '12px 16px',
      alignSelf: 'flex-start',
      alignItems: 'center',
      '@media (max-width: 480px)': {
        padding: '10px 12px',
      },
    },
    loadingDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: '#b91010',
      animation: 'loadingPulse 1.4s infinite ease-in-out',
      animationDelay: '0s',
    },
    loadingDot2: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: '#b91010',
      animation: 'loadingPulse 1.4s infinite ease-in-out',
      animationDelay: '0.2s',
    },
    loadingDot3: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: '#b91010',
      animation: 'loadingPulse 1.4s infinite ease-in-out',
      animationDelay: '0.4s',
    },
    inputContainer: {
      padding: '20px 24px',
      borderTop: '1px solid #353f4f',
      background: 'rgba(31, 41, 55, 0.8)',
      '@media (max-width: 480px)': {
        padding: '16px 20px',
      },
    },
    inputWrapper: {
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-end',
    },
    input: {
      flex: 1,
      background: 'rgba(31, 41, 55, 1)',
      border: '1px solid #4b5563',
      borderRadius: '20px',
      padding: '14px 18px',
      color: 'white',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s ease',
      minHeight: '20px',
      resize: 'none',
      '@media (max-width: 480px)': {
        padding: '12px 16px',
        fontSize: '13px',
      },
    },
    sendBtn: {
      width: '52px',
      height: '52px',
      background:
        'linear-gradient(135deg, #b91010 0%, #960505 100%)',
      color: 'white',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 16px rgba(185, 16, 16, 0.4)',
      border: 'none',
      cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
      opacity: loading || !input.trim() ? 0.6 : 1,
      fontSize: '20px',
      fontWeight: 'bold',
      transition: 'all 0.2s ease',
      '@media (max-width: 480px)': {
        width: '48px',
        height: '48px',
        fontSize: '18px',
      },
    },
    floatingBtn: {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      width: '68px',
      height: '68px',
      background:
        'linear-gradient(135deg, #b91010 0%, #960505 100%)',
      color: 'white',
      borderRadius: '50%',
      boxShadow: '0 12px 40px rgb(223, 10, 10)',
      border: '3px solid rgba(255, 255, 255, 0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '28px',
      cursor: 'pointer',
      transition:
        'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      backdropFilter: 'blur(20px)',
      '@media (max-width: 768px)': {
        bottom: '20px',
        right: '20px',
        width: '64px',
        height: '64px',
        fontSize: '26px',
      },
      '@media (max-width: 480px)': {
        bottom: '16px',
        right: '16px',
        width: '60px',
        height: '60px',
        fontSize: '24px',
      },
    },
  };

  return (
    <>
      {/* BOTÃO FLUTUANTE */}
      {!isOpen && (
        <button
          style={styles.floatingBtn}
          onClick={() => setIsOpen(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow =
              '0 16px 50px rgba(233, 12, 12, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow =
              '0 12px 40px rgba(228, 15, 15, 0.5)';
          }}
        >
          👨🏻‍⚕️
        </button>
      )}

      {/* CHAT MODAL */}
      {isOpen && (
        <div style={styles.container}>
          {/* HEADER */}
          <div style={styles.header}>
            <h3 style={styles.title}>Scooby - Nutri</h3>
            <button
              style={styles.closeBtn}
              onClick={() => setIsOpen(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              }}
            >
              ✕
            </button>
          </div>

          {/* MENSAGENS */}
          <div style={styles.messagesContainer}>
            {messages.map((message, i) => (
              <div
                key={`${message.role}-${i}`}
                style={{
                  display: 'flex',
                  justifyContent:
                    message.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '4px',
                }}
              >
                <div
                  style={{
                    ...styles.message,
                    ...(message.role === 'user'
                      ? styles.userMessage
                      : styles.aiMessage),
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={styles.loadingContainer}>
                <div style={styles.loadingDot}></div>
                <div style={styles.loadingDot2}></div>
                <div style={styles.loadingDot3}></div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div style={styles.inputContainer}>
            <div style={styles.inputWrapper}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Digite sua pergunta sobre dieta, calorias, macros..."
                style={styles.input}
                rows={1}
                disabled={loading}
              />
              <button
                style={styles.sendBtn}
                onClick={handleSend}
                disabled={loading || !input.trim()}
                onMouseEnter={
                  loading || !input.trim()
                    ? undefined
                    : (e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow =
                          '0 6px 20px rgba(185, 16, 16, 0.8)';
                      }
                }
                onMouseLeave={
                  loading || !input.trim()
                    ? undefined
                    : (e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow =
                          '0 4px 16px rgba(185, 16, 16, 0.4)';
                      }
                }
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes loadingPulse {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}
