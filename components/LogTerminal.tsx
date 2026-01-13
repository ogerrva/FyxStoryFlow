import React, { useEffect, useRef } from 'react';
import { SystemLog, Language } from '../types';
import { translations } from '../locales';

interface LogTerminalProps {
  logs: SystemLog[];
  lang: Language;
}

export const LogTerminal: React.FC<LogTerminalProps> = ({ logs, lang }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getColor = (level: string) => {
    switch (level) {
      case 'INFO': return 'text-blue-400';
      case 'WARN': return 'text-yellow-400';
      case 'ERROR': return 'text-red-500';
      case 'SUCCESS': return 'text-green-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="bg-slate-950 rounded-lg shadow-xl border border-slate-800 flex flex-col h-[500px] font-mono text-sm overflow-hidden">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
        <span className="text-slate-400 text-xs uppercase tracking-widest">{t.systemOutputStream} // storyflow-worker-1</span>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500"></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3">
            <span className="text-slate-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString(lang === 'pt' ? 'pt-BR' : 'en-US')}]</span>
            <span className={`font-bold shrink-0 w-16 ${getColor(log.level)}`}>{log.level}</span>
            <span className="text-slate-300 break-all">{log.module}: {log.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};
