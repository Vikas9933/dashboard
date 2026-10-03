"use client";

import { useState } from "react";
import {
  X,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  UserCheck,
  TrendingUp,
  Play,
  Pause,
  FileText,
  CheckCircle2,
} from "lucide-react";
import type { DialerCaseRecord } from "@/lib/services/dialer-service";
import { formatCurrency } from "@/lib/format";

interface CallDetailModalProps {
  caseRecord: DialerCaseRecord | null;
  onClose: () => void;
}

export function CallDetailModal({ caseRecord, onClose }: CallDetailModalProps) {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  if (!caseRecord) return null;

  function toggleAudio(callId: string) {
    if (playingAudioId === callId) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(callId);
    }
  }

  function formatSecs(sec: number): string {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s}s`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="dash-clay relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#0B1120] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 p-5 bg-gradient-to-r from-blue-900/20 via-transparent to-transparent">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00F2FE]/15 text-[#00F2FE]">
              <PhoneCall className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{caseRecord.customerName}</h3>
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-mono text-slate-300">
                  {caseRecord.loanNumber}
                </span>
                <span className="rounded-md bg-[#00F2FE]/10 border border-[#00F2FE]/30 px-2 py-0.5 text-xs font-semibold text-[#00F2FE]">
                  {caseRecord.clientBank} • {caseRecord.productType}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Contact: <strong className="text-white">{caseRecord.phoneNumber}</strong> | Outstanding:{" "}
                <strong className="text-white font-mono">{formatCurrency(caseRecord.outstandingAmount)}</strong> | Bucket:{" "}
                <strong className="text-white">{caseRecord.bucket}</strong> | Location: {caseRecord.city}, {caseRecord.state}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Accountability Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 border-b border-white/5 p-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Assigned Agent / TL</span>
            <span className="font-semibold text-white">{caseRecord.agentName}</span>
            <span className="text-slate-500 block text-[10px]">TL: {caseRecord.teamLeaderName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Dialer Attempts</span>
            <span className="font-bold text-white font-mono">
              {caseRecord.callsAttempted} attempts
            </span>
            <span className="text-slate-500 block text-[10px]">
              {caseRecord.callsConnected} connects ({caseRecord.rpcCount} RPC)
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">PTP Commitment</span>
            {caseRecord.ptpGenerated ? (
              <span className="font-bold text-amber-400 font-mono">
                {formatCurrency(caseRecord.ptpAmount)} ({caseRecord.ptpStatus})
              </span>
            ) : (
              <span className="text-slate-500">No PTP recorded</span>
            )}
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Resolution Status</span>
            {caseRecord.isResolved ? (
              <span className="font-bold text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Recovered {formatCurrency(caseRecord.resolutionAmount)}
              </span>
            ) : (
              <span className="text-amber-400 font-medium">Pending Resolution</span>
            )}
          </div>
        </div>

        {/* Chronological Calling Logs List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Chronological Call Audit Trail ({caseRecord.callLogs.length} attempts)
            </h4>
            <span className="text-[11px] text-slate-500">Telephony Session Logs</span>
          </div>

          {caseRecord.callLogs.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs">
              No calls have been logged yet on this account.
            </div>
          ) : (
            caseRecord.callLogs.map((call, idx) => (
              <div
                key={call.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-slate-300">
                      {caseRecord.callLogs.length - idx}
                    </span>
                    <span className="font-mono text-xs font-semibold text-white">
                      {call.callDate} at {call.callTime}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      [{call.callSessionId}]
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {call.isConnected ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                        <PhoneIncoming className="h-3 w-3" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                        <PhoneOff className="h-3 w-3" />
                        Not Connected
                      </span>
                    )}

                    {call.isRpc && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#00F2FE]/15 border border-[#00F2FE]/30 px-2 py-0.5 text-[10px] font-semibold text-[#00F2FE]">
                        <UserCheck className="h-3 w-3" />
                        RPC
                      </span>
                    )}

                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                      {call.disposition.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Call Metrics Grid */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Duration</span>
                    <span className="font-mono text-white font-medium">{formatSecs(call.durationSeconds)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Talk Time</span>
                    <span className="font-mono text-[#00F2FE] font-medium">{formatSecs(call.talkTimeSeconds)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Dialer Wait/Ring</span>
                    <span className="font-mono text-slate-400">{call.waitTimeSeconds}s</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Agent</span>
                    <span className="text-slate-300 font-medium">{call.agentName}</span>
                  </div>
                </div>

                {/* Call Notes & PTP Info */}
                <div className="mt-3 rounded-lg bg-black/30 p-2.5 text-xs border border-white/5">
                  <div className="flex items-start gap-2">
                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-slate-300 leading-relaxed">{call.notes}</p>
                  </div>

                  {call.ptpGenerated && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        PTP Registered: {formatCurrency(call.ptpAmount)}
                      </span>
                      <span className="text-slate-400">Date: {call.ptpDate || "N/A"}</span>
                    </div>
                  )}
                </div>

                {/* Simulated Audio Player if connected */}
                {call.isConnected && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 border border-white/5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleAudio(call.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00F2FE] text-[#0B1120] hover:scale-105 transition"
                      >
                        {playingAudioId === call.id ? (
                          <Pause className="h-3.5 w-3.5 fill-current" />
                        ) : (
                          <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-white">
                          {playingAudioId === call.id ? "Playing Call Recording..." : "Call Audio Recording"}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          {call.callSessionId}.mp3 (stereo dual-track)
                        </span>
                      </div>
                    </div>

                    {/* Waveform graphic */}
                    <div className="flex items-center gap-0.5 h-4">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-0.5 rounded-full ${
                            playingAudioId === call.id ? "bg-[#00F2FE] animate-pulse" : "bg-slate-600"
                          }`}
                          style={{ height: `${((i * 7 + call.durationSeconds) % 14) + 4}px` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 bg-black/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
          >
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
}
