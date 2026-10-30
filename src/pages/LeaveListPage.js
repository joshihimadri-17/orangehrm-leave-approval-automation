const { BasePage } = require('./BasePage');
const { DataTable } = require('../components/DataTable');
const { fillDate, selectEmployee, selectOption } = require('../components/FormControls');
const { logger } = require('../utils/logger');

/** Leave > Leave List: the admin/supervisor view where requests are approved or rejected. */
class LeaveListPage extends BasePage {
  constructor(page) {
    super(page);
    this.table = new DataTable(page);
    this.searchButton = page.getByRole('button', { name: 'Search' });
  }

  async open() {
    await super.open('/leave/viewLeaveList');
    await this.searchButton.waitFor();
  }

  /**
   * Filters the list to one employee and one date. `extraStatus` adds a status to the
   * "Show Leave with Status" filter, which shows only Pending Approval by default.
   * The status is set before the dates because an open date-picker swallows the next click.
   */
  async search({ employeeName, date, extraStatus }) {
    if (extraStatus) await selectOption(this.page, 'Show Leave with Status', extraStatus);
    await fillDate(this.page, 'From Date', date);
    await fillDate(this.page, 'To Date', date);
    await selectEmployee(this.page, 'Employee Name', employeeName);
    await this.searchButton.click();
    await this.waitForLoaded();
    logger.info('Leave list searched', { employeeName, extraStatus: extraStatus || 'default' });
  }

  async getStatus(comment) {
    const row = this.table.rowContaining(comment);
    await row.waitFor();
    return this.table.cellText(row, 'Status');
  }

  /** Clicks Approve on the row and returns the id of the request the server updated. */
  async approve(comment) {
    const row = this.table.rowContaining(comment);
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/api/v2/leave/employees/leave-requests/') && r.request().method() === 'PUT'),
      row.getByRole('button', { name: 'Approve' }).click(),
    ]);
    if (!response.ok()) throw new Error(`Approve failed with ${response.status()}: ${await response.text()}`);
    const approvedId = (await response.json()).data.id;
    logger.info('Leave approved', { leaveRequestId: approvedId });
    return approvedId;
  }
}

module.exports = { LeaveListPage };
