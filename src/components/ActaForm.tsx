import React, { useState, useEffect } from 'react';
import DraggableBlocks from './DraggableBlocks';

interface StudentInvite {
  id: number;
  enrollment: string;
  full_name: string;
  career: string;
  grade: number;
  group_letter: string;
  role: string;
  whatsapp_sent: number;
  attended: number; // 0 or 1
}

interface ActaFormProps {
  sessionId: string;
  sessionDate: string;
  sessionTime: string;
  sessionAgenda: string[];
  invitedStudents: StudentInvite[];
  existingAgreements?: string[];
}

export default function ActaForm({
  sessionId,
  sessionDate,
  sessionTime,
  sessionAgenda,
  invitedStudents = [],
  existingAgreements = []
}: ActaFormProps) {
  const [agreements, setAgreements] = useState<string[]>(existingAgreements);
  const [attendance, setAttendance] = useState<{ [studentId: number]: boolean }>({});

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Sync attendance states
  useEffect(() => {
    const initialAttendance: { [id: number]: boolean } = {};
    invitedStudents.forEach(student => {
      initialAttendance[student.id] = student.attended === 1;
    });
    setAttendance(initialAttendance);
  }, [invitedStudents]);

  const handleAttendanceToggle = (id: number) => {
    setAttendance(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAgreementsChange = (newBlocks: string[]) => {
    setAgreements(newBlocks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (agreements.length === 0 || agreements.every(x => !x.trim())) {
      setError('Por favor, ingresa al menos un acuerdo tomado en la sesión.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Submit to save Minutes and Attendance
      const res = await fetch('/api/actas/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          agreements,
          attendance: Object.keys(attendance).map(key => ({
            student_id: parseInt(key),
            attended: attendance[parseInt(key)] ? 1 : 0
          }))
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'No se pudo guardar el acta.');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {error && (
        <div className="card bg-[#770F00]/5 border-[#770F00] text-[#770F00] text-sm font-semibold rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="card bg-[#527630]/5 border-[#527630] text-[#527630] text-sm font-semibold rounded-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold">¡Acta guardada correctamente!</h4>
            <p className="text-xs">Los acuerdos y el control de asistencia han sido registrados en la base de datos.</p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/api/pdf?session_id=${encodeURIComponent(sessionId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--success text-xs font-bold"
              style={{ height: '38px', padding: '0 16px' }}
            >
              📥 Descargar PDF (LaTeX)
            </a>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left column: read-only info and agenda (1/3) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="card bg-white p-5 flex flex-col gap-4">
            <div>
              <span className="overline">Datos Generales </span>
              <h3 className="text-base font-bold mt-1">Convocatoria {sessionId}</h3>
            </div>

            <hr className="rule" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span className="field-label">Fecha</span>
                <span className="field-value font-mono">{sessionDate}</span>
              </div>
              <div>
                <span className="field-label">Hora</span>
                <span className="field-value font-mono">{sessionTime}</span>
              </div>
            </div>
          </div>

          <div className="card bg-white p-5 flex flex-col gap-3">
            <span className="overline">Orden del Día </span>
            <ul className="flex flex-col gap-2">
              {sessionAgenda.map((item, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-gray-800 bg-gray-50 border border-gray-100 p-2.5 rounded">
                  <span className="font-mono text-xs text-gray-400 font-bold">{idx + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right columns: agreements and attendance (2/3) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Agreements (Draggable) */}
          <div className="card bg-white p-5">
            <DraggableBlocks
              initialBlocks={agreements}
              onChange={handleAgreementsChange}
              label="Registrar Acuerdos (Draggable)"
              placeholder="Escribe un acuerdo tomado..."
            />
          </div>

          {/* Attendance Checklist */}
          <div className="card bg-white p-5 flex flex-col gap-4">
            <div>
              <span className="overline overline--secondary">Control de Asistencia y Firmas</span>
              <h3 className="text-base font-bold mt-1">Lista de Convocados</h3>
              <p className="text-2xs text-gray-500 mt-0.5">Marca a los alumnos representantes que asistieron a la asamblea.</p>
            </div>

            <hr className="rule" />

            {invitedStudents.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No hubo estudiantes convocados en esta sesión.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {invitedStudents.map((student) => {
                  const isChecked = !!attendance[student.id];
                  return (
                    <div
                      key={student.id}
                      onClick={() => handleAttendanceToggle(student.id)}
                      className={`card cursor-pointer flex justify-between items-center p-3 border transition-colors ${isChecked
                          ? 'border-[#527630] bg-[#527630]/5'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-gray-800">{student.full_name}</span>
                        <span className="font-mono text-[10px] text-gray-500">
                          {student.enrollment} · {student.career} {student.grade}°{student.group_letter}
                        </span>
                        <span className="text-[9px] text-gray-400 uppercase tracking-wide">
                          {student.role}
                        </span>
                      </div>

                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isChecked ? 'bg-[#527630] border-[#527630] text-white' : 'border-gray-300 bg-white'
                        }`}>
                        {isChecked && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 mt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn--primary"
                style={{ height: '44px' }}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar y Finalizar Acta'}
              </button>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
