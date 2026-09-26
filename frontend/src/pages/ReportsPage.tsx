import React, { useState, useEffect } from 'react';
import { api, API_BASE } from '../services/api';
import { FileText, Download, Printer, Shield, CheckCircle, RefreshCw } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([
        api.getDailyReport(),
        api.getAuditLogs()
      ]);
      setReport(r);
      setAuditLogs(a);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    window.open(`${API_BASE}/api/analytics/export/csv`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-mono font-bold text-white tracking-wide">
            SECURITY INTELLIGENCE REPORTS & AUDIT TRAIL
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Exportable forensic logs, incident frequency audits, and compliance documentation
          </p>
        </div>

        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={handleDownloadCSV}
            className="py-2 px-3.5 rounded-lg bg-slate-900 border border-soc-border hover:border-cyan-500/50 text-cyan-400 flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT CSV ARCHIVE</span>
          </button>
          <button
            onClick={handlePrint}
            className="py-2 px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center space-x-2 shadow-glow-cyan transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>PRINT OFFICIAL REPORT</span>
          </button>
        </div>
      </div>

      {/* Daily Summary Card */}
      {report && (
        <div className="glass-panel p-6 rounded-xl border border-soc-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-soc-border">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-mono font-bold text-white">
                DAILY SECURITY OPERATIONS SUMMARY — {report.report_date}
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              AUDIT COMPLIANT
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-3.5 rounded-lg bg-slate-900 border border-soc-border space-y-1">
              <div className="text-slate-500 text-[10px]">TOTAL THREAT INCIDENTS</div>
              <div className="text-xl font-bold text-white">{report.total_incidents}</div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-soc-border space-y-1">
              <div className="text-slate-500 text-[10px]">CRITICAL SEVERITY EVENTS</div>
              <div className="text-xl font-bold text-red-400">{report.critical_incidents}</div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-soc-border space-y-1">
              <div className="text-slate-500 text-[10px]">EMERGENCY DISPATCHES</div>
              <div className="text-xl font-bold text-purple-400">{report.forwarded_to_emergency}</div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-soc-border space-y-1">
              <div className="text-slate-500 text-[10px]">SYSTEM UPTIME & ACCURACY</div>
              <div className="text-xl font-bold text-emerald-400">{report.system_uptime}</div>
            </div>
          </div>
        </div>
      )}

      {/* Operator Audit Logs */}
      <div className="glass-panel p-6 rounded-xl border border-soc-border space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-soc-border">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-mono font-bold text-white">OPERATOR AUDIT TRAIL</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">Chronological immutable activity log</span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs font-mono text-slate-500 text-center py-6">No audit activities recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Operator</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 text-slate-500">{log.timestamp}</td>
                    <td className="py-2.5 px-3 font-bold text-cyan-400">{log.username}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{log.details}</td>
                    <td className="py-2.5 px-3 text-slate-500">{log.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
