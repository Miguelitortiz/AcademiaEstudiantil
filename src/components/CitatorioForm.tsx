import React, { useState, useEffect } from 'react';
import DraggableBlocks from './DraggableBlocks';
import StudentSelector from './StudentSelector';

interface Student {
  id: number;
  enrollment: string;
  full_name: string;
  grade: number;
  group_letter: string;
  career: string;
  phone: string;
  role: 'Jefe' | 'Subjefe';
}

interface CitatorioFormProps {
  students: Student[];
  userRole: 'director' | 'jefe_carrera';
  userCareer?: string | null;
}

export default function CitatorioForm({ students, userRole, userCareer }: CitatorioFormProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [roleType, setRoleType] = useState('Ambos');
  const [agenda, setAgenda] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // Submission & Simulation States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [sendingLogs, setSendingLogs] = useState<{ id: number; name: string; phone: string; status: 'pending' | 'sending' | 'sent' }[]>([]);
  const [currentSendingIndex, setCurrentSendingIndex] = useState(-1);
  const [generatedSessionId, setGeneratedSessionId] = useState('');

  const handleAgendaChange = (newBlocks: string[]) => {
    setAgenda(newBlocks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!date || !time) {
      setSubmitError('Por favor, selecciona fecha y hora.');
      return;
    }

    if (agenda.length === 0 || agenda.every(x => !x.trim())) {
      setSubmitError('Por favor, añade al menos un punto a tratar en la Orden del Día.');
      return;
    }

    // Get final selected students based on selector output
    // Read directly from hidden input or state
    if (selectedStudentIds.length === 0) {
      setSubmitError('Por favor, selecciona al menos un alumno para convocar.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create session in DB via API
      const res = await fetch('/api/citatorios/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          time,
          role_type: roleType,
          agenda,
          student_ids: selectedStudentIds
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'No se pudo crear la sesión.');
      }

      const sessionId = data.sessionId;
      setGeneratedSessionId(sessionId);

      // 2. Setup WhatsApp sending logs simulation
      const targetStudents = students.filter(s => selectedStudentIds.includes(s.id));
      const logs = targetStudents.map(s => ({
        id: s.id,
        name: s.full_name,
        phone: s.phone,
        status: 'pending' as const
      }));

      setSendingLogs(logs);
      setCurrentSendingIndex(0);

      // Start sequential simulation
      simulateWhatsAppSending(sessionId, logs);
    } catch (err: any) {
      setSubmitError(err.message);
      setIsSubmitting(false);
    }
  };

  const simulateWhatsAppSending = async (
    sessionId: string,
    logs: { id: number; name: string; phone: string; status: 'pending' | 'sending' | 'sent' }[]
  ) => {
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const updatedLogs = [...logs];

    for (let i = 0; i < updatedLogs.length; i++) {
      setCurrentSendingIndex(i);

      // Update state to "sending"
      updatedLogs[i].status = 'sending';
      setSendingLogs([...updatedLogs]);

      // Wait for simulated network send
      await sleep(600);

      try {
        // Call backend API to mark as sent
        await fetch('/api/invites/update-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            student_id: updatedLogs[i].id
          })
        });
      } catch (e) {
        console.error('Failed to notify sent invite', e);
      }

      // Update state to "sent"
      updatedLogs[i].status = 'sent';
      setSendingLogs([...updatedLogs]);
    }

    // Complete simulation
    setCurrentSendingIndex(-1);
  };

  return (
    <div className="w-full flex flex-col gap-8">
      {submitError && (
        <div className="card bg-[#770F00]/5 border-[#770F00] text-[#770F00] text-sm font-semibold rounded-md">
          {submitError}
        </div>
      )}

      {/* Main summoning form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left column: metadata & agenda (1/3 width) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="card bg-white p-5 flex flex-col gap-4">
            <div>
              <span className="overline overline--primary"> &mdash; Datos Generales</span>
              <h3 className="text-base font-bold mt-1">Sesión de Asamblea</h3>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="field-label" htmlFor="summon-date">Fecha de la sesión</label>
              <input
                type="date"
                id="summon-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="field-label" htmlFor="summon-time">Hora de inicio</label>
              <input
                type="time"
                id="summon-time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="field-label" htmlFor="summon-role">Rol Convocado</label>
              <select
                id="summon-role"
                value={roleType}
                onChange={(e) => setRoleType(e.target.value)}
                required
                className="input"
              >
                <option value="Ambos">Ambos (Jefe y Subjefe)</option>
                <option value="Jefe">Solo Jefes de Grupo</option>
                <option value="Subjefe">Solo Subjefes de Grupo</option>
              </select>
            </div>
          </div>

          <div className="card bg-white p-5">
            <DraggableBlocks
              initialBlocks={agenda}
              onChange={handleAgendaChange}
              label="Orden del Día "
              placeholder="Escribe un punto a tratar..."
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary w-full py-3"
            style={{ height: '48px' }}
          >
            Generar Citatorio y Notificar
          </button>
        </div>

        {/* Right column: student selector (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="card bg-white p-5 flex flex-col gap-2">
            <div>
              <span className="overline overline--secondary"> &mdash; Destinatarios</span>
              <h3 className="text-base font-bold mt-1">Seleccionar Alumnos</h3>
            </div>

            {/* Standard HTML connection to React State */}
            <StudentSelectorWrapper
              students={students}
              userRole={userRole}
              userCareer={userCareer}
              onSelectionChange={setSelectedStudentIds}
            />
          </div>
        </div>
      </form>

      {/* Premium WhatsApp Sending Simulation Dialog */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-[#1A1A1A]/60 flex items-center justify-center p-6 z-50">
          <div className="card bg-white w-full max-w-[500px] flex flex-col gap-5 p-6 animate-in fade-in zoom-in duration-200">
            <div>
              <span className="overline overline--primary">Envío Automatizado</span>
              <h2 className="text-lg font-black mt-1">Notificaciones WhatsApp</h2>
              <p className="text-xs text-gray-500">ID de Citatorio: <strong>{generatedSessionId}</strong></p>
            </div>

            <hr className="rule" />

            {/* List of progress items */}
            <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto scroll border border-gray-100 p-3 rounded-lg bg-gray-50">
              {sendingLogs.map((log, idx) => (
                <div key={log.id} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{log.name}</span>
                    <span className="font-mono text-gray-500">({log.phone})</span>
                  </div>

                  <div>
                    {log.status === 'pending' && (
                      <span className="text-gray-400 font-mono text-[10px]">EN COLA</span>
                    )}
                    {log.status === 'sending' && (
                      <span className="text-blue-600 font-mono font-bold animate-pulse text-[10px]">ENVIANDO...</span>
                    )}
                    {log.status === 'sent' && (
                      <span className="text-green-600 font-mono font-bold text-[10px] flex items-center gap-0.5">
                        ENVIADO ✔
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <hr className="rule" />

            <div className="flex flex-col gap-3">
              {currentSendingIndex !== -1 ? (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold text-gray-700">
                    Procesando cola de notificaciones ({currentSendingIndex + 1}/{sendingLogs.length})...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-4 text-center">
                  <div className="text-green-600 font-bold text-sm">
                    🎉 ¡Todos los citatorios se han notificado con éxito vía WhatsApp!
                  </div>
                  <div className="flex gap-2">
                    <a href={`/actas/nuevo?session=${generatedSessionId}`} className="btn btn--primary flex-1">
                      Generar Acta del Citatorio
                    </a>
                    <button
                      type="button"
                      onClick={() => { setIsSubmitting(false); setDate(''); setTime(''); setAgenda([]); }}
                      className="btn btn--ghost flex-1"
                    >
                      Crear Otro
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper for StudentSelector to connect change updates
function StudentSelectorWrapper({
  students,
  userRole,
  userCareer,
  onSelectionChange
}: {
  students: Student[];
  userRole: 'director' | 'jefe_carrera';
  userCareer?: string | null;
  onSelectionChange: (ids: number[]) => void;
}) {
  const [selectedStr, setSelectedStr] = useState('[]');

  useEffect(() => {
    try {
      const parsed = JSON.parse(selectedStr);
      onSelectionChange(parsed);
    } catch (e) { }
  }, [selectedStr]);

  // Hook change events on form inputs or simulate state inside React
  return (
    <div>
      <StudentSelector
        students={students}
        userRole={userRole}
        userCareer={userCareer}
        selectedIdsName="form_student_ids"
      />

      {/* Small polling hack or event emitter for custom component linking */}
      <input
        type="hidden"
        id="watcher-input"
        ref={(el) => {
          if (!el) return;
          // Set interval to sync standard input to React state
          const interval = setInterval(() => {
            const formInput = document.querySelector('input[name="form_student_ids"]') as HTMLInputElement;
            if (formInput && formInput.value !== selectedStr) {
              setSelectedStr(formInput.value);
            }
          }, 100);
          return () => clearInterval(interval);
        }}
      />
    </div>
  );
}
