'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Clock3, LockKeyhole, UsersRound } from 'lucide-react';

import { api } from '@/lib/api';
import { attendanceSummary } from '@/lib/attendance';
import type {
  AttendanceRecord,
  AttendanceSession,
  CourseEnrollment,
  PortalData,
  Session,
} from '@/lib/types';
import { Empty, Notice, PanelHeading, Submit } from './ui';

function readableStatus(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function EnrollmentWorkspace({
  session,
  data,
  onSaved,
}: {
  session: Session;
  data: PortalData;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const currentSession = data.sessions.find((item) => item.is_current);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const enrollment = await api<CourseEnrollment>('course-enrollments/', session, {
        method: 'POST',
        body: JSON.stringify({
          student: Number(fields.student),
          subject: Number(fields.subject),
          session: Number(fields.academic_session),
          status: 'ACTIVE',
        }),
      });
      setSuccess(`${enrollment.student_name} is now enrolled in ${enrollment.subject_code}.`);
      form.reset();
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="milestone-layout">
      {session.role === 'ADMIN' && (
        <section className="panel form-panel milestone-form">
          <PanelHeading eyebrow="COURSE REGISTRATION" title="Enroll a student" />
          <p className="panel-intro">Link a student to one course for a specific academic session.</p>
          <Notice>{error}</Notice>
          <Notice success>{success}</Notice>
          <form onSubmit={submit}>
            <div className="form-row">
              <label>
                Student
                <select name="student" defaultValue="" required disabled={busy}>
                  <option value="">Choose a student</option>
                  {data.students.map((student) => (
                    <option key={student.id} value={student.id}>{student.name} · {student.admission_number || student.username}</option>
                  ))}
                </select>
              </label>
              <label>
                Course
                <select name="subject" defaultValue="" required disabled={busy}>
                  <option value="">Choose a course</option>
                  {data.courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.code} · {course.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Academic session
              <select name="academic_session" defaultValue={currentSession?.id || ''} required disabled={busy}>
                <option value="">Choose a session</option>
                {data.sessions.map((academicSession) => (
                  <option key={academicSession.id} value={academicSession.id}>
                    {academicSession.session}{academicSession.is_current ? ' · Current' : ''}
                  </option>
                ))}
              </select>
            </label>
            <Submit busy={busy} disabled={!data.students.length || !data.courses.length || !data.sessions.length}>Enroll student</Submit>
          </form>
        </section>
      )}

      <section className="panel milestone-table">
        <PanelHeading
          eyebrow={session.role === 'STUDENT' ? 'MY REGISTRATION' : 'COURSE ENROLLMENT'}
          title={session.role === 'STUDENT' ? 'My enrolled courses' : 'Enrolled students'}
        />
        {data.courseEnrollments.length ? (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Student</th><th>Course</th><th>Session</th><th>Status</th></tr></thead>
              <tbody>
                {data.courseEnrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td><strong>{enrollment.student_name}</strong><small>{enrollment.admission_number || 'No admission number'}</small></td>
                    <td><strong>{enrollment.subject_code}</strong><small>{enrollment.subject_name}</small></td>
                    <td>{enrollment.session_name}</td>
                    <td><span className={`status-chip status-${enrollment.status.toLowerCase()}`}>{readableStatus(enrollment.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No course enrollments yet">
            {session.role === 'ADMIN' ? 'Use the enrollment form to register a student for a course.' : 'Your course registrations will appear here.'}
          </Empty>
        )}
      </section>
    </div>
  );
}

export function AttendanceWorkspace({
  session,
  data,
  onSaved,
}: {
  session: Session;
  data: PortalData;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const summary = attendanceSummary(data.attendanceRecords);
  const activeSession = data.attendanceSessions.find((item) => item.id === Number(selectedSession));
  const eligibleEnrollments = useMemo(() => {
    if (!activeSession) return [];
    return data.courseEnrollments.filter(
      (item) => item.status === 'ACTIVE' && item.subject === activeSession.subject && item.session === activeSession.academic_session,
    );
  }, [activeSession, data.courseEnrollments]);

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const created = await api<AttendanceSession>('attendance-sessions/', session, {
        method: 'POST',
        body: JSON.stringify({
          subject: Number(fields.subject),
          date: fields.date,
          starts_at: fields.starts_at,
          ends_at: fields.ends_at || null,
        }),
      });
      setSuccess(`${created.subject_code} attendance session is open.`);
      form.reset();
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function recordAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const record = await api<AttendanceRecord>('attendance-records/', session, {
        method: 'POST',
        body: JSON.stringify({
          attendance_session: Number(fields.attendance_session),
          course_enrollment: Number(fields.course_enrollment),
          status: fields.status,
          notes: fields.notes,
        }),
      });
      setSuccess(`${record.student_name} was marked ${readableStatus(record.status).toLowerCase()}.`);
      form.reset();
      setSelectedSession('');
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function closeSession(attendanceSession: AttendanceSession) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api(`attendance-sessions/${attendanceSession.id}/`, session, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CLOSED' }),
      });
      setSuccess(`${attendanceSession.subject_code} attendance session is closed.`);
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (session.role === 'STUDENT') {
    return (
      <div className="attendance-student">
        <section className="attendance-summary">
          <article><CheckCircle2 size={20} /><span>Attendance rate</span><strong>{summary.rate === null ? '—' : `${summary.rate}%`}</strong></article>
          <article><UsersRound size={20} /><span>Present / late</span><strong>{summary.present + summary.late}</strong></article>
          <article><Clock3 size={20} /><span>Absent</span><strong>{summary.absent}</strong></article>
          <article><LockKeyhole size={20} /><span>Excused</span><strong>{summary.excused}</strong></article>
        </section>
        <AttendanceTable records={data.attendanceRecords} studentView />
      </div>
    );
  }

  return (
    <div className="milestone-layout">
      <section className="panel form-panel milestone-form">
        <PanelHeading eyebrow="LECTURE ATTENDANCE" title="Open an attendance session" />
        <p className="panel-intro">Choose one assigned course and the lecture time. The current academic session is used automatically.</p>
        <Notice>{error}</Notice>
        <Notice success>{success}</Notice>
        <form onSubmit={createSession}>
          <label>Course<select name="subject" defaultValue="" required disabled={busy}><option value="">Choose a course</option>{data.courses.map((course) => <option key={course.id} value={course.id}>{course.code} · {course.name}</option>)}</select></label>
          <div className="form-row">
            <label>Date<input name="date" type="date" required disabled={busy} /></label>
            <label>Start time<input name="starts_at" type="time" required disabled={busy} /></label>
          </div>
          <label>End time <span className="label-note">optional</span><input name="ends_at" type="time" disabled={busy} /></label>
          <Submit busy={busy} disabled={!data.courses.length}>Open attendance</Submit>
        </form>
      </section>

      <section className="panel form-panel milestone-form">
        <PanelHeading eyebrow="STUDENT ATTENDANCE" title="Mark a student" />
        <form onSubmit={recordAttendance}>
          <label>Open session<select name="attendance_session" value={selectedSession} onChange={(event) => setSelectedSession(event.target.value)} required disabled={busy}><option value="">Choose a session</option>{data.attendanceSessions.filter((item) => item.status === 'OPEN').map((item) => <option key={item.id} value={item.id}>{item.subject_code} · {item.date} · {item.starts_at.slice(0, 5)}</option>)}</select></label>
          <label>Enrolled student<select name="course_enrollment" defaultValue="" required disabled={busy || !activeSession}><option value="">Choose a student</option>{eligibleEnrollments.map((item) => <option key={item.id} value={item.id}>{item.student_name} · {item.admission_number || 'No admission number'}</option>)}</select></label>
          <label>Status<select name="status" defaultValue="PRESENT" required disabled={busy}><option value="PRESENT">Present</option><option value="LATE">Late</option><option value="ABSENT">Absent</option><option value="EXCUSED">Excused</option></select></label>
          <label>Note <span className="label-note">optional</span><textarea name="notes" maxLength={1000} disabled={busy} /></label>
          <Submit busy={busy} disabled={!eligibleEnrollments.length}>Save attendance</Submit>
        </form>
      </section>

      <section className="panel milestone-table milestone-wide">
        <PanelHeading eyebrow="ATTENDANCE SESSIONS" title="Lecture sessions" />
        {data.attendanceSessions.length ? (
          <div className="table-scroll"><table><thead><tr><th>Course</th><th>Date & time</th><th>Records</th><th>Status</th><th /></tr></thead><tbody>{data.attendanceSessions.map((item) => <tr key={item.id}><td><strong>{item.subject_code}</strong><small>{item.subject_name}</small></td><td>{item.date}<small>{item.starts_at.slice(0, 5)}{item.ends_at ? ` – ${item.ends_at.slice(0, 5)}` : ''}</small></td><td>{item.record_count}</td><td><span className={`status-chip status-${item.status.toLowerCase()}`}>{readableStatus(item.status)}</span></td><td>{item.status === 'OPEN' && <button className="text-button" type="button" disabled={busy} onClick={() => closeSession(item)}>Close session</button>}</td></tr>)}</tbody></table></div>
        ) : <Empty title="No attendance sessions yet">Open the first lecture attendance session using the form.</Empty>}
      </section>

      <AttendanceTable records={data.attendanceRecords} />
    </div>
  );
}

function AttendanceTable({ records, studentView = false }: { records: AttendanceRecord[]; studentView?: boolean }) {
  return (
    <section className="panel milestone-table milestone-wide">
      <PanelHeading eyebrow="ATTENDANCE HISTORY" title={studentView ? 'My attendance records' : 'Recorded attendance'} />
      {records.length ? (
        <div className="table-scroll"><table><thead><tr>{!studentView && <th>Student</th>}<th>Course</th><th>Date</th><th>Status</th><th>Note</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}>{!studentView && <td><strong>{record.student_name}</strong><small>{record.admission_number || 'No admission number'}</small></td>}<td><strong>{record.subject_code}</strong><small>{record.subject_name}</small></td><td>{record.session_date}</td><td><span className={`status-chip status-${record.status.toLowerCase()}`}>{readableStatus(record.status)}</span></td><td>{record.notes || '—'}</td></tr>)}</tbody></table></div>
      ) : <Empty title="No attendance records yet">Saved attendance will appear here.</Empty>}
    </section>
  );
}
