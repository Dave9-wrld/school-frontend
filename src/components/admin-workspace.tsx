'use client';
import { useState, type FormEvent } from 'react';
import { ArrowUpRight, Plus, Search, UsersRound, BookOpen, UserRound, X, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import type { ClassGroup, PortalData, Session, Student } from '@/lib/types';
import { Dialog, Empty, Notice, PanelHeading, Submit } from './ui';
import { CreateAccountDialog } from './create-account-dialog';

type Editor = { type: 'create' } | { type: 'class'; classGroup: ClassGroup } | { type: 'student'; student: Student };

export function AdminWorkspace({
  session,
  data,
  view,
  onSaved,
}: {
  session: Session;
  data: PortalData;
  view: 'classes' | 'students';
  onSaved: () => Promise<void>;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [newAccount,setNewAccount]=useState<'STUDENT'|'TEACHER'|null>(null);

  const matches = (text: string) => text.toLowerCase().includes(search.trim().toLowerCase());
  const students = data.students.filter((s) => matches(`${s.name} ${s.username} ${s.admission_number} ${s.current_class_name || ''}`));
  const classes = data.classes.filter((c) => matches(`${c.name} ${c.teacher_name || ''}`));

  function edit(value: Editor) {
    setEditor(value);
    setError('');
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editor) return;
    setBusy(true);
    setError('');
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (editor.type === 'student') {
        await api(`admin/students/${editor.student.id}/class/`, session, {
          method: 'PATCH',
          body: JSON.stringify({ current_class: fields.current_class ? Number(fields.current_class) : null }),
        });
      } else {
        await api(
          editor.type === 'create' ? 'admin/classes/' : `admin/classes/${editor.classGroup.id}/`,
          session,
          {
            method: editor.type === 'create' ? 'POST' : 'PATCH',
            body: JSON.stringify({
              name: fields.name,
              class_teacher: fields.class_teacher ? Number(fields.class_teacher) : null,
            }),
          }
        );
      }
      setSuccess(
        editor.type === 'student'
          ? 'Student class assignment saved.'
          : editor.type === 'create'
          ? 'Your new class is ready.'
          : 'Class details updated.'
      );
      setEditor(null);
      try {
        await onSaved();
      } catch {
        setSuccess('Changes saved. Refresh the page to load the updated directory.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please check your input and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Notice success>{success}</Notice>
      <section className="panel directory-panel">
        <PanelHeading
          eyebrow="MAKE ROOM FOR POTENTIAL"
          title={view === 'classes' ? 'Class groups' : 'Student directory'}
          action={
            <div className="account-actions"><button className="button button-outline button-small" onClick={()=>setNewAccount(view==='classes'?'TEACHER':'STUDENT')}><Plus size={17}/> Add {view==='classes'?'lecturer':'student'}</button>{view === 'classes' && (
              <button className="button button-primary button-small" onClick={() => edit({ type: 'create' })}>
                <Plus size={17} /> New class
              </button>
            )}</div>
          }
        />
        <div className="table-tools">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label={view === 'classes' ? 'Search classes' : 'Search students'}
              placeholder={view === 'classes' ? 'Find a class or lecturer…' : 'Find a student or class…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <span className="directory-count">
            {view === 'classes'
              ? `${classes.length} of ${data.classes.length} class groups`
              : `${students.length} of ${data.students.length} active students`}
          </span>
        </div>

        {view === 'classes' ? (
          classes.length ? (
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
                        <button className="text-button" onClick={() => edit({ type: 'class', classGroup: c })}>
                          Manage <ArrowUpRight size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={search ? 'No classes match your search' : 'A place for every student'}
            >
              {search ? (
                <div>
                  <p style={{ marginBottom: 12 }}>Try searching for a different class name or lecturer.</p>
                  <button
                    type="button"
                    className="button button-outline button-small"
                    onClick={() => setSearch('')}
                  >
                    <RotateCcw size={14} /> Clear search
                  </button>
                </div>
              ) : (
                'Create your first class to begin assigning lecturers and students.'
              )}
            </Empty>
          )
        ) : students.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Admission number</th>
                  <th>Current class</th>
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
                        {s.current_class_name || 'Not assigned'}
                      </span>
                    </td>
                    <td>
                      <button className="text-button" onClick={() => edit({ type: 'student', student: s })}>
                        {s.current_class ? 'Change class' : 'Assign class'} <ArrowUpRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={search ? 'No students match your search' : 'Your student community starts here'}
          >
            {search ? (
              <div>
                <p style={{ marginBottom: 12 }}>Try searching for a different student name, username or class.</p>
                <button
                  type="button"
                  className="button button-outline button-small"
                  onClick={() => setSearch('')}
                >
                  <RotateCcw size={14} /> Clear search
                </button>
              </div>
            ) : (
              'Students will appear here after they register.'
            )}
          </Empty>
        )}
        <div className="table-footer">
          <span>
            {view === 'classes'
              ? 'Class groups bring your academic community together.'
              : 'Each student can belong to one current class.'}
          </span>
        </div>
      </section>

      {newAccount && <CreateAccountDialog session={session} role={newAccount} onClose={()=>setNewAccount(null)} onCreated={()=>{setNewAccount(null);setSuccess('Account created. They can now sign in.');onSaved().catch(()=>setSuccess('Account created. Refresh to load the updated directory.'));}}/>}
      {editor && (
        <Dialog
          title={
            editor.type === 'student'
              ? 'Find their place'
              : editor.type === 'create'
              ? 'Create a new class'
              : 'Manage class'
          }
          onClose={() => {
            if (!busy) setEditor(null);
          }}
        >
          <Notice>{error}</Notice>
          <form onSubmit={submit}>
            {editor.type === 'student' ? (
              <>
                <div className="dialog-person">
                  <UserRound size={22} />
                  <div>
                    <strong>{editor.student.name}</strong>
                    <small>@{editor.student.username}</small>
                  </div>
                </div>
                <label>
                  Class group
                  <select name="current_class" defaultValue={editor.student.current_class || ''}>
                    <option value="">No class assigned</option>
                    {data.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="form-footnote">
                  The student will see their new class when they next open their portal.
                </p>
              </>
            ) : (
              <>
                <label>
                  Class name
                  <input
                    name="name"
                    defaultValue={editor.type === 'class' ? editor.classGroup.name : ''}
                    placeholder="e.g. Year 1 — Group A"
                    maxLength={20}
                    autoFocus
                    required
                  />
                </label>
                <label>
                  Class lecturer
                  <select
                    name="class_teacher"
                    defaultValue={editor.type === 'class' ? editor.classGroup.class_teacher || '' : ''}
                  >
                    <option value="">Assign a lecturer later</option>
                    {data.lecturers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {t.employee_id || t.username}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="form-footnote">
                  Students can be placed in this class from the student directory.
                </p>
              </>
            )}
            <Submit busy={busy}>{editor.type === 'create' ? 'Create class' : 'Save changes'}</Submit>
          </form>
        </Dialog>
      )}
    </>
  );
}
