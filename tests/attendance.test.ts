import assert from 'node:assert/strict';
import test from 'node:test';

import { attendanceSummary } from '../src/lib/attendance.ts';
import type { AttendanceRecord } from '../src/lib/types.ts';

function record(status: AttendanceRecord['status']): AttendanceRecord {
  return {
    id: 1,
    attendance_session: 1,
    course_enrollment: 1,
    student: 1,
    student_name: 'Test Student',
    admission_number: 'STU001',
    subject_code: 'CSC101',
    subject_name: 'Introduction to Computing',
    session_date: '2026-11-10',
    status,
    notes: '',
    recorded_by: 2,
    created_at: '2026-11-10T08:00:00Z',
    updated_at: '2026-11-10T08:00:00Z',
  };
}

test('attendance rate counts present and late, excluding excused records', () => {
  const summary = attendanceSummary([
    record('PRESENT'),
    record('LATE'),
    record('ABSENT'),
    record('EXCUSED'),
  ]);

  assert.deepEqual(summary, {
    present: 1,
    late: 1,
    absent: 1,
    excused: 1,
    rate: 67,
  });
});

test('attendance rate is unavailable before any countable record exists', () => {
  assert.equal(attendanceSummary([record('EXCUSED')]).rate, null);
});
