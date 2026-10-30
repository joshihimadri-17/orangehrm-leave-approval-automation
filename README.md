# OrangeHRM Leave Approval Automation (Scenario 7)

End-to-end automation of the **Employee Leave Approval with Role-Based Validation** scenario on the
[OrangeHRM demo](https://opensource-demo.orangehrmlive.com/): an employee applies for leave, the
manager approves it, and the employee confirms the updated status.

Built with **Playwright Test (JavaScript)** using the **Page Object Model**.

---

## Framework at a glance

| Item | Choice |
|---|---|
| Language / runner | JavaScript (Node.js) + `@playwright/test` |
| Design pattern | Page Object Model, with reusable UI components and fixtures |
| Waiting | Playwright auto-waiting and explicit waits on states/responses; no hard sleeps (enforced by an ESLint rule) |
| Dynamic data | Employee, login, leave date and comment generated per run; leave request ID captured at run time |
| Reporting | Playwright HTML report, Allure report, structured JSON log (`logs/execution.log`), screenshot/video/trace on failure |
| Code quality | ESLint (`npm run lint`) |

## Project structure

```
config/
  env.js                 all settings, read from .env with demo-friendly defaults
src/
  api/OrangeHrmApi.js    REST client: test setup/teardown + independent status cross-checks
  components/            reusable UI pieces: Header (logout), FormControls (dropdown, date, autocomplete), DataTable
  pages/                 page objects: LoginPage, ApplyLeavePage, MyLeavePage, LeaveListPage (+ BasePage)
  fixtures/index.js      injects page objects; prepares the employee + leave date once per run and cleans up
  utils/                 logger, date helpers, unique test-data factory
tests/
  leave-approval.spec.js the scenario: 3 role-separated phases
playwright.config.js     browser, timeouts, reporters, artefacts on failure
```

## Prerequisites

- Node.js 18 or newer
- Internet access to `opensource-demo.orangehrmlive.com`

## Setup

```bash
git clone <this-repo-url>
cd dyad-leave-approval-automation
npm install
npx playwright install chromium
```

Optional: copy `.env.example` to `.env` to change any setting. With no `.env`, the defaults run the
whole scenario against the public demo.

## Run the tests

```bash
npm test                 # headless run of the full workflow
npm run test:headed      # watch it in a browser
npm run report           # open the Playwright HTML report
npm run allure:generate  # build the Allure report from reports/allure-results
npm run allure:open      # open the Allure report
npm run lint             # static checks
```

A run takes about 1.5 minutes. Logs go to the console and to `logs/execution.log` (one JSON object per line).

## Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `BASE_URL` | `https://opensource-demo.orangehrmlive.com` | Application under test |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `Admin` / `admin123` | Manager account (public demo credentials) |
| `EMPLOYEE_USERNAME` / `EMPLOYEE_PASSWORD` / `EMPLOYEE_FULL_NAME` | empty | A manually prepared employee (steps 1-5). If empty, one is created automatically. |
| `LEAVE_TYPE` | `US - Vacation` | Leave type to apply for |
| `LEAVE_DAYS_AHEAD` | `14` | Leave starts on the first working day on/after this many days from today |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn` or `error` |

## How the scenario is covered

| Step | What happens | Where |
|---|---|---|
| 1-5 (manual in the brief) | Admin creates an employee, an ESS login and a 10-day entitlement for the leave period that contains the leave date. Skipped when an employee is supplied in `.env`. | `fixtures/index.js` → `OrangeHrmApi` |
| 6 | Log in as the employee and check the user menu shows their name | `LoginPage.login` |
| 7 | Apply for one day of leave on a future working day | `ApplyLeavePage.applyForLeave` |
| 8 | Capture the Leave Request ID from the server's response to Apply | `ApplyLeavePage.applyForLeave` |
| 9 | Log out | `Header.logout` |
| 10-12 | Log in as admin, open Leave List, search by employee name and date | `LeaveListPage.search` |
| 13 | Approve the request and check the server updated **the same ID** | `LeaveListPage.approve` |
| 14 | Re-search including "Scheduled" and check the status | `LeaveListPage.getStatus` |
| 15-17 | Log in again as the employee, open My Leave, check the same request is approved | `MyLeavePage.getRequest` |

| Validation | Assertions |
|---|---|
| 1. Leave request is created with a valid ID | ID is a positive integer; the API echoes the right date and leave type; the ID is listed in the employee's own requests; My Leave shows the request as *Pending Approval* |
| 2. Manager approval updates the status to Approved | The approved ID equals the captured ID; success message shown; the Leave List row shows *Scheduled* and no longer *Pending Approval*; the API status breakdown for that ID is exactly *Scheduled* |
| 3. Employee sees the same status after re-login | In a fresh employee session, My Leave shows the same request (same date and type) as *Scheduled*; the employee API returns the same ID with status *Scheduled* |

## Dynamic data handling

- **Employee and login:** a unique name, employee ID, username and password are generated every run (`dataFactory.js`).
- **Leave date:** the next working day on/after `LEAVE_DAYS_AHEAD`, skipping weekends and the holidays configured in OrangeHRM (fetched from the API).
- **Date format:** OrangeHRM's date format is configurable (the demo uses `yyyy-dd-mm`). The framework reads each date field's placeholder and formats the date to match, instead of hard-coding a format.
- **Leave request ID:** not shown on screen, so it's captured from the response to the Apply call and then followed through approval and confirmation.
- **Finding "our" request:** each run uses a unique leave comment, so the right row is found even if the employee has other requests.
- **Table columns:** cells are read by column header name, not position.
- **Entitlement period:** the leave period that contains the leave date is looked up, so a date in January still works.

## Assumptions

1. **"Approved" = "Scheduled".** OrangeHRM 5 has no status called "Approved". Its statuses are Rejected, Cancelled, Pending Approval, Scheduled and Taken. An approved leave on a future date shows as **Scheduled** (and becomes Taken once the date passes). The tests assert *Scheduled* as the approved state, confirm it is no longer *Pending Approval*, and cross-check the status through the API.
2. **Steps 1-5 are automated as setup**, not as part of the tested workflow. The brief says they are done manually; on the shared public demo, data is reset often, so a hand-made employee may disappear. The framework therefore creates one through the admin API before the run and deletes it afterwards. To use a manually prepared employee instead, fill the `EMPLOYEE_*` variables in `.env`.
3. **The admin account acts as the manager**, as the brief allows ("Login as Admin/Manager").
4. The leave is **one full day**; the leave type defaults to *US - Vacation*.
5. The workflow is **stateful and sequential**, so it runs on one worker and the three phases share the captured request through a serial test block. Each phase uses a fresh browser session for its role.

## Reports and debugging

- `reports/html`: Playwright report with each numbered step, plus the captured Leave Request ID as an annotation
- `reports/allure-report`: Allure report (after `npm run allure:generate`)
- `reports/test-results`: screenshot, video and trace for any failure (`npx playwright show-trace <trace.zip>`)
- `logs/execution.log`: structured log of logins, leave application (with ID), search, approval and cleanup

## Troubleshooting

- **Timeouts or `ERR_NAME_NOT_RESOLVED`:** the public demo is occasionally slow or unreachable; re-run when it responds.
- **"Leave type not found":** set `LEAVE_TYPE` to a type that exists on the instance.
- **Demo data reset:** nothing to do; the framework creates its own data every run.
