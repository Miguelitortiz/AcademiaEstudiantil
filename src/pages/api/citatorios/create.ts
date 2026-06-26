import { db } from '../../../lib/db.js';

export const POST = async ({ request, locals }: any) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { date, time, role_type, agenda, student_ids } = body;

    if (!date || !time || !role_type || !agenda || !student_ids || student_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos o no se seleccionaron alumnos.' }), { status: 400 });
    }

    // Format Date to DD/MM
    const dateObj = new Date(date + 'T00:00:00');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = `${day}/${month}`;

    // Get sequential number for today
    const { count } = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE date = ?').get(date) as { count: number };
    const seq = String(count + 1).padStart(2, '0');
    const sessionId = `${prefix} - ${seq}`;

    // Set career scoping
    const career = user.role === 'jefe_carrera' ? user.career : null; // Director has null (all careers)

    // DB Transaction
    const createSessionTransaction = db.transaction(() => {
      // 1. Create Session
      db.prepare(`
        INSERT INTO sessions (id, date, time, agenda, role_type, career, status)
        VALUES (?, ?, ?, ?, ?, ?, 'summoned')
      `).run(sessionId, date, time, JSON.stringify(agenda), role_type, career);

      // 2. Create Invites
      const insertInvite = db.prepare(`
        INSERT INTO invites (session_id, student_id, whatsapp_sent, attended)
        VALUES (?, ?, 0, 0)
      `);

      for (const studentId of student_ids) {
        insertInvite.run(sessionId, studentId);
      }
    });

    createSessionTransaction();

    return new Response(JSON.stringify({ success: true, sessionId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error creating summon:', error);
    return new Response(JSON.stringify({ error: `Error interno: ${error.message}` }), { status: 500 });
  }
};
