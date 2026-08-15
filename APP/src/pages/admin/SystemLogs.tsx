import React, { useState } from 'react';
import { DEMO_LOGS } from '../../data/mockData';
import { SystemLog, LogLevel } from '../../types';

function levelColor(level: LogLevel) {
  const map: Record<LogLevel, string> = {
    success: 'bg-green-400', info: 'bg-blue-400',
    warning: 'bg-amber-400', error: 'bg-red-400'
  };
  return map[level];
}

function levelBadge(level: LogLevel) {
  const map: Record<LogLevel, string> = {
    success: 'badge-success', info: 'badge-info',
    warning: 'badge-warning', error: 'badge-error'
  };
  return map[level];
}

export default function SystemLogs() {
  const [filter, setFilter] = useState<'all' | LogLevel>('all');
  const filtered = filter === 'all' ? DEMO_LOGS : DEMO_LOGS.filter(l => l.level === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">System Logs</h1>
        <p className="page-subtitle">System events, errors, and activity records</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'success', 'info', 'warning', 'error'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filter === f ? 'bg-primary-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-gray-50">
        {filtered.map(log => (
          <div key={log.id} className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50/50">
            <span className={`status-dot mt-1.5 flex-shrink-0 ${levelColor(log.level)}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm font-medium text-gray-900">{log.message}</div>
                <span className={`badge text-xs flex-shrink-0 ${levelBadge(log.level)}`}>{log.level.toUpperCase()}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                <span className="font-semibold text-gray-500">{log.source}</span>
                {' • '}
                {new Date(log.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
