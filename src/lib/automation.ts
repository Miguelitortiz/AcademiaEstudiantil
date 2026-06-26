import { db } from './db.js';

/**
 * Checks if the current date is past Feb 1st or Aug 1st milestones
 * and applies the automatic grade promotion and graduate deletion.
 */
export function checkAndPromoteGrades(): { promoted: boolean; details?: string } {
  try {
    const configRow = db.prepare('SELECT value FROM system_config WHERE key = ?').get('last_grade_promotion_date') as { value: string } | undefined;
    const lastPromotionStr = configRow ? configRow.value : '2026-01-01';
    
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Milestones for the current year
    const febMilestone = new Date(`${currentYear}-02-01T00:00:00`);
    const augMilestone = new Date(`${currentYear}-08-01T00:00:00`);
    
    // Last promotion date
    const lastPromotion = new Date(lastPromotionStr + 'T00:00:00');
    
    let targetMilestoneStr: string | null = null;
    
    // Check if we need to run promotion
    // 1. If now is past August 1st, and the last promotion was before August 1st of this year
    if (now >= augMilestone && lastPromotion < augMilestone) {
      targetMilestoneStr = `${currentYear}-08-01`;
    }
    // 2. If now is past February 1st, and the last promotion was before February 1st of this year
    else if (now >= febMilestone && lastPromotion < febMilestone) {
      targetMilestoneStr = `${currentYear}-02-01`;
    }
    // 3. Special case: if we are in a new year, and last promotion was in the previous year but missed August (or February) of last year
    else {
      // Find past year's milestones if we are lagging behind
      const prevYear = currentYear - 1;
      const prevAugMilestone = new Date(`${prevYear}-08-01T00:00:00`);
      const prevFebMilestone = new Date(`${prevYear}-02-01T00:00:00`);
      
      if (lastPromotion < prevAugMilestone) {
        targetMilestoneStr = `${prevYear}-08-01`;
      } else if (lastPromotion < prevFebMilestone) {
        targetMilestoneStr = `${prevYear}-02-01`;
      }
    }
    
    if (!targetMilestoneStr) {
      return { promoted: false };
    }
    
    console.log(`Running automatic grade promotion for milestone: ${targetMilestoneStr}`);
    
    // Perform promotion in a transaction
    const executePromotion = db.transaction(() => {
      // 1. Get all students
      const students = db.prepare('SELECT id, enrollment, full_name, grade, career FROM students').all() as Array<{
        id: number;
        enrollment: string;
        full_name: string;
        grade: number;
        career: string;
      }>;
      
      let promotedCount = 0;
      let deletedCount = 0;
      
      const updateGrade = db.prepare('UPDATE students SET grade = grade + 1 WHERE id = ?');
      const deleteStudent = db.prepare('DELETE FROM students WHERE id = ?');
      
      for (const student of students) {
        // Límite de semestres por carrera: ICI 8 semestres, IME 8 semestres, IMT 8 semestres
        const maxSemester = 8; 
        
        if (student.grade >= maxSemester) {
          // Graduates - delete automatically
          deleteStudent.run(student.id);
          deletedCount++;
        } else {
          // Promote grade
          updateGrade.run(student.id);
          promotedCount++;
        }
      }
      
      // Update system config
      db.prepare('INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)')
        .run('last_grade_promotion_date', targetMilestoneStr);
        
      return { promotedCount, deletedCount };
    });
    
    const result = executePromotion();
    
    return {
      promoted: true,
      details: `Hitos de promoción ejecutados al ${targetMilestoneStr}. Alumnos promovidos: ${result.promotedCount}, egresados eliminados: ${result.deletedCount}.`
    };
  } catch (error: any) {
    console.error('Error al ejecutar la promoción de grado:', error);
    return { promoted: false, details: `Error: ${error.message}` };
  }
}
