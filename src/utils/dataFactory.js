/**
 * Builds unique test data for every run, so runs never collide on the shared public demo.
 */
function uniqueSuffix() {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`.slice(-7);
}

function buildEmployee() {
  const suffix = uniqueSuffix();
  return {
    firstName: 'Dyad',
    lastName: `Leave${suffix}`,
    employeeId: `DY${suffix}`.slice(0, 10),
    username: `dyad.${suffix}`,
    password: `Dyad@${suffix}9x`,
  };
}

/** A unique leave comment lets us pick out exactly this request in every list. */
function buildLeaveComment() {
  return `Dyad automation leave ${uniqueSuffix()}`;
}

module.exports = { buildEmployee, buildLeaveComment };
