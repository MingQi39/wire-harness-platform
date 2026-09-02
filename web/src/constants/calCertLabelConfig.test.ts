import { describe, expect, it } from "vitest";
import {
  DEFAULT_CAL_CERT_LABEL_PRINT_CONFIG,
} from "./calCertLabelConfig";
import { DEFAULT_SAMPLE_LABEL_PRINT_CONFIG, pickPrinterByPatterns } from "./sampleLabelConfig";
import { resolveInitialSampleLabelDeviceName } from "@/utils/desktopPrintPreferences";

describe("DEFAULT_CAL_CERT_LABEL_PRINT_CONFIG printer matching", () => {
  const jcPrinter = {
    name: "jc://M3-I413060182/9100",
    displayName: "精臣 M3-I413060182 (USB)",
  };

  it("does not inherit Deli patterns that miss jc:// USB devices", () => {
    expect(
      pickPrinterByPatterns([jcPrinter], DEFAULT_SAMPLE_LABEL_PRINT_CONFIG.printer_name_patterns),
    ).toBeUndefined();
    expect(DEFAULT_CAL_CERT_LABEL_PRINT_CONFIG.printer_name_patterns).not.toEqual(
      DEFAULT_SAMPLE_LABEL_PRINT_CONFIG.printer_name_patterns,
    );
  });

  it("auto-selects the only connected Jingchen USB printer", () => {
    expect(
      pickPrinterByPatterns([jcPrinter], DEFAULT_CAL_CERT_LABEL_PRINT_CONFIG.printer_name_patterns),
    ).toBe(jcPrinter.name);
    expect(
      resolveInitialSampleLabelDeviceName(
        [jcPrinter],
        DEFAULT_CAL_CERT_LABEL_PRINT_CONFIG.printer_name_patterns,
        { deviceName: "DL-720W" },
      ),
    ).toBe(jcPrinter.name);
  });
});
