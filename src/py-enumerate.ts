/**
 * Enumerate over an iterable, generating an index and an item.
 * @param iterable An iterable
 * @param initial First returned index
 */
export function* enumerate<T>(
  iterable: Iterable<T>,
  initial = 0,
): Generator<[number, T]> {
  let i = initial;
  for (const x of iterable) {
    yield [i, x];
    i++;
  }
}
