import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Search, Sun, Loader2, AlertCircle, Calendar, ShieldCheck, MapPin, Info, Zap, TrendingUp, BarChart2, History, X } from 'lucide-react';
import { getCityCoordinates, getMonthlyUVData, getCitySuggestions, getCityFromCoords, getCurrentUV } from './services/api';
import type { MonthlyUV } from './services/api';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Select } from './components/ui/select-native';
import { cn } from './lib/utils';

interface CityInfo {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

interface LiveUV {
  current: number;
  todayMax: number;
}

interface RecentCity {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const uv = payload[0].value;
    let advice = "";
    let colorClass = "";
    
    if (uv < 3) { advice = "Safe to be outside."; colorClass = "text-emerald-700"; }
    else if (uv < 6) { advice = "Sunscreen recommended."; colorClass = "text-yellow-700"; }
    else if (uv < 8) { advice = "Seek shade midday."; colorClass = "text-orange-700"; }
    else if (uv < 11) { advice = "High risk. Avoid midday sun."; colorClass = "text-red-700"; }
    else { advice = "Extreme risk. Stay indoors."; colorClass = "text-purple-700"; }

    return (
      <div className="bg-white p-3 rounded-lg shadow-2xl border border-slate-200 ring-1 ring-black/10">
        <p className="text-slate-900 font-bold uppercase text-[10px] mb-1">{label}</p>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={`text-2xl font-black ${colorClass}`}>{uv}</span>
          <span className="text-slate-400 font-bold text-[11px] uppercase">UV Index</span>
        </div>
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
          <ShieldCheck size={14} className={colorClass} />
          <p className="text-[11px] font-bold text-slate-700">{advice}</p>
        </div>
      </div>
    );
  }
  return null;
};

const SafetyGuide = () => (
  <div className="space-y-4">
    <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Info className="text-slate-900" size={20} />
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">UV Safety Guide</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { range: "0 - 2 (Low)", advice: "No protection required. You can safely stay outside.", color: "bg-emerald-600" },
            { range: "3 - 5 (Moderate)", advice: "Seek shade during midday. Wear a hat and sunscreen.", color: "bg-yellow-600" },
            { range: "6 - 7 (High)", advice: "Protection required. Reduce time in the sun between 10am and 4pm.", color: "bg-orange-600" },
            { range: "8 - 10 (Very High)", advice: "Extra protection needed. Avoid sun during midday hours. Wear protective clothing.", color: "bg-red-600" },
            { range: "11+ (Extreme)", advice: "Take all precautions. Unprotected skin can burn in minutes. Stay indoors.", color: "bg-purple-600" },
          ].map((item) => (
            <div key={item.range} className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className={`w-3 h-3 rounded-full ${item.color} shrink-0 mt-1`} />
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-900 leading-none">{item.range}</p>
                <p className="text-[11px] font-bold text-slate-600 leading-relaxed">{item.advice}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden border border-slate-100">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Understanding Data</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-1.5">
            <p className="text-xs font-black text-slate-900 uppercase">Average Peak</p>
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
              Estimates intensity during the strongest hour (Noon). Matches standard weather forecasts.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-black text-slate-900 uppercase">Monthly Average</p>
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
              The 24-hour mean including nights/clouds. Primarily used for climate trend analysis.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

function App() {
  const [city, setCity] = useState('');
  const [year, setYear] = useState('2025');
  const [viewType, setViewType] = useState<'avg' | 'peak'>('peak');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonthlyUV[]>([]);
  const [cityInfo, setCityInfo] = useState<CityInfo | null>(null);
  const [liveUV, setLiveUV] = useState<LiveUV | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentCities, setRecentCities] = useState<RecentCity[]>([]);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const years = Array.from({ length: 10 }, (_, i) => (2025 - i).toString());

  useEffect(() => {
    const saved = localStorage.getItem('recent_cities');
    if (saved) {
      try {
        setRecentCities(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recent cities");
      }
    }
  }, []);

  const saveRecentCity = (newCity: RecentCity) => {
    const updated = [newCity, ...recentCities.filter(c => c.name !== newCity.name)].slice(0, 5);
    setRecentCities(updated);
    localStorage.setItem('recent_cities', JSON.stringify(updated));
  };

  const removeRecentCity = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentCities.filter(c => c.name !== name);
    setRecentCities(updated);
    localStorage.setItem('recent_cities', JSON.stringify(updated));
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (city.length >= 2 && !cityInfo) {
        const results = await getCitySuggestions(city);
        setSuggestions(results);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [city, cityInfo]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDataByCoords = async (lat: number, lon: number, name: string, country: string, searchYear: string) => {
    setLoading(true);
    setError(null);
    try {
      const currentCityInfo = { name, country, lat, lon };
      setCityInfo(currentCityInfo);
      setCity(name);
      
      const [uvData, liveData] = await Promise.all([
        getMonthlyUVData(lat, lon, parseInt(searchYear)),
        getCurrentUV(lat, lon)
      ]);
      
      setData(uvData);
      setLiveUV({ current: liveData.currentUV, todayMax: liveData.todayMax });
      saveRecentCity({ name, country, lat, lon });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setData([]);
      setLiveUV(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (searchCity: string, searchYear: string) => {
    setLoading(true);
    setError(null);
    try {
      let currentCityInfo = cityInfo;
      if (!currentCityInfo || searchCity.toLowerCase() !== currentCityInfo.name.toLowerCase()) {
        const coords = await getCityCoordinates(searchCity);
        currentCityInfo = { name: coords.name, country: coords.country, lat: coords.latitude, lon: coords.longitude };
        setCityInfo(currentCityInfo);
      }
      
      const [uvData, liveData] = await Promise.all([
        getMonthlyUVData(currentCityInfo.lat, currentCityInfo.lon, parseInt(searchYear)),
        getCurrentUV(currentCityInfo.lat, currentCityInfo.lon)
      ]);
      
      setData(uvData);
      setLiveUV({ current: liveData.currentUV, todayMax: liveData.todayMax });
      saveRecentCity({ name: currentCityInfo.name, country: currentCityInfo.country, lat: currentCityInfo.lat, lon: currentCityInfo.lon });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setData([]);
      setLiveUV(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;
    fetchData(city, year);
    setShowSuggestions(false);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = e.target.value;
    setYear(newYear);
    if (cityInfo) fetchData(cityInfo.name, newYear);
  };

  const handleSuggestionClick = (suggestion: any) => {
    setCity(suggestion.name);
    fetchDataByCoords(suggestion.latitude, suggestion.longitude, suggestion.name, suggestion.country, year);
    setShowSuggestions(false);
  };

  const handleLocationDetection = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const info = await getCityFromCoords(latitude, longitude);
          fetchDataByCoords(latitude, longitude, info.name, info.country, year);
        } catch (err) {
          setError("Could not detect your city name, but showing data.");
          const { latitude, longitude } = position.coords;
          fetchDataByCoords(latitude, longitude, "My Location", "", year);
        }
      },
      () => {
        setError("Location access denied.");
        setLoading(false);
      }
    );
  };

  const getBarColor = (uv: number) => {
    if (uv < 3) return '#059669';
    if (uv < 6) return '#d97706';
    if (uv < 8) return '#ea580c';
    if (uv < 11) return '#dc2626';
    return '#7c3aed';
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans p-2 sm:p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        <header className="flex items-center justify-between px-2 pt-2">
          <div className="flex items-center gap-2">
            <Sun className="text-orange-600" size={28} />
            <h1 className="text-2xl font-black tracking-tight text-slate-900">UV Index</h1>
          </div>
          <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.2em] hidden md:block">
            Scientific Archive • NASA
          </p>
        </header>

        <div className="relative" ref={suggestionRef}>
          <Card className="border-none shadow-md bg-white overflow-hidden rounded-xl border-b-2 border-slate-200">
            <CardContent className="p-0">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                <div className="flex-1 flex items-center px-4 py-3 sm:py-0 gap-3">
                  <Search className="text-slate-500" size={20} />
                  <input
                    type="text"
                    placeholder="Search city (e.g. Tokyo)..."
                    className="w-full h-8 sm:h-12 bg-transparent outline-none text-base font-bold text-slate-900 placeholder:text-slate-400"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      if (cityInfo) setCityInfo(null);
                    }}
                    disabled={loading}
                    onFocus={() => city.length >= 2 ? setShowSuggestions(true) : setShowSuggestions(false)}
                  />
                  <button type="button" onClick={handleLocationDetection} className="p-2 text-slate-400 hover:text-orange-600 transition-colors" title="Use my location">
                    <MapPin size={20} />
                  </button>
                </div>
                <div className="flex divide-x divide-slate-100 bg-slate-50/50">
                  <div className="relative flex-1 sm:flex-none">
                    <Select value={year} onChange={handleYearChange} className="h-12 w-full sm:w-28 bg-transparent border-none appearance-none pl-10 pr-4 font-black text-sm text-slate-800 cursor-pointer focus:ring-0" disabled={loading}>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
                  </div>
                  <Button type="submit" disabled={loading || !city.trim()} className="h-12 px-6 sm:px-8 rounded-none bg-orange-600 hover:bg-orange-700 text-white transition-colors shrink-0 active:scale-95">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <span className="text-sm font-black uppercase tracking-wider">Search</span>}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {showSuggestions && (
            <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
              {suggestions.length > 0 ? (
                suggestions.map((s, i) => (
                  <button key={`${s.name}-${i}`} onClick={() => handleSuggestionClick(s)} className="w-full px-5 py-3 text-left hover:bg-slate-50 flex items-center justify-between transition-colors group">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{s.name}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.country}</span>
                    </div>
                    <Sun size={14} className="text-slate-200 group-hover:text-orange-400 transition-colors" />
                  </button>
                ))
              ) : city.length < 2 && recentCities.length > 0 && (
                <div className="p-2">
                  <p className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <History size={12} /> Recent Searches
                  </p>
                  {recentCities.map((c, i) => (
                    <div key={`${c.name}-${i}`} className="flex items-center group">
                      <button onClick={() => fetchDataByCoords(c.lat, c.lon, c.name, c.country, year)} className="flex-1 px-3 py-2.5 text-left hover:bg-slate-50 rounded-lg flex items-center justify-between transition-colors">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{c.name}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{c.country}</span>
                        </div>
                      </button>
                      <button onClick={(e) => removeRecentCity(c.name, e)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-100 text-red-900 rounded-xl border-l-4 border-red-600 animate-in fade-in slide-in-from-left-2">
            <AlertCircle size={20} className="shrink-0" />
            <p className="font-bold text-sm">{error}</p>
          </div>
        )}

        <Card className="border-none shadow-lg bg-white rounded-2xl overflow-hidden min-h-[450px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-orange-600" size={48} />
              <p className="text-slate-900 font-black text-xs uppercase tracking-[0.3em]">Processing...</p>
            </div>
          ) : data.length > 0 ? (
            <div className="p-4 sm:p-8 space-y-8 flex-1 flex flex-col">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none italic">{cityInfo?.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">{cityInfo?.country}</span>
                    <span className="text-slate-700 text-[10px] font-bold uppercase tracking-widest">{year} Analysis</span>
                  </div>
                </div>
                {liveUV && (
                  <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <div className="flex-1 sm:flex-none flex items-center gap-3 bg-orange-600 text-white p-3 rounded-xl shadow-lg shadow-orange-100 min-w-[140px]">
                      <div className="bg-white/20 p-2 rounded-lg"><Zap size={20} className="fill-white" /></div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest leading-none opacity-80">Live UV Now</p>
                        <p className="text-xl font-black">{liveUV.current.toFixed(1)}</p>
                      </div>
                    </div>
                    <div className="flex-1 sm:flex-none flex items-center gap-3 bg-slate-900 text-white p-3 rounded-xl shadow-lg shadow-slate-100 min-w-[140px]">
                      <div className="bg-white/10 p-2 rounded-lg text-orange-400"><Sun size={20} /></div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest leading-none opacity-60">Today's Peak</p>
                        <p className="text-xl font-black">{liveUV.todayMax.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-fit">
                <button onClick={() => setViewType('peak')} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", viewType === 'peak' ? "bg-white text-orange-600 shadow-sm ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600")}><TrendingUp size={14} />Average Peak</button>
                <button onClick={() => setViewType('avg')} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", viewType === 'avg' ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600")}><BarChart2 size={14} />Monthly Average</button>
              </div>

              <div className="w-full h-[350px] sm:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={{ stroke: '#94a3b8', strokeWidth: 2 }} tickLine={false} tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 900 }} dy={10} />
                    <YAxis axisLine={{ stroke: '#94a3b8', strokeWidth: 2 }} tickLine={false} tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 700 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', radius: 4 }} />
                    <Bar dataKey={viewType === 'peak' ? 'peakUV' : 'uvIndex'} radius={[4, 4, 0, 0]} barSize={35}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(viewType === 'peak' ? entry.peakUV : entry.uvIndex)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-6 border-t border-slate-100">
                {[{ label: 'Low', color: 'bg-emerald-600' }, { label: 'Mod', color: 'bg-yellow-600' }, { label: 'High', color: 'bg-orange-600' }, { label: 'V.High', color: 'bg-red-600' }, { label: 'Ext', color: 'bg-purple-600' }].map((level) => (
                  <div key={level.label} className="flex items-center gap-2 px-2 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <div className={`w-2.5 h-2.5 rounded-full ${level.color} shrink-0`} />
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{level.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center border-2 border-dashed border-slate-200 animate-pulse">
                <Search size={32} className="text-slate-300" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Ready for Discovery</p>
                <p className="text-xs text-slate-600 max-w-[240px] font-bold leading-relaxed uppercase tracking-wider">
                  Enter a city name above to load high-contrast solar radiation data.
                </p>
              </div>
            </div>
          )}
        </Card>

        <SafetyGuide />

        <footer className="text-center py-6 space-y-4">
          <p className="text-slate-900 text-[10px] font-black uppercase tracking-[0.3em]">Scientific Integrity: NASA POWER</p>
          <div className="space-y-1">
            <p className="text-slate-700 text-[9px] font-black uppercase tracking-widest italic">2026 data unavailable • Verified to Dec 2025</p>
            <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
              Disclaimer: Data provides scientific estimates for educational use. Always follow local health authority sun safety guidelines.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
