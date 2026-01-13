import React, { useState } from 'react';
import { translations, helpContent } from '../locales';
import { Language } from '../types';

interface HelpPageProps {
  lang: Language;
}

export const HelpPage: React.FC<HelpPageProps> = ({ lang }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const t = translations[lang];
  const articles = helpContent[lang];

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-800 p-8 rounded-lg border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-4">{t.helpTitle}</h2>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder={t.searchHelp}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 pl-11 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
          />
          <svg className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredArticles.length > 0 ? (
          filteredArticles.map(article => (
            <div key={article.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-bold text-cyan-400">{article.title}</h3>
                  <div className="flex gap-2">
                    {article.tags.map(tag => (
                      <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-slate-900/50 p-4 rounded border border-slate-700/50">
                  {article.content}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-slate-500">
            {t.noResults}
          </div>
        )}
      </div>
    </div>
  );
};
