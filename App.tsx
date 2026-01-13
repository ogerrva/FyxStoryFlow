import React, { useState, useEffect } from 'react';
import { Story, StoryStatus, SystemLog, ViewState, Stats, Language, AppSettings, User } from './types';
import { LogTerminal } from './components/LogTerminal';
import { StoryCard } from './components/StoryCard';
import { HelpPage } from './components/HelpPage';
import { generateStoryCaption } from './services/geminiService';
import { translations } from './locales';

const API_URL = '/api'; 

export default function App() {
  const [lang, setLang] = useState<Language>('pt');
  
  // Initialize auth state immediately to prevent flicker
  const initialToken = localStorage.getItem('token');
  const [token, setToken] = useState<string | null>(initialToken);
  
  // Helper to parse token
  const parseUser = (t: string): User | null => {
      try {
          const payload = JSON.parse(atob(t.split('.')[1]));
          return { id: payload.id, username: payload.username, role: payload.role };
      } catch (e) { return null; }
  };

  const [user, setUser] = useState<User | null>(() => initialToken ? parseUser(initialToken) : null);
  const [view, setView] = useState<ViewState>(() => initialToken ? 'DASHBOARD' : 'LOGIN');

  // Auth Form State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Data State
  const [stories, setStories] = useState<Story[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [libraryStories, setLibraryStories] = useState<Story[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Create Story Form
  const [newStoryImg, setNewStoryImg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [waNumber, setWaNumber] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [stickerText, setStickerText] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [tempDate, setTempDate] = useState('');
  const [scheduleList, setScheduleList] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [stickerPos, setStickerPos] = useState({ x: 50, y: 80 }); 
  const [settings, setSettings] = useState<AppSettings>({});
  const [settingsStatus, setSettingsStatus] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Admin Create User State
  const [newUserMsg, setNewUserMsg] = useState('');

  const t = translations[lang];

  // Auth Effect: Handle updates to token
  useEffect(() => {
    if (token) {
        const u = parseUser(token);
        if (u) {
            setUser(u);
            if (view === 'LOGIN') setView('DASHBOARD');
            fetchData();
        } else {
            logout();
        }
    }
  }, [token]);

  // Main Data Fetcher
  const fetchData = async () => {
      if (!token) return;
      const headers = { 'Authorization': `Bearer ${token}` };
      
      try {
          const [storiesRes, logsRes] = await Promise.all([
              fetch(`${API_URL}/stories`, { headers }),
              fetch(`${API_URL}/logs`, { headers })
          ]);
          
          if (storiesRes.status === 403 || storiesRes.status === 401) { logout(); return; }

          const storiesData = await storiesRes.json();
          setStories(storiesData);
          setLogs(await logsRes.json());
      } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (token) {
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }
  }, [token]);

  const login = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const res = await fetch(`${API_URL}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: loginUser, password: loginPass })
          });
          const data = await res.json();
          if (res.ok) {
              localStorage.setItem('token', data.token);
              setToken(data.token);
              setLoginError('');
          } else {
              setLoginError(data.error);
          }
      } catch (e) { setLoginError('Connection failed'); }
  };

  const logout = () => {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setView('LOGIN');
  };

  useEffect(() => {
      if (!waNumber) { setGeneratedLink(''); return; }
      const cleanNum = waNumber.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(waMessage);
      setGeneratedLink(`https://wa.me/${cleanNum}?text=${encodedMsg}`);
  }, [waNumber, waMessage]);

  const handleFileUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewStoryImg(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  const handleGenerateCaption = async () => {
    if (!newStoryImg) return;
    setAiGenerating(true);
    const contextWithLang = `${stickerText} - Link: ${generatedLink} (Language: ${lang})`;
    const caption = await generateStoryCaption(newStoryImg, contextWithLang);
    setGeneratedCaption(caption);
    setAiGenerating(false);
  };

  const handleAddSchedule = () => {
      if (tempDate && !scheduleList.includes(tempDate)) {
          setScheduleList(prev => [...prev, tempDate].sort());
          setTempDate('');
      }
  };

  const removeSchedule = (dateToRemove: string) => {
      setScheduleList(prev => prev.filter(d => d !== dateToRemove));
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setStickerPos({ x, y });
  };

  const handleCreateStory = async () => {
    if (!selectedFile || scheduleList.length === 0 || !waNumber) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('ctaUrl', generatedLink);
    formData.append('whatsappNumber', waNumber);
    formData.append('whatsappMessage', waMessage);
    formData.append('stickerText', stickerText);
    formData.append('caption', generatedCaption);
    formData.append('schedules', JSON.stringify(scheduleList));
    formData.append('isRecurring', isRecurring.toString());
    formData.append('stickerX', stickerPos.x.toString());
    formData.append('stickerY', stickerPos.y.toString());

    await fetch(`${API_URL}/stories`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData 
    });
    await fetchData(); 
    setNewStoryImg(null); setSelectedFile(null); setScheduleList([]); setView('DASHBOARD'); setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if(window.confirm(t.confirmDelete)) { 
        await fetch(`${API_URL}/stories/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        fetchData();
    }
  };

  const handleRunNow = async (id: string) => {
      await fetch(`${API_URL}/stories/${id}/run`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      fetchData();
  };

  const handleShare = async (id: string, currentStatus: boolean) => {
      await fetch(`${API_URL}/stories/${id}/share`, { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ isShared: !currentStatus })
      });
      fetchData();
  };

  const fetchLibrary = async () => {
      const res = await fetch(`${API_URL}/library`, { headers: { 'Authorization': `Bearer ${token}` } });
      setLibraryStories(await res.json());
  };

  const handleClone = async (id: string) => {
      await fetch(`${API_URL}/library/clone/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      alert("Story copied to your Dashboard!");
  };

  const fetchUsers = async () => {
      const res = await fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
      setUsersList(await res.json());
  };

  const createUser = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const data = new FormData(form);
      const res = await fetch(`${API_URL}/admin/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(Object.fromEntries(data))
      });
      if (res.ok) { setNewUserMsg("User Created"); fetchUsers(); form.reset(); }
      else setNewUserMsg("Error creating user");
  };

  // --- VIEWS ---

  if (view === 'LOGIN') {
      return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl mx-auto mb-6 flex items-center justify-center text-2xl font-bold text-white shadow-lg">F</div>
                  <h2 className="text-2xl font-bold text-white text-center mb-2">FyxStoryFlow</h2>
                  <p className="text-slate-500 text-center mb-8 text-sm">Enterprise Automation System</p>
                  
                  <form onSubmit={login} className="space-y-4">
                      <div>
                          <label className="text-xs text-slate-400 font-bold uppercase">Username</label>
                          <input type="text" value={loginUser} onChange={e => setLoginUser(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-pink-500 outline-none" />
                      </div>
                      <div>
                          <label className="text-xs text-slate-400 font-bold uppercase">Password</label>
                          <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-pink-500 outline-none" />
                      </div>
                      {loginError && <div className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded">{loginError}</div>}
                      <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-lg transition-colors">Login</button>
                  </form>
              </div>
          </div>
      );
  }

  // --- APP LAYOUT ---

  const NavButton = ({ id, label, icon }: any) => (
    <button onClick={() => { setView(id); if(id === 'LIBRARY') fetchLibrary(); if(id === 'ADMIN') fetchUsers(); }} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${view === id ? 'bg-pink-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
        <span className="text-xl">{icon}</span>
        <span className="hidden md:block text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-200 flex font-sans">
       <aside className="w-20 md:w-64 bg-slate-900/50 border-r border-white/5 flex flex-col p-4">
          <div className="flex items-center gap-3 mb-8 px-2">
             <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg"></div>
             <span className="font-bold text-white hidden md:block">StoryFlow</span>
          </div>
          <nav className="space-y-2 flex-1">
             <NavButton id="DASHBOARD" label={t.dashboard} icon="📊" />
             <NavButton id="CREATE" label={t.newStory} icon="⚡" />
             <NavButton id="LIBRARY" label="Library" icon="📚" />
             <NavButton id="CALENDAR" label={t.calendar} icon="📅" />
             <NavButton id="LOGS" label={t.liveLogs} icon="🖥️" />
             {user?.role === 'admin' && <NavButton id="ADMIN" label="Admin Users" icon="👥" />}
             <NavButton id="SETTINGS" label={t.settings} icon="⚙️" />
          </nav>
          <div className="mt-auto border-t border-white/5 pt-4">
              <div className="px-2 mb-4 hidden md:block">
                  <div className="text-xs text-slate-500">Logged in as</div>
                  <div className="font-bold text-white truncate">{user?.username}</div>
              </div>
              <button onClick={logout} className="flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl w-full">
                  <span>🚪</span> <span className="hidden md:block">Logout</span>
              </button>
          </div>
       </aside>

       <main className="flex-1 h-screen overflow-y-auto p-4 md:p-8 relative">
          {view === 'DASHBOARD' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {stories.map(s => (
                     <div key={s.id} className="relative">
                         <StoryCard story={s} onDelete={handleDelete} onRunNow={handleRunNow} lang={lang} />
                         <button onClick={() => handleShare(s.id, s.isShared)} className={`absolute top-2 right-14 text-xs px-2 py-1 rounded border ${s.isShared ? 'bg-blue-500 text-white border-blue-400' : 'bg-slate-800 text-slate-400 border-slate-600'}`}>
                             {s.isShared ? 'Shared' : 'Private'}
                         </button>
                     </div>
                 ))}
                 {stories.length === 0 && <div className="text-slate-500 col-span-full text-center py-20">{t.queueEmpty}</div>}
              </div>
          )}

          {view === 'LIBRARY' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {libraryStories.map(s => (
                      <div key={s.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex gap-4">
                          <img src={s.imagePreview} className="w-20 h-32 object-cover rounded bg-black" />
                          <div className="flex-1">
                              <div className="text-xs text-blue-400 font-bold mb-1">@{s.ownerName}</div>
                              <div className="text-white text-sm font-medium mb-2">{s.caption || "No caption"}</div>
                              <button onClick={() => handleClone(s.id)} className="bg-white text-black px-3 py-1.5 rounded text-sm font-bold hover:bg-slate-200">
                                  Clone to my Dashboard
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {view === 'ADMIN' && user?.role === 'admin' && (
              <div className="max-w-4xl mx-auto">
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8">
                      <h3 className="text-xl font-bold text-white mb-4">Create User</h3>
                      <form onSubmit={createUser} className="flex gap-4 items-end">
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">Username</label>
                              <input name="username" required className="bg-black border border-slate-700 rounded p-2 text-white" />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">Password</label>
                              <input name="password" required className="bg-black border border-slate-700 rounded p-2 text-white" />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">Role</label>
                              <select name="role" className="bg-black border border-slate-700 rounded p-2 text-white">
                                  <option value="user">User</option>
                                  <option value="admin">Admin</option>
                              </select>
                          </div>
                          <button className="bg-green-600 text-white px-4 py-2 rounded font-bold">Create</button>
                      </form>
                      {newUserMsg && <p className="text-green-400 mt-2 text-sm">{newUserMsg}</p>}
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                          <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
                              <tr>
                                  <th className="p-4">Username</th>
                                  <th className="p-4">Role</th>
                                  <th className="p-4">Created</th>
                                  <th className="p-4">Action</th>
                              </tr>
                          </thead>
                          <tbody className="text-slate-300">
                              {usersList.map(u => (
                                  <tr key={u.id} className="border-t border-slate-800">
                                      <td className="p-4 font-bold text-white">{u.username}</td>
                                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700'}`}>{u.role}</span></td>
                                      <td className="p-4 text-xs text-slate-500">{u.id.substring(0,8)}...</td>
                                      <td className="p-4">
                                          {u.username !== 'admin' && (
                                              <button onClick={async () => {
                                                  if(confirm('Delete user?')) {
                                                      await fetch(`${API_URL}/admin/users/${u.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                                                      fetchUsers();
                                                  }
                                              }} className="text-red-400 hover:underline text-sm">Delete</button>
                                          )}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {view === 'CREATE' && (
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
                     <h3 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4">{t.newStory}</h3>
                     
                     {/* Image Drop Zone */}
                     <div 
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        className={`relative border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center transition-all mb-6 ${isDragging ? 'border-pink-500 bg-pink-500/10' : 'border-slate-700 hover:border-slate-500'}`}
                     >
                        {!newStoryImg ? (
                            <>
                                <input type="file" id="file" onChange={e => e.target.files && handleFileUpload(e.target.files[0])} className="hidden" />
                                <label htmlFor="file" className="cursor-pointer flex flex-col items-center">
                                    <span className="text-3xl mb-2">📷</span>
                                    <span className="text-sm text-slate-400">{t.clickToUpload}</span>
                                </label>
                            </>
                        ) : (
                            <>
                                <img src={newStoryImg} className="h-full object-contain" />
                                <button onClick={()=>setNewStoryImg(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-red-500">✕</button>
                            </>
                        )}
                     </div>

                     <div className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                             <input placeholder={t.phoneLabel} value={waNumber} onChange={e=>setWaNumber(e.target.value)} className="bg-black border border-slate-700 rounded p-3 text-white focus:border-pink-500 outline-none" />
                             <input placeholder={t.stickerTextLabel} value={stickerText} onChange={e=>setStickerText(e.target.value)} className="bg-black border border-slate-700 rounded p-3 text-white focus:border-pink-500 outline-none" />
                         </div>
                         <textarea placeholder={t.messageLabel} value={waMessage} onChange={e=>setWaMessage(e.target.value)} rows={2} className="w-full bg-black border border-slate-700 rounded p-3 text-white focus:border-pink-500 outline-none resize-none" />
                         
                         {/* Scheduling Mini-UI */}
                         <div className="bg-black/30 p-4 rounded-lg border border-slate-800">
                             <div className="flex gap-2 mb-2">
                                 <input type="datetime-local" value={tempDate} onChange={e=>setTempDate(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-white [color-scheme:dark]" />
                                 <button onClick={handleAddSchedule} className="bg-slate-700 px-4 rounded text-white hover:bg-slate-600">+</button>
                             </div>
                             <div className="flex flex-wrap gap-2">
                                 {scheduleList.map(d => (
                                     <span key={d} className="bg-pink-900/30 text-pink-300 text-xs px-2 py-1 rounded flex items-center gap-1">
                                         {new Date(d).toLocaleString()} 
                                         <button onClick={()=>removeSchedule(d)} className="hover:text-white">×</button>
                                     </span>
                                 ))}
                             </div>
                             <label className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                                 <input type="checkbox" checked={isRecurring} onChange={e=>setIsRecurring(e.target.checked)} className="rounded bg-slate-800 border-slate-700" />
                                 {t.recurrenceLabel}
                             </label>
                         </div>
                     </div>

                     <button onClick={handleCreateStory} disabled={loading || !newStoryImg} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 py-3 rounded-lg text-white font-bold mt-6 hover:opacity-90 disabled:opacity-50 transition-all">
                        {loading ? 'Processing...' : t.scheduleAutomation}
                     </button>
                  </div>

                  {/* Preview Panel */}
                  <div className="flex flex-col gap-4">
                      <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center relative min-h-[500px]" onClick={handleImageClick}>
                          <h4 className="absolute top-4 left-4 text-xs text-slate-500 uppercase font-bold">{t.stickerPosTitle}</h4>
                          <div className="relative w-[280px] h-[500px] bg-black rounded-2xl overflow-hidden border-4 border-slate-800 shadow-2xl cursor-crosshair">
                              {newStoryImg ? (
                                  <img src={newStoryImg} className="w-full h-full object-contain" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-700">Preview</div>
                              )}
                              {newStoryImg && (
                                  <div className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white text-black px-4 py-2 rounded-lg font-bold text-xs shadow-lg pointer-events-none" style={{ left: `${stickerPos.x}%`, top: `${stickerPos.y}%` }}>
                                      🔗 {stickerText || 'Link'}
                                  </div>
                              )}
                          </div>
                          <p className="text-xs text-slate-500 mt-4">{t.tapToPosition}</p>
                      </div>
                      
                      {/* AI Button */}
                      {newStoryImg && (
                          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                              <span className="text-sm text-slate-300 italic truncate max-w-[200px]">{generatedCaption || "AI Caption..."}</span>
                              <button onClick={handleGenerateCaption} disabled={aiGenerating} className="text-pink-400 text-xs font-bold flex items-center gap-1 hover:text-white transition-colors">
                                  ✨ {aiGenerating ? t.analyzing : t.generateCaption}
                              </button>
                          </div>
                      )}
                  </div>
               </div>
          )}
          
          {view === 'LOGS' && <LogTerminal logs={logs} lang={lang} />}
          
          {view === 'SETTINGS' && (
               <div className="max-w-2xl mx-auto bg-slate-900 p-8 rounded-xl border border-slate-800">
                  <h3 className="text-xl font-bold text-white mb-6">{t.settingsTitle}</h3>
                  <div className="space-y-4">
                      <div><label className="block text-slate-400 text-sm mb-1">{t.igUser}</label><input className="w-full bg-black border border-slate-700 p-2 rounded text-white" value={settings.instagram_username || ''} onChange={e => setSettings({...settings, instagram_username: e.target.value})} /></div>
                      <div><label className="block text-slate-400 text-sm mb-1">{t.igPass}</label><input type="password" className="w-full bg-black border border-slate-700 p-2 rounded text-white" value={settings.instagram_password || ''} onChange={e => setSettings({...settings, instagram_password: e.target.value})} /></div>
                      
                      <div className="flex items-center justify-between bg-black/30 p-3 rounded border border-slate-800">
                          <div>
                              <div className="text-sm text-white font-bold">{t.headless}</div>
                              <div className="text-xs text-slate-500">{t.headlessDesc}</div>
                          </div>
                          <button onClick={() => setSettings({...settings, headless_mode: settings.headless_mode === 'true' ? 'false' : 'true'})} className={`w-10 h-5 rounded-full relative transition-colors ${settings.headless_mode === 'true' ? 'bg-pink-600' : 'bg-slate-700'}`}>
                              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.headless_mode === 'true' ? 'left-6' : 'left-1'}`} />
                          </button>
                      </div>

                      <button onClick={async () => {
                           await fetch(`${API_URL}/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(settings) });
                           setSettingsStatus(t.saved); setTimeout(()=>setSettingsStatus(''), 2000);
                      }} className="bg-white text-black px-6 py-2 rounded font-bold hover:bg-slate-200 transition-colors">{t.saveSettings}</button>
                      {settingsStatus && <span className="text-green-400 ml-4">{settingsStatus}</span>}
                  </div>
               </div>
          )}

       </main>
    </div>
  );
}