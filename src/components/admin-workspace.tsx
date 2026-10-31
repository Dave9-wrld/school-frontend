'use client';
import { useState, useMemo, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Plus,
  Search,
  UsersRound,
  BookOpen,
  UserRound,
  X,
  RotateCcw,
  GraduationCap,
  CalendarDays,
  Trophy,
  CheckCircle2,
  Trash2,
  Download,
  AlertTriangle,
  Mail,
  Phone,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AcademicSession, ClassGroup, Course, Grade, Lecturer, PortalData, Session, Student } from '@/lib/types';
import { Dialog, Empty, Notice, PanelHeading, Submit } from './ui';
import { CreateAccountDialog } from './create-account-dialog';

type AdminView = 'classes' | 'students' | 'lecturers' | 'courses' | 'sessions' | 'results';

type Editor =
  | { type: 'create_class' }
  | { type: 'class'; classGroup: ClassGroup }
  | { type: 'student'; student: Student }
  | { type: 'lecturer'; lecturer: Lecturer }
  | { type: 'create_course' }
  | { type: 'course'; course: Course }
  | { type: 'create_session' }
  | { type: 'session'; sessionItem: AcademicSession }
  | { type: 'grade'; grade: Grade }
  | { type: 'delete'; itemType: 'class' | 'student' | 'lecturer' | 'course' | 'session' | 'grade'; id: number; title: string };

function computeGradeBadge(total: number) {
  if (total >= 70) return { letter: 'A', className: 'grade-badge-a' };
  if (total >= 60) return { letter: 'B', className: 'grade-badge-b' };
  if (total >= 50) return { letter: 'C', className: 'grade-badge-c' };
  if (total >= 45) return { letter: 'D', className: 'grade-badge-d' };
  return { letter: 'F', className: 'grade-badge-f' };
}

export function AdminWorkspace({
  session,
  data,
  view,
  onSaved,
  onNavigate,
}: {
  session: Session;
  data: PortalData;
  view: AdminView;
  onSaved: () => Promise<void>;
  onNavigate?: (v: string) => void;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [newAccount, setNewAccount] = useState<'STUDENT' | 'TEACHER' | null>(null);

  // Filters for tables
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>('all');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  const matches = (text: string) => text.toLowerCase().includes(search.trim().toLowerCase());

  // Filtered datasets
  const students = useMemo(() => {
    return (data.students || []).filter((s) => {
      const matchText = matches(`${s.name} ${s.username} ${s.admission_number || ''} ${s.current_class_name || ''} ${s.email || ''}`);
      if (!matchText) return false;
      if (selectedClassFilter !== 'all') {
        if (selectedClassFilter === 'unassigned') return !s.current_class;
        return String(s.current_class) === selectedClassFilter;
      }
      return true;
    });
  }, [data.students, search, selectedClassFilter]);

  const classes = useMemo(() => {
    return (data.classes || []).filter((c) => matches(`${c.name} ${c.teacher_name || ''}`));
  }, [data.classes, search]);

  const lecturers = useMemo(() => {
    return (data.lecturers || []).filter((l) =>
      matches(`${l.name} ${l.username} ${l.employee_id || ''} ${l.department || ''} ${l.email || ''}`)
    );
  }, [data.lecturers, search]);

  const courses = useMemo(() => {
    return (data.courses || []).filter((c) => matches(`${c.name} ${c.code} ${c.teacher_name || ''}`));
  }, [data.courses, search]);

  const sessions = useMemo(() => {
    return (data.sessions || []).filter((s) => matches(s.session));
  }, [data.sessions, search]);

  const grades = useMemo(() => {
    return (data.grades || []).filter((g) => {
      const matchText = matches(`${g.student_name} ${g.subject_name} ${g.session_name}`);
      if (!matchText) return false;
      if (selectedSessionFilter !== 'all' && String(g.session) !== selectedSessionFilter) return false;
      if (selectedCourseFilter !== 'all' && String(g.subject) !== selectedCourseFilter) return false;
      return true;
    });
  }, [data.grades, search, selectedSessionFilter, selectedCourseFilter]);

  function edit(value: Editor) {
    setEditor(value);
    setError('');
  }

  async function handleSetCurrentSession(sessionId: number, sessionName: string) {
    setBusy(true);
    setError('');
    try {
      await api(`admin/sessions/${sessionId}/`, session, {
        method: 'PATCH',
        body: JSON.stringify({ is_current: true }),
      });
      setSuccess(`Academic session ${sessionName} is now set as the active current session.`);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not activate session.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!editor || editor.type !== 'delete') return;
    setBusy(true);
    setError('');
    const { itemType, id, title } = editor;
    try {
      if (itemType === 'class') {
        await api(`admin/classes/${id}/`, session, { method: 'DELETE' });
        setSuccess(`Class "${title}" has been deleted.`);
      } else if (itemType === 'student') {
        await api(`admin/students/${id}/`, session, { method: 'DELETE' });
        setSuccess(`Student account "${title}" has been removed.`);
      } else if (itemType === 'lecturer') {
        await api(`admin/teachers/${id}/`, session, { method: 'DELETE' });
        setSuccess(`Lecturer "${title}" has been removed.`);
      } else if (itemType === 'course') {
        await api(`admin/subjects/${id}/`, session, { method: 'DELETE' });
        setSuccess(`Course "${title}" has been deleted.`);
      } else if (itemType === 'session') {
        await api(`admin/sessions/${id}/`, session, { method: 'DELETE' });
        setSuccess(`Academic session "${title}" has been deleted.`);
      } else if (itemType === 'grade') {
        await api(`admin/grades/${id}/`, session, { method: 'DELETE' });
        setSuccess(`Grade record has been deleted.`);
      }
      setEditor(null);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editor) return;
    setBusy(true);
    setError('');
    const fields = Object.fromEntries(new FormData(e.currentTarget));

    try {
      if (editor.type === 'create_class') {
        await api('admin/classes/', session, {
          method: 'POST',
          body: JSON.stringify({
            name: fields.name,
            class_teacher: fields.class_teacher ? Number(fields.class_teacher) : null,
          }),
        });
        setSuccess('Class group successfully created.');
      } else if (editor.type === 'class') {
        await api(`admin/classes/${editor.classGroup.id}/`, session, {
          method: 'PATCH',
          body: JSON.stringify({
            name: fields.name,
            class_teacher: fields.class_teacher ? Number(fields.class_teacher) : null,
          }),
        });
        setSuccess('Class group details updated.');
      } else if (editor.type === 'student') {
        await api(`admin/students/${editor.student.id}/`, session, {
          method: 'PATCH',
          body: JSON.stringify({
            first_name: fields.first_name,
            last_name: fields.last_name,
            email: fields.email,
            phone_number: fields.phone_number,
            admission_number: fields.admission_number,
            current_class: fields.current_class ? Number(fields.current_class) : null,
          }),
        });
        setSuccess('Student profile details updated.');
      } else if (editor.type === 'lecturer') {
        await api(`admin/teachers/${editor.lecturer.id}/`, session, {
          method: 'PATCH',
          body: JSON.stringify({
            first_name: fields.first_name,
            last_name: fields.last_name,
            email: fields.email,
            phone_number: fields.phone_number,
            employee_id: fields.employee_id,
            department: fields.department,
          }),
        });
        setSuccess('Lecturer profile details updated.');
      } else if (editor.type === 'create_course') {
        await api('admin/subjects/', session, {
          method: 'POST',
          body: JSON.stringify({
            name: fields.name,
            code: fields.code,
            teacher: fields.teacher ? Number(fields.teacher) : null,
          }),
        });
        setSuccess('Course successfully registered.');
      } else if (editor.type === 'course') {
        await api(`admin/subjects/${editor.course.id}/`, session, {
          method: 'PATCH',
          body: JSON.stringify({
            name: fields.name,
            code: fields.code,
            teacher: fields.teacher ? Number(fields.teacher) : null,
          }),
        });
        setSuccess('Course details updated.');
      } else if (editor.type === 'create_session') {
        await api('admin/sessions/', session, {
          method: 'POST',
          body: JSON.stringify({
            session: fields.session,
            is_current: fields.is_current === 'on',
          }),
        });
        setSuccess('Academic session registered.');
      } else if (editor.type === 'session') {
        await api(`admin/sessions/${editor.sessionItem.id}/`, session, {
          method: 'PATCH',
          body: JSON.stringify({
            session: fields.session,
            is_current: fields.is_current === 'on',
          }),
        });
        setSuccess('Academic session updated.');
      } else if (editor.type === 'grade') {
        await api(`admin/grades/${editor.grade.id}/`, session, {
          method: 'PATCH',
          body: JSON.stringify({
            continuous_assessment_score: fields.continuous_assessment_score,
            exam_score: fields.exam_score,
          }),
        });
        setSuccess('Result mark updated successfully.');
      }

      setEditor(null);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please check your input and try again.');
    } finally {
      setBusy(false);
    }
  }

  function downloadCSV() {
    if (!grades.length) return;
    const headers = ['Student Name', 'Course Name', 'Academic Session', 'Continuous Assessment (40)', 'Examination (60)', 'Total (100)', 'Grade'];
    const rows = grades.map((g) => {
      const tot = Number(g.total_score);
      const b = computeGradeBadge(tot);
      return [
        `"${g.student_name.replace(/"/g, '""')}"`,
        `"${g.subject_name.replace(/"/g, '""')}"`,
        `"${g.session_name.replace(/"/g, '""')}"`,
        Number(g.continuous_assessment_score || g.continous_assessment_score || 0).toFixed(2),
        Number(g.exam_score || 0).toFixed(2),
        tot.toFixed(2),
        b.letter,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dave_university_grades_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Notice success>{success}</Notice>
      <Notice>{error}</Notice>

      <section className="panel directory-panel">
        <PanelHeading
          eyebrow="INSTITUTIONAL ADMINISTRATION"
          title={
            view === 'classes'
              ? 'Class groups'
              : view === 'students'
              ? 'Student directory'
              : view === 'lecturers'
              ? 'Lecturer registry'
              : view === 'courses'
              ? 'Courses & subjects'
              : view === 'sessions'
              ? 'Academic sessions'
              : 'University examination results'
          }
          action={
            <div className="account-actions">
              {view === 'classes' && (
                <>
                  <button className="button button-outline button-small" onClick={() => setNewAccount('TEACHER')}>
                    <Plus size={16} /> Add lecturer
                  </button>
                  <button className="button button-primary button-small" onClick={() => edit({ type: 'create_class' })}>
                    <Plus size={16} /> New class
                  </button>
                </>
              )}
              {view === 'students' && (
                <button className="button button-primary button-small" onClick={() => setNewAccount('STUDENT')}>
                  <Plus size={16} /> Add student
                </button>
              )}
              {view === 'lecturers' && (
                <button className="button button-primary button-small" onClick={() => setNewAccount('TEACHER')}>
                  <Plus size={16} /> Add lecturer
                </button>
              )}
              {view === 'courses' && (
                <button className="button button-primary button-small" onClick={() => edit({ type: 'create_course' })}>
                  <Plus size={16} /> New course
                </button>
              )}
              {view === 'sessions' && (
                <button className="button button-primary button-small" onClick={() => edit({ type: 'create_session' })}>
                  <Plus size={16} /> New academic session
                </button>
              )}
              {view === 'results' && (
                <button className="button button-outline button-small" onClick={downloadCSV} disabled={!grades.length}>
                  <Download size={16} /> Download CSV
                </button>
              )}
            </div>
          }
        />

        {/* Search and Filters toolbar */}
        <div className="table-tools">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search"
              placeholder={
                view === 'classes'
                  ? 'Find a class or lecturer…'
                  : view === 'students'
                  ? 'Find student by name, username, or matric…'
                  : view === 'lecturers'
                  ? 'Find lecturer by name, department, or staff ID…'
                  : view === 'courses'
                  ? 'Find course by name or code…'
                  : view === 'sessions'
                  ? 'Find academic session…'
                  : 'Search by student, course, or session…'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="clear-search-btn" onClick={() => setSearch('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </label>

          {/* Contextual filters */}
          {view === 'students' && (
            <select
              aria-label="Filter students by class"
              className="table-filter-select"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
            >
              <option value="all">All classes ({data.students.length})</option>
              <option value="unassigned">Awaiting allocation ({data.students.filter((s) => !s.current_class).length})</option>
              {data.classes.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name} ({c.student_count})
                </option>
              ))}
            </select>
          )}

          {view === 'results' && (
            <>
              <select
                aria-label="Filter results by academic session"
                className="table-filter-select"
                value={selectedSessionFilter}
                onChange={(e) => setSelectedSessionFilter(e.target.value)}
              >
                <option value="all">All academic sessions</option>
                {data.sessions?.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.session} {s.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter results by course"
                className="table-filter-select"
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
              >
                <option value="all">All courses</option>
                {data.courses?.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </select>
            </>
          )}

          <span className="directory-count">
            {view === 'classes'
              ? `${classes.length} of ${data.classes.length} class groups`
              : view === 'students'
              ? `${students.length} of ${data.students.length} students`
              : view === 'lecturers'
              ? `${lecturers.length} of ${data.lecturers.length} lecturers`
              : view === 'courses'
              ? `${courses.length} of ${data.courses.length} courses`
              : view === 'sessions'
              ? `${sessions.length} of ${data.sessions?.length || 0} academic sessions`
              : `${grades.length} of ${data.grades.length} recorded grades`}
          </span>
        </div>

        {/* 1. Classes View */}
        {view === 'classes' &&
          (classes.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Class group</th>
                    <th>Class lecturer</th>
                    <th>Students</th>
                    <th>Allocation</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="table-person">
                          <span className="table-icon">
                            <BookOpen size={17} />
                          </span>
                          <strong>{c.name}</strong>
                        </div>
                      </td>
                      <td>{c.teacher_name || <span className="muted">Not assigned</span>}</td>
                      <td>
                        <span className="inline-icon">
                          <UsersRound size={14} />
                          {c.student_count}
                        </span>
                      </td>
                      <td>
                        <span className={`status-label ${!c.class_teacher ? 'status-pending' : ''}`}>
                          <i />
                          {c.class_teacher ? 'Lecturer assigned' : 'Awaiting lecturer'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <button className="text-button" onClick={() => edit({ type: 'class', classGroup: c })}>
                            Manage <ArrowUpRight size={15} />
                          </button>
                          <button
                            className="text-button"
                            style={{ color: '#9b2c3b' }}
                            title="Delete class"
                            onClick={() => edit({ type: 'delete', itemType: 'class', id: c.id, title: c.name })}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title={search ? 'No classes match your search' : 'A place for every student'}>
              {search ? 'Try searching for a different class name or lecturer.' : 'Create your first class to begin assigning lecturers and students.'}
            </Empty>
          ))}

        {/* 2. Students View */}
        {view === 'students' &&
          (students.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Admission number</th>
                    <th>Current class</th>
                    <th>Contact details</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="table-person">
                          <span className="mini-avatar">{s.name.slice(0, 1).toUpperCase()}</span>
                          <div>
                            <strong>{s.name}</strong>
                            <small>@{s.username}</small>
                          </div>
                        </div>
                      </td>
                      <td>{s.admission_number || '—'}</td>
                      <td>
                        <span className={`status-label ${!s.current_class ? 'status-pending' : ''}`}>
                          <i />
                          {s.current_class_name || 'Not assigned'}
                        </span>
                      </td>
                      <td>
                        <small className="muted" style={{ display: 'block' }}>
                          {s.email || 'No email registered'}
                        </small>
                        {s.phone_number && (
                          <small className="muted" style={{ display: 'block' }}>
                            {s.phone_number}
                          </small>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <button className="text-button" onClick={() => edit({ type: 'student', student: s })}>
                            Edit details <ArrowUpRight size={15} />
                          </button>
                          <button
                            className="text-button"
                            style={{ color: '#9b2c3b' }}
                            title="Remove student"
                            onClick={() => edit({ type: 'delete', itemType: 'student', id: s.id, title: s.name })}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title={search ? 'No students match your query' : 'Your student community starts here'}>
              {search ? 'Try adjusting your search criteria.' : 'Add your first student account to get started.'}
            </Empty>
          ))}

        {/* 3. Lecturers View */}
        {view === 'lecturers' &&
          (lecturers.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Lecturer</th>
                    <th>Staff / Employee ID</th>
                    <th>Department</th>
                    <th>Assigned portfolio</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lecturers.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <div className="table-person">
                          <span className="mini-avatar">{l.name.slice(0, 1).toUpperCase()}</span>
                          <div>
                            <strong>{l.name}</strong>
                            <small>@{l.username}</small>
                          </div>
                        </div>
                      </td>
                      <td>{l.employee_id || '—'}</td>
                      <td>{l.department || <span className="muted">General Faculty</span>}</td>
                      <td>
                        <small className="muted">
                          {l.assigned_subjects?.length ? l.assigned_subjects.join(', ') : 'No courses assigned yet'}
                        </small>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <button className="text-button" onClick={() => edit({ type: 'lecturer', lecturer: l })}>
                            Edit details <ArrowUpRight size={15} />
                          </button>
                          <button
                            className="text-button"
                            style={{ color: '#9b2c3b' }}
                            title="Remove lecturer"
                            onClick={() => edit({ type: 'delete', itemType: 'lecturer', id: l.id, title: l.name })}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title={search ? 'No lecturers match your query' : 'Teaching faculty'}>
              {search ? 'Try searching by name or department.' : 'Add your first lecturer account to begin course allocations.'}
            </Empty>
          ))}

        {/* 4. Courses / Subjects View */}
        {view === 'courses' &&
          (courses.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Course code</th>
                    <th>Course title</th>
                    <th>Assigned lecturer</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.code}</strong>
                      </td>
                      <td>{c.name}</td>
                      <td>{c.teacher_name || <span className="muted">Unassigned</span>}</td>
                      <td>
                        <span className={`status-label ${!c.teacher ? 'status-pending' : ''}`}>
                          <i />
                          {c.teacher ? 'Active syllabus' : 'Needs lecturer'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <button className="text-button" onClick={() => edit({ type: 'course', course: c })}>
                            Edit course <ArrowUpRight size={15} />
                          </button>
                          <button
                            className="text-button"
                            style={{ color: '#9b2c3b' }}
                            title="Delete course"
                            onClick={() => edit({ type: 'delete', itemType: 'course', id: c.id, title: `${c.code} - ${c.name}` })}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title={search ? 'No courses match your query' : 'University Course Registry'}>
              {search ? 'Try searching for a different course code or title.' : 'Create courses to build your academic registry.'}
            </Empty>
          ))}

        {/* 5. Academic Sessions View */}
        {view === 'sessions' &&
          (sessions.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Academic session</th>
                    <th>Active state</th>
                    <th>Recorded results</th>
                    <th>Activation</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="table-person">
                          <span className="table-icon">
                            <CalendarDays size={17} />
                          </span>
                          <strong>{s.session}</strong>
                        </div>
                      </td>
                      <td>
                        {s.is_current ? (
                          <span className="metric-pill-session">
                            <i /> Current active session
                          </span>
                        ) : (
                          <span className="status-label">
                            <i style={{ background: '#999' }} /> Inactive session
                          </span>
                        )}
                      </td>
                      <td>{s.grades_count ?? '—'} grades recorded</td>
                      <td>
                        {!s.is_current ? (
                          <button
                            className="button button-outline button-small"
                            onClick={() => handleSetCurrentSession(s.id, s.session)}
                            disabled={busy}
                          >
                            <CheckCircle2 size={14} /> Set as current
                          </button>
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>
                            Primary session
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <button className="text-button" onClick={() => edit({ type: 'session', sessionItem: s })}>
                            Edit <ArrowUpRight size={15} />
                          </button>
                          <button
                            className="text-button"
                            style={{ color: '#9b2c3b' }}
                            title="Delete session"
                            onClick={() => edit({ type: 'delete', itemType: 'session', id: s.id, title: s.session })}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title={search ? 'No sessions match your search' : 'Academic calendar'}>
              Create your university's academic sessions (e.g. 2025/2026) to enable grading.
            </Empty>
          ))}

        {/* 6. University Results View */}
        {view === 'results' &&
          (grades.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Session</th>
                    <th>CA (40)</th>
                    <th>Exam (60)</th>
                    <th>Total (100)</th>
                    <th>Grade</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g) => {
                    const total = Number(g.total_score);
                    const badge = computeGradeBadge(total);
                    return (
                      <tr key={g.id}>
                        <td>
                          <strong>{g.student_name}</strong>
                        </td>
                        <td>{g.subject_name}</td>
                        <td>{g.session_name}</td>
                        <td>{Number(g.continuous_assessment_score || g.continous_assessment_score || 0).toFixed(1)}</td>
                        <td>{Number(g.exam_score || 0).toFixed(1)}</td>
                        <td>
                          <strong>{total.toFixed(1)}</strong>
                        </td>
                        <td>
                          <span className={`grade-badge ${badge.className}`}>{badge.letter}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button className="text-button" onClick={() => edit({ type: 'grade', grade: g })}>
                              Edit mark <ArrowUpRight size={15} />
                            </button>
                            <button
                              className="text-button"
                              style={{ color: '#9b2c3b' }}
                              title="Delete result"
                              onClick={() =>
                                edit({
                                  type: 'delete',
                                  itemType: 'grade',
                                  id: g.id,
                                  title: `${g.student_name} · ${g.subject_name}`,
                                })
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title={search ? 'No grades match your search filters' : 'University Examination Records'}>
              {search
                ? 'Try clearing or widening your course or academic session filters.'
                : 'Recorded grades will appear here across all university faculties.'}
            </Empty>
          ))}
      </section>

      {/* Account Creation Modal (Student / Lecturer) */}
      {newAccount && (
        <CreateAccountDialog
          session={session}
          role={newAccount}
          onClose={() => setNewAccount(null)}
          onCreated={async () => {
            setNewAccount(null);
            setSuccess(`New ${newAccount === 'TEACHER' ? 'lecturer' : 'student'} account created.`);
            await onSaved();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {editor?.type === 'delete' && (
        <Dialog title="Confirm Deletion" onClose={() => setEditor(null)}>
          <div className="confirm-delete-box">
            <h4>Delete {editor.itemType}?</h4>
            <p>
              Are you sure you want to permanently remove <strong>{editor.title}</strong>? This action cannot be undone.
            </p>
          </div>
          <div className="form-actions-split">
            <button type="button" className="button button-outline" onClick={() => setEditor(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="button button-danger"
              onClick={handleDeleteConfirmed}
              disabled={busy}
            >
              {busy ? 'Deleting…' : 'Yes, Delete'}
            </button>
          </div>
        </Dialog>
      )}

      {/* Class Create / Edit Modal */}
      {(editor?.type === 'create_class' || editor?.type === 'class') && (
        <Dialog
          title={editor.type === 'create_class' ? 'Create a new class group' : `Manage ${editor.classGroup.name}`}
          onClose={() => setEditor(null)}
        >
          <Notice>{error}</Notice>
          <form onSubmit={submit}>
            <label>
              Class name
              <input
                name="name"
                defaultValue={editor.type === 'class' ? editor.classGroup.name : ''}
                placeholder="e.g. Year 1 Alpha, Mechanical 200L"
                required
              />
            </label>
            <label>
              Assign class lecturer (optional)
              <select
                name="class_teacher"
                defaultValue={editor.type === 'class' && editor.classGroup.class_teacher ? String(editor.classGroup.class_teacher) : ''}
              >
                <option value="">No lecturer assigned</option>
                {data.lecturers.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.name} (@{l.username}) {l.employee_id ? `· ${l.employee_id}` : ''}
                  </option>
                ))}
              </select>
            </label>

            {editor.type === 'class' && (
              <p className="form-footnote">
                This class currently has {editor.classGroup.student_count} enrolled student
                {editor.classGroup.student_count === 1 ? '' : 's'}.
              </p>
            )}

            <Submit busy={busy}>{editor.type === 'create_class' ? 'Create class group' : 'Save class changes'}</Submit>
          </form>
        </Dialog>
      )}

      {/* Student Edit Modal */}
      {editor?.type === 'student' && (
        <Dialog title={`Edit ${editor.student.name}`} onClose={() => setEditor(null)}>
          <Notice>{error}</Notice>
          <form onSubmit={submit}>
            <div className="form-row">
              <label>
                First name
                <input name="first_name" defaultValue={editor.student.first_name || editor.student.name.split(' ')[0]} required />
              </label>
              <label>
                Last name
                <input name="last_name" defaultValue={editor.student.last_name || editor.student.name.split(' ').slice(1).join(' ')} required />
              </label>
            </div>
            <label>
              Email address
              <input name="email" type="email" defaultValue={editor.student.email || ''} placeholder="student@dave.edu" />
            </label>
            <div className="form-row">
              <label>
                Admission number
                <input
                  name="admission_number"
                  defaultValue={editor.student.admission_number || ''}
                  placeholder="e.g. DU/26/001"
                />
              </label>
              <label>
                Phone number
                <input name="phone_number" defaultValue={editor.student.phone_number || ''} placeholder="+234..." />
              </label>
            </div>
            <label>
              Class allocation
              <select name="current_class" defaultValue={editor.student.current_class ? String(editor.student.current_class) : ''}>
                <option value="">Not assigned to a class</option>
                {data.classes.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-actions-split">
              <button
                type="button"
                className="button-danger-outline button button-small"
                onClick={() =>
                  edit({
                    type: 'delete',
                    itemType: 'student',
                    id: editor.student.id,
                    title: editor.student.name,
                  })
                }
              >
                <Trash2 size={15} /> Delete student
              </button>
              <Submit busy={busy}>Save profile changes</Submit>
            </div>
          </form>
        </Dialog>
      )}

      {/* Lecturer Edit Modal */}
      {editor?.type === 'lecturer' && (
        <Dialog title={`Edit ${editor.lecturer.name}`} onClose={() => setEditor(null)}>
          <Notice>{error}</Notice>
          <form onSubmit={submit}>
            <div className="form-row">
              <label>
                First name
                <input name="first_name" defaultValue={editor.lecturer.first_name || editor.lecturer.name.split(' ')[0]} required />
              </label>
              <label>
                Last name
                <input name="last_name" defaultValue={editor.lecturer.last_name || editor.lecturer.name.split(' ').slice(1).join(' ')} required />
              </label>
            </div>
            <label>
              Email address
              <input name="email" type="email" defaultValue={editor.lecturer.email || ''} placeholder="lecturer@dave.edu" />
            </label>
            <div className="form-row">
              <label>
                Employee / Staff ID
                <input name="employee_id" defaultValue={editor.lecturer.employee_id || ''} placeholder="e.g. STAFF-024" />
              </label>
              <label>
                Department
                <input name="department" defaultValue={editor.lecturer.department || ''} placeholder="e.g. Computer Science" />
              </label>
            </div>
            <label>
              Phone number
              <input name="phone_number" defaultValue={editor.lecturer.phone_number || ''} placeholder="+234..." />
            </label>

            <div className="form-actions-split">
              <button
                type="button"
                className="button-danger-outline button button-small"
                onClick={() =>
                  edit({
                    type: 'delete',
                    itemType: 'lecturer',
                    id: editor.lecturer.id,
                    title: editor.lecturer.name,
                  })
                }
              >
                <Trash2 size={15} /> Delete lecturer
              </button>
              <Submit busy={busy}>Save lecturer changes</Submit>
            </div>
          </form>
        </Dialog>
      )}

      {/* Course Create / Edit Modal */}
      {(editor?.type === 'create_course' || editor?.type === 'course') && (
        <Dialog
          title={editor.type === 'create_course' ? 'Register a new course' : `Edit ${editor.course.code}`}
          onClose={() => setEditor(null)}
        >
          <Notice>{error}</Notice>
          <form onSubmit={submit}>
            <label>
              Course title
              <input
                name="name"
                defaultValue={editor.type === 'course' ? editor.course.name : ''}
                placeholder="e.g. Introduction to Software Engineering"
                required
              />
            </label>
            <label>
              Course code
              <input
                name="code"
                defaultValue={editor.type === 'course' ? editor.course.code : ''}
                placeholder="e.g. CSC201"
                required
              />
            </label>
            <label>
              Assigned lecturer
              <select
                name="teacher"
                defaultValue={editor.type === 'course' && editor.course.teacher ? String(editor.course.teacher) : ''}
              >
                <option value="">No lecturer assigned</option>
                {data.lecturers.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.name} (@{l.username}) {l.employee_id ? `· ${l.employee_id}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-actions-split">
              {editor.type === 'course' ? (
                <button
                  type="button"
                  className="button-danger-outline button button-small"
                  onClick={() =>
                    edit({
                      type: 'delete',
                      itemType: 'course',
                      id: editor.course.id,
                      title: `${editor.course.code} - ${editor.course.name}`,
                    })
                  }
                >
                  <Trash2 size={15} /> Delete course
                </button>
              ) : (
                <div />
              )}
              <Submit busy={busy}>{editor.type === 'create_course' ? 'Register course' : 'Save course'}</Submit>
            </div>
          </form>
        </Dialog>
      )}

      {/* Academic Session Create / Edit Modal */}
      {(editor?.type === 'create_session' || editor?.type === 'session') && (
        <Dialog
          title={editor.type === 'create_session' ? 'Register Academic Session' : `Edit Academic Session ${editor.sessionItem.session}`}
          onClose={() => setEditor(null)}
        >
          <Notice>{error}</Notice>
          <form onSubmit={submit}>
            <label>
              Academic session title
              <input
                name="session"
                defaultValue={editor.type === 'session' ? editor.sessionItem.session : ''}
                placeholder="e.g. 2025/2026"
                required
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 12 }}>
              <input
                name="is_current"
                type="checkbox"
                defaultChecked={editor.type === 'session' ? editor.sessionItem.is_current : true}
                style={{ width: 18, height: 18 }}
              />
              <span>Set as current active academic session</span>
            </label>
            <p className="form-footnote">Setting this session as active allows lecturers to record grades against it.</p>

            <div className="form-actions-split">
              {editor.type === 'session' ? (
                <button
                  type="button"
                  className="button-danger-outline button button-small"
                  onClick={() =>
                    edit({
                      type: 'delete',
                      itemType: 'session',
                      id: editor.sessionItem.id,
                      title: editor.sessionItem.session,
                    })
                  }
                >
                  <Trash2 size={15} /> Delete session
                </button>
              ) : (
                <div />
              )}
              <Submit busy={busy}>{editor.type === 'create_session' ? 'Create session' : 'Save session'}</Submit>
            </div>
          </form>
        </Dialog>
      )}

      {/* Grade Edit Modal */}
      {editor?.type === 'grade' && (
        <Dialog
          title={`Edit result: ${editor.grade.student_name} (${editor.grade.subject_name})`}
          onClose={() => setEditor(null)}
        >
          <Notice>{error}</Notice>
          <form onSubmit={submit}>
            <div className="form-row">
              <label>
                Continuous assessment (/40)
                <input
                  name="continuous_assessment_score"
                  type="number"
                  step="0.01"
                  min="0"
                  max="40"
                  defaultValue={String(editor.grade.continuous_assessment_score || editor.grade.continous_assessment_score || 0)}
                  required
                />
              </label>
              <label>
                Examination mark (/60)
                <input
                  name="exam_score"
                  type="number"
                  step="0.01"
                  min="0"
                  max="60"
                  defaultValue={String(editor.grade.exam_score || 0)}
                  required
                />
              </label>
            </div>

            <div className="form-actions-split">
              <button
                type="button"
                className="button-danger-outline button button-small"
                onClick={() =>
                  edit({
                    type: 'delete',
                    itemType: 'grade',
                    id: editor.grade.id,
                    title: `${editor.grade.student_name} · ${editor.grade.subject_name}`,
                  })
                }
              >
                <Trash2 size={15} /> Delete grade
              </button>
              <Submit busy={busy}>Save result mark</Submit>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
