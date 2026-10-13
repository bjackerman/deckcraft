import { describe, expect, it } from "vitest";
import { applyNamePattern, uniqueExportNames } from "@/utils/style";

describe("unique export names", () => {
  it("preserves every icon when sanitized names collide", () => {
    const names = ["Play!", "Play?", "play-2", "PLAY"].map((keyName, index) =>
      applyNamePattern("{keyName}", { index, keyName, state: "default" }),
    );
    expect(uniqueExportNames(names)).toEqual([
      "play",
      "play-2",
      "play-2-2",
      "play-3",
    ]);
  });

  it("handles empty patterns and case insensitive extraction", () => {
    expect(uniqueExportNames(["", " ", "..", "Icon", "ICON"])).toEqual([
      "icon",
      "icon-2",
      "icon-3",
      "Icon-4",
      "ICON-5",
    ]);
  });

  it("keeps already unique default pattern names unchanged", () => {
    expect(uniqueExportNames(["01-play-default", "02-stop-default"])).toEqual([
      "01-play-default",
      "02-stop-default",
    ]);
  });
});
