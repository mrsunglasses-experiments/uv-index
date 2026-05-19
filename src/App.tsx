import React, { useState } from 'react';
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
import { Search, Sun, Loader2, AlertCircle, Calendar, ShieldCheck } from 'lucide-react';
import { getCityCoordinates, getMonthlyUVData } from './services/api';
import type { MonthlyUV } from './services/api';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Select } from './components/ui/select-native';

interface CityInfo {
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
          <span className="text-slate-600 font-bold text-[11px] uppercase">UV Index</span>
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

function App() {
  const [city, setCity] = useState('');
  const [year, setYear] = useState('2025');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonthlyUV[]>([]);
  const [cityInfo, setCityInfo] = useState<CityInfo | null>(null);

  const years = Array.from({ length: 10 }, (_, i) => (2025 - i).toString());

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
      const uvData = await getMonthlyUVData(currentCityInfo.lat, currentCityInfo.lon, parseInt(searchYear));
      setData(uvData);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;
    fetchData(city, year);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = e.target.value;
    setYear(newYear);
    if (cityInfo) fetchData(cityInfo.name, newYear);
  };

  const getBarColor = (uv: number) => {
    if (uv < 3) return '#059669'; // Darker Emerald
    if (uv < 6) return '#d97706'; // Darker Amber/Yellow
    if (uv < 8) return '#ea580c'; // Darker Orange
    if (uv < 11) return '#dc2626'; // Darker Red
    return '#7c3aed'; // Darker Purple
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans p-2 sm:p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {/* Header - High Contrast */}
        <header className="flex items-center justify-between px-2 pt-2">
          <div className="flex items-center gap-2">
            <Sun className="text-orange-600" size={28} />
            <h1 className="text-2xl font-black tracking-tight text-slate-900">UV Index</h1>
          </div>
          <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.2em] hidden md:block">
            Scientific Archive • NASA
          </p>
        </header>

        {/* Responsive Search Section */}
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
                  onChange={(e) => setCity(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="flex divide-x divide-slate-100 bg-slate-50/50">
                <div className="relative flex-1 sm:flex-none">
                  <Select 
                    value={year} 
                    onChange={handleYearChange}
                    className="h-12 w-full sm:w-28 bg-transparent border-none appearance-none pl-10 pr-4 font-black text-sm text-slate-800 cursor-pointer focus:ring-0"
                    disabled={loading}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </Select>
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !city.trim()}
                  className="h-12 px-6 sm:px-8 rounded-none bg-orange-600 hover:bg-orange-700 text-white transition-colors shrink-0 active:scale-95"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <span className="text-sm font-black uppercase tracking-wider">Search</span>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-100 text-red-900 rounded-xl border-l-4 border-red-600 animate-in fade-in slide-in-from-left-2">
            <AlertCircle size={20} className="shrink-0" />
            <p className="font-bold text-sm">{error}</p>
          </div>
        )}

        {/* Main Graph Card */}
        <Card className="border-none shadow-lg bg-white rounded-2xl overflow-hidden min-h-[450px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-orange-600" size={48} />
              <p className="text-slate-900 font-black text-xs uppercase tracking-[0.3em]">Loading NASA Data...</p>
            </div>
          ) : data.length > 0 ? (
            <div className="p-4 sm:p-8 space-y-8 flex-1 flex flex-col">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none italic">{cityInfo?.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">{cityInfo?.country}</span>
                    <span className="text-slate-700 text-[10px] font-bold uppercase tracking-widest">{year} Solar intensity</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 w-full sm:w-auto">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Sun className="text-orange-600" size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Peak Index</p>
                    <p className="text-xl font-black text-slate-900">{Math.max(...data.map(d => d.uvIndex))}</p>
                  </div>
                </div>
              </div>

              <div className="w-full h-[350px] sm:h-[400px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={{ stroke: '#94a3b8', strokeWidth: 2 }} 
                      tickLine={false} 
                      tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 900 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={{ stroke: '#94a3b8', strokeWidth: 2 }} 
                      tickLine={false} 
                      tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 700 }} 
                    />
                    <Tooltip 
                      content={<CustomTooltip />} 
                      cursor={{ fill: '#f1f5f9', radius: 4 }} 
                    />
                    <Bar dataKey="uvIndex" radius={[4, 4, 0, 0]} barSize={35}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.uvIndex)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-6 border-t border-slate-100">
                {[
                  { label: 'Low', color: 'bg-emerald-600' },
                  { label: 'Mod', color: 'bg-yellow-600' },
                  { label: 'High', color: 'bg-orange-600' },
                  { label: 'V.High', color: 'bg-red-600' },
                  { label: 'Ext', color: 'bg-purple-600' },
                ].map((level) => (
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

        {/* High Contrast Footer */}
        <footer className="text-center py-6 space-y-2">
          <p className="text-slate-900 text-[10px] font-black uppercase tracking-[0.3em]">Scientific Integrity: NASA POWER</p>
          <div className="space-y-1">
            <p className="text-slate-700 text-[9px] font-black uppercase tracking-widest italic">2026 data unavailable • Verified to Dec 2025</p>
            <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">Global Historical Monthly Solar Statistics</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
