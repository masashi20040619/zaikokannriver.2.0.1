
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Prize, PrizeCategory } from './types';
import PrizeCard from './components/PrizeCard';
import PrizeFormModal from './components/PrizeFormModal';
import PlusIcon from './components/icons/PlusIcon';
import SearchIcon from './components/icons/SearchIcon';
import PrizeList from './components/PrizeList';
import Squares2x2Icon from './components/icons/Squares2x2Icon';
import QueueListIcon from './components/icons/QueueListIcon';
import CheckCircleIcon from './components/icons/CheckCircleIcon';
import ArrowPathIcon from './components/icons/ArrowPathIcon';
import SaveIcon from './components/icons/SaveIcon';
import CogIcon from './components/icons/CogIcon';
import ArrowDownTrayIcon from './components/icons/ArrowDownTrayIcon';
import ArrowUpTrayIcon from './components/icons/ArrowUpTrayIcon';
import TrashIcon from './components/icons/TrashIcon';

const prizeCategories: PrizeCategory[] = ['マスコット', 'ぬいぐるみ', 'フィギュア', 'その他'];

type DisplayMode = 'card' | 'list';
type SortOrder = 'date-desc' | 'name-asc' | 'name-desc';

const App: React.FC = () => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prizeToEdit, setPrizeToEdit] = useState<Prize | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PrizeCategory | 'すべて'>('すべて');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('card');
  const [sortOrder, setSortOrder] = useState<SortOrder>('date-desc');
  
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showTools, setShowTools] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data on mount
  useEffect(() => {
    try {
      const storedPrizes = localStorage.getItem('crane-game-prizes');
      if (storedPrizes) {
        setPrizes(JSON.parse(storedPrizes));
      }
    } catch (error) {
      console.error("Failed to load prizes", error);
    }
  }, []);

  // Manual save to localStorage
  const handleSaveToStorage = useCallback(() => {
    setSaveStatus('saving');
    setTimeout(() => {
      try {
        localStorage.setItem('crane-game-prizes', JSON.stringify(prizes));
        setIsDirty(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error("Storage error:", error);
        alert("【エラー】保存容量がいっぱいです！\n\nブラウザの制限によりこれ以上保存できません。右上のツールメニューから「バックアップを保存」してPC等に退避させるか、不要な画像を削除してください。");
        setSaveStatus('idle');
      }
    }, 400);
  }, [prizes]);

  // Export data as JSON file
  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(prizes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `crane_game_inventory_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    setShowTools(false);
  }, [prizes]);

  // Import data from JSON file
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        if (Array.isArray(importedData)) {
          if (confirm('現在のリストを上書きしてインポートしますか？')) {
            setPrizes(importedData);
            setIsDirty(true);
            alert('インポート完了しました。「保存する」ボタンを押して確定させてください。');
          }
        } else {
          alert('不正なファイル形式です。');
        }
      } catch (error) {
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    setShowTools(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClearAll = useCallback(() => {
    if (confirm('すべての在庫データを削除しますか？この操作は取り消せません。')) {
      setPrizes([]);
      setIsDirty(true);
      setShowTools(false);
    }
  }, []);

  const handleSavePrize = useCallback((prize: Prize) => {
    setPrizes(prevPrizes => {
      const existingIndex = prevPrizes.findIndex(p => p.id === prize.id);
      let nextPrizes;
      if (existingIndex > -1) {
        nextPrizes = [...prevPrizes];
        nextPrizes[existingIndex] = prize;
      } else {
        nextPrizes = [...prevPrizes, prize];
      }
      setIsDirty(true);
      return nextPrizes;
    });
  }, []);

  const handleDeletePrize = useCallback((prizeId: string) => {
    if (confirm('この景品を削除してもよろしいですか？')) {
      setPrizes(prevPrizes => {
        const next = prevPrizes.filter(p => p.id !== prizeId);
        setIsDirty(true);
        return next;
      });
    }
  }, []);

  const handleQuantityChange = useCallback((prizeId: string, newQuantity: number) => {
    setPrizes(prevPrizes => {
      const next = prevPrizes.map(p =>
        p.id === prizeId ? { ...p, quantity: newQuantity } : p
      );
      setIsDirty(true);
      return next;
    });
  }, []);

  const stats = useMemo(() => {
    const totalTypes = prizes.length;
    const totalQuantity = prizes.reduce((sum, p) => sum + p.quantity, 0);
    const categoryCount = prizes.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.quantity;
      return acc;
    }, {} as Record<string, number>);
    return { totalTypes, totalQuantity, categoryCount };
  }, [prizes]);

  const filteredAndSortedPrizes = useMemo(() => {
    const filtered = prizes
      .filter(prize => {
        const nameMatch = prize.name.toLowerCase().includes(searchTerm.toLowerCase());
        const categoryMatch = selectedCategory === 'すべて' || prize.category === selectedCategory;
        return nameMatch && categoryMatch;
      });

      switch (sortOrder) {
        case 'name-asc':
          return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        case 'name-desc':
          return [...filtered].sort((a, b) => b.name.localeCompare(a.name, 'ja'));
        case 'date-desc':
        default:
          return [...filtered].sort((a, b) => new Date(b.acquisitionDate).getTime() - new Date(a.acquisitionDate).getTime());
      }
  }, [prizes, searchTerm, selectedCategory, sortOrder]);


  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans pb-24">
      {/* Hidden file input for import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImport} 
        accept=".json" 
        className="hidden" 
      />

      <header className="bg-white dark:bg-slate-800 shadow-lg sticky top-0 z-20 border-b border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center justify-between w-full md:w-auto gap-4">
              <h1 className="text-2xl font-black tracking-tighter text-indigo-600 dark:text-indigo-400">
                CRANE STOCK
              </h1>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveToStorage}
                  disabled={saveStatus === 'saving'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all transform active:scale-95 shadow-md ${
                    isDirty 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 opacity-80'
                  }`}
                >
                  {saveStatus === 'saving' ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : saveStatus === 'saved' ? (
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                  ) : (
                    <SaveIcon className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '保存完了' : '保存する'}</span>
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setShowTools(!showTools)}
                    className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    aria-label="ツールメニュー"
                  >
                    <CogIcon className="w-5 h-5" />
                  </button>
                  
                  {showTools && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden py-1 animate-in zoom-in-95 duration-200 origin-top-right">
                      <button onClick={handleExport} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <ArrowDownTrayIcon className="w-5 h-5 text-indigo-500" />
                        バックアップを保存 (JSON)
                      </button>
                      <button onClick={() => { fileInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <ArrowUpTrayIcon className="w-5 h-5 text-indigo-500" />
                        バックアップから復元
                      </button>
                      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                      <button onClick={handleClearAll} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <TrashIcon className="w-5 h-5" />
                        全データを消去
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:w-48">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="アイテム検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as PrizeCategory | 'すべて')}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-bold"
              >
                <option value="すべて">すべて</option>
                {prizeCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
                <button
                  onClick={() => setDisplayMode('card')}
                  className={`p-1.5 rounded-lg transition-all ${displayMode === 'card' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600' : 'text-slate-400'}`}
                >
                  <Squares2x2Icon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDisplayMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${displayMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600' : 'text-slate-400'}`}
                >
                  <QueueListIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Statistics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">総アイテム数</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.totalTypes} <span className="text-sm font-normal text-slate-500">種類</span></p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">総在庫数</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.totalQuantity} <span className="text-sm font-normal text-slate-500">個</span></p>
          </div>
          <div className="col-span-2 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-800/30">
            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2">カテゴリ別内訳</p>
            <div className="flex flex-wrap gap-2">
              {prizeCategories.map(cat => (
                <div key={cat} className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg text-xs font-bold border border-indigo-100 dark:border-indigo-800/50">
                  <span className="text-slate-500">{cat}:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{stats.categoryCount[cat] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {prizes.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="mx-auto w-20 h-20 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-6 text-slate-300">
              <PlusIcon className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-200">アイテムを登録しましょう</h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">右下の「+」ボタンから開始します</p>
          </div>
        ) : filteredAndSortedPrizes.length === 0 ? (
           <div className="text-center py-20">
            <p className="text-lg text-slate-400 font-bold">検索条件に一致する景品はありません</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {displayMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedPrizes.map(prize => (
                  <PrizeCard
                    key={prize.id}
                    prize={prize}
                    onEdit={(p) => { setPrizeToEdit(p); setIsModalOpen(true); }}
                    onDelete={handleDeletePrize}
                    onQuantityChange={handleQuantityChange}
                  />
                ))}
              </div>
            ) : (
              <PrizeList
                prizes={filteredAndSortedPrizes}
                onEdit={(p) => { setPrizeToEdit(p); setIsModalOpen(true); }}
                onDelete={handleDeletePrize}
                onQuantityChange={handleQuantityChange}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => { setPrizeToEdit(null); setIsModalOpen(true); }}
        className="fixed bottom-8 right-8 bg-indigo-600 text-white p-5 rounded-2xl shadow-2xl hover:bg-indigo-700 transition-all transform hover:scale-110 active:scale-95 z-30 ring-4 ring-white dark:ring-slate-900"
        aria-label="景品を追加"
      >
        <PlusIcon className="h-6 w-6 stroke-[3]" />
      </button>

      {/* Persistence Reminder */}
      {isDirty && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-full shadow-2xl z-40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-300">
          <span className="text-xs font-black uppercase tracking-widest">未保存のデータがあります</span>
          <button 
            onClick={handleSaveToStorage}
            className="bg-white text-orange-600 px-4 py-1 rounded-full text-xs font-black hover:bg-orange-50 transition-colors"
          >
            今すぐ保存
          </button>
        </div>
      )}

      <PrizeFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setPrizeToEdit(null); }}
        onSave={handleSavePrize}
        prizeToEdit={prizeToEdit}
      />
    </div>
  );
};

export default App;
