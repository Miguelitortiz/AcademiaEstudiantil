import { db } from '../../../lib/db.js';

export const POST = async ({ request, locals }: any) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const { session_id, student_id } = await request.json();

    if (!session_id || !student_id) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros' }), { status: 400 });
    }

    db.prepare('UPDATE invites SET whatsapp_sent = 1 WHERE session_id = ? AND student_id = ?').run(session_id, student_id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
