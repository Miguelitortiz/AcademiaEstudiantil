import { db } from '../../../lib/db.js';

export const POST = async ({ request, locals }: any) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const { session_id, agreements, attendance } = await request.json();

    if (!session_id || !agreements || agreements.length === 0 || !attendance) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos.' }), { status: 400 });
    }

    const saveMinutesTransaction = db.transaction(() => {
      // 1. Insert/Replace Minutes record
      db.prepare(`
        INSERT OR REPLACE INTO minutes (session_id, agreements)
        VALUES (?, ?)
      `).run(session_id, JSON.stringify(agreements));

      // 2. Update student attendance in invites table
      const updateAttendance = db.prepare(`
        UPDATE invites 
        SET attended = ?
        WHERE session_id = ? AND student_id = ?
      `);

      for (const att of attendance) {
        updateAttendance.run(att.attended, session_id, att.student_id);
      }

      // 3. Mark session as completed
      db.prepare(`
        UPDATE sessions
        SET status = 'completed'
        WHERE id = ?
      `).run(session_id);
    });

    saveMinutesTransaction();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error saving minutes:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
