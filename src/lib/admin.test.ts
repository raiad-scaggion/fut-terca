import { describe, expect, it } from "vitest";
import { emailKey } from "./admin";

describe("emailKey", () => {
  it("swaps every dot for a comma", () => {
    expect(emailKey("first.last@gmail.com")).toBe("first,last@gmail,com");
  });

  it("matches regardless of case and surrounding spaces", () => {
    expect(emailKey(" RaiadScaggion@Gmail.com ")).toBe("raiadscaggion@gmail,com");
  });
});
