import type { AttendanceRecord } from './types.ts';

export function attendanceSummary(records: AttendanceRecord[]) {
  const present = records.filter((record) => record.status === 'PRESENT').length;
  const late = records.filter((record) => record.status === 'LATE').length;
  const absent = records.filter((record) => record.status === 'ABSENT').length;
  const excused = records.filter((record) => record.status === 'EXCUSED').length;
  const counted = present + late + absent;

  return {
    present,
    late,
    absent,
    excused,
    rate: counted ? Math.round(((present + late) / counted) * 100) : null,
  };
}
