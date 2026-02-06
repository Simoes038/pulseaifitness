import { get } from '@/supabase';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Busca usuário
    const user = get(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    return Response.json({
      exists: !!user,
    });
  } catch (error) {
    console.error('❌ Erro ao verificar email:', error);
    return Response.json(
      { error: 'Erro ao verificar email' },
      { status: 500 }
    );
  }
}
