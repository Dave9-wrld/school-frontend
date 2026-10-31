import type { Grade } from './types.ts';
export function filterGrades(grades: Grade[], search = '', session = 'all', course = 'all') {
  const term = search.trim().toLowerCase();
  return grades.filter(g => (session === 'all' || String(g.session) === session) && (course === 'all' || String(g.subject) === course) && `${g.student_name} ${g.subject_name}`.toLowerCase().includes(term));
}
export function resultsCsv(grades: Grade[]) {
  const rows = [['Student','Course','Session','Assessment / 40','Exam / 60','Total / 100'], ...grades.map(g => [g.student_name,g.subject_name,g.session_name,g.continuous_assessment_score,g.exam_score,g.total_score])];
  return '\ufeff' + rows.map(row => row.map(cell => {
    let value = String(cell ?? '');
    if (/^[=+\-@\t\r]/.test(value)) value = "'" + value;
    return '"' + value.replaceAll('"', '""') + '"';
  }).join(',')).join('\r\n');
}
