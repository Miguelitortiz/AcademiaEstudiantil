import React, { useState, useEffect, useMemo } from 'react';

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

interface StudentSelectorProps {
  students: Student[];
  userRole: 'director' | 'jefe_carrera';
  userCareer?: string | null;
  selectedIdsName?: string;
}

export default function StudentSelector({
  students = [],
  userRole,
  userCareer = null,
  selectedIdsName = 'selected_student_ids'
}: StudentSelectorProps) {
  // Students scoped by career (for jefe_carrera)
  const availableStudents = useMemo(() => {
    if (userRole === 'jefe_carrera' && userCareer) {
      return students.filter(s => s.career === userCareer);
    }
    return students;
  }, [students, userRole, userCareer]);

  // Selected student IDs (for submission)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // --- Filter states (multiple selection using arrays) ---
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [selectedCareers, setSelectedCareers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Available options for filters
  const allGrades = useMemo(() => {
    const set = new Set(availableStudents.map(s => s.grade));
    return Array.from(set).sort((a, b) => a - b);
  }, [availableStudents]);

  const allCareers = useMemo(() => {
    const set = new Set(availableStudents.map(s => s.career));
    return Array.from(set).sort();
  }, [availableStudents]);

  // Helper: toggle an item in an array
  const toggleArrayItem = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  // Toggle handlers for each filter
  const toggleGrade = (grade: number) => {
    setSelectedGrades(prev => toggleArrayItem(prev, grade));
  };

  const toggleCareer = (career: string) => {
    setSelectedCareers(prev => toggleArrayItem(prev, career));
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => toggleArrayItem(prev, role));
  };

  // Check if a student matches all active filters
  const matchesFilters = (student: Student) => {
    const gradeOk = selectedGrades.length === 0 || selectedGrades.includes(student.grade);
    const careerOk = selectedCareers.length === 0 || selectedCareers.includes(student.career);
    const roleOk = selectedRoles.length === 0 || selectedRoles.includes(student.role);
    return gradeOk && careerOk && roleOk;
  };

  // Apply current filters to select matching students
  const applyPresetFilter = () => {
    const matched = availableStudents.filter(matchesFilters);
    setSelectedIds(matched.map(s => s.id));
  };

  // Sort students: matches first, non‑matches at the bottom
  const displayedStudents = useMemo(() => {
    const matches = availableStudents.filter(matchesFilters);
    const nonMatches = availableStudents.filter(s => !matchesFilters(s));
    return [...matches, ...nonMatches];
  }, [availableStudents, selectedGrades, selectedCareers, selectedRoles]);

  // Shortcuts
  const handleSelectAll = () => {
    setSelectedIds(availableStudents.map(s => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedGrades([]);
    setSelectedCareers([]);
    setSelectedRoles([]);
  };

  // Serialize selected IDs for hidden input
  const serializedIds = useMemo(() => JSON.stringify(selectedIds), [selectedIds]);

  return (
    <div className="flex flex-col gap-6">
      {/* Hidden input for Astro Form */}
      <input type="hidden" name={selectedIdsName} value={serializedIds} />

      {/* Filters and Presets Bar */}
      <div className="card bg-white p-4 flex flex-col gap-4">
        <div>
          <span className="overline overline--secondary">Filtros y Ajustes Rápidos</span>
          <h3 className="text-base font-bold mt-1">Pre‑seleccionar alumnos</h3>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Grade filter – toggle buttons */}
          <div className="flex flex-col gap-1">
            <span className="field-label">Semestre(s)</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {allGrades.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGrade(g)}
                  className={`px-3 py-1 text-xs font-bold border transition-colors rounded-md ${selectedGrades.includes(g)
                      ? 'bg-[#006096] text-white border-[#006096]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  style={{ height: '36px' }}
                >
                  {g}°
                </button>
              ))}
            </div>
          </div>

          {/* Career filter – toggle buttons (only for director) */}
          {userRole === 'director' && (
            <div className="flex flex-col gap-1">
              <span className="field-label">Carrera(s)</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {allCareers.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCareer(c)}
                    className={`px-3 py-1 text-xs font-bold border transition-colors rounded-md ${selectedCareers.includes(c)
                        ? 'bg-[#006096] text-white border-[#006096]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    style={{ height: '36px' }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Role filter – toggle buttons */}
          <div className="flex flex-col gap-1">
            <span className="field-label">Rol(es)</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(['Jefe', 'Subjefe'] as const).map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`px-3 py-1 text-xs font-bold border transition-colors rounded-md ${selectedRoles.includes(role)
                      ? 'bg-[#006096] text-white border-[#006096]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  style={{ height: '36px' }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 items-center">
          <button
            type="button"
            onClick={handleSelectAll}
            className="btn btn--ghost text-2xs"
            style={{ height: '36px', padding: '0 12px' }}
          >
            Seleccionar Todos ({availableStudents.length})
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="btn btn--ghost text-2xs"
            style={{ height: '36px', padding: '0 12px' }}
          >
            Limpiar Selección ({selectedIds.length})
          </button>
          <button
            type="button"
            onClick={applyPresetFilter}
            className="btn btn--primary text-2xs"
            style={{ height: '36px', padding: '0 12px' }}
          >
            Seleccionar los que coinciden
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="btn btn--ghost text-2xs"
            style={{ height: '36px', padding: '0 12px' }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Grid of Student Cards */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <span className="overline">Lista de Alumnos ({displayedStudents.length} mostrados)</span>
          <span className="text-xs font-bold text-gray-500">
            {selectedIds.length} seleccionados para citatorio
          </span>
        </div>

        {displayedStudents.length === 0 ? (
          <div className="card text-center p-8 bg-gray-50 border-dashed">
            <p className="text-sm text-gray-500">No se encontraron alumnos que coincidan con los filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedStudents.map((student) => {
              const isSelected = selectedIds.includes(student.id);
              const isMatch = matchesFilters(student);
              return (
                <div
                  key={student.id}
                  onClick={() => {
                    // Toggle selection on card click
                    setSelectedIds(prev =>
                      prev.includes(student.id)
                        ? prev.filter(id => id !== student.id)
                        : [...prev, student.id]
                    );
                  }}
                  className={`card cursor-pointer transition-all border select-none flex flex-col justify-between h-[150px] ${isSelected
                      ? 'border-[#006096] bg-[#006096]/5 ring-1 ring-[#006096]'
                      : 'border-gray-200 bg-white hover:border-gray-400'
                    } ${!isMatch ? 'opacity-40 grayscale-[10%]' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-2xs text-gray-500">{student.enrollment}</span>
                      <h4 className="text-sm font-bold text-gray-800 line-clamp-1 mt-0.5">{student.full_name}</h4>
                    </div>
                    <span className={`tag ${student.role === 'Jefe' ? 'tag--primary' : 'tag--secondary'}`}>
                      {student.role}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-col gap-1 border-t border-gray-100 pt-2">
                    <div className="flex justify-between text-2xs">
                      <span className="text-gray-500">Carrera / Grado</span>
                      <span className="font-semibold text-gray-700">
                        {student.career} — {student.grade}° {student.group_letter}
                      </span>
                    </div>
                    <div className="flex justify-between text-2xs">
                      <span className="text-gray-500">Teléfono</span>
                      <span className="font-mono text-gray-700">{student.phone}</span>
                    </div>
                  </div>

                  {/* Selection Indicator Checkbox */}
                  <div className="mt-2 flex justify-end">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#006096] border-[#006096] text-white' : 'border-gray-300 bg-white'
                      }`}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}