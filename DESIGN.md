# Dave University · React portal

## Visual direction
An editorial university identity: warm paper, deep navy, burgundy and muted sage. Use Instrument Serif for expressive headings and DM Sans for dependable UI text. The custom wordmark and academic seal anchor the interface. Campus photography is illustrative, credited in the README, and stored locally.

## Composition
- Sign-in pairs a quiet form with an immersive photographic panel; mobile prioritises the form.
- A dark navigation rail anchors the dashboards. A slim utility bar, generous heading and photographic welcome banner establish hierarchy.
- Counts and score summaries come from Django. Course cards, academic tables and profiles each have distinct visual treatments.
- Use actual records, useful empty states and short guidance. No invented fees, schedules, announcements, GPA or performance trends.

## Interaction
- Role comes from the authenticated backend account. One login serves students, lecturers and administrators.
- Registration returns to login; it does not authenticate automatically.
- Class edits use focused dialogs. Results offer search, session/course filters and CSV exports.
- Scores and allocations refresh after a successful save. Distinguish saved changes from a failed refresh.
- Keyboard focus, reduced-motion support and mobile navigation are first-class requirements.
- Keep developer endpoints, tokens and implementation details out of the interface.

## Source
- `src/app`: Next.js routes, styles and the server-side API proxy.
- `src/components`: reusable React screens and role workspaces.
- `src/lib`: typed API access, tab-scoped session storage and result utilities.
- `public/campus.jpg`: locally served image; fonts are bundled through Fontsource.
