export interface DialerMetrics {
  allocatedCases: number;
  allocatedAmount: number;
  uniqueCasesCalled: number;
  callsAttempted: number;
  connectedCalls: number;
  notConnectedCalls: number;
  rpcCount: number;
  ptpGenerated: number;
  ptpAmount: number;
  ptpConversion: number;
  brokenPtp: number;
  callDurationSeconds: number;
  followUpCases: number;
  resolvedCases: number;
  resolutionAmount: number;
  connectRate: number;
  rpcRate: number;
  resolutionRate: number;
  attemptCoverage: number;
  productivity: number;
}

export interface DialerDailyPoint {
  date: string;
  attempted: number;
  connected: number;
  rpc: number;
  uniqueCases: number;
  durationSeconds: number;
  resolvedAmount: number;
}

export interface DialerFunnelStage {
  stage: string;
  count: number;
  conversionFromStart: number;
  conversionFromPrevious: number;
}

export function emptyDialerMetrics(): DialerMetrics {
  return {
    allocatedCases: 0,
    allocatedAmount: 0,
    uniqueCasesCalled: 0,
    callsAttempted: 0,
    connectedCalls: 0,
    notConnectedCalls: 0,
    rpcCount: 0,
    ptpGenerated: 0,
    ptpAmount: 0,
    ptpConversion: 0,
    brokenPtp: 0,
    callDurationSeconds: 0,
    followUpCases: 0,
    resolvedCases: 0,
    resolutionAmount: 0,
    connectRate: 0,
    rpcRate: 0,
    resolutionRate: 0,
    attemptCoverage: 0,
    productivity: 0,
  };
}

export function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

export function finalizeDialerMetrics(m: DialerMetrics): DialerMetrics {
  m.connectRate = rate(m.connectedCalls, m.callsAttempted);
  m.rpcRate = rate(m.rpcCount, m.connectedCalls);
  m.ptpConversion = rate(m.ptpGenerated, m.rpcCount);
  m.resolutionRate = rate(m.resolvedCases, m.allocatedCases);
  m.attemptCoverage = rate(m.uniqueCasesCalled, m.allocatedCases);
  m.productivity = Math.max(
    0,
    Math.min(
      100,
      m.connectRate * 0.2 +
        m.rpcRate * 0.2 +
        m.ptpConversion * 0.2 +
        m.resolutionRate * 0.25 +
        m.attemptCoverage * 0.15
    )
  );
  return m;
}

export function buildDialerFunnel(params: {
  allocated: number;
  attempted: number;
  connected: number;
  rpc: number;
  ptp: number;
  resolved: number;
}): DialerFunnelStage[] {
  const stages = [
    { stage: "Allocated Cases", count: params.allocated },
    { stage: "Calls Attempted", count: params.attempted },
    { stage: "Connected", count: params.connected },
    { stage: "RPC", count: params.rpc },
    { stage: "PTP", count: params.ptp },
    { stage: "Payment / Resolution", count: params.resolved },
  ];
  return stages.map((s, i) => ({
    ...s,
    conversionFromStart: rate(s.count, params.allocated),
    conversionFromPrevious: i === 0 ? 100 : rate(s.count, stages[i - 1].count),
  }));
}

export interface DialerCaseMetricInput {
  allocatedAmount: number;
  callsAttempted: number;
  connectedCalls: number;
  rpcCount: number;
  ptpGenerated: number;
  ptpAmount: number;
  brokenPtp: number;
  callDurationSeconds: number;
  followUp: boolean;
  resolved: boolean;
  resolutionAmount: number;
}

export function metricsFromCases(rows: DialerCaseMetricInput[]): DialerMetrics {
  const m = emptyDialerMetrics();
  m.allocatedCases = rows.length;
  for (const row of rows) {
    m.allocatedAmount += row.allocatedAmount;
    m.callsAttempted += row.callsAttempted;
    m.connectedCalls += row.connectedCalls;
    m.rpcCount += row.rpcCount;
    m.ptpGenerated += row.ptpGenerated;
    m.ptpAmount += row.ptpAmount;
    m.brokenPtp += row.brokenPtp;
    m.callDurationSeconds += row.callDurationSeconds;
    if (row.callsAttempted > 0) m.uniqueCasesCalled += 1;
    if (row.followUp) m.followUpCases += 1;
    if (row.resolved) {
      m.resolvedCases += 1;
      m.resolutionAmount += row.resolutionAmount;
    }
  }
  m.notConnectedCalls = Math.max(0, m.callsAttempted - m.connectedCalls);
  return finalizeDialerMetrics(m);
}

export interface DialerAccountabilityGaps {
  unworkedCases: number;
  calledNotConnected: number;
  connectedNoRpc: number;
  rpcNoPtp: number;
  ptpNoResolution: number;
  resolvedWithoutCall: number;
}

/** Leakage between calling activity and actual case resolution. */
export function buildAccountabilityGaps(rows: DialerCaseMetricInput[]): DialerAccountabilityGaps {
  const gaps: DialerAccountabilityGaps = {
    unworkedCases: 0,
    calledNotConnected: 0,
    connectedNoRpc: 0,
    rpcNoPtp: 0,
    ptpNoResolution: 0,
    resolvedWithoutCall: 0,
  };
  for (const row of rows) {
    if (row.callsAttempted === 0) {
      gaps.unworkedCases += 1;
      if (row.resolved) gaps.resolvedWithoutCall += 1;
      continue;
    }
    if (row.connectedCalls === 0) {
      gaps.calledNotConnected += 1;
      continue;
    }
    if (row.rpcCount === 0) {
      gaps.connectedNoRpc += 1;
      continue;
    }
    if (row.ptpGenerated === 0) {
      gaps.rpcNoPtp += 1;
      continue;
    }
    if (!row.resolved) gaps.ptpNoResolution += 1;
  }
  return gaps;
}
