'use client';
import { useState } from 'react';
import { Download, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Grade } from '@/lib/types';
import { filterGrades, resultsCsv } from '@/lib/results';
import { Empty, PanelHeading } from './ui';

function getGradeClassification(total: number) {
  if (total >= 70) return { letter: 'A', tone: 'grade-badge-a', label: 'Distinction' };
  if (total >= 60) return { letter: 'B', tone: 'grade-badge-b', label: 'Merit' };
  if (total >= 50) return { letter: 'C', tone: 'grade-badge-c', label: 'Credit' };
  if (total >= 45) return { letter: 'D', tone: 'grade-badge-d', label: 'Pass' };
  return { letter: 'F', tone: 'grade-badge-f', label: 'Fail' };
}

export function ResultsPanel({ grades, lecturer = false }: { grades: Grade[]; lecturer?: boolean }) {
  const [search, setSearch] = useState('');
  const [session, setSession] = useState('all');
  const [course, setCourse] = useState('all');

  const filtered = filterGrades(grades, search, session, course);
  const sessions = [...new Map(grades.map((g) => [String(g.session), g.session_name])).entries()];
  const courses = [...new Map(grades.map((g) => [String(g.subject), g.subject_name])).entries()];

  const isFiltered = search.trim() !== '' || session !== 'all' || course !== 'all';

  function resetFilters() {
    setSearch('');
    setSession('all');
    setCourse('all');
  }

  function download() {
    const url = URL.createObjectURL(new Blob([resultsCsv(filtered)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dave-university-results.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="panel results-panel">
      <PanelHeading
        eyebrow="GRADEBOOK"
        title={lecturer ? 'Recorded results' : 'Your academic record'}
        action={
          <button className="button button-outline button-small" onClick={download} disabled={!filtered.length}>
            <Download size={15} /> Export results
          </button>
        }
      />
      <div className="table-tools">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label={lecturer ? 'Search students or courses' : 'Search courses'}
            placeholder={lecturer ? 'Find a student or course…' : 'Find a course…'}
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
        <div className="table-filters">
          <SlidersHorizontal size={16} />
          <select aria-label="Filter academic session" value={session} onChange={(e) => setSession(e.target.value)}>
            <option value="all">All sessions</option>
            {sessions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          {lecturer && (
            <select aria-label="Filter course" value={course} onChange={(e) => setCourse(e.target.value)}>
              <option value="all">All courses</option>
              {courses.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          )}
          {isFiltered && (
            <button type="button" className="filter-reset-btn" onClick={resetFilters}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {filtered.length ? (
        <>
          <div className="table-scroll result-ledger">
            <table>
              <thead>
                <tr>
                  <th>{lecturer ? 'Student' : 'Course'}</th>
                  {lecturer && <th>Course</th>}
                  <th>Session</th>
                  <th>CA <span>/ 40</span></th>
                  <th>Exam <span>/ 60</span></th>
                  <th>Total <span>/ 100</span></th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => {
                  const score = Number(g.total_score);
                  const gradeInfo = getGradeClassification(score);
                  return (
                    <tr key={g.id}>
                      <td>
                        <div className="table-person">
                          {lecturer && (
                            <span className="mini-avatar">{g.student_name.slice(0, 1).toUpperCase()}</span>
                          )}
                          <strong>{lecturer ? g.student_name : g.subject_name}</strong>
                        </div>
                      </td>
                      {lecturer && <td>{g.subject_name}</td>}
                      <td>
                        <span className="session-tag">{g.session_name}</span>
                      </td>
                      <td data-label="Assessment">{Number(g.continuous_assessment_score ?? g.continous_assessment_score).toFixed(1)}</td>
                      <td data-label="Exam">{Number(g.exam_score).toFixed(1)}</td>
                      <td data-label="Total">
                        <span className="score-chip">{score.toFixed(1)}</span>
                      </td>
                      <td data-label="Grade">
                        <span className={`grade-badge ${gradeInfo.tone}`} title={gradeInfo.label}>
                          {gradeInfo.letter}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>
              {filtered.length} of {grades.length} result{grades.length !== 1 ? 's' : ''} shown
            </span>
            <span>Assessment 40% <i /> Examination 60%</span>
          </div>
        </>
      ) : (
        <Empty
          title={grades.length ? 'No matching results' : 'No results yet'}
        >
          {grades.length ? (
            <div>
              <p style={{ marginBottom: 12 }}>No records match your search or filter combination.</p>
              <button
                type="button"
                className="button button-outline button-small"
                onClick={resetFilters}
              >
                <RotateCcw size={14} /> Reset all filters
              </button>
            </div>
          ) : lecturer ? (
            'Save a student’s score to start building your course records.'
          ) : (
            'Your results will appear here as your lecturers record them.'
          )}
        </Empty>
      )}
    </section>
  );
}
