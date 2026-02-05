'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NutritionChat from '@/components/NutritionChat';

// ✅ ADICIONAR AQUI
if (typeof window !== 'undefined') {
  window.debugProgress = () => {
    console.log('📊 DEBUG COMPLETO:');
    console.log('userData:', localStorage.getItem('userData'));
    
    const keys = Object.keys(localStorage).filter(k => k.includes('training'));
    console.log('Todas as chaves training:', keys);
    
    keys.forEach(key => {
      console.log(`  ${key}:`, localStorage.getItem(key));
    });
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [training, setTraining] = useState(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [formStage, setFormStage] = useState('home');
  
  // ✅ NOVO: Estado para progresso dos treinos
  const [completedDays, setCompletedDays] = useState([]);
  
  const [formData, setFormData] = useState({
    altura: '',
    peso: '',
    biceps: '',
    antebraco: '',
    peitoral: '',
    cintura: '',
    ombro: '',
    quadriceps: '',
    coxa: '',
    panturrilha: '',
    gluteos: '',
    experiencia: '',
    sexo: '',
    local: '',
    diasSemana: '',
    objetivo: '',
  });
  const [imc, setImc] = useState(null);
  const [formError, setFormError] = useState('');
  const [tempoDiario, setTempoDiario] = useState(null);

// ✅ CORRIGIDO: Carregar progresso do localStorage
useEffect(() => {
  if (!training || !user) return;
  const key = `training_progress_${user.id || user.email}`; // ✅ MUDANÇA: usar user ao invés de training
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      setCompletedDays(JSON.parse(saved));
      console.log('✅ Progresso carregado:', JSON.parse(saved));
    } catch {
      setCompletedDays([]);
    }
  } else {
    setCompletedDays([]);
  }
}, [training, user]); // ✅ ADICIONAR user como dependência

// ✅ CORRIGIDO: Salvar progresso com userId do token (NÃO DEPENDE DE user)
const saveProgress = (days) => {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(window.atob(base64));
    
    const key = `training_progress_${decoded.userId}`;
    localStorage.setItem(key, JSON.stringify(days));
    console.log('💾 Progresso salvo:', { key, days });
  } catch (e) {
    console.error('Erro ao salvar progresso:', e);
  }
};

// ✅ CORRIGIDO: Carregar progresso com userId do token
useEffect(() => {
  if (!training) return;
  
  const token = localStorage.getItem('authToken');
  if (!token) return;
  
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(window.atob(base64));
    
    const key = `training_progress_${decoded.userId}`;
    const saved = localStorage.getItem(key);
    
    console.log('🔍 Carregando progresso:', { key, saved });
    
    if (saved) {
      try {
        setCompletedDays(JSON.parse(saved));
        console.log('✅ Progresso carregado:', JSON.parse(saved));
      } catch {
        setCompletedDays([]);
      }
    } else {
      setCompletedDays([]);
    }
  } catch (e) {
    console.error('Erro ao carregar progresso:', e);
    setCompletedDays([]);
  }
}, [training]);

// ✅ NOVO: Atualizar currentDay baseado no progresso
useEffect(() => {
  if (!training) return;
  const totalDays = training.diasSemana || 5;
  const pending = [];
  for (let d = 1; d <= totalDays; d++) {
    if (!completedDays.includes(d)) pending.push(d);
  }
  setCurrentDay(pending[0] || 1);
}, [training, completedDays]);


/* =============================== VERIFICA LOGIN + TREINO =============================== */
useEffect(() => {
  const verifyAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.push('/');
        return;
      }

      // ✅ DECODIFICAR TOKEN PARA PEGAR USER
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(window.atob(base64));
      
      console.log('🔍 Token decodificado:', decoded);

      // ✅ TENTAR localStorage PRIMEIRO
      let userData = null;
      const userStr = localStorage.getItem('userData');
      if (userStr) {
        try {
          userData = JSON.parse(userStr);
          console.log('✅ User do localStorage:', userData);
        } catch {
          console.log('❌ Erro lendo userData');
        }
      }

      // ✅ SE NÃO TEM, CRIAR DO TOKEN
      if (!userData) {
        userData = {
          id: decoded.userId,
          email: decoded.email || 'user@temp.com',
          fullName: decoded.fullName || 'Usuário'
        };
        localStorage.setItem('userData', JSON.stringify(userData));
        console.log('✅ User criado do token:', userData);
      }

      setUser(userData);

      const response = await fetch('/api/training/current', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTraining(data);
      } else {
        setTraining(null);
        setShowGenerateModal(true);
      }
    } catch (err) {
      console.error(err);
      setShowGenerateModal(true);
    } finally {
      setLoading(false);
    }
  };

  verifyAuth();
}, [router]);
  /* =============================== GERAR TREINO =============================== */
  const handleGenerateTraining = async () => {
    try {
      if (!tempoDiario) {
        setFormError('Selecione um tempo de treino');
        return;
      }

      setGenerating(true);
      setFormError('');

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/training/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          tempoDiario,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Erro ao gerar treino: ${errorData.error || 'Erro desconhecido'}`);
        return;
      }

      const data = await response.json();
      setTraining(data.training);
      setCurrentDay(1);
      setCompletedDays([]); // ✅ NOVO: Resetar progresso ao gerar novo treino
      setShowGenerateModal(false);
      setFormStage('home');
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar treino');
    } finally {
      setGenerating(false);
    }
  };

// ✅ NOVO: Marcar dia como concluído COM LOGS
const handleCompleteDay = () => {
  console.log('🎯 === INICIANDO CONCLUSÃO ===');
  console.log('User existe?', !!user);
  console.log('User.id:', user?.id);
  console.log('User.email:', user?.email);
  console.log('Selected Day:', selectedDay);
  console.log('Completed Days ANTES:', completedDays);
  
  if (!selectedDay || !training) {
    console.log('❌ Saiu: selectedDay ou training vazio');
    return;
  }
  
  const totalDays = training.diasSemana || 5;
  let newCompleted = [...new Set([...completedDays, selectedDay])];

  // Se concluiu TODOS os dias, reseta progresso
  if (newCompleted.length >= totalDays) {
    console.log('🔄 Resetando progresso - completou todos os dias');
    newCompleted = [];
  }

  console.log('✅ Novo array:', newCompleted);
  
  setCompletedDays(newCompleted);
  saveProgress(newCompleted);
  
  // Verificar se salvou
  const key = `training_progress_${user?.id || user?.email}`;
  console.log('🔍 Verificando localStorage:', localStorage.getItem(key));
  console.log('=== FIM CONCLUSÃO ===');
  
  setSelectedDay(null);
};

  const calculateIMC = (altura, peso) => {
    if (altura && peso) {
      const alturaM = altura / 100;
      const imcValue = peso / (alturaM * alturaM);
      setImc(imcValue.toFixed(1));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'altura' || field === 'peso') {
      calculateIMC(
        field === 'altura' ? value : formData.altura,
        field === 'peso' ? value : formData.peso
      );
    }
  };

  const validateStage = (stage) => {
    setFormError('');
    if (stage === 1) {
      if (!formData.altura || !formData.peso) {
        setFormError('Preencha altura e peso');
        return false;
      }
    } else if (stage === 2) {
      if (!formData.biceps || !formData.peitoral || !formData.cintura || !formData.quadriceps) {
        setFormError('Preencha pelo menos as medidas principais');
        return false;
      }
    } else if (stage === 3) {
      if (!formData.experiencia || !formData.sexo || !formData.local || !formData.diasSemana || !formData.objetivo) {
        setFormError('Preencha todos os campos');
        return false;
      }
    }
    return true;
  };

  const nextFormStage = (stage) => {
    if (validateStage(stage)) {
      if (stage === 1) setFormStage('stage2');
      else if (stage === 2) setFormStage('stage3');
    }
  };

  const previousFormStage = (stage) => {
    if (stage === 2) setFormStage('stage1');
    else if (stage === 3) setFormStage('stage2');
    else if (stage === 1) setFormStage('home');
  };

  const resetForm = () => {
    setFormStage('home');
    setFormData({
      altura: '', peso: '', biceps: '', antebraco: '', peitoral: '',
      cintura: '', ombro: '', quadriceps: '', coxa: '', panturrilha: '',
      gluteos: '', experiencia: '', sexo: '', local: '', diasSemana: '', objetivo: '',
    });
    setImc(null);
    setFormError('');
    setTempoDiario(null);
  };

const handleLogout = () => {
  
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
    router.push('/');
};

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Carregando seu dashboard...</p>
      </div>
    );
  }
  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerBrand}>
          <h1 style={styles.headerTitle}>
            PULSE AI <span style={styles.fitnessBadge}>FITNESS</span>
          </h1>
          <p style={styles.headerSubtitle}>
            Bem-vindo{user?.fullName ? `, ${user.fullName}` : ''}!
          </p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Sair
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main style={styles.main}>
        {/* WELCOME CARD */}
        <section style={styles.card}>
          <div style={styles.cardIcon}>🏋️</div>
          <h2 style={styles.cardTitle}>Treino com Inteligência Artificial</h2>
          <p style={styles.cardDescription}>
            Seus treinos são gerados automaticamente com base no seu perfil e evolução.
          </p>
          {!training && (
            <button onClick={() => setShowGenerateModal(true)} style={styles.btnPrimary}>
              Gerar um novo treino 🤖
            </button>
          )}
        </section>

        {/* TRAINING SECTION */}
        {training && (
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Seu Treino Atual</h2>
            <button
              style={styles.btnPrimaryLarge}
              onClick={() => setSelectedDay(currentDay)}
            >
              Continuar treino do dia {currentDay}
            </button>
            <button
              style={styles.btnSecondary}
              onClick={() => setShowGenerateModal(true)}
            >
              Gerar um novo treino 🤖
            </button>

            <div style={styles.divider}></div>

            <h3 style={styles.gridTitle}>Dias da Semana</h3>
            <div style={styles.dayGrid}>
              {/* ✅ MODIFICADO: Só renderiza até training.diasSemana */}
              {Array.from({ length: training.diasSemana || 5 }, (_, i) => {
                const day = i + 1;
                const isCompleted = completedDays.includes(day);
                const isCurrent = day === currentDay;

                return (
                  <button
                    key={day}
                    style={{
                      ...styles.dayBtn,
                      background: isCompleted 
                        ? '#065f46' // ✅ Verde escuro para concluído
                        : isCurrent 
                        ? '#dc2626' // Vermelho para dia atual
                        : '#353f4f', // Cinza para não iniciado
                      border: isCompleted
                        ? '2px solid #10b981' // ✅ Borda verde para concluído
                        : isCurrent
                        ? '2px solid #dc2626'
                        : '1px solid #404854',
                      color: '#ffffff',
                    }}
                    onClick={() => setSelectedDay(day)}
                  >
                    <div style={styles.dayBtnIcon}>
                      {isCompleted ? '✓' : isCurrent ? '▶' : day}
                    </div>
                    <div style={styles.dayBtnText}>Dia {day}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* ✅ MODAL TREINO - COM BOTÃO CONCLUÍDO */}
      {selectedDay && training && (
        <div style={styles.overlay} onClick={() => setSelectedDay(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Treino - Dia {selectedDay}</h2>
              <button
                style={styles.closeBtn}
                onClick={() => setSelectedDay(null)}
              >
                ✕
              </button>
            </div>

            {/* CARDS DE EXERCÍCIOS */}
            <div style={styles.exercisesList}>
              {Array.isArray(training.plan?.[selectedDay]) &&
                training.plan[selectedDay].map((ex, index) => {
                  const nome = ex.exercicio || ex.exercise || `Exercício ${index + 1}`;
                  const series = ex.series || ex.sets || '-';
                  const reps = ex.repeticoes || ex.reps || '-';
                  const descanso = ex.descanso || ex.rest || '-';

                  const ytQuery = encodeURIComponent(`${nome} exercício execução`);
                  const ytUrl = `https://www.youtube.com/results?search_query=${ytQuery}`;

                  return (
                    <div key={index} style={styles.exerciseCard}>
                      <div style={styles.exerciseHeader}>
                        <div style={styles.exerciseTitle}>
                          {index + 1}. {nome}
                        </div>
                        <a
                          href={ytUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.exerciseVideoLink}
                        >
                          Ver vídeo
                        </a>
                      </div>
                      <div style={styles.exerciseMeta}>
                        <span><strong>Séries:</strong> {series}</span>
                        <span><strong>Reps:</strong> {reps}</span>
                        <span>
                          <strong>Descanso:</strong>{' '}
                          {typeof descanso === 'number' ? `${descanso}s` : descanso}
                        </span>
                      </div>
                    </div>
                  );
                })}

              {(!training.plan?.[selectedDay] || training.plan[selectedDay].length === 0) && (
                <div style={styles.noExercisesText}>
                  Nenhum exercício encontrado para este dia.
                </div>
              )}
            </div>

            {/* ✅ BOTÕES: FECHAR + CONCLUÍDO */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                style={styles.btnSecondary}
                onClick={() => setSelectedDay(null)}
              >
                Fechar
              </button>
              <button
                style={{
                  ...styles.btnPrimary,
                  background: '#10b981',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
                onClick={handleCompleteDay}
              >
                ✓ Concluído
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL GERAR TREINO */}
      {showGenerateModal && (
        <div style={styles.overlay} onClick={() => { setShowGenerateModal(false); resetForm(); }}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            
            {/* HOME STAGE */}
            {formStage === 'home' && (
              <>
                <div style={styles.modalHeader}>
                  <h2 style={styles.modalTitle}>Gerar Novo Treino</h2>
                  <button
                    style={styles.closeBtn}
                    onClick={() => { setShowGenerateModal(false); resetForm(); }}
                  >
                    ✕
                  </button>
                </div>
                <p style={styles.modalDescription}>
                  Responda algumas perguntas sobre seu perfil e medidas corporais para gerar um treino personalizado com IA.
                </p>
                <button
                  style={styles.btnPrimary}
                  onClick={() => setFormStage('stage1')}
                >
                  Começar Agora
                </button>
              </>
            )}

            {/* STAGE 1: DADOS PESSOAIS */}
            {formStage === 'stage1' && (
              <>
                <div style={styles.modalHeader}>
                  <h2 style={styles.modalTitle}>Dados Pessoais</h2>
                  <button
                    style={styles.closeBtn}
                    onClick={() => { setShowGenerateModal(false); resetForm(); }}
                  >
                    ✕
                  </button>
                </div>

                <div style={styles.progressBarContainer}>
                  <div style={{ ...styles.progressBar, width: '33%' }}></div>
                </div>

                {formError && <div style={styles.errorMessage}>{formError}</div>}

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Altura (cm)</label>
                  <input
                    type="number"
                    placeholder="Ex: 175"
                    min="100"
                    max="220"
                    value={formData.altura}
                    onChange={(e) => handleInputChange('altura', e.target.value)}
                    style={styles.formInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Peso (kg)</label>
                  <input
                    type="number"
                    placeholder="Ex: 75"
                    min="30"
                    max="300"
                    value={formData.peso}
                    onChange={(e) => handleInputChange('peso', e.target.value)}
                    style={styles.formInput}
                  />
                </div>

                {imc && (
                  <div style={styles.imcBox}>
                    <div style={styles.imcText}>IMC: <strong>{imc}</strong></div>
                  </div>
                )}

                <div style={styles.buttonGroup}>
                  <button
                    style={styles.btnSecondary}
                    onClick={() => { setShowGenerateModal(false); resetForm(); }}
                  >
                    Cancelar
                  </button>
                  <button
                    style={styles.btnPrimary}
                    onClick={() => nextFormStage(1)}
                  >
                    Próximo
                  </button>
                </div>
              </>
            )}

            {/* STAGE 2: MEDIDAS CORPORAIS */}
            {formStage === 'stage2' && (
              <>
                <div style={styles.modalHeader}>
                  <h2 style={styles.modalTitle}>Medidas Corporais</h2>
                  <button
                    style={styles.closeBtn}
                    onClick={() => { setShowGenerateModal(false); resetForm(); }}
                  >
                    ✕
                  </button>
                </div>

                <div style={styles.progressBarContainer}>
                  <div style={{ ...styles.progressBar, width: '66%' }}></div>
                </div>

                {formError && <div style={styles.errorMessage}>{formError}</div>}

                <div style={styles.measurementsGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Bíceps💪(cm)</label>
                    <input
                      type="number"
                      placeholder="0"
                      step="0.1"
                      value={formData.biceps}
                      onChange={(e) => handleInputChange('biceps', e.target.value)}
                      style={styles.formInput}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Peitoral 🛡️(cm)</label>
                    <input
                      type="number"
                      placeholder="0"
                      step="0.1"
                      value={formData.peitoral}
                      onChange={(e) => handleInputChange('peitoral', e.target.value)}
                      style={styles.formInput}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Cintura ⭕(cm)</label>
                    <input
                      type="number"
                      placeholder="0"
                      step="0.1"
                      value={formData.cintura}
                      onChange={(e) => handleInputChange('cintura', e.target.value)}
                      style={styles.formInput}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Ombro ⚡(cm)</label>
                    <input
                      type="number"
                      placeholder="0"
                      step="0.1"
                      value={formData.ombro}
                      onChange={(e) => handleInputChange('ombro', e.target.value)}
                      style={styles.formInput}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Quadríceps 🦵(cm)</label>
                    <input
                      type="number"
                      placeholder="0"
                      step="0.1"
                      value={formData.quadriceps}
                      onChange={(e) => handleInputChange('quadriceps', e.target.value)}
                      style={styles.formInput}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Panturrilha 𓂾(cm)</label>
                    <input
                      type="number"
                      placeholder="0"
                      step="0.1"
                      value={formData.panturrilha}
                      onChange={(e) => handleInputChange('panturrilha', e.target.value)}
                      style={styles.formInput}
                    />
                  </div>
                </div>

                <div style={styles.buttonGroup}>
                  <button
                    style={styles.btnSecondary}
                    onClick={() => previousFormStage(2)}
                  >
                    Voltar
                  </button>
                  <button
                    style={styles.btnPrimary}
                    onClick={() => nextFormStage(2)}
                  >
                    Próximo
                  </button>
                </div>
              </>
            )}
            {/* STAGE 3: PERFIL DO USUÁRIO + TEMPO */}
            {formStage === 'stage3' && (
              <>
                <div style={styles.modalHeader}>
                  <h2 style={styles.modalTitle}>Seu Perfil</h2>
                  <button
                    style={styles.closeBtn}
                    onClick={() => { setShowGenerateModal(false); resetForm(); }}
                  >
                    ✕
                  </button>
                </div>

                <div style={styles.progressBarContainer}>
                  <div style={{ ...styles.progressBar, width: '100%' }}></div>
                </div>

                {formError && <div style={styles.errorMessage}>{formError}</div>}

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Nível de Experiência</label>
                  <div style={styles.radioGroup}>
                    {['Iniciante', 'Intermediário', 'Avançado'].map((opt) => (
                      <label key={opt} style={styles.radioLabel}>
                        <input
                          type="radio"
                          name="exp"
                          value={opt}
                          checked={formData.experiencia === opt}
                          onChange={(e) => handleInputChange('experiencia', e.target.value)}
                          style={styles.radioInput}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Sexo</label>
                  <div style={styles.radioGroup}>
                    {['Masculino', 'Feminino'].map((opt) => (
                      <label key={opt} style={styles.radioLabel}>
                        <input
                          type="radio"
                          name="sex"
                          value={opt}
                          checked={formData.sexo === opt}
                          onChange={(e) => handleInputChange('sexo', e.target.value)}
                          style={styles.radioInput}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Local de Treino</label>
                  <div style={styles.radioGroup}>
                    {['Academia', 'Casa'].map((opt) => (
                      <label key={opt} style={styles.radioLabel}>
                        <input
                          type="radio"
                          name="local"
                          value={opt}
                          checked={formData.local === opt}
                          onChange={(e) => handleInputChange('local', e.target.value)}
                          style={styles.radioInput}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Dias por semana</label>
                  <select
                    value={formData.diasSemana}
                    onChange={(e) => handleInputChange('diasSemana', e.target.value)}
                    style={styles.formSelect}
                  >
                    <option value="">Selecione</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <option key={d} value={d}>
                        {d} dia{d > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Objetivo</label>
                  <div style={styles.radioGroup}>
                    {[
                      { value: 'Ganho de Massa', label: 'Ganho de Massa' },
                      { value: 'Perda de Peso', label: 'Perda de Peso' },
                      { value: 'Manter a Forma', label: 'Manter a Forma' },
                    ].map((opt) => (
                      <label key={opt.value} style={styles.radioLabel}>
                        <input
                          type="radio"
                          name="obj"
                          value={opt.value}
                          checked={formData.objetivo === opt.value}
                          onChange={(e) => handleInputChange('objetivo', e.target.value)}
                          style={styles.radioInput}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* TEMPO DISPONÍVEL POR DIA */}
                <div style={{ marginTop: 20 }}>
                  <label style={styles.formLabel}>Tempo disponível por dia</label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                      gap: 8,
                      marginTop: 8,
                      marginBottom: 12,
                    }}
                  >
                    {[
                      { time: 15, label: '15 min', desc: 'Ultra-rápido' },
                      { time: 30, label: '30 min', desc: 'Eficiente' },
                      { time: 60, label: '60 min', desc: 'Completo' },
                      { time: 90, label: '90 min', desc: 'Expansivo' },
                      { time: 120, label: '120 min', desc: 'Máximo' },
                    ].map((opt) => {
                      const selected = tempoDiario === opt.time;
                      return (
                        <button
                          key={opt.time}
                          type="button"
                          onClick={() => setTempoDiario(opt.time)}
                          style={{
                            padding: 8,
                            borderRadius: 8,
                            border: selected ? '2px solid #dc2626' : '1px solid #4b5563',
                            background: selected ? '#dc2626' : '#111827',
                            color: '#f9fafb',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            gap: 4,
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>{opt.label}</span>
                          <span style={{ opacity: 0.7 }}>{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                  {tempoDiario && (
                    <div
                      style={{
                        background: '#111827',
                        borderRadius: 8,
                        border: '1px solid #4b5563',
                        padding: 8,
                        fontSize: 12,
                        color: '#e5e7eb',
                      }}
                    >
                      Você selecionou <strong>{tempoDiario} minutos</strong> por dia
                    </div>
                  )}
                </div>

                <div style={styles.buttonGroup}>
                  <button
                    style={styles.btnSecondary}
                    onClick={() => previousFormStage(3)}
                  >
                    Voltar
                  </button>
                  <button
                    style={{
                      ...styles.btnPrimary,
                      opacity: generating ? 0.7 : 1,
                      cursor: generating ? 'not-allowed' : 'pointer',
                    }}
                    disabled={generating}
                    onClick={handleGenerateTraining}
                  >
                    {generating ? 'Gerando treino...' : 'Gerar Treino'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CHATBOT NUTRICIONISTA */}
      <NutritionChat />
    </div>
  );
}
const styles = {
  page: {
    minHeight: '100vh',
    background: '#1a1f2e',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    background: '#252d3d',
    borderBottom: '1px solid #353f4f',
    padding: 'clamp(16px, 4vw, 24px)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  headerBrand: {
    flex: 1,
  },
  headerTitle: {
    margin: 0,
    fontSize: 'clamp(18px, 5vw, 28px)',
    fontWeight: 700,
    color: '#ffffff',
  },
  fitnessBadge: {
    color: '#dc2626',
    fontWeight: 700,
  },
  headerSubtitle: {
    margin: '4px 0 0 0',
    fontSize: 'clamp(12px, 3vw, 14px)',
    color: '#9ca3af',
  },
  logoutBtn: {
    padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: 'clamp(12px, 2vw, 14px)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
    whiteSpace: 'nowrap',
  },
  main: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: 'clamp(16px, 4vw, 32px)',
    width: '100%',
  },
  card: {
    background: '#252d3d',
    border: '1px solid #353f4f',
    borderRadius: 16,
    padding: 'clamp(20px, 4vw, 32px)',
    marginBottom: 'clamp(16px, 3vw, 24px)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    animation: 'fadeIn 0.8s ease-out',
  },
  cardIcon: {
    fontSize: 'clamp(32px, 8vw, 48px)',
    marginBottom: 12,
    display: 'block',
  },
  cardTitle: {
    margin: '0 0 12px 0',
    fontSize: 'clamp(18px, 4vw, 24px)',
    fontWeight: 700,
    color: '#ffffff',
  },
  cardDescription: {
    margin: '0 0 20px 0',
    fontSize: 'clamp(13px, 2vw, 15px)',
    color: '#cbd5e1',
    lineHeight: 1.6,
  },
  btnPrimary: {
    width: '100%',
    padding: 'clamp(10px, 2vw, 14px) clamp(16px, 4vw, 24px)',
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: 'clamp(13px, 2.5vw, 15px)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
    marginTop: 12,
  },
  btnPrimaryLarge: {
    width: '100%',
    padding: 'clamp(12px, 2.5vw, 16px) clamp(16px, 4vw, 24px)',
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: 'clamp(14px, 3vw, 16px)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
    marginBottom: 12,
  },
  btnSecondary: {
    width: '100%',
    padding: 'clamp(10px, 2vw, 12px) clamp(16px, 4vw, 24px)',
    borderRadius: 10,
    border: '2px solid #3b82f6',
    backgroundColor: 'transparent',
    color: '#3b82f6',
    fontSize: 'clamp(13px, 2.5vw, 14px)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  divider: {
    height: 1,
    backgroundColor: '#353f4f',
    margin: 'clamp(16px, 3vw, 24px) 0',
  },
  gridTitle: {
    margin: 'clamp(12px, 2vw, 16px) 0 12px 0',
    fontSize: 'clamp(14px, 3vw, 16px)',
    fontWeight: 600,
    color: '#d1d5db',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(40px, 12vw, 100px), 1fr))',
    gap: 'clamp(8px, 2vw, 12px)',
    marginTop: 12,
  },
  dayBtn: {
    padding: 'clamp(12px, 2vw, 16px)',
    borderRadius: 10,
    border: '1px solid #404854',
    backgroundColor: '#353f4f',
    color: '#ffffff',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 'clamp(70px, 15vw, 100px)',
  },
  dayBtnIcon: {
    fontSize: 'clamp(18px, 4vw, 24px)',
    fontWeight: 'bold',
  },
  dayBtnText: {
    fontSize: 'clamp(11px, 2vw, 12px)',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#1a1f2e',
    color: '#ffffff',
    gap: 20,
  },
  loadingSpinner: {
    width: 60,
    height: 60,
    border: '4px solid #353f4f',
    borderTopColor: '#dc2626',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 'clamp(16px, 4vw, 24px)',
  },
  modal: {
    background: '#252d3d',
    border: '1px solid #353f4f',
    borderRadius: 16,
    padding: 'clamp(20px, 4vw, 32px)',
    width: '100%',
    maxWidth: 500,
    maxHeight: '85vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    animation: 'slideInDown 0.4s ease-out',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  modalTitle: {
    margin: 0,
    fontSize: 'clamp(18px, 4vw, 22px)',
    fontWeight: 700,
    color: '#ffffff',
    flex: 1,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    fontSize: 24,
    cursor: 'pointer',
    transition: 'color 0.3s ease',
    padding: 0,
    minWidth: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDescription: {
    margin: '0 0 20px 0',
    fontSize: 'clamp(13px, 2vw, 14px)',
    color: '#cbd5e1',
    lineHeight: 1.6,
  },
  exercisesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 20,
  },
  exerciseCard: {
    background: '#1f2937',
    borderRadius: 10,
    border: '1px solid #374151',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  exerciseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  exerciseTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f9fafb',
  },
  exerciseVideoLink: {
    fontSize: 12,
    color: '#60a5fa',
    textDecoration: 'none',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  exerciseMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    fontSize: 12,
    color: '#e5e7eb',
  },
  noExercisesText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    background: '#353f4f',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: '#3b82f6',
    transition: 'width 0.3s ease',
  },
  formGroup: {
    marginBottom: 'clamp(16px, 3vw, 20px)',
  },
  formLabel: {
    display: 'block',
    fontSize: 'clamp(12px, 2vw, 14px)',
    fontWeight: 600,
    color: '#d1d5db',
    marginBottom: 8,
  },
  formInput: {
    width: '100%',
    padding: 'clamp(10px, 2vw, 12px)',
    borderRadius: 8,
    border: '1px solid #353f4f',
    background: '#1f2839',
    color: '#ffffff',
    fontSize: 'clamp(13px, 2vw, 14px)',
    fontFamily: 'inherit',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
  },
  formSelect: {
    width: '100%',
    padding: 'clamp(10px, 2vw, 12px)',
    borderRadius: 8,
    border: '1px solid #353f4f',
    background: '#1f2839',
    color: '#ffffff',
    fontSize: 'clamp(13px, 2vw, 14px)',
    fontFamily: 'inherit',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 'clamp(12px, 2vw, 14px)',
    color: '#cbd5e1',
    cursor: 'pointer',
    padding: 10,
    borderRadius: 8,
    border: '1px solid transparent',
    transition: 'all 0.3s ease',
  },
  radioInput: {
    marginRight: 10,
    cursor: 'pointer',
    width: 18,
    height: 18,
  },
  measurementsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(120px, 45vw, 150px), 1fr))',
    gap: 'clamp(12px, 2vw, 16px)',
    marginBottom: 16,
  },
  imcBox: {
    background: '#353f4f',
    border: '1px solid #3b82f6',
    padding: 'clamp(12px, 2vw, 16px)',
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'center',
  },
  imcText: {
    fontSize: 'clamp(13px, 2vw, 14px)',
    color: '#cbd5e1',
  },
  errorMessage: {
    background: 'rgba(220, 38, 38, 0.15)',
    border: '1px solid #dc2626',
    color: '#fca5a5',
    padding: 'clamp(10px, 2vw, 12px)',
    borderRadius: 8,
    fontSize: 'clamp(12px, 2vw, 13px)',
    marginBottom: 16,
  },
  buttonGroup: {
    display: 'flex',
    gap: 'clamp(10px, 2vw, 12px)',
    marginTop: 'clamp(16px, 3vw, 24px)',
  },
};