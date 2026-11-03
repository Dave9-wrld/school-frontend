'use client';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  PenLine,
  RefreshCw,
  Search,
  ShieldCheck,
  Trophy,
  UserRound,
  UsersRound,
  X,
  Layers,
} from 'lucide-react';
import { api, clearSession, readSession } from '@/lib/api';
import type { AcademicSession, ClassGroup, Course, Grade, Lecturer, PortalData, Session, Stats, Student } from '@/lib/types';
import { Brand, Empty, Notice, PanelHeading } from './ui';
import { ResultsPanel } from './results-panel';
import { CourseCards, RecordResult, TeacherClasses } from './lecturer-workspace';
import { AdminWorkspace } from './admin-workspace';

type View = 'overview' | 'results' | 'courses' | 'record' | 'classes' | 'students' | 'lecturers' | 'sessions' | 'profile' | 'support';
const emptyData: PortalData = { grades: [], courses: [], students: [], classes: [], lecturers: [], sessions: [], profile: null, stats: null };
const roles = { ADMIN: 'Administrator', TEACHER: 'Lecturer', STUDENT: 'Student' };

async function fetchData(session: Session): Promise<PortalData> {
  if (session.role === 'STUDENT') {
    const [grades, profile] = await Promise.all([
      api<Grade[]>('student/grades/', session),
      api<Student>('student/profile/', session),
    ]);
    return { ...emptyData, grades, profile };
  }
  if (session.role === 'TEACHER') {
    const [courses, students, classes, grades] = await Promise.all([
      api<Course[]>('teacher/subjects/', session),
      api<Student[]>('teacher/students/', session),
      api<ClassGroup[]>('teacher/classes/', session),
      api<Grade[]>('teacher/grades/', session),
    ]);
    return { ...emptyData, courses, students, classes, grades };
  }
  const [stats, classes, lecturers, students, courses, sessions, grades] = await Promise.all([
    api<Stats>('admin/stats/', session),
    api<ClassGroup[]>('admin/classes/', session),
    api<Lecturer[]>('admin/teachers/', session),
    api<Student[]>('admin/students/', session),
    api<Course[]>('admin/subjects/', session),
    api<AcademicSession[]>('admin/sessions/', session),
    api<Grade[]>('admin/grades/', session),
  ]);
  return { ...emptyData, stats, classes, lecturers, students, courses, sessions, grades };
}

export function Dashboard() {
  const router = useRouter();
  const [navigationDepth, setNavigationDepth] = useState(0);
  const [session, setSession] = useState<Session | null>(null),
    [data, setData] = useState<PortalData>(emptyData),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [view, setView] = useState<View>('overview'),
    [menu, setMenu] = useState(false),
    [selectedCourse, setSelectedCourse] = useState<number>(),
    [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const current = readSession();
    if (!current) {
      router.replace('/login');
      return;
    }
    setSession(current);
    let active = true;
    fetchData(current)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  const refresh = useCallback(async () => {
    if (session) setData(await fetchData(session));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const permitted: View[] = [
      'overview',
      'support',
      ...(session.role === 'ADMIN'
        ? (['classes', 'students', 'lecturers', 'courses', 'sessions', 'results'] as View[])
        : session.role === 'TEACHER'
        ? (['courses', 'classes', 'record', 'results'] as View[])
        : (['results', 'profile'] as View[])),
    ];
    function restoreLocation() {
      const url = new URL(window.location.href);
      const requested = url.searchParams.get('view') || 'overview';
      const next: View = permitted.includes(requested as View) ? (requested as View) : 'overview';
      const course = Number(url.searchParams.get('course'));
      setView(next);
      setSelectedCourse(next === 'record' && Number.isSafeInteger(course) && course > 0 ? course : undefined);
      setMenu(false);
      const entry = window.history.state?.portalNavigation;
      const depth = entry?.userId === session!.user_id && Number.isSafeInteger(entry.depth) && entry.depth >= 0 ? entry.depth : 0;
      setNavigationDepth(depth);
      if (next === 'overview') url.searchParams.delete('view');
      else url.searchParams.set('view', next);
      if (next !== 'record' || !Number.isSafeInteger(course) || course <= 0) url.searchParams.delete('course');
      window.history.replaceState({ portalNavigation: { userId: session!.user_id, depth } }, '', url);
    }
    restoreLocation();
    window.addEventListener('popstate', restoreLocation);
    return () => window.removeEventListener('popstate', restoreLocation);
  }, [session]);

  async function reload() {
    setRefreshing(true);
    setError('');
    try {
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setRefreshing(false);
    }
  }

  async function logout() {
    try {
      await api('logout/', session, { method: 'POST' });
    } catch {
    } finally {
      clearSession();
      router.replace('/login');
    }
  }

  function navigate(next: View, course?: number, replace = false) {
    setMenu(false);
    if (next === view && course === selectedCourse) return;
    const url = new URL(window.location.href);
    if (next === 'overview') url.searchParams.delete('view');
    else url.searchParams.set('view', next);
    if (next === 'record' && course) url.searchParams.set('course', String(course));
    else url.searchParams.delete('course');
    const depth = replace ? navigationDepth : navigationDepth + 1;
    window.history[replace ? 'replaceState' : 'pushState']({ portalNavigation: { userId: session?.user_id, depth } }, '', url);
    setNavigationDepth(depth);
    setView(next);
    setSelectedCourse(course);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack() {
    if (navigationDepth > 0) window.history.back();
    else if (view !== 'overview') navigate('overview', undefined, true);
  }

  function record(id: number) {
    navigate('record', id);
  }

  if (!session)
    return (
      <div className="portal-loading">
        <Brand />
        <div className="loading-line" />
        <p>Opening your academic world…</p>
      </div>
    );

  const teacher = session.role === 'TEACHER',
    admin = session.role === 'ADMIN';
  const name = session.display_name || session.username;

  const nav: { view: View; label: string; icon: typeof BookOpen; count?: number }[] = [
    { view: 'overview', label: 'Overview', icon: LayoutDashboard },
    ...(admin
      ? [
          { view: 'classes' as View, label: 'Class management', icon: BookOpen, count: data.classes.length },
          { view: 'students' as View, label: 'Student directory', icon: UsersRound, count: data.students.length },
          { view: 'lecturers' as View, label: 'Lecturer registry', icon: UserRound, count: data.lecturers.length },
          { view: 'courses' as View, label: 'Courses & subjects', icon: GraduationCap, count: data.courses.length },
          { view: 'sessions' as View, label: 'Academic sessions', icon: CalendarDays, count: data.sessions?.length || 0 },
          { view: 'results' as View, label: 'University results', icon: Trophy, count: data.grades.length },
        ]
      : teacher
      ? [
          { view: 'courses' as View, label: 'My courses', icon: BookOpen, count: data.courses.length },
          { view: 'classes' as View, label: 'My classes', icon: UsersRound },
          { view: 'record' as View, label: 'Record results', icon: PenLine },
          { view: 'results' as View, label: 'Recorded results', icon: GraduationCap, count: data.grades.length },
        ]
      : [
          { view: 'results' as View, label: 'My results', icon: GraduationCap, count: data.grades.length },
          { view: 'profile' as View, label: 'My profile', icon: UserRound },
        ]),
  ];

  const title = nav.find((n) => n.view === view)?.label || 'Academic support';

  return (
    <div className="portal-shell">
      {menu && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenu(false)} />}
      <aside className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Brand light compact />
          <button className="mobile-close icon-button" aria-label="Close navigation" onClick={() => setMenu(false)}>
            <X size={20} />
          </button>
        </div>
        <span className="workspace-label">{roles[session.role].toUpperCase()} WORKSPACE</span>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <button
              key={item.view}
              aria-current={view === item.view ? "page" : undefined}
              className={`nav-item ${view === item.view ? 'nav-active' : ''}`}
              onClick={() => navigate(item.view)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.count !== undefined && item.count > 0 && <small>{item.count}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className={`nav-item ${view === 'support' ? 'nav-active' : ''}`} onClick={() => navigate('support')}>
            <CircleHelp size={18} /> Help & guidance
          </button>
          <div className="sidebar-account">
            <span className="avatar">
              {name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
            <div>
              <strong>{name}</strong>
              <small>{roles[session.role]}</small>
            </div>
            <button aria-label="Sign out" title="Sign out" onClick={logout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="mobile-menu icon-button" onClick={() => setMenu(true)} aria-label="Open navigation">
              <Menu size={21} />
            </button>
            <span>Academic portal</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="today">
              <CalendarDays size={15} />
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <Badge variant="outline" className="role-pill">
              <span />
              {roles[session.role]} portal
            </Badge>
          </div>
        </header>
        <main className="dashboard-main" id="main-content">
          {view !== "overview" && <nav className="page-navigation" aria-label="Page navigation">
            <button className="back-button" onClick={goBack}>
              <ArrowLeft size={16} /> Back
            </button>
              <button className="text-button" onClick={() => navigate('overview')}>
                <LayoutDashboard size={15} /> Back to overview
              </button>
          </nav>}
          <div className="page-heading dashboard-title">
            <div>
              <h1>{view === 'overview' ? `${roles[session.role]} overview` : title}</h1>
            </div>
            <button
              className="button button-outline button-small refresh-button"
              aria-label="Refresh dashboard"
              onClick={reload}
              disabled={refreshing || loading}
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
          <Notice>{error}</Notice>
          {loading ? (
            <div className="dashboard-skeleton">
              <div />
              <div />
              <div />
            </div>
          ) : error ? (
            <div className="panel">
              <Empty title="Let’s reconnect">We couldn’t load the latest records. Use Refresh to try again.</Empty>
            </div>
          ) : (
            <div className="view-enter" key={view}>
              {view === 'overview' && <Overview session={session} data={data} onNavigate={navigate} onRecord={record} />}
              {view === 'results' && !admin && <ResultsPanel grades={data.grades} lecturer={teacher} />}
              {view === 'courses' && teacher && <CourseCards courses={data.courses} grades={data.grades} onRecord={record} />}
              {view === 'record' && teacher && (
                <>
                  <RecordResult key={selectedCourse} session={session} data={data} initialCourse={selectedCourse} onSaved={refresh} />
                  <div className="section-gap">
                    <ResultsPanel grades={data.grades} lecturer />
                  </div>
                </>
              )}
              {view === 'classes' && teacher && <TeacherClasses data={data} />}
              {['classes', 'students', 'lecturers', 'courses', 'sessions', 'results'].includes(view) && admin && (
                <AdminWorkspace
                  key={view}
                  session={session}
                  data={data}
                  view={view as any}
                  onSaved={refresh}
                  onNavigate={(v) => navigate(v as View)}
                />
              )}
              {view === 'profile' && <Profile session={session} data={data} />}
              {view === 'support' && <Support session={session} onNavigate={navigate} />}
            </div>
          )}
          <footer className="dashboard-footer">
            <span>Made for your next chapter.</span>
            <span>
              Dave University <i /> {new Date().getFullYear()}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Overview({
  session,
  data,
  onNavigate,
  onRecord,
}: {
  session: Session;
  data: PortalData;
  onNavigate: (v: View) => void;
  onRecord: (id: number) => void;
}) {
  const teacher = session.role === 'TEACHER',
    admin = session.role === 'ADMIN';
  const totals = data.grades.map((g) => Number(g.total_score));
  const average = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
  const currentSession = data.sessions?.find((s) => s.is_current);

  const metrics = admin
    ? [
        {
          label: 'Student community',
          value: data.students.length,
          note: `${data.students.filter((s) => s.current_class).length} allocated to class groups`,
          icon: UsersRound,
        },
        {
          label: 'Teaching faculty',
          value: data.lecturers.length,
          note: 'Lecturers across university faculties',
          icon: GraduationCap,
        },
        {
          label: 'Registered courses',
          value: data.courses.length,
          note: `${data.courses.filter((c) => c.teacher).length} courses with assigned lecturers`,
          icon: BookOpen,
        },
        {
          label: 'Academic session',
          value: currentSession?.session || 'No active session',
          note: currentSession ? 'Primary active grading session' : 'Set an active session to grade',
          icon: CalendarDays,
        },
      ]
    : teacher
    ? [
        { label: 'Courses you teach', value: data.courses.length, note: 'Assigned to your account', icon: BookOpen },
        { label: 'Class groups', value: data.classes.length, note: 'Classes assigned to you', icon: UsersRound },
        {
          label: 'Results recorded',
          value: data.grades.length,
          note: `Across ${new Set(data.grades.map((g) => g.student)).size} students in your courses`,
          icon: PenLine,
        },
      ]
    : [
        {
          label: 'Courses with results',
          value: new Set(data.grades.map((g) => g.subject)).size,
          note: 'Across your academic sessions',
          icon: BookOpen,
        },
        {
          label: 'Average score',
          value: totals.length ? average.toFixed(1) : '—',
          note: 'Across your recorded results · / 100',
          icon: GraduationCap,
        },
        {
          label: 'Personal best',
          value: totals.length ? Math.max(...totals).toFixed(1) : '—',
          note: 'Your highest recorded score · / 100',
          icon: Trophy,
        },
      ];

  return (
    <>
      <section className="workspace-intro">
        <div>
          <span className="workspace-label">{admin ? 'Administration' : teacher ? 'Lecturer workspace' : 'Student workspace'}</span>
          <h2>{admin ? 'Class management' : teacher ? 'Course gradebook' : 'My academic results'}</h2>
          <p>{admin ? 'Assign students and lecturers to class groups.' : teacher ? 'Enter assessment and exam scores, or correct a saved result.' : 'Review your assessment, exam score and total for each course.'}</p>
        </div>
        <Button className="hero-action" size="lg" onClick={() => onNavigate(admin ? 'classes' : teacher ? 'record' : 'results')}>
          {admin ? 'Manage classes' : teacher ? 'Record a result' : 'View my results'}
          <ArrowUpRight size={17} aria-hidden="true" />
        </Button>
      </section>

      <div className="metrics-grid">
        {metrics.map((m) => (
          <Card className="metric-card" key={m.label}>
            <div className="metric-label">
              <span>{m.label}</span>
              <m.icon size={19} />
            </div>
            <div className="metric-number">
              {m.value}

            </div>
            <p>{m.note}</p>
          </Card>
        ))}
      </div>

      {teacher ? (
        <>
          <CourseCards courses={data.courses} grades={data.grades} onRecord={onRecord} />
          <div className="section-gap">
            <ResultsPanel grades={data.grades} lecturer />
          </div>
        </>
      ) : admin ? (
        <div className="overview-columns">
          <section className="panel">
            <PanelHeading
              eyebrow="STUDENT DIRECTORY"
              title="Class placements"
              action={
                <button className="text-button" onClick={() => onNavigate('students')}>
                  View directory <ArrowUpRight size={15} />
                </button>
              }
            />
            <div className="community-visual">
              <div
                className="community-ring"
                style={{
                  background: `conic-gradient(var(--burgundy) ${
                    data.students.length
                      ? (data.students.filter((s) => s.current_class).length / data.students.length) * 100
                      : 0
                  }%, #ece7e1 0)`,
                }}
              >
                <div>
                  <strong>{data.students.length}</strong>
                  <span>active students</span>
                </div>
              </div>
              <div className="community-legend">
                <div>
                  <i />
                  <span>Assigned to a class</span>
                  <strong>{data.students.filter((s) => s.current_class).length}</strong>
                </div>
                <div>
                  <i />
                  <span>Awaiting allocation</span>
                  <strong>{data.students.filter((s) => !s.current_class).length}</strong>
                </div>
                <p>Ensure every student has a designated class group and assigned lecturer.</p>
              </div>
            </div>
          </section>

          <section className="panel quick-actions">
            <PanelHeading eyebrow="KEEP THINGS MOVING" title="Administrative Control" />
            <button onClick={() => onNavigate('classes')}>
              <span className="quick-icon">
                <BookOpen size={20} />
              </span>
              <span>
                <strong>Organise class groups</strong>
                <small>Create classes, assign teachers & review student numbers</small>
              </span>
              <ArrowUpRight size={19} />
            </button>
            <button onClick={() => onNavigate('students')}>
              <span className="quick-icon">
                <UsersRound size={20} />
              </span>
              <span>
                <strong>Student directory & placement</strong>
                <small>Add new students, update admission details & allocate classes</small>
              </span>
              <ArrowUpRight size={19} />
            </button>
            <button onClick={() => onNavigate('courses')}>
              <span className="quick-icon">
                <GraduationCap size={20} />
              </span>
              <span>
                <strong>Course & syllabus registry</strong>
                <small>Create courses, manage codes & assign lecturers</small>
              </span>
              <ArrowUpRight size={19} />
            </button>
            <button onClick={() => onNavigate('sessions')}>
              <span className="quick-icon">
                <CalendarDays size={20} />
              </span>
              <span>
                <strong>Academic sessions & calendar</strong>
                <small>Configure sessions and activate current grading term</small>
              </span>
              <ArrowUpRight size={19} />
            </button>
            <button onClick={() => onNavigate('results')}>
              <span className="quick-icon">
                <Trophy size={20} />
              </span>
              <span>
                <strong>Institutional grade records</strong>
                <small>View, edit, filter and export university grade sheets</small>
              </span>
              <ArrowUpRight size={19} />
            </button>
            <div className="desk-note">
              <ShieldCheck size={18} />
              <p>You have full administrative privileges to manage all university database entities.</p>
            </div>
          </section>
        </div>
      ) : (
        <>
          <div className="overview-columns">
            <section className="panel performance-panel">
              <PanelHeading
                eyebrow="SEE HOW FAR YOU’VE COME"
                title="Progress, in perspective"
                action={<span className="subtle-tag">Your latest recorded results</span>}
              />
              {data.grades.length ? (
                <div className="score-bars">
                  {data.grades.slice(-5).map((g) => (
                    <div className="score-bar-row" key={g.id}>
                      <div>
                        <strong>{g.subject_name}</strong>
                        <span>{g.session_name}</span>
                      </div>
                      <div className="score-track">
                        <span style={{ width: `${Math.max(0, Math.min(100, Number(g.total_score)))}%` }} />
                      </div>
                      <b>
                        {Number(g.total_score).toFixed(0)}
                        <small>/100</small>
                      </b>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty title="Your progress has room to grow">Your course scores will bring this view to life.</Empty>
              )}
            </section>
            <section className="student-card">
              <span className="eyebrow">A LITTLE ABOUT YOUR JOURNEY</span>
              <span className="student-card-symbol">
                <GraduationCap size={36} />
              </span>
              <h2>{data.profile?.current_class_name || 'A world of possibility'}</h2>
              <p>{data.profile?.current_class_name ? 'Your current academic class' : 'Your class will appear here once it is assigned.'}</p>
              <div className="student-card-line">
                <span>Student</span>
                <strong>{data.profile?.name || session.display_name || session.username}</strong>
              </div>
              <button className="text-button" onClick={() => onNavigate('profile')}>
                View my profile <ArrowUpRight size={16} />
              </button>
            </section>
          </div>
          <div className="section-gap">
            <ResultsPanel grades={data.grades} />
          </div>
        </>
      )}
    </>
  );
}

function Profile({ session, data }: { session: Session; data: PortalData }) {
  const name = data.profile?.name || session.display_name || session.username;
  return (
    <div className="profile-layout">
      <section className="profile-identity">
        <span className="large-avatar">
          {name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')}
        </span>
        <h2>{name}</h2>
        <p>@{session.username}</p>
        <span className="status-label">{roles[session.role]}</span>
        <div className="profile-identity-bottom">
          <GraduationCap size={23} />
          <span>Part of the Dave community.</span>
        </div>
      </section>
      <section className="panel">
        <PanelHeading eyebrow="YOUR ACADEMIC IDENTITY" title="The essentials" />
        <dl className="profile-details">
          <div>
            <dt>Full name</dt>
            <dd>{name}</dd>
          </div>
          <div>
            <dt>Username</dt>
            <dd>{session.username}</dd>
          </div>
          <div>
            <dt>Admission number</dt>
            <dd>{data.profile?.admission_number || 'Not assigned yet'}</dd>
          </div>
          <div>
            <dt>Class group</dt>
            <dd>{data.profile?.current_class_name || 'Not assigned yet'}</dd>
          </div>
          <div>
            <dt>Account type</dt>
            <dd>{roles[session.role]}</dd>
          </div>
        </dl>
        <div className="profile-note">
          <CircleHelp size={18} />
          <p>Something needs updating? Contact university administration to review your academic details.</p>
        </div>
      </section>
    </div>
  );
}

function Support({ session, onNavigate }: { session: Session; onNavigate: (v: View) => void }) {
  const teacher = session.role === 'TEACHER',
    admin = session.role === 'ADMIN';
  return (
    <div className="support-layout">
      <section className="support-intro">
        <span className="eyebrow">YOU DON’T HAVE TO FIGURE IT OUT ALONE</span>
        <h2>
          A little clarity.
          <br />
          <em>A confident next step.</em>
        </h2>
        <p>Your guide to the things that matter in your academic portal.</p>
      </section>
      <div className="support-items">
        <article className="panel">
          <span className="quick-icon">
            <BookOpen size={22} />
          </span>
          <h3>{admin ? 'Building your campus' : teacher ? 'Your assigned courses' : 'Understanding your results'}</h3>
          <p>
            {admin
              ? 'Manage courses, assign active lecturers, configure academic sessions, and allocate students to class groups. All actions are immediate and synced across the portal.'
              : teacher
              ? 'Your courses and class groups are assigned by university administration. Contact them if an assignment is missing.'
              : 'Your total combines continuous assessment out of 40 and examination out of 60. Results appear when your lecturer saves them.'}
          </p>
          <button className="text-button" onClick={() => onNavigate(admin ? 'classes' : teacher ? 'courses' : 'results')}>
            Take me there <ArrowUpRight size={15} />
          </button>
        </article>
        <article className="panel">
          <span className="quick-icon">
            <PenLine size={22} />
          </span>
          <h3>{teacher ? 'Correcting a result' : admin ? 'Academic Sessions & Grading' : 'Something doesn’t look right?'}</h3>
          <p>
            {teacher
              ? 'Select the same student and course in Record results, then save the corrected scores. This updates the existing result in the current academic session.'
              : admin
              ? 'Lecturers can only record results against the designated active academic session. You can activate or create sessions anytime from Academic Sessions.'
              : 'Contact the lecturer responsible for a missing or incorrect result. For class or account details, contact university administration.'}
          </p>
        </article>
        <article className="panel">
          <span className="quick-icon">
            <ShieldCheck size={22} />
          </span>
          <h3>Your account, your space</h3>
          <p>Sign out when you finish on a shared device. If your session expires, simply sign in again with your existing username and password.</p>
        </article>
      </div>
    </div>
  );
}
