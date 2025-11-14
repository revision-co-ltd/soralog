import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, Plane, TrendingUp, ShieldCheck } from 'lucide-react';

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
  isTokuteiFlight?: boolean;
}

interface FlightStatisticsProps {
  flights: FlightLog[];
}

export function FlightStatistics({ flights }: FlightStatisticsProps) {
  const totalFlights = flights.length;
  const totalDuration = flights.reduce((sum, flight) => sum + flight.duration, 0);
  const averageDuration = totalFlights > 0 ? Math.round(totalDuration / totalFlights) : 0;
  const tokuteiFlightCount = flights.filter(flight => flight.isTokuteiFlight).length;

  // Monthly flight data
  const monthlyData = flights.reduce((acc, flight) => {
    const month = new Date(flight.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(monthlyData).map(([month, count]) => ({
    month,
    flights: count
  }));

  // Purpose distribution
  const purposeData = flights.reduce((acc, flight) => {
    acc[flight.purpose] = (acc[flight.purpose] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(purposeData).map(([purpose, count]) => ({
    name: purpose,
    value: count
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Drone model usage
  const droneUsage = flights.reduce((acc, flight) => {
    acc[flight.droneModel] = (acc[flight.droneModel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostUsedDrone = Object.entries(droneUsage).reduce((a, b) => 
    droneUsage[a[0]] > droneUsage[b[0]] ? a : b, ['', 0]
  )[0] || 'なし';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総フライト数</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFlights}</div>
            <p className="text-xs text-muted-foreground">回</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総飛行時間</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(totalDuration / 60)}h {totalDuration % 60}m</div>
            <p className="text-xs text-muted-foreground">累計</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均飛行時間</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageDuration}</div>
            <p className="text-xs text-muted-foreground">分/回</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">特定飛行回数</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tokuteiFlightCount}</div>
            <p className="text-xs text-muted-foreground">カテゴリーⅡ・Ⅲ</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Flight Chart */}
        <Card>
          <CardHeader>
            <CardTitle>月別フライト数</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="flights" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Purpose Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>飛行目的別分布</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <Card>
        <CardHeader>
          <CardTitle>その他の統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">最も使用されている機種</p>
              <p className="font-semibold">{mostUsedDrone}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">登録された場所数</p>
              <p className="font-semibold">{new Set(flights.map(f => f.location)).size}箇所</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">特定飛行割合</p>
              <p className="font-semibold">
                {flights.length > 0
                  ? `${Math.round((tokuteiFlightCount / flights.length) * 100)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}