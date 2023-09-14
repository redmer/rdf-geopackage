/** Enumerate over an iterable, generating an index and the item */
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
