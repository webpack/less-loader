import path from "node:path";
import { snapshot } from "node:test";

snapshot.setResolveSnapshotPath((testFilePath) => {
  const dir = path.dirname(testFilePath);
  const file = path.basename(testFilePath);

  return path.join(dir, "__snapshots__", `${file}.snap`);
});
