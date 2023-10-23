import { mimetypeForExtension } from "./mimetypes.js";

test("mimetypes for extension", () => {
  expect(mimetypeForExtension("file://path/hello.ttl")).toEqual("text/turtle");
  expect(mimetypeForExtension("hello.ttl")).toEqual("text/turtle");
  expect(mimetypeForExtension(".ttl")).toEqual("text/turtle");
  expect(mimetypeForExtension("ttl")).toEqual("text/turtle");
  expect(mimetypeForExtension("unknown.unknown")).toBeUndefined();
});
