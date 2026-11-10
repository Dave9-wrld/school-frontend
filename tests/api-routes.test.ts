import assert from 'node:assert/strict';
import test from 'node:test';

import { isAllowedApiRoute } from '../src/lib/api-routes.ts';

test('frontend proxy allows every enrollment and attendance route', () => {
  for (const endpoint of [
    'course-enrollments',
    'course-enrollments/12',
    'attendance-sessions',
    'attendance-sessions/34',
    'attendance-records',
    'attendance-records/56',
  ]) {
    assert.equal(isAllowedApiRoute(endpoint), true, endpoint);
  }
});

test('frontend proxy still rejects unknown or malformed routes', () => {
  for (const endpoint of [
    'course-enrollments/not-a-number',
    'attendance-records/1/delete',
    'private-data',
  ]) {
    assert.equal(isAllowedApiRoute(endpoint), false, endpoint);
  }
});
