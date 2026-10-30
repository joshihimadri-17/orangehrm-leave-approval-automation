const { logger } = require('../utils/logger');

/** OrangeHRM 5 leave status ids, as used by the REST API and the "Show Leave with Status" filter. */
const LEAVE_STATUS = { REJECTED: -1, CANCELLED: 0, PENDING_APPROVAL: 1, SCHEDULED: 2, TAKEN: 3 };

/** OrangeHRM user role id for an Employee Self-Service login. */
const ESS_ROLE_ID = 2;

/**
 * Thin client over OrangeHRM's REST API (/web/index.php/api/v2), using the cookie session of a
 * logged-in browser context. Used for test setup/teardown (scenario steps 1-5) and to cross-check
 * what the UI shows; the workflow under test itself is always driven through the UI.
 */
class OrangeHrmApi {
  /** @param {import('@playwright/test').APIRequestContext} request  an authenticated request context */
  constructor(request) {
    this.request = request;
  }

  async call(method, path, data) {
    const response = await this.request.fetch(`/web/index.php/api/v2${path}`, { method, data });
    if (!response.ok()) {
      throw new Error(`OrangeHRM API ${method} ${path} failed with ${response.status()}: ${await response.text()}`);
    }
    return (await response.json()).data;
  }

  async createEmployee({ firstName, lastName, employeeId }) {
    const employee = await this.call('POST', '/pim/employees', { firstName, middleName: '', lastName, employeeId });
    logger.info('Employee created', { empNumber: employee.empNumber, employeeId });
    return employee;
  }

  async createEssUser({ empNumber, username, password }) {
    const user = await this.call('POST', '/admin/users', { username, password, status: true, userRoleId: ESS_ROLE_ID, empNumber });
    logger.info('ESS login created', { username });
    return user;
  }

  async getLeaveTypeId(name) {
    const types = await this.call('GET', '/leave/leave-types?limit=100');
    const type = types.find((t) => t.name === name);
    if (!type) throw new Error(`Leave type "${name}" not found. Available: ${types.map((t) => t.name).join(', ')}`);
    return type.id;
  }

  /** The leave period (e.g. a calendar year) that contains the given 'YYYY-MM-DD' date. */
  async getLeavePeriodFor(isoDate) {
    const periods = await this.call('GET', '/leave/leave-periods');
    const period = periods.find((p) => p.startDate <= isoDate && isoDate <= p.endDate);
    if (!period) throw new Error(`No leave period defined for ${isoDate}`);
    return period;
  }

  async addEntitlement({ empNumber, leaveTypeId, fromDate, toDate, days }) {
    const entitlement = await this.call('POST', '/leave/leave-entitlements', {
      empNumber, leaveTypeId, fromDate, toDate, entitlement: String(days),
    });
    logger.info('Leave entitled', { empNumber, leaveTypeId, days, fromDate, toDate });
    return entitlement;
  }

  /** Holiday dates ('YYYY-MM-DD') between two dates, so the leave date can avoid them. */
  async getHolidays(fromDate, toDate) {
    const holidays = await this.call('GET', `/leave/holidays?fromDate=${fromDate}&toDate=${toDate}`);
    return holidays.map((h) => h.date);
  }

  /** All leave requests of one employee in a date range, as seen by an admin/supervisor. */
  async getLeaveRequests({ empNumber, fromDate, toDate }) {
    const statuses = Object.values(LEAVE_STATUS).map((s) => `statuses[]=${s}`).join('&');
    return this.call('GET', `/leave/employees/leave-requests?empNumber=${empNumber}&fromDate=${fromDate}&toDate=${toDate}&${statuses}&limit=50`);
  }

  /** Leave requests of the logged-in employee (call with an employee's session). */
  async getMyLeaveRequests({ fromDate, toDate }) {
    const statuses = Object.values(LEAVE_STATUS).map((s) => `statuses[]=${s}`).join('&');
    return this.call('GET', `/leave/leave-requests?fromDate=${fromDate}&toDate=${toDate}&${statuses}&limit=50`);
  }

  /** Looks up a manually pre-configured employee by full name. */
  async findEmployeeByName(fullName) {
    const matches = await this.call('GET', `/pim/employees?nameOrId=${encodeURIComponent(fullName)}&limit=5`);
    if (matches.length !== 1) throw new Error(`Expected one employee named "${fullName}", found ${matches.length}`);
    return matches[0];
  }

  async deleteEmployee(empNumber) {
    await this.call('DELETE', '/pim/employees', { ids: [empNumber] });
    logger.info('Employee deleted', { empNumber });
  }
}

module.exports = { OrangeHrmApi, LEAVE_STATUS };
