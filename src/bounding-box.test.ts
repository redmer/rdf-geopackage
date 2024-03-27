import { jest } from "@jest/globals";

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

import { BoundingBox } from "@ngageoint/geopackage";
import { getRawBoundingBox } from "./bounding-box.js";

test("bounding box calculations", () => {
  const target = new BoundingBox(11, 33, 22, 44);

  expect(getRawBoundingBox("11,22,33,44").equals(target)).toEqual(true);
  expect(getRawBoundingBox("11 33 22 44").equals(target)).toEqual(true);
  expect(getRawBoundingBox("11,22,99,33,44,88").equals(target)).toEqual(true);

  expect(getRawBoundingBox("hello world").equals(target)).toEqual(false);
  expect(getRawBoundingBox("11,33,22,44").equals(target)).toEqual(false);
});
