import React from 'react';
import { Story, StoryStatus, Language } from '../types';
import { translations } from '../locales';

interface StoryCardProps {
  story: Story;
  onDelete: (id: string) => void;
  onRunNow: (id: string) => void;
  lang: Language;
}

export const StoryCard: React.FC<StoryCardProps> = ({ story, onDelete, onRunNow, lang }) => {
  const t = translations[lang];

  const getStatusBadge = (status: StoryStatus) => {
    const base = "px-2 py-1 rounded text-xs font-bold tracking-wider";
    const label = t.status[status];
    
    switch (status) {
      case StoryStatus.PUBLISHED: return <span className={`${base} bg-green-500/10 text-green-500 border border-green-500/20`}>{label}</span>;
      case StoryStatus.PENDING: return <span className={`${base} bg-blue-500/10 text-blue-500 border border-blue-500/20`}>{label}</span>;
      case StoryStatus.PUBLISHING: return <span className={`${base} bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse`}>{label}</span>;
      case StoryStatus.FAILED: return <span className={`${base} bg-red-500/10 text-red-500 border border-red-500/20`}>{label}</span>;
      default: return <span className={base}>{label}</span>;
    }
  };

  // Sort dates to find the next upcoming one
  const upcomingSchedules = story.schedules
    .filter(d => new Date(d) > new Date())
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  const nextRun = upcomingSchedules[0];
  const totalRemaining = upcomingSchedules.length;

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex flex-col sm:flex-row gap-4 hover:border-slate-600 transition-colors">
      {/* Image Preview */}
      <div className="w-full sm:w-24 h-40 sm:h-32 bg-slate-900 rounded overflow-hidden flex-shrink-0 relative group">
        <img src={story.imagePreview} alt="Story" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        {/* Visual indicator of sticker position */}
        <div 
            className="absolute w-2 h-2 bg-green-500 rounded-full border border-white shadow-sm"
            style={{ left: `${story.stickerPosition.x}%`, top: `${story.stickerPosition.y}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            {getStatusBadge(story.status)}
            <span className="text-slate-400 text-xs">
                {nextRun 
                    ? new Date(nextRun).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US') 
                    : 'Done'}
            </span>
          </div>
          <h4 className="text-white font-medium truncate mb-1" title={story.caption}>{story.caption || '...'}</h4>
          
          <div className="flex flex-col gap-1">
             <a href={story.ctaUrl} target="_blank" rel="noreferrer" className="text-cyan-400 text-sm hover:underline truncate block">
                🔗 {story.whatsappNumber ? `+${story.whatsappNumber}` : 'Link'}
             </a>
             {totalRemaining > 1 && (
                 <span className="text-xs text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded w-fit">
                    +{totalRemaining - 1} {lang === 'pt' ? 'agendamentos extras' : 'more schedules'}
                 </span>
             )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 sm:mt-0 justify-end">
           {story.status === StoryStatus.PENDING && (
              <button 
                onClick={() => onRunNow(story.id)}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded shadow-lg shadow-cyan-900/20 transition-all active:scale-95"
              >
                ► {t.forceRun}
              </button>
           )}
           <button 
             onClick={() => onDelete(story.id)}
             className="px-3 py-1.5 bg-slate-700 hover:bg-red-900/30 hover:text-red-400 text-slate-300 text-sm rounded transition-all"
           >
             {t.trash}
           </button>
        </div>
      </div>
    </div>
  );
};
