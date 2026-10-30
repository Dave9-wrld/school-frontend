# Dave University Â· Next.js frontend

A React and TypeScript application using the Next.js App Router. Runs separately from Django; uses the existing accounts, classes, courses and results.

## Run locally

Keep Django running from the project root:

```powershell
.\env\Scripts\python.exe manage.py runserver
```

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open **http://127.0.0.1:3000**. Use your existing account. Registration creates a student account and returns to sign-in. Administrators and lecturers sign in at the same page.

The original Django frontend remains at http://127.0.0.1:8000/app/.

## How it connects

React calls `/api/â€¦` on port 3000. The Next.js route handler forwards allowed routes to Django on port 8000, including the user's token. Django enforces all role permissions. Browser session cookies are not forwarded, responses are not cached, and no CORS changes are required. The user token is held in session storage for the current browser tab.

To use a different backend, copy `.env.example` to `.env.local` and change `DJANGO_API_ORIGIN`, then restart Next.js. Keep this variable server-side; it is not a `NEXT_PUBLIC_` setting.

## Included workflows

- Students: registration, login, profile, results search and session filter, CSV export.
- Lecturers: assigned courses/classes, record or update current-session scores, searchable recorded results and CSV export.
- Administrators: create/rename classes, assign/remove class lecturers, assign/move/remove students from classes, searchable directories.
- All roles: refresh, logout, session expiration, loading/error/empty states and mobile navigation.

Class groups are separate from subject assignments. The existing model permits one current class per student and one class lecturer per group. Course assignment and account-role administration remain available through Django admin. Results are scoped to a lecturer's currently assigned courses; historical authorship is not tracked by the existing model.

## Account identifiers and registration

Public student registration accepts an optional `admission_number` (maximum 20 characters). It is saved on `StudentProfile` and appears in the student profile, student directory and lecturer student selectors. Employee IDs belong to `TeacherProfile`; public registration cannot create lecturer/admin accounts. Both identifiers must be unique when provided; empty values are stored as null.

`POST /api/register/` returns HTTP 201 with `{message, token, expires_at, user}`. The nested `user` contains safe account details and identifiers, never a password. The token uses the existing `Authorization: Token â€¦` mechanism. Both frontends deliberately return to login without saving this signup token, preserving the explicit sign-in flow.

Administrators use `POST /api/admin/users/` to create a `STUDENT` or `TEACHER` with username, password, optional email/name fields, and the appropriate `admission_number` or `employee_id`. This endpoint requires an administrator's existing authentication, returns safe account details, and never changes the administrator's session. New lecturers do not receive Django staff/superuser access. In Next.js, use **Class management â†’ Add lecturer** or **Student directory â†’ Add student**. The original `/app/` admin screen also includes **Add a lecturer**. Lecturer selectors show the employee ID when available.

The identifier columns already existed, so these additions require no new database migration. Account role changes and course assignments remain in Django admin.

## Password recovery and Gmail

The login screen links to `/forgot-password`. Users enter their username and saved email address (several accounts may share an email). Django emails a six-digit code for that specific account. Users enter the code and their new password on `/reset-password` in the same browser tab. The code expires after 10 minutes, is usable once and permits five confirmation attempts. Resending replaces the previous code and challenge. The UI has a 60-second resend cooldown, and backend request throttles also apply.

Codes are generated cryptographically and stored as keyed hashes with a random challenge ID, expiration and attempt counter. Password/email changes invalidate outstanding challenges. New passwords pass Django's validators. Success returns to login, revokes existing API tokens and invalidates Django sessions; roles and academic records stay intact. Unknown/inactive accounts receive the same request response. Accounts without a working saved email need administrator assistance. Old reset links no longer work.

**Inbox delivery needs Gmail setup.** The default console backend cannot deliver email, so recovery now returns an unavailable message when it is selected. It no longer claims a message was sent. To enable Gmail:

1. Enable Google 2-Step Verification, then create a Google App Password named Dave University. Follow [Google's App Password instructions](https://support.google.com/accounts/answer/185833). If unavailable on a managed account, ask its administrator for an approved mail service.
2. Stop the existing Django server with Ctrl+C. Leave Next.js running.
3. In a PowerShell terminal at the project root, run `& .\scripts\start_with_gmail.ps1`.
4. Enter the sending Gmail address and App Password into the local prompts. Use an App Password, not your normal Gmail password. The launcher authenticates to Gmail SMTP with TLS on port 587 before starting Django. It sends no email during this check and does not save credentials to files or shell history.
5. Request a code for a test account whose saved email you control. Check inbox/spam, enter the code in the portal, choose the new password, then sign in. Inbox delivery can only be verified after credentials are configured.

Use the launcher whenever restarting with Gmail. Ordinary `manage.py runserver` defaults to console mail unless SMTP environment variables are configured separately. Never commit credentials or paste them in chat.

For another environment, configure `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` and `DEFAULT_FROM_EMAIL` in the Django server environment. `frontend/.env.local` configures Next.js, not Django email. Run `manage.py check_mail` to check SMTP authentication without sending a message. General configuration failures return 503 for all usernames. Recipient-specific delivery failures are logged without exposing account existence; the unsent challenge is invalidated.

Reset API: `POST /api/password-reset/` with `username` and `email`; it returns `challenge_id`, `expires_in` and a generic message. `POST /api/password-reset/confirm/` accepts `challenge_id`, `code`, `new_password` and `confirm_password`. The API never returns the code. The browser stores only the pending challenge and account details in session storage, not the code or new password.

The migration adds one outstanding challenge row per account. Request/confirmation IP throttles and email throttles use the current local memory cache; production workers need a shared cache and deployment-level rate limiting. The Next.js proxy currently shares a source address for requests, so its IP throttle is shared across frontend users.

## Checks

```powershell
npm test
npm run typecheck
npm run build
```

Production uses `npm run build` followed by `npm start` with a reachable Django server. This project has not been deployed publicly.

## Design & assets

Warm paper, deep navy, burgundy, muted sage. Instrument Serif for editorial headings; DM Sans for forms and records. Fonts are bundled locally from Fontsource. Icons use Lucide. Campus imagery is illustrative: [Tim Alex on Unsplash](https://unsplash.com/photos/person-walking-on-pathway-in-front-of-brown-concrete-building-during-daytime-JYqLCa-rv7o). The local photograph is at `public/campus.jpg`.

Framework reference: [Next.js App Router documentation](https://nextjs.org/docs/app/getting-started/installation).
