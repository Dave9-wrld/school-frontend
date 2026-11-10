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
  user_id?: number;
  name: string;
  first_name?: string;
  last_name?: string;
  username: string;
  email?: string;
  phone_number?: string;
  admission_number: string;
  date_of_birth?: string;
  current_class: number | null;
  current_class_name: string | null;
  is_active?: boolean;
}

export interface Lecturer {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  username: string;
  email?: string;
  phone_number?: string;
  employee_id: string;
  department?: string;
  is_active?: boolean;
  assigned_classes?: string[];
  assigned_subjects?: string[];
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
  grades_count?: number;
}

export interface AcademicSession {
  id: number;
  session: string;
  is_current: boolean;
  grades_count?: number;
}

export interface Grade {
  id: number;
  student: number;
  subject: number;
  student_name: string;
  subject_name: string;
  session: number;
  session_name: string;
  continuous_assessment_score: string | number;
  continous_assessment_score?: string | number;
  exam_score: string | number;
  total_score: string | number;
}

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN';

export interface CourseEnrollment {
  id: number;
  student: number;
  student_name: string;
  admission_number: string | null;
  subject: number;
  subject_name: string;
  subject_code: string;
  session: number;
  session_name: string;
  teacher_name: string | null;
  status: EnrollmentStatus;
  enrolled_on: string | null;
  ended_on: string | null;
  created_at: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceSession {
  id: number;
  subject: number;
  subject_name: string;
  subject_code: string;
  academic_session: number;
  session_name: string;
  teacher_name: string | null;
  date: string;
  starts_at: string;
  ends_at: string | null;
  status: 'OPEN' | 'CLOSED';
  record_count: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: number;
  attendance_session: number;
  course_enrollment: number;
  student: number;
  student_name: string;
  admission_number: string | null;
  subject_code: string;
  subject_name: string;
  session_date: string;
  status: AttendanceStatus;
  notes: string;
  recorded_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total_teachers: number;
  total_students: number;
  total_subjects: number;
  total_classes?: number;
  total_grades?: number;
  current_session?: string | null;
  current_session_id?: number | null;
}

export interface PortalData {
  grades: Grade[];
  courses: Course[];
  students: Student[];
  classes: ClassGroup[];
  lecturers: Lecturer[];
  sessions: AcademicSession[];
  courseEnrollments: CourseEnrollment[];
  attendanceSessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
  profile: StudentProfile | null;
  stats: Stats | null;
}
