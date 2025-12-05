import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Eye, Search, Calendar, Clock, MapPin, Plane, Filter, X, SortAsc, SortDesc } from 'lucide-react';

interface FlightLog {
  id: string;
  date: string;
  duration: number;
  location: string;
  droneModel: string;
  weather: string;
  purpose: string;
  notes: string;
  pilot: string;
  clientName?: string; // 案件名・クライアント名
  isTokuteiFlight?: boolean;
  takeoffTime?: string; // 離陸時刻 HH:mm
  landingTime?: string; // 着陸時刻 HH:mm
  outline?: string; // 飛行概要
  tokuteiFlightCategories?: string[]; // 特定飛行カテゴリ
  flightPlanNotified?: boolean; // 飛行計画の通報
}

interface FlightHistoryProps {
  flights: FlightLog[];
  onViewFlight: (flight: FlightLog) => void;
}

export function FlightHistory({ flights, onViewFlight }: FlightHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pilotFilter, setPilotFilter] = useState<string>('all');
  const [droneFilter, setDroneFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [purposeFilter, setPurposeFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'location' | 'pilot'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique values for filter options
  const uniquePilots = useMemo(() => [...new Set(flights.map(f => f.pilot))].sort(), [flights]);
  const uniqueDrones = useMemo(() => [...new Set(flights.map(f => f.droneModel))].sort(), [flights]);
  const uniqueAreas = useMemo(() => [...new Set(flights.map(f => {
    // Extract area from location (assuming format like "prefecture + city + location")
    const parts = f.location.split(/[都道府県市区町村]/);
    return parts[0] + (parts[1] ? parts[1].charAt(0) : '');
  }))].sort(), [flights]);
  const uniquePurposes = useMemo(() => [...new Set(flights.map(f => f.purpose))].sort(), [flights]);
  const uniqueClients = useMemo(() => [...new Set(flights.filter(f => f.clientName).map(f => f.clientName!))].sort(), [flights]);

  const activeFiltersCount = [pilotFilter, droneFilter, areaFilter, purposeFilter, clientFilter].filter(f => f !== 'all').length;

  const filteredFlights = useMemo(() => {
    return flights
      .filter(flight => {
        // Text search filter
        const searchMatch = searchTerm === '' || 
          flight.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          flight.droneModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
          flight.pilot.toLowerCase().includes(searchTerm.toLowerCase()) ||
          flight.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
          flight.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (flight.clientName && flight.clientName.toLowerCase().includes(searchTerm.toLowerCase()));

        // Pilot filter
        const pilotMatch = pilotFilter === 'all' || flight.pilot === pilotFilter;

        // Drone filter
        const droneMatch = droneFilter === 'all' || flight.droneModel === droneFilter;

        // Area filter
        const areaMatch = areaFilter === 'all' || flight.location.includes(areaFilter);

        // Purpose filter
        const purposeMatch = purposeFilter === 'all' || flight.purpose === purposeFilter;

        // Client filter
        const clientMatch = clientFilter === 'all' || flight.clientName === clientFilter;

        return searchMatch && pilotMatch && droneMatch && areaMatch && purposeMatch && clientMatch;
      })
      .sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'date':
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            break;
          case 'duration':
            comparison = a.duration - b.duration;
            break;
          case 'location':
            comparison = a.location.localeCompare(b.location);
            break;
          case 'pilot':
            comparison = a.pilot.localeCompare(b.pilot);
            break;
          default:
            comparison = 0;
        }

        return sortOrder === 'desc' ? -comparison : comparison;
      });
  }, [flights, searchTerm, pilotFilter, droneFilter, areaFilter, purposeFilter, sortBy, sortOrder]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setPilotFilter('all');
    setDroneFilter('all');
    setAreaFilter('all');
    setPurposeFilter('all');
    setClientFilter('all');
  };

  const toggleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const getWeatherEmoji = (weather: string) => {
    switch (weather) {
      case '晴れ': return '☀️';
      case '曇り': return '☁️';
      case '雨': return '🌧️';
      case '雪': return '❄️';
      case '霧': return '🌫️';
      default: return '🌤️';
    }
  };

  const getPurposeBadgeColor = (purpose: string) => {
    switch (purpose) {
      case '趣味・娯楽': return 'bg-blue-100 text-blue-800';
      case '練習・訓練': return 'bg-green-100 text-green-800';
      case '撮影・映像制作': return 'bg-indigo-100 text-indigo-800';
      case '点検・調査': return 'bg-orange-100 text-orange-800';
      case '測量': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 flex-shrink-0" />
              フライト履歴
              <Badge variant="secondary" className="ml-2">
                {filteredFlights.length}件
              </Badge>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="キーワード検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm">操縦者</label>
                  <Select value={pilotFilter} onValueChange={setPilotFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="全ての操縦者" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全ての操縦者</SelectItem>
                      {uniquePilots.map(pilot => (
                        <SelectItem key={pilot} value={pilot}>{pilot}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm">機体</label>
                  <Select value={droneFilter} onValueChange={setDroneFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="全ての機体" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全ての機体</SelectItem>
                      {uniqueDrones.map(drone => (
                        <SelectItem key={drone} value={drone}>{drone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm">エリア</label>
                  <Select value={areaFilter} onValueChange={setAreaFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="全てのエリア" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全てのエリア</SelectItem>
                      {uniqueAreas.map(area => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm">目的</label>
                  <Select value={purposeFilter} onValueChange={setPurposeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="全ての目的" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全ての目的</SelectItem>
                      {uniquePurposes.map(purpose => (
                        <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm">クライアント</label>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="全てのクライアント" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全てのクライアント</SelectItem>
                      {uniqueClients.map(client => (
                        <SelectItem key={client} value={client}>{client}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters & Clear */}
              {activeFiltersCount > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-500">アクティブフィルター:</span>
                  {pilotFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      操縦者: {pilotFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setPilotFilter('all')} />
                    </Badge>
                  )}
                  {droneFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      機体: {droneFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setDroneFilter('all')} />
                    </Badge>
                  )}
                  {areaFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      エリア: {areaFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setAreaFilter('all')} />
                    </Badge>
                  )}
                  {purposeFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      目的: {purposeFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setPurposeFilter('all')} />
                    </Badge>
                  )}
                  {clientFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      クライアント: {clientFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setClientFilter('all')} />
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
                    全てクリア
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredFlights.length === 0 ? (
          <div className="text-center py-8">
            <Plane className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">フライト記録がありません</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleSort('date')}
                        className="p-0 h-auto font-medium hover:bg-transparent"
                      >
                        日付
                        {sortBy === 'date' && (
                          sortOrder === 'desc' ? <SortDesc className="ml-1 h-4 w-4" /> : <SortAsc className="ml-1 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleSort('location')}
                        className="p-0 h-auto font-medium hover:bg-transparent"
                      >
                        場所
                        {sortBy === 'location' && (
                          sortOrder === 'desc' ? <SortDesc className="ml-1 h-4 w-4" /> : <SortAsc className="ml-1 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>機種</TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleSort('pilot')}
                        className="p-0 h-auto font-medium hover:bg-transparent"
                      >
                        操縦者
                        {sortBy === 'pilot' && (
                          sortOrder === 'desc' ? <SortDesc className="ml-1 h-4 w-4" /> : <SortAsc className="ml-1 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleSort('duration')}
                        className="p-0 h-auto font-medium hover:bg-transparent"
                      >
                        時間
                        {sortBy === 'duration' && (
                          sortOrder === 'desc' ? <SortDesc className="ml-1 h-4 w-4" /> : <SortAsc className="ml-1 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>天気</TableHead>
                    <TableHead>目的</TableHead>
                    <TableHead>クライアント</TableHead>
                    <TableHead>詳細</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFlights.map((flight) => (
                    <TableRow key={flight.id}>
                      <TableCell>
                        {new Date(flight.date).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="truncate max-w-[150px]" title={flight.location}>
                            {flight.location}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{flight.droneModel}</TableCell>
                      <TableCell>{flight.pilot}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {flight.duration}分
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{getWeatherEmoji(flight.weather)}</span>
                          <span>{flight.weather}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPurposeBadgeColor(flight.purpose)}>
                          {flight.purpose}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {flight.clientName ? (
                          <span className="text-sm truncate max-w-[120px]" title={flight.clientName}>
                            {flight.clientName}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewFlight(flight)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Sort Controls for Mobile */}
            <div className="lg:hidden mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500">並び順:</span>
                <Button
                  variant={sortBy === 'date' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSort('date')}
                  className="gap-1"
                >
                  日付
                  {sortBy === 'date' && (
                    sortOrder === 'desc' ? <SortDesc className="h-3 w-3" /> : <SortAsc className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant={sortBy === 'location' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSort('location')}
                  className="gap-1"
                >
                  場所
                  {sortBy === 'location' && (
                    sortOrder === 'desc' ? <SortDesc className="h-3 w-3" /> : <SortAsc className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant={sortBy === 'pilot' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSort('pilot')}
                  className="gap-1"
                >
                  操縦者
                  {sortBy === 'pilot' && (
                    sortOrder === 'desc' ? <SortDesc className="h-3 w-3" /> : <SortAsc className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {filteredFlights.map((flight) => (
                <div 
                  key={flight.id}
                  className="bg-white border rounded-lg p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium">
                          {new Date(flight.date).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm truncate" title={flight.location}>
                          {flight.location}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewFlight(flight)}
                      className="ml-2 flex-shrink-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs">機種</span>
                      <p className="font-medium truncate">{flight.droneModel}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">操縦者</span>
                      <p className="font-medium truncate">{flight.pilot}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">時間</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="font-medium">{flight.duration}分</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">天気</span>
                      <div className="flex items-center gap-1">
                        <span>{getWeatherEmoji(flight.weather)}</span>
                        <span className="font-medium">{flight.weather}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={getPurposeBadgeColor(flight.purpose)}>
                        {flight.purpose}
                      </Badge>
                      {flight.isTokuteiFlight && (
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
                          特定飛行
                        </Badge>
                      )}
                    </div>
                    {flight.clientName && (
                      <div className="text-xs text-gray-600">
                        <span className="text-gray-400">クライアント: </span>
                        <span className="font-medium">{flight.clientName}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}