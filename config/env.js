require('dotenv').config();

/**
 * Single source of configuration. Everything comes from environment variables (.env),
 * with defaults that work against the public OrangeHRM demo.
 */
const env = {
  baseUrl: process.env.BASE_URL || 'https://opensource-demo.orangehrmlive.com',

  admin: {
    username: process.env.ADMIN_USERNAME || 'Admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },

  // A manually pre-configured employee (scenario steps 1-5). When empty, one is provisioned automatically.
  employee: {
    username: process.env.EMPLOYEE_USERNAME || '',
    password: process.env.EMPLOYEE_PASSWORD || '',
    fullName: process.env.EMPLOYEE_FULL_NAME || '',
  },

  leave: {
    type: process.env.LEAVE_TYPE || 'US - Vacation',
    daysAhead: Number(process.env.LEAVE_DAYS_AHEAD || 14),
  },

  logLevel: process.env.LOG_LEVEL || 'info',
};

env.hasPreconfiguredEmployee = Boolean(env.employee.username && env.employee.password && env.employee.fullName);

module.exports = { env };
