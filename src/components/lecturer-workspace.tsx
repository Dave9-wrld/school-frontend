'use client';
import { useState, type FormEvent } from 'react';
import { ArrowUpRight, BookOpen, CheckCircle2, PenLine, UsersRound } from 'lucide-react';
import { api } from '@/lib/api';
import type { Course, Grade, PortalData, Session } from '@/lib/types';
import { Empty, Notice, PanelHeading, Submit } from './ui';

function getGradeLetter(total: number) {
  if (total >= 70) return { letter: 'A', tone: 'grade-badge-a', label: 'Distinction' };
  if (total >= 60) return { letter: 'B', tone: 'grade-badge-b', label: 'Merit' };
  if (total >= 50) return { letter: 'C', tone: 'grade-badge-c', label: 'Credit' };
  if (total >= 45) return { letter: 'D', tone: 'grade-badge-d', label: 'Pass' };
  return { letter: 'F', tone: 'grade-badge-f', label: 'Fail' };
}

export function CourseCards({
  courses,
  grades,
  onRecord,
}: {
  courses: Course[];
  grades: Grade[];
  onRecord: (id: number) => void;
}) {
  return (
    <section>
      <PanelHeading eyebrow="YOUR TEACHING WORLD" title="Courses with your name on them" />
      {courses.length ? (
        <div className="course-grid">
          {courses.map((course, i) => (
            <article className={`course-card course-tone-${i % 3}`} key={course.id}>
              <div className="course-card-top">
                <span className="course-code">{course.code}</span>
                <BookOpen size={19} />
              </div>
              <span className="course-index">{String(i + 1).padStart(2, '0')}</span>
              <h3>{course.name}</h3>
              <div className="course-card-bottom">
                <span>{grades.filter((g) => g.subject === course.id).length} recorded results</span>
                <button onClick={() => onRecord(course.id)} aria-label={`Record a result for ${course.name}`}>
                  <ArrowUpRight size={20} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty title="Your teaching journey starts here">
            Your courses will appear when university administration assigns them to you.
          </Empty>
        </div>
      )}
    </section>
  );
}

export function RecordResult({
  session,
  data,
  initialCourse,
  onSaved,
}: {
  session: Session;
  data: PortalData;
  initialCourse?: number;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ca, setCa] = useState('');
  const [exam, setExam] = useState('');

  const canRecord = !!data.courses.length && !!data.students.length;

  const caNum = Number(ca) || 0;
  const examNum = Number(exam) || 0;
  const totalScore = caNum + examNum;
  const gradeInfo = getGradeLetter(totalScore);

  const caExceeded = caNum > 40;
  const examExceeded = examNum > 60;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = Object.fromEntries(new FormData(form));

    if (caNum > 40) {
      setError('Continuous assessment cannot exceed 40 marks.');
      return;
    }
    if (examNum > 60) {
      setError('Examination cannot exceed 60 marks.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await api<Grade>(`teacher/grades/record/${fields.subject}/`, session, {
        method: 'POST',
        body: JSON.stringify({
          student: Number(fields.student),
          continous_assessment_score: fields.ca,
          exam_score: fields.exam,
        }),
      });
      setSuccess(`${result.student_name}’s result is saved. Total: ${result.total_score} / 100 (${gradeInfo.letter} - ${gradeInfo.label}).`);
      form.reset();
      setCa('');
      setExam('');
      try {
        await onSaved();
      } catch {
        setError('Your result was saved. Refresh the page to update the results list.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="record-layout">
      <section className="panel form-panel">
        <PanelHeading
          eyebrow="TEACHING & ASSESSMENT"
          title="Give progress a number"
        />
        <p className="panel-intro">
          Record a student’s assessment and examination scores for the current academic session.
        </p>
        <Notice>{error}</Notice>
        <Notice success>{success}</Notice>
        {!canRecord && (
          <Notice>
            {data.courses.length
              ? 'There are no students available for assessment yet.'
              : 'You need an assigned course before recording results.'}
          </Notice>
        )}
        <form onSubmit={submit}>
          <div className="form-row">
            <label>
              Course
              <select name="subject" defaultValue={initialCourse || ''} required disabled={!canRecord}>
                <option value="">Choose a course</option>
                {data.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Student
              <select name="student" defaultValue="" required disabled={!canRecord}>
                <option value="">Choose a student</option>
                {data.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.admission_number || s.username}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Continuous assessment <span className="label-note">out of 40</span>
              <input
                name="ca"
                type="number"
                min="0"
                max="40"
                step="0.01"
                placeholder="0.00"
                value={ca}
                onChange={(e) => setCa(e.target.value)}
                style={caExceeded ? { borderColor: '#c85a5a' } : undefined}
                required
              />
              {caExceeded && (
                <span style={{ color: '#c85a5a', fontSize: '10px', marginTop: '4px', display: 'block' }}>
                  Maximum score is 40
                </span>
              )}
            </label>
            <label>
              Examination <span className="label-note">out of 60</span>
              <input
                name="exam"
                type="number"
                min="0"
                max="60"
                step="0.01"
                placeholder="0.00"
                value={exam}
                onChange={(e) => setExam(e.target.value)}
                style={examExceeded ? { borderColor: '#c85a5a' } : undefined}
                required
              />
              {examExceeded && (
                <span style={{ color: '#c85a5a', fontSize: '10px', marginTop: '4px', display: 'block' }}>
                  Maximum score is 60
                </span>
              )}
            </label>
          </div>
          <div className="score-preview">
            <div>
              <span className="eyebrow">THE BIG PICTURE</span>
              <p>Combined score &amp; Grade</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <output aria-live="polite">
                {totalScore.toFixed(1)}
                <span> / 100</span>
              </output>
              <span className={`grade-badge ${gradeInfo.tone}`} style={{ fontSize: '13px', padding: '5px 10px' }}>
                Grade {gradeInfo.letter}
              </span>
            </div>
          </div>
          <Submit busy={busy} disabled={!canRecord || caExceeded || examExceeded}>
            Save student result
          </Submit>
          <p className="form-footnote">
            Saving updates this student’s result for this course in the current session.
          </p>
        </form>
      </section>
      <aside className="record-guide">
        <span className="guide-icon">
          <PenLine size={24} />
        </span>
        <span className="eyebrow">A LITTLE GUIDANCE</span>
        <h2>
          Every mark<br />
          tells a <em>story.</em>
        </h2>
        <p>A few checks before you save.</p>
        <div className="guide-step">
          <span>01</span>
          <div>
            <h4>The right student</h4>
            <p>Match the name and username with the student you’re assessing.</p>
          </div>
        </div>
        <div className="guide-step">
          <span>02</span>
          <div>
            <h4>The right course</h4>
            <p>Only your assigned courses are available for assessment.</p>
          </div>
        </div>
        <div className="guide-step">
          <CheckCircle2 size={19} />
          <div>
            <h4>Ready when you are</h4>
            <p>Saved results appear in Recorded results and in the student’s portal.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function TeacherClasses({ data }: { data: PortalData }) {
  return (
    <section>
      <PanelHeading eyebrow="YOUR ACADEMIC COMMUNITY" title="The groups you guide" />
      {data.classes.length ? (
        <div className="course-grid">
          {data.classes.map((c) => (
            <article className="panel class-card" key={c.id}>
              <span className="class-icon">
                <UsersRound size={25} />
              </span>
              <h3>{c.name}</h3>
              <p>
                {c.student_count} student{c.student_count !== 1 ? 's' : ''} assigned
              </p>
              <span className="status-label">Class lecturer</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty title="No class groups yet">
            Your assigned classes will appear here once administration allocates them.
          </Empty>
        </div>
      )}
    </section>
  );
}
