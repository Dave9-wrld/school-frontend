export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface Session {
  token: string;
  user_id: number;
  username: string;
  display_name: string;
  role: Role;
  expires_at: string;
}

export interface StudentProfile {
  id: number;
  name: string;
  username: string;
  admission_number: string;
  current_class: number | null;
  current_class_name: string | null;
}

export interface Student {
  id: number;
  name: string;
  username: string;
  admission_number: string;
  current_class: number | null;
  current_class_name: string | null;
}

export interface Lecturer {
  id: number;
  name: string;
  username: string;
  employee_id: string;
}

export interface ClassGroup {
  id: number;
  name: string;
  class_teacher: number | null;
  teacher_name: string | null;
  student_count: number;
}

export interface Course {
  id: number;
  name: string;
  code: string;
  teacher: number | null;
  teacher_name?: string;
}

export interface Grade {
  id: number;
  student: number;
  subject: number;
  student_name: string;
  subject_name: string;
  session: number;
  session_name: string;
  continous_assessment_score: string | number;
  exam_score: string | number;
  total_score: string | number;
}

export interface Stats {
  total_teachers: number;
  total_students: number;
  total_subjects: number;
}

export interface PortalData {
  grades: Grade[];
  courses: Course[];
  students: Student[];
  classes: ClassGroup[];
  lecturers: Lecturer[];
  profile: StudentProfile | null;
  stats: Stats | null;
}
