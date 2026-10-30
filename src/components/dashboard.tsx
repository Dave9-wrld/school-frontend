'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, ChevronRight, CircleHelp, GraduationCap, LayoutDashboard, LogOut, Menu, PenLine, RefreshCw, Search, ShieldCheck, Sparkles, Trophy, UserRound, UsersRound, X } from 'lucide-react';
import { api, clearSession, readSession } from '@/lib/api';
import type { ClassGroup, Course, Grade, Lecturer, PortalData, Session, Stats, Student } from '@/lib/types';
import { Brand, Empty, Notice, PanelHeading } from './ui';
import { ResultsPanel } from './results-panel';
import { CourseCards, RecordResult, TeacherClasses } from './lecturer-workspace';
import { AdminWorkspace } from './admin-workspace';

type View = 'overview'|'results'|'courses'|'record'|'classes'|'students'|'profile'|'support';
const emptyData:PortalData = {grades:[],courses:[],students:[],classes:[],lecturers:[],profile:null,stats:null};
const roles = {ADMIN:'Administrator',TEACHER:'Lecturer',STUDENT:'Student'};

async function fetchData(session:Session):Promise<PortalData> {
  if(session.role==='STUDENT') {
    const [grades,profile] = await Promise.all([api<Grade[]>('student/grades/',session),api<Student>('student/profile/',session)]);
    return {...emptyData,grades,profile};
  }
  if(session.role==='TEACHER') {
    const [courses,students,classes,grades] = await Promise.all([api<Course[]>('teacher/subjects/',session),api<Student[]>('teacher/students/',session),api<ClassGroup[]>('teacher/classes/',session),api<Grade[]>('teacher/grades/',session)]);
    return {...emptyData,courses,students,classes,grades};
  }
  const [stats,classes,lecturers,students] = await Promise.all([api<Stats>('admin/stats/',session),api<ClassGroup[]>('admin/classes/',session),api<Lecturer[]>('admin/teachers/',session),api<Student[]>('admin/students/',session)]);
  return {...emptyData,stats,classes,lecturers,students};
}

export function Dashboard() {
  const router=useRouter();
  const [navigationDepth,setNavigationDepth]=useState(0);
  const [session,setSession]=useState<Session|null>(null),[data,setData]=useState<PortalData>(emptyData),[loading,setLoading]=useState(true),[error,setError]=useState(''),[view,setView]=useState<View>('overview'),[menu,setMenu]=useState(false),[selectedCourse,setSelectedCourse]=useState<number>(),[refreshing,setRefreshing]=useState(false);
  useEffect(()=>{const current=readSession();if(!current){router.replace('/login');return;}setSession(current);let active=true;fetchData(current).then(value=>{if(active)setData(value);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[router]);
  const refresh=useCallback(async()=>{if(session)setData(await fetchData(session));},[session]);
  useEffect(()=>{
    if(!session) return;
    const permitted:View[] = ['overview','support',...(session.role==='ADMIN' ? ['classes','students'] as View[] : session.role==='TEACHER' ? ['courses','classes','record','results'] as View[] : ['results','profile'] as View[])];
    function restoreLocation() {
      const url = new URL(window.location.href);
      const requested = url.searchParams.get('view') || 'overview';
      const next:View = permitted.includes(requested as View) ? requested as View : 'overview';
      const course = Number(url.searchParams.get('course'));
      setView(next);setSelectedCourse(next==='record' && Number.isSafeInteger(course) && course>0 ? course : undefined);setMenu(false);
      const entry = window.history.state?.portalNavigation;
      const depth = entry?.userId===session!.user_id && Number.isSafeInteger(entry.depth) && entry.depth>=0 ? entry.depth : 0;
      setNavigationDepth(depth);
      if(next==='overview') url.searchParams.delete('view'); else url.searchParams.set('view',next);
      if(next!=='record' || !Number.isSafeInteger(course) || course<=0) url.searchParams.delete('course');
      window.history.replaceState({portalNavigation:{userId:session!.user_id,depth}},'',url);
    }
    restoreLocation();
    window.addEventListener('popstate',restoreLocation);
    return ()=>window.removeEventListener('popstate',restoreLocation);
  },[session]);
  async function reload(){setRefreshing(true);setError('');try{await refresh();}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setRefreshing(false);}}
  async function logout(){try{await api('logout/',session,{method:'POST'});}catch{}finally{clearSession();router.replace('/login');}}
  function navigate(next:View,course?:number,replace=false){
    setMenu(false);
    if(next===view && course===selectedCourse) return;
    const url=new URL(window.location.href);
    if(next==='overview') url.searchParams.delete('view'); else url.searchParams.set('view',next);
    if(next==='record' && course) url.searchParams.set('course',String(course)); else url.searchParams.delete('course');
    const depth=replace ? navigationDepth : navigationDepth+1;
    window.history[replace?'replaceState':'pushState']({portalNavigation:{userId:session?.user_id,depth}},'',url);
    setNavigationDepth(depth);setView(next);setSelectedCourse(course);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function goBack(){
    if(navigationDepth>0) window.history.back();
    else if(view!=='overview') navigate('overview',undefined,true);
  }
  function record(id:number){navigate('record',id);}
  if(!session) return <div className="portal-loading"><Brand/><div className="loading-line"/><p>Opening your academic world…</p></div>;
  const teacher=session.role==='TEACHER', admin=session.role==='ADMIN';
  const name=session.display_name || session.username;
  const nav:{view:View;label:string;icon:typeof BookOpen;count?:number}[] = [{view:'overview',label:'Overview',icon:LayoutDashboard},...(admin?[{view:'classes' as View,label:'Class management',icon:BookOpen,count:data.classes.length},{view:'students' as View,label:'Student directory',icon:UsersRound,count:data.students.length}]:teacher?[{view:'courses' as View,label:'My courses',icon:BookOpen,count:data.courses.length},{view:'classes' as View,label:'My classes',icon:UsersRound},{view:'record' as View,label:'Record results',icon:PenLine},{view:'results' as View,label:'Recorded results',icon:GraduationCap,count:data.grades.length}]:[{view:'results' as View,label:'My results',icon:GraduationCap,count:data.grades.length},{view:'profile' as View,label:'My profile',icon:UserRound}])];
  const title=nav.find(n=>n.view===view)?.label || 'Academic support';
  return <div className="portal-shell">
    {menu && <button className="mobile-scrim" aria-label="Close navigation" onClick={()=>setMenu(false)}/>}
    <aside className={`sidebar ${menu?'sidebar-open':''}`}><div className="sidebar-brand"><Brand light compact/><button className="mobile-close icon-button" aria-label="Close navigation" onClick={()=>setMenu(false)}><X size={20}/></button></div><span className="workspace-label">{roles[session.role].toUpperCase()} WORKSPACE</span><nav aria-label="Main navigation">{nav.map(item=><button key={item.view} className={`nav-item ${view===item.view?'nav-active':''}`} onClick={()=>navigate(item.view)}><item.icon size={18}/><span>{item.label}</span>{item.count !== undefined && item.count>0 && <small>{item.count}</small>}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-note"><span className="note-star">✳</span><h3>A little support.<br/>A lot of possibility.</h3><button onClick={()=>navigate('support')}>Find your next step <ArrowUpRight size={15}/></button></div><button className={`nav-item ${view==='support'?'nav-active':''}`} onClick={()=>navigate('support')}><CircleHelp size={18}/> Help & guidance</button><div className="sidebar-account"><span className="avatar">{name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</span><div><strong>{name}</strong><small>{roles[session.role]}</small></div><button aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={17}/></button></div></div></aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" onClick={()=>setMenu(true)} aria-label="Open navigation"><Menu size={21}/></button><span>Academic portal</span><ChevronRight size={13}/><strong>{title}</strong></div><div className="topbar-actions"><span className="today"><CalendarDays size={15}/>{new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span><span className="role-pill"><span/>{roles[session.role]} portal</span></div></header>
      <main className="dashboard-main" id="main-content"><nav className="page-navigation" aria-label="Page navigation"><button className="back-button" onClick={goBack} disabled={navigationDepth===0 && view==='overview'}><ArrowLeft size={16}/> Back</button>{view!=='overview' && <button className="text-button" onClick={()=>navigate('overview')}><LayoutDashboard size={15}/> Back to overview</button>}</nav><div className="page-heading"><div><span className="eyebrow">DAVE UNIVERSITY / {view==='overview'?'YOUR SPACE TO GROW':title.toUpperCase()}</span><h1>{view==='overview'?<>Good to see you, <em>{name.split(' ')[0]}.</em></>:<>{title}<span className="heading-dot">.</span></>}</h1><p>{view==='overview'?'Here’s where your academic world stands today.':'The details that keep your academic life moving.'}</p></div><button className="button button-outline button-small refresh-button" onClick={reload} disabled={refreshing || loading}><RefreshCw size={14} className={refreshing?'spin':''}/>{refreshing?'Refreshing':'Refresh'}</button></div>
      <Notice>{error}</Notice>
      {loading ? <div className="dashboard-skeleton"><div/><div/><div/></div> : error ? <div className="panel"><Empty title="Let’s reconnect">We couldn’t load the latest records. Use Refresh to try again.</Empty></div> : <div className="view-enter" key={view}>
        {view==='overview' && <Overview session={session} data={data} onNavigate={navigate} onRecord={record}/>}
        {view==='results' && <ResultsPanel grades={data.grades} lecturer={teacher}/>}
        {view==='courses' && teacher && <CourseCards courses={data.courses} grades={data.grades} onRecord={record}/>}
        {view==='record' && teacher && <><RecordResult key={selectedCourse} session={session} data={data} initialCourse={selectedCourse} onSaved={refresh}/><div className="section-gap"><ResultsPanel grades={data.grades} lecturer/></div></>}
        {view==='classes' && teacher && <TeacherClasses data={data}/>}
        {(view==='classes'||view==='students') && admin && <AdminWorkspace key={view} session={session} data={data} view={view} onSaved={refresh}/>}
        {view==='profile' && <Profile session={session} data={data}/>}
        {view==='support' && <Support session={session} onNavigate={navigate}/>}
      </div>}
      <footer className="dashboard-footer"><span>Made for your next chapter.</span><span>Dave University <i/> {new Date().getFullYear()}</span></footer></main>
    </div>
  </div>;
}

function Overview({session,data,onNavigate,onRecord}: {session:Session;data:PortalData;onNavigate:(v:View)=>void;onRecord:(id:number)=>void}) {
  const teacher=session.role==='TEACHER',admin=session.role==='ADMIN';
  const totals=data.grades.map(g=>Number(g.total_score));
  const average=totals.length?totals.reduce((a,b)=>a+b,0)/totals.length:0;
  const metrics=admin?[{label:'Student community',value:data.stats?.total_students || 0,note:'Registered student accounts',icon:UsersRound},{label:'Teaching faculty',value:data.stats?.total_teachers || 0,note:'Lecturers across the university',icon:GraduationCap},{label:'Class groups',value:data.classes.length,note:`${data.students.filter(s=>!s.current_class).length} students awaiting allocation`,icon:BookOpen}]:teacher?[{label:'Courses you teach',value:data.courses.length,note:'Assigned to your teaching portfolio',icon:BookOpen},{label:'Class groups',value:data.classes.length,note:'Academic communities you lead',icon:UsersRound},{label:'Results recorded',value:data.grades.length,note:`Across ${new Set(data.grades.map(g=>g.student)).size} students in your courses`,icon:PenLine}]:[{label:'Courses with results',value:new Set(data.grades.map(g=>g.subject)).size,note:'Across your academic sessions',icon:BookOpen},{label:'Average score',value:totals.length?average.toFixed(1):'—',note:'Across your recorded results · / 100',icon:GraduationCap},{label:'Personal best',value:totals.length?Math.max(...totals).toFixed(1):'—',note:'Your highest recorded score · / 100',icon:Trophy}];
  return <>
    <section className="welcome-banner"><div className="banner-photo"/><div className="banner-copy"><span className="banner-kicker"><span/>{admin?'THE BIGGER PICTURE':teacher?'SHAPING WHAT COMES NEXT':'THIS IS YOUR CHAPTER'}</span><h2>{admin?<>A thriving campus<br/>starts with <em>you.</em></>:teacher?<>Great minds need<br/><em>great guidance.</em></>:<>Small steps today.<br/><em>Extraordinary tomorrows.</em></>}</h2><p>{admin?'Bring people, classes and possibilities together.':teacher?'Inspire your students. Celebrate their progress.': 'Stay curious. Follow your progress. Keep moving forward.'}</p><button className="button button-light" onClick={()=>onNavigate(admin?'classes':teacher?'record':'results')}>{admin?'Manage your campus':teacher?'Record a result':'Explore my results'}<ArrowUpRight size={17}/></button></div><span className="banner-seal"><GraduationCap size={36}/><small>DAVE<br/>UNIVERSITY</small></span><span className="banner-caption">A WORLD OF POSSIBILITY</span></section>
    <div className="metrics-grid">{metrics.map((m,i)=><article className="metric-card" key={m.label}><div className="metric-label"><span>{m.label}</span><m.icon size={19}/></div><div className="metric-number">{m.value}<span className={`metric-symbol symbol-${i}`}><ArrowUpRight size={20}/></span></div><p>{m.note}</p></article>)}</div>
    {teacher ? <><CourseCards courses={data.courses} grades={data.grades} onRecord={onRecord}/><div className="section-gap"><ResultsPanel grades={data.grades} lecturer/></div></> : admin ? <div className="overview-columns"><section className="panel"><PanelHeading eyebrow="YOUR ACADEMIC COMMUNITY" title="A place for everyone" action={<button className="text-button" onClick={()=>onNavigate('students')}>View directory <ArrowUpRight size={15}/></button>}/><div className="community-visual"><div className="community-ring" style={{background:`conic-gradient(var(--burgundy) ${data.students.length?data.students.filter(s=>s.current_class).length/data.students.length*100:0}%, #ece7e1 0)`}}><div><strong>{data.students.length}</strong><span>active students</span></div></div><div className="community-legend"><div><i/><span>Assigned to a class</span><strong>{data.students.filter(s=>s.current_class).length}</strong></div><div><i/><span>Awaiting allocation</span><strong>{data.students.filter(s=>!s.current_class).length}</strong></div><p>Give every student a place to belong.</p></div></div></section><section className="panel quick-actions"><PanelHeading eyebrow="KEEP THINGS MOVING" title="Your admin desk"/><button onClick={()=>onNavigate('classes')}><span className="quick-icon"><BookOpen size={20}/></span><span><strong>Organise class groups</strong><small>Create classes and assign lecturers</small></span><ArrowUpRight size={19}/></button><button onClick={()=>onNavigate('students')}><span className="quick-icon"><UsersRound size={20}/></span><span><strong>Place your students</strong><small>Allocate students to their classes</small></span><ArrowUpRight size={19}/></button><div className="desk-note"><ShieldCheck size={18}/><p>Only administrators can change class allocations.</p></div></section></div> : <><div className="overview-columns"><section className="panel performance-panel"><PanelHeading eyebrow="SEE HOW FAR YOU’VE COME" title="Progress, in perspective" action={<span className="subtle-tag">Your latest recorded results</span>}/>{data.grades.length?<div className="score-bars">{data.grades.slice(-5).map(g=><div className="score-bar-row" key={g.id}><div><strong>{g.subject_name}</strong><span>{g.session_name}</span></div><div className="score-track"><span style={{width:`${Math.max(0,Math.min(100,Number(g.total_score)))}%`}}/></div><b>{Number(g.total_score).toFixed(0)}<small>/100</small></b></div>)}</div>:<Empty title="Your progress has room to grow">Your course scores will bring this view to life.</Empty>}</section><section className="student-card"><span className="eyebrow">A LITTLE ABOUT YOUR JOURNEY</span><span className="student-card-symbol"><GraduationCap size={36}/></span><h2>{data.profile?.current_class_name || 'A world of possibility'}</h2><p>{data.profile?.current_class_name?'Your current academic class':'Your class will appear here once it is assigned.'}</p><div className="student-card-line"><span>Student</span><strong>{data.profile?.name || session.display_name || session.username}</strong></div><button className="text-button" onClick={()=>onNavigate('profile')}>View my profile <ArrowUpRight size={16}/></button></section></div><div className="section-gap"><ResultsPanel grades={data.grades}/></div></>}
  </>;
}

function Profile({session,data}:{session:Session;data:PortalData}) {
  const name=data.profile?.name || session.display_name || session.username;
  return <div className="profile-layout"><section className="profile-identity"><span className="large-avatar">{name.split(' ').map(n=>n[0]).slice(0,2).join('')}</span><h2>{name}</h2><p>@{session.username}</p><span className="status-label">{roles[session.role]}</span><div className="profile-identity-bottom"><GraduationCap size={23}/><span>Part of the Dave community.</span></div></section><section className="panel"><PanelHeading eyebrow="YOUR ACADEMIC IDENTITY" title="The essentials"/><dl className="profile-details"><div><dt>Full name</dt><dd>{name}</dd></div><div><dt>Username</dt><dd>{session.username}</dd></div><div><dt>Admission number</dt><dd>{data.profile?.admission_number || 'Not assigned yet'}</dd></div><div><dt>Class group</dt><dd>{data.profile?.current_class_name || 'Not assigned yet'}</dd></div><div><dt>Account type</dt><dd>{roles[session.role]}</dd></div></dl><div className="profile-note"><CircleHelp size={18}/><p>Something needs updating? Contact university administration to review your academic details.</p></div></section></div>;
}

function Support({session,onNavigate}:{session:Session;onNavigate:(v:View)=>void}) {
  const teacher=session.role==='TEACHER',admin=session.role==='ADMIN';
  return <div className="support-layout"><section className="support-intro"><span className="eyebrow">YOU DON’T HAVE TO FIGURE IT OUT ALONE</span><h2>A little clarity.<br/><em>A confident next step.</em></h2><p>Your guide to the things that matter in your academic portal.</p></section><div className="support-items"><article className="panel"><span className="quick-icon"><BookOpen size={22}/></span><h3>{admin?'Building your class groups':teacher?'Your assigned courses':'Understanding your results'}</h3><p>{admin?'Create a class, assign an active lecturer, then use the student directory to place students in it. You can change these assignments at any time.':teacher?'Your courses and class groups are assigned by university administration. Contact them if an assignment is missing.':'Your total combines continuous assessment out of 40 and examination out of 60. Results appear when your lecturer saves them.'}</p><button className="text-button" onClick={()=>onNavigate(admin?'classes':teacher?'courses':'results')}>Take me there <ArrowRight size={15}/></button></article><article className="panel"><span className="quick-icon"><PenLine size={22}/></span><h3>{teacher?'Correcting a result':'Something doesn’t look right?'}</h3><p>{teacher?'Select the same student and course in Record results, then save the corrected scores. This updates the existing result in the current academic session.':admin?'Use the student directory to check a student’s current class. Their account name and username help you identify the right person.':'Contact the lecturer responsible for a missing or incorrect result. For class or account details, contact university administration.'}</p></article><article className="panel"><span className="quick-icon"><ShieldCheck size={22}/></span><h3>Your account, your space</h3><p>Sign out when you finish on a shared device. If your session expires, simply sign in again with your existing username and password.</p></article></div></div>;
}
