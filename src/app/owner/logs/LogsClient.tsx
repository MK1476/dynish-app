'use client';

import React, { useState } from 'react';
import type { LogEntry, LogLevel } from '@/lib/logger';
import { getRecentLogs, clearAllLogs, logAction } from '@/actions/logs';
import { 
  AlertCircle, AlertTriangle, Info, Bug, RefreshCw, 
  Copy, Trash2, Check, Search, Filter, Terminal, PlusCircle 
} from 'lucide-react';
import { copyTextToClipboard } from '@/lib/utils';

interface LogsClientProps {
  initialLogs: LogEntry[];
}

export const LogsClient: React.FC<LogsClientProps> = ({ initialLogs }) => {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [noteLevel, setNoteLevel] = useState<LogLevel>('INFO');
  const [addingNote, setAddingNote] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    const updated = await getRecentLogs();
    setLogs(updated);
    setRefreshing(false);
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      await clearAllLogs();
      setLogs([]);
    }
  };

  const handleCopyReport = async () => {
    const report = {
      generatedAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      totalLogs: logs.length,
      errorsCount: logs.filter(l => l.level === 'ERROR').length,
      warningsCount: logs.filter(l => l.level === 'WARN').length,
      recentLogs: logs.slice(0, 30),
    };

    const text = '```json\n' + JSON.stringify(report, null, 2) + '\n```';
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    }
  };

  const handleAddCustomNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNote.trim()) return;
    setAddingNote(true);
    const newLog = await logAction(noteLevel, 'manual_test', customNote.trim(), {
      browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'browser',
      screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown'
    });
    setLogs(prev => [newLog, ...prev]);
    setCustomNote('');
    setAddingNote(false);
  };

  const filteredLogs = logs.filter(l => {
    if (filterLevel !== 'all' && l.level !== filterLevel) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        l.message.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q) ||
        JSON.stringify(l.details || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const errorCount = logs.filter(l => l.level === 'ERROR').length;
  const warnCount = logs.filter(l => l.level === 'WARN').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-espresso-900 text-brand-400">
              <Terminal className="w-4 h-4" />
            </span>
            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950">
              System Logs & Diagnostics
            </h1>
          </div>
          <p className="text-espresso-500 text-xs sm:text-sm mt-0.5">
            Real-time recorder for server errors, billing operations, auth traces, and bug reporting.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-800 text-xs font-semibold border border-ivory-300 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleCopyReport}
            className="px-3 py-2 rounded-xl bg-espresso-900 hover:bg-espresso-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
          >
            {copiedReport ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-brand-400" />
            )}
            <span>{copiedReport ? 'Report Copied!' : 'Copy Error Dump'}</span>
          </button>

          {logs.length > 0 && (
            <button
              onClick={handleClear}
              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs transition-colors"
              title="Clear all logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Overview Metric Badges */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-ivory-200 shadow-soft">
          <span className="text-[11px] font-bold uppercase tracking-wider text-espresso-500 block">Total Logs</span>
          <span className="font-sans font-black text-2xl text-espresso-950">{logs.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-ivory-200 shadow-soft">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block">Errors</span>
          <span className="font-sans font-black text-2xl text-rose-600">{errorCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-ivory-200 shadow-soft">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">Warnings</span>
          <span className="font-sans font-black text-2xl text-amber-600">{warnCount}</span>
        </div>
      </div>

      {/* Quick Manual Log / Test Input */}
      <form onSubmit={handleAddCustomNote} className="bg-white rounded-2xl p-4 border border-ivory-200 shadow-soft space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-espresso-800 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <PlusCircle className="w-3.5 h-3.5 text-brand-600" />
            Record Manual Log / Tester Note
          </span>
          <select
            value={noteLevel}
            onChange={(e) => setNoteLevel(e.target.value as LogLevel)}
            className="text-xs bg-ivory-50 border border-ivory-300 rounded-lg px-2 py-1 text-espresso-800 font-bold"
          >
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="e.g. Tested customer billing on mobile Safari, works smoothly"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-ivory-50 border border-ivory-300 text-xs text-espresso-950 focus:outline-none focus:border-brand-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={addingNote || !customNote.trim()}
            className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-espresso-950 text-xs font-bold shrink-0 shadow-xs"
          >
            Log Entry
          </button>
        </div>
      </form>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-ivory-200 shadow-soft">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', 'ERROR', 'WARN', 'INFO'].map((level) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                filterLevel === level
                  ? level === 'ERROR'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : level === 'WARN'
                    ? 'bg-amber-500 text-espresso-950 shadow-xs'
                    : 'bg-espresso-900 text-white shadow-xs'
                  : 'bg-ivory-100 text-espresso-600 hover:bg-ivory-200 border border-ivory-200'
              }`}
            >
              {level === 'all' ? 'All Logs' : level}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-espresso-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-xl bg-ivory-50 border border-ivory-200 text-xs text-espresso-900 focus:outline-none focus:border-brand-500 w-full sm:w-48"
          />
        </div>
      </div>

      {/* Logs Stream Container */}
      <div className="bg-white rounded-3xl border border-ivory-200 shadow-card overflow-hidden divide-y divide-ivory-100">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-espresso-400 space-y-2">
            <Bug className="w-8 h-8 mx-auto text-espresso-300" />
            <p className="text-sm font-semibold text-espresso-600">No logs found</p>
            <p className="text-xs text-espresso-400">
              {searchQuery || filterLevel !== 'all' 
                ? 'Try adjusting your filter or search query.' 
                : 'Your application has not recorded any errors yet. All systems operational.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const timeFormatted = new Date(entry.timestamp).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const dateFormatted = new Date(entry.timestamp).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div key={entry.id} className="p-3.5 sm:p-4 hover:bg-ivory-50/60 transition-colors">
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="flex items-start justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="shrink-0 mt-0.5">
                      {entry.level === 'ERROR' && (
                        <span className="p-1 rounded-md bg-rose-100 text-rose-700 block">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {entry.level === 'WARN' && (
                        <span className="p-1 rounded-md bg-amber-100 text-amber-800 block">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {entry.level === 'INFO' && (
                        <span className="p-1 rounded-md bg-emerald-100 text-emerald-800 block">
                          <Info className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {entry.level === 'DEBUG' && (
                        <span className="p-1 rounded-md bg-slate-100 text-slate-700 block">
                          <Terminal className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-sans font-bold uppercase bg-ivory-200 text-espresso-700">
                          {entry.source}
                        </span>
                        <span className="text-xs text-espresso-400 font-sans">
                          {dateFormatted} {timeFormatted}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-espresso-950 mt-1 break-words">
                        {entry.message}
                      </p>
                    </div>
                  </div>

                  {entry.details && (
                    <span className="text-[10px] font-bold text-brand-700 underline shrink-0">
                      {isExpanded ? 'Hide Details' : 'Details'}
                    </span>
                  )}
                </div>

                {/* Expanded Details JSON viewer */}
                {isExpanded && entry.details && (
                  <div className="mt-3 p-3 rounded-xl bg-espresso-950 text-brand-300 font-mono text-[11px] overflow-x-auto shadow-inner border border-espresso-800">
                    <pre>{JSON.stringify(entry.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
