import { describe, expect, it } from "vitest";
import {
  buildAccountabilityGaps,
  buildDialerFunnel,
  emptyDialerMetrics,
  finalizeDialerMetrics,
  metricsFromCases,
  rate,
} from "./dialer-metrics";

describe("dialer metrics", () => {
  it("computes rates and productivity from calling + resolution", () => {
    const m = emptyDialerMetrics();
    m.allocatedCases = 100;
    m.uniqueCasesCalled = 80;
    m.callsAttempted = 200;
    m.connectedCalls = 100;
    m.rpcCount = 50;
    m.ptpGenerated = 25;
    m.resolvedCases = 10;
    const done = finalizeDialerMetrics(m);
    expect(done.connectRate).toBe(50);
    expect(done.rpcRate).toBe(50);
    expect(done.ptpConversion).toBe(50);
    expect(done.resolutionRate).toBe(10);
    expect(done.attemptCoverage).toBe(80);
    expect(done.productivity).toBeCloseTo(44.5, 1);
  });

  it("builds the accountability funnel", () => {
    const funnel = buildDialerFunnel({
      allocated: 100,
      attempted: 80,
      connected: 40,
      rpc: 20,
      ptp: 10,
      resolved: 5,
    });
    expect(funnel).toHaveLength(6);
    expect(funnel[0].stage).toBe("Allocated Cases");
    expect(funnel[5].stage).toBe("Payment / Resolution");
    expect(funnel[5].conversionFromStart).toBe(5);
    expect(funnel[2].conversionFromPrevious).toBe(50);
  });

  it("returns 0 rate when denominator is 0", () => {
    expect(rate(10, 0)).toBe(0);
  });

  it("counts leakage between calling activity and resolution", () => {
    const gaps = buildAccountabilityGaps([
      { allocatedAmount: 1, callsAttempted: 0, connectedCalls: 0, rpcCount: 0, ptpGenerated: 0, ptpAmount: 0, brokenPtp: 0, callDurationSeconds: 0, followUp: false, resolved: false, resolutionAmount: 0 },
      { allocatedAmount: 1, callsAttempted: 3, connectedCalls: 0, rpcCount: 0, ptpGenerated: 0, ptpAmount: 0, brokenPtp: 0, callDurationSeconds: 12, followUp: false, resolved: false, resolutionAmount: 0 },
      { allocatedAmount: 1, callsAttempted: 2, connectedCalls: 2, rpcCount: 0, ptpGenerated: 0, ptpAmount: 0, brokenPtp: 0, callDurationSeconds: 40, followUp: false, resolved: false, resolutionAmount: 0 },
      { allocatedAmount: 1, callsAttempted: 2, connectedCalls: 1, rpcCount: 1, ptpGenerated: 0, ptpAmount: 0, brokenPtp: 0, callDurationSeconds: 80, followUp: false, resolved: false, resolutionAmount: 0 },
      { allocatedAmount: 1, callsAttempted: 2, connectedCalls: 1, rpcCount: 1, ptpGenerated: 1, ptpAmount: 500, brokenPtp: 0, callDurationSeconds: 90, followUp: true, resolved: false, resolutionAmount: 0 },
      { allocatedAmount: 1, callsAttempted: 0, connectedCalls: 0, rpcCount: 0, ptpGenerated: 0, ptpAmount: 0, brokenPtp: 0, callDurationSeconds: 0, followUp: false, resolved: true, resolutionAmount: 200 },
    ]);
    expect(gaps.unworkedCases).toBe(2);
    expect(gaps.calledNotConnected).toBe(1);
    expect(gaps.connectedNoRpc).toBe(1);
    expect(gaps.rpcNoPtp).toBe(1);
    expect(gaps.ptpNoResolution).toBe(1);
    expect(gaps.resolvedWithoutCall).toBe(1);
  });

  it("rolls calling and resolution into agent productivity", () => {
    const summary = metricsFromCases([
      {
        allocatedAmount: 1000,
        callsAttempted: 4,
        connectedCalls: 2,
        rpcCount: 1,
        ptpGenerated: 1,
        ptpAmount: 400,
        brokenPtp: 0,
        callDurationSeconds: 120,
        followUp: true,
        resolved: true,
        resolutionAmount: 400,
      },
      {
        allocatedAmount: 500,
        callsAttempted: 0,
        connectedCalls: 0,
        rpcCount: 0,
        ptpGenerated: 0,
        ptpAmount: 0,
        brokenPtp: 0,
        callDurationSeconds: 0,
        followUp: false,
        resolved: false,
        resolutionAmount: 0,
      },
    ]);
    expect(summary.allocatedCases).toBe(2);
    expect(summary.uniqueCasesCalled).toBe(1);
    expect(summary.notConnectedCalls).toBe(2);
    expect(summary.resolvedCases).toBe(1);
    expect(summary.followUpCases).toBe(1);
    expect(summary.attemptCoverage).toBe(50);
  });
});
