const { test, expect } = require('../src/fixtures');
const { env } = require('../config/env');
const { formatByPattern } = require('../src/utils/dateUtils');

/**
 * Scenario 7: Employee Leave Approval with Role-Based Validation.
 * Three phases run in order, each in a fresh browser session for the right role:
 *   1. Employee applies for leave and the Leave Request ID is captured.
 *   2. Admin/manager finds the request by employee name and approves it.
 *   3. Employee logs in again and sees the same request as approved.
 *
 * OrangeHRM shows an approved FUTURE leave with the status "Scheduled" (it becomes "Taken" once the
 * date has passed). It has no status literally called "Approved", so "Scheduled" is asserted as the
 * approved state; see README > Assumptions.
 */
const STATUS = { PENDING: 'Pending Approval', APPROVED: 'Scheduled' };

/** State handed from one phase to the next (tests in a serial block share the worker). */
const captured = {};

test.describe.serial('Employee leave approval workflow', () => {
  test('Phase 1: employee applies for future leave and the request ID is captured', async ({
    scenario, loginPage, applyLeavePage, myLeavePage, api,
  }) => {
    const { employee, leave } = scenario;

    await test.step('Step 6: log in as the employee', async () => {
      await loginPage.login(employee.username, employee.password);
      await expect(loginPage.header.userName).toHaveText(employee.fullName);
    });

    await test.step(`Step 7: apply for ${leave.type} leave on ${leave.isoDate}`, async () => {
      await applyLeavePage.open();
      captured.request = await applyLeavePage.applyForLeave(leave);
      expect(await applyLeavePage.successMessage()).toContain('Successfully Saved');
    });

    await test.step('Step 8 + Validation 1: leave request is created with a valid ID', async () => {
      const { id } = captured.request;
      expect(Number.isInteger(id), `leave request id should be an integer, got ${id}`).toBe(true);
      expect(id).toBeGreaterThan(0);
      expect(captured.request.dateApplied).toBe(leave.isoDate);
      expect(captured.request.leaveType.name).toBe(leave.type);

      const myRequests = await api.getMyLeaveRequests({ fromDate: leave.isoDate, toDate: leave.isoDate });
      expect(myRequests.map((r) => r.id), 'the new ID is listed among the employee\'s requests').toContain(id);

      await myLeavePage.open();
      const row = await myLeavePage.getRequest(leave.comment);
      expect(row.status).toContain(STATUS.PENDING);
      expect(row.type).toBe(leave.type);
      captured.displayedDate = row.date;
      test.info().annotations.push({ type: 'Leave Request ID', description: String(id) });
    });

    await test.step('Step 9: log out', async () => {
      await myLeavePage.header.logout();
      await expect(loginPage.loginButton).toBeVisible();
    });
  });

  test('Phase 2: manager approves the request and its status changes to approved', async ({
    scenario, loginPage, leaveListPage, api,
  }) => {
    const { employee, leave } = scenario;
    test.skip(!captured.request, 'Phase 1 did not create a leave request');

    await test.step('Step 10: log in as admin/manager', async () => {
      await loginPage.login(env.admin.username, env.admin.password);
    });

    await test.step('Steps 11-12: open Leave List and search by employee name', async () => {
      await leaveListPage.open();
      await leaveListPage.search({ employeeName: employee.fullName, date: leave.date });
      expect(await leaveListPage.getStatus(leave.comment)).toContain(STATUS.PENDING);
    });

    await test.step('Step 13: approve the leave request', async () => {
      const approvedId = await leaveListPage.approve(leave.comment);
      expect(approvedId, 'the approved request is the one the employee created').toBe(captured.request.id);
      expect(await leaveListPage.successMessage()).toContain('Successfully Updated');
    });

    await test.step('Step 14 + Validation 2: status changes to approved', async () => {
      await leaveListPage.open();
      await leaveListPage.search({ employeeName: employee.fullName, date: leave.date, extraStatus: STATUS.APPROVED });
      const status = await leaveListPage.getStatus(leave.comment);
      expect(status).toContain(STATUS.APPROVED);
      expect(status).not.toContain(STATUS.PENDING);

      const requests = await api.getLeaveRequests({ empNumber: employee.empNumber, fromDate: leave.isoDate, toDate: leave.isoDate });
      const approved = requests.find((r) => r.id === captured.request.id);
      expect(approved, 'request is found through the API').toBeDefined();
      expect(approved.leaveBreakdown.map((b) => b.name)).toEqual([STATUS.APPROVED]);
    });

    await test.step('Log out', async () => {
      await leaveListPage.header.logout();
    });
  });

  test('Phase 3: employee logs in again and sees the same request as approved', async ({
    scenario, loginPage, myLeavePage, api,
  }) => {
    const { employee, leave } = scenario;
    test.skip(!captured.request, 'Phase 1 did not create a leave request');

    await test.step('Step 15: log in again as the employee', async () => {
      await loginPage.login(employee.username, employee.password);
    });

    await test.step('Steps 16-17 + Validation 3: My Leave shows the same request as approved', async () => {
      await myLeavePage.open();
      const row = await myLeavePage.getRequest(leave.comment);
      expect(row.status).toContain(STATUS.APPROVED);
      expect(row.status).not.toContain(STATUS.PENDING);
      expect(row.date).toBe(captured.displayedDate);
      expect(row.date).toBe(formatByPattern(leave.date, await myLeavePage.datePattern()));
      expect(row.type).toBe(leave.type);

      const myRequests = await api.getMyLeaveRequests({ fromDate: leave.isoDate, toDate: leave.isoDate });
      const sameRequest = myRequests.find((r) => r.id === captured.request.id);
      expect(sameRequest, 'the same request ID is visible to the employee').toBeDefined();
      expect(sameRequest.leaveBreakdown.map((b) => b.name)).toEqual([STATUS.APPROVED]);
    });

    await test.step('Log out', async () => {
      await myLeavePage.header.logout();
    });
  });
});
