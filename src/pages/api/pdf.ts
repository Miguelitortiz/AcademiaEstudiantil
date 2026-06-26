import { db } from '../../lib/db.js';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const GET = async ({ url, redirect }: any) => {
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return new Response('Falta session_id', { status: 400 });
  }

  try {
    // 1. Fetch meeting session details
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any;
    if (!session) {
      return new Response('Sesión no encontrada', { status: 404 });
    }

    // 2. Fetch minutes agreements
    const minutes = db.prepare('SELECT agreements FROM minutes WHERE session_id = ?').get(sessionId) as any;
    const agreements = minutes ? JSON.parse(minutes.agreements) : [];

    // 3. Fetch attendees
    const attendees = db.prepare(`
      SELECT s.enrollment, s.full_name, s.career, s.grade, s.group_letter, s.role, i.attended
      FROM students s
      JOIN invites i ON s.id = i.student_id
      WHERE i.session_id = ?
      ORDER BY s.full_name ASC
    `).all(sessionId) as any[];

    // Build payload structure
    const payload = {
      session_id: session.id,
      date: session.date,
      time: session.time,
      career: session.career ? `${session.career} (FIME)` : 'Facultad de Ingeniería Mecánica y Eléctrica',
      role_type: session.role_type,
      agenda: JSON.parse(session.agenda || '[]'),
      agreements,
      attendees
    };

    // 4. Write payload to temp JSON file
    const tempDir = os.tmpdir();
    const tempJsonPath = path.join(tempDir, `acta-${Date.now()}.json`);
    const tempPdfPath = path.join(tempDir, `acta-${Date.now()}.pdf`);
    
    fs.writeFileSync(tempJsonPath, JSON.stringify(payload, null, 2), 'utf-8');

    // 5. Check if pdflatex command exists
    let hasLatex = false;
    try {
      await execAsync('which pdflatex');
      hasLatex = true;
    } catch (e) {
      console.warn('pdflatex is not installed on the system path.');
    }

    if (hasLatex) {
      // Execute Python script to compile LaTeX PDF
      const pythonScriptPath = path.join(process.cwd(), 'python', 'generate_pdf.py');
      try {
        console.log(`Running: python3 "${pythonScriptPath}" "${tempJsonPath}" "${tempPdfPath}"`);
        await execAsync(`python3 "${pythonScriptPath}" "${tempJsonPath}" "${tempPdfPath}"`);

        if (fs.existsSync(tempPdfPath)) {
          const pdfBuffer = fs.readFileSync(tempPdfPath);
          
          // Cleanup temp files
          try {
            fs.unlinkSync(tempJsonPath);
            fs.unlinkSync(tempPdfPath);
          } catch (e) {}

          return new Response(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="Acta_Academia_${sessionId.replace(/\s+/g, '').replace('/', '-')}.pdf"`
            }
          });
        }
      } catch (pythonErr: any) {
        console.error('Python PDF generation failed:', pythonErr.message);
      }
    }

    // Cleanup temp JSON if we are failing
    try {
      fs.unlinkSync(tempJsonPath);
    } catch (e) {}

    // Fallback: Redirect to beautiful HTML print view
    console.log('Falling back to HTML printable view.');
    return redirect(`/actas/print?session_id=${encodeURIComponent(sessionId)}&fallback=true`, 302);
  } catch (error: any) {
    console.error('Error on PDF generation endpoint:', error);
    return new Response(`Error interno: ${error.message}`, { status: 500 });
  }
};
