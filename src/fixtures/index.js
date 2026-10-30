const base = require('@playwright/test');
const { env } = require('../../config/env');
const { OrangeHrmApi } = require('../api/OrangeHrmApi');
const { LoginPage } = require('../pages/LoginPage');
const { ApplyLeavePage } = require('../pages/ApplyLeavePage');
const { MyLeavePage } = require('../pages/MyLeavePage');
const { LeaveListPage } = require('../pages/LeaveListPage');
const { buildEmployee, buildLeaveComment } = require('../utils/dataFactory');
const { nextWorkingDay, toIsoDate } = require('../utils/dateUtils');
const { logger } = require('../utils/logger');

/** Opens a separate browser context logged in as admin and returns an API client on its session. */
async function adminSession(browser) {
  const context = await browser.newContext({ baseURL: env.baseUrl });
  const page = await context.newPage();
  await new LoginPage(page).login(env.admin.username, env.admin.password);
  return { context, api: new OrangeHrmApi(context.request) };
}

/**
 * Prepares the preconditions (scenario steps 1-5) once per run:
 *  - uses the employee from .env if one was configured manually, otherwise creates a fresh
 *    employee, ESS login and leave entitlement through the admin API;
 *  - picks the leave date: the next working day on/after LEAVE_DAYS_AHEAD, skipping holidays.
 * The provisioned employee is deleted again after the run.
 */
async function prepareScenario(browser) {
  const { context, api } = await adminSession(browser);
  const firstCandidate = nextWorkingDay(env.leave.daysAhead);
  const searchEnd = new Date(firstCandidate.getFullYear(), firstCandidate.getMonth(), firstCandidate.getDate() + 30);
  const holidays = await api.getHolidays(toIsoDate(firstCandidate), toIsoDate(searchEnd));
  const leaveDate = nextWorkingDay(env.leave.daysAhead, holidays);
  const leave = { type: env.leave.type, date: leaveDate, isoDate: toIsoDate(leaveDate), comment: buildLeaveComment() };

  let employee;
  if (env.hasPreconfiguredEmployee) {
    const found = await api.findEmployeeByName(env.employee.fullName);
    employee = { ...env.employee, empNumber: found.empNumber, provisioned: false };
    logger.info('Using pre-configured employee', { username: employee.username });
  } else {
    const data = buildEmployee();
    const created = await api.createEmployee(data);
    await api.createEssUser({ empNumber: created.empNumber, username: data.username, password: data.password });
    const period = await api.getLeavePeriodFor(leave.isoDate);
    await api.addEntitlement({
      empNumber: created.empNumber,
      leaveTypeId: await api.getLeaveTypeId(leave.type),
      fromDate: period.startDate,
      toDate: period.endDate,
      days: 10,
    });
    employee = {
      username: data.username,
      password: data.password,
      fullName: `${data.firstName} ${data.lastName}`,
      empNumber: created.empNumber,
      provisioned: true,
    };
  }
  await context.close();
  logger.info('Scenario prepared', { employee: employee.fullName, leaveDate: leave.isoDate, leaveType: leave.type });
  return { employee, leave };
}

const test = base.test.extend({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  applyLeavePage: async ({ page }, use) => use(new ApplyLeavePage(page)),
  myLeavePage: async ({ page }, use) => use(new MyLeavePage(page)),
  leaveListPage: async ({ page }, use) => use(new LeaveListPage(page)),

  /** API client on the session of whoever is logged in on `page` (used for cross-checks). */
  api: async ({ page }, use) => use(new OrangeHrmApi(page.context().request)),

  scenario: [
    async ({ browser }, use) => {
      const scenario = await prepareScenario(browser);
      await use(scenario);
      if (scenario.employee.provisioned) {
        const { context, api } = await adminSession(browser);
        // Cleanup must not fail the run: the shared demo may already have reset and removed the employee.
        await api.deleteEmployee(scenario.employee.empNumber)
          .catch((error) => logger.warn('Cleanup skipped', { empNumber: scenario.employee.empNumber, reason: error.message }));
        await context.close();
      }
    },
    { scope: 'worker', timeout: 4 * 60 * 1000 },
  ],
});

module.exports = { test, expect: base.expect };
