/** Exact structural comparison, including property order/presence, array holes and -0. */
export function firstDifference(expected, actual, path = '$', tick = null) {
  if (Object.is(expected, actual)) return null;
  if (expected && typeof expected === 'object' && Number.isInteger(expected.tick))
    tick = expected.tick;
  const mismatch = (reason) => ({ path, tick, reason, expected, actual });
  if (
    expected === null ||
    actual === null ||
    typeof expected !== 'object' ||
    typeof actual !== 'object'
  )
    return mismatch('value-or-type');
  if (Array.isArray(expected) !== Array.isArray(actual)) return mismatch('array-or-object');
  const a = Object.keys(expected),
    b = Object.keys(actual);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i])
      return { ...mismatch('property-presence-or-order'), path: `${path}.${a[i] ?? b[i]}` };
    const key = a[i];
    const next = Array.isArray(expected) ? `${path}[${key}]` : `${path}.${key}`;
    const difference = firstDifference(expected[key], actual[key], next, tick);
    if (difference) return difference;
  }
  if (Array.isArray(expected) && expected.length !== actual.length) return mismatch('array-length');
  return null;
}
export function assertEquivalent(a, b, label) {
  const d = firstDifference(a, b);
  if (d) {
    const brief = (v) => String(JSON.stringify(v)).slice(0, 200);
    throw Error(
      `${label}: first divergence ${d.path}, tick=${d.tick}, ${d.reason}, A=${brief(d.expected)} B=${brief(d.actual)}`,
    );
  }
}
