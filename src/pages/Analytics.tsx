import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { Eye, Users, Clock, Monitor, Smartphone, Tablet, MousePointerClick } from "lucide-react";

interface PageVisit {
  id: string;
  page: string;
  timestamp: string;
  session_id: string;
  device_type: string | null;
  duration_ms: number | null;
  scroll_depth_pct: number | null;
  is_return_visit: boolean | null;
  screen_width: number | null;
  click: string | null;
}

const COLORS = [
  "hsl(175, 80%, 50%)",
  "hsl(145, 70%, 45%)",
  "hsl(200, 60%, 50%)",
  "hsl(45, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 50%)",
];

const chartConfig: ChartConfig = {
  uniqueVisitors: { label: "Unique Visitors", color: "hsl(175, 80%, 50%)" },
  avgDuration: { label: "Avg Duration (min)", color: "hsl(145, 70%, 45%)" },
  desktop: { label: "Desktop", color: "hsl(175, 80%, 50%)" },
  mobile: { label: "Mobile", color: "hsl(200, 60%, 50%)" },
  tablet: { label: "Tablet", color: "hsl(45, 80%, 55%)" },
  clicks: { label: "Clicks", color: "hsl(280, 60%, 55%)" },
};

type DateRange = "7d" | "30d" | "all";
type DeviceFilter = "all" | "desktop" | "mobile" | "tablet";

export default function Analytics() {
  const [visits, setVisits] = useState<PageVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>("all");

  useEffect(() => {
    supabase.functions.invoke<PageVisit[]>("get-analytics", { method: "GET" })
      .then(({ data, error }) => {
        if (error) console.error("Analytics fetch failed:", error);
        else setVisits(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    let result = visits;
    if (dateRange !== "all") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (dateRange === "7d" ? 7 : 30));
      result = result.filter((v) => new Date(v.timestamp) >= cutoff);
    }
    if (deviceFilter !== "all") {
      result = result.filter((v) => v.device_type === deviceFilter);
    }
    return result;
  }, [visits, dateRange, deviceFilter]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading analytics…</p>
      </div>
    );
  }

  // --- Derived data (all computed from `filtered`) ---
  const uniqueSessions = new Set(filtered.map((v) => v.session_id)).size;
  const avgDuration =
    filtered.filter((v) => v.duration_ms).reduce((s, v) => s + (v.duration_ms ?? 0), 0) /
      (filtered.filter((v) => v.duration_ms).length || 1) /
      1000;

  // Unique sessions & avg duration per day
  const byDay = filtered.reduce<Record<string, { sessions: Map<string, number[]> }>>((acc, v) => {
    const day = v.timestamp.slice(0, 10);
    if (!acc[day]) acc[day] = { sessions: new Map() };
    if (!acc[day].sessions.has(v.session_id)) acc[day].sessions.set(v.session_id, []);
    if (v.duration_ms) acc[day].sessions.get(v.session_id)!.push(v.duration_ms);
    return acc;
  }, {});
  const viewsPerDay = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { sessions }]) => {
      const durations = [...sessions.values()].map((d) => d.reduce((a, b) => a + b, 0) / (d.length || 1));
      const avgDur = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length / 60000 : 0;
      return { date, uniqueVisitors: sessions.size, avgDuration: Math.round(avgDur * 10) / 10 };
    });

  // Top pages by unique sessions
  const byPage = filtered.reduce<Record<string, Set<string>>>((acc, v) => {
    if (!acc[v.page]) acc[v.page] = new Set();
    acc[v.page].add(v.session_id);
    return acc;
  }, {});
  const topPages = Object.entries(byPage)
    .sort(([, a], [, b]) => b.size - a.size)
    .map(([page, sessions]) => ({ page, sessions: sessions.size }));

  // Click breakdown
  const byClick = filtered.filter((v) => v.click).reduce<Record<string, number>>((acc, v) => {
    acc[v.click!] = (acc[v.click!] ?? 0) + 1;
    return acc;
  }, {});
  const topClicks = Object.entries(byClick)
    .sort(([, a], [, b]) => b - a)
    .map(([click, count]) => ({ click, count }));

  // Device breakdown
  const byDevice = filtered.reduce<Record<string, number>>((acc, v) => {
    const d = v.device_type ?? "unknown";
    acc[d] = (acc[d] ?? 0) + 1;
    return acc;
  }, {});
  const deviceData = Object.entries(byDevice).map(([name, value]) => ({ name, value }));

  const deviceIcon = (type: string) => {
    if (type === "mobile") return <Smartphone className="h-4 w-4" />;
    if (type === "tablet") return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const monoStyle = { fontFamily: "'JetBrains Mono', monospace" };
  const filterBtn = (active: boolean) =>
    `text-xs px-3 py-1 rounded-md border transition-colors duration-150 ${
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border/50 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
    }`;

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-primary shadow-[0_0_12px_hsl(175,80%,50%,0.5)]" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground" style={monoStyle}>
              Analytics
            </h1>
            <p className="text-sm text-muted-foreground" style={monoStyle}>
              // page visit insights
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground" style={monoStyle}>range:</span>
            {(["7d", "30d", "all"] as DateRange[]).map((r) => (
              <button key={r} className={filterBtn(dateRange === r)} style={monoStyle} onClick={() => setDateRange(r)}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground" style={monoStyle}>device:</span>
            {(["all", "desktop", "mobile", "tablet"] as DeviceFilter[]).map((d) => (
              <button key={d} className={filterBtn(deviceFilter === d)} style={monoStyle} onClick={() => setDeviceFilter(d)}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Page Views", value: filtered.length, icon: Eye },
            { label: "Unique Sessions", value: uniqueSessions, icon: Users },
            { label: "Avg Duration", value: `${(avgDuration / 60).toFixed(1)}m`, icon: Clock },
            { label: "Unique Pages", value: topPages.length, icon: Eye },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-colors duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground" style={monoStyle}>
                  {label}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary/70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary" style={{ ...monoStyle, textShadow: '0 0 20px hsl(175, 80%, 50%, 0.3)' }}>
                  {value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sessions over time */}
          <Card className="lg:col-span-2 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground" style={monoStyle}>
                Unique Sessions & Avg Duration Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={viewsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(200, 15%, 18%)" />
                  <XAxis dataKey="date" fontSize={11} tickFormatter={(v) => v.slice(5)} stroke="hsl(200, 15%, 40%)" style={monoStyle} />
                  <YAxis yAxisId="left" fontSize={11} allowDecimals={false} stroke="hsl(200, 15%, 40%)" style={monoStyle} label={{ value: "Sessions", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: 'hsl(200, 15%, 40%)', fontFamily: "'JetBrains Mono', monospace" } }} />
                  <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="hsl(200, 15%, 40%)" style={monoStyle} label={{ value: "Avg Duration (min)", angle: 90, position: "insideRight", style: { fontSize: 11, fill: 'hsl(200, 15%, 40%)', fontFamily: "'JetBrains Mono', monospace" } }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line yAxisId="left" type="monotone" dataKey="uniqueVisitors" name="Unique Sessions" stroke="hsl(175, 80%, 50%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(175, 80%, 50%)', strokeWidth: 0 }} />
                  <Line yAxisId="right" type="monotone" dataKey="avgDuration" name="Avg Duration (min)" stroke="hsl(145, 70%, 45%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(145, 70%, 45%)', strokeWidth: 0 }} strokeDasharray="5 5" />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Top Pages by unique sessions */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground" style={monoStyle}>Top Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={topPages} layout="vertical">
                  <XAxis type="number" fontSize={11} allowDecimals={false} stroke="hsl(200, 15%, 40%)" style={monoStyle} />
                  <YAxis type="category" dataKey="page" fontSize={11} width={140} stroke="hsl(200, 15%, 40%)" style={monoStyle} tickFormatter={(v) => (v.length > 20 ? v.slice(0, 20) + "…" : v)} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="sessions" name="Unique Sessions" fill="hsl(175, 80%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Device Breakdown */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground" style={monoStyle}>Device Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <PieChart>
                  <Pie data={deviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label stroke="hsl(220, 20%, 7%)" strokeWidth={2}>
                    {deviceData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="mt-4 flex justify-center gap-6">
                {deviceData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm text-muted-foreground" style={monoStyle}>
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length], boxShadow: `0 0 8px ${COLORS[i % COLORS.length]}60` }} />
                    {deviceIcon(d.name)}
                    <span className="capitalize">{d.name}</span>
                    <span className="font-medium text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Click Tracking */}
          <Card className="lg:col-span-2 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground" style={monoStyle}>
                <MousePointerClick className="h-5 w-5 text-accent" />
                Click Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topClicks.length === 0 ? (
                <p className="text-muted-foreground text-sm" style={monoStyle}>// no click events recorded yet</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={topClicks} layout="vertical">
                    <XAxis type="number" fontSize={11} allowDecimals={false} stroke="hsl(200, 15%, 40%)" style={monoStyle} />
                    <YAxis type="category" dataKey="click" fontSize={11} width={180} stroke="hsl(200, 15%, 40%)" style={monoStyle} tickFormatter={(v) => (v.length > 25 ? v.slice(0, 25) + "…" : v)} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(280, 60%, 55%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
