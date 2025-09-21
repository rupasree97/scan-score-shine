import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Target, PieChart, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  subjectPerformance: Record<string, { average: number; count: number }>;
  versionPerformance: Record<string, { average: number; count: number }>;
  scoreDistribution: { range: string; count: number }[];
  recentTrends: { date: string; averageScore: number; count: number }[];
}

export const OMRAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      // Load all completed results
      const { data: results, error: resultsError } = await supabase
        .from('omr_results')
        .select(`
          *,
          omr_sheets!inner (
            sheet_version,
            created_at
          )
        `);

      if (resultsError) throw resultsError;

      if (!results || results.length === 0) {
        setAnalyticsData({
          totalStudents: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          subjectPerformance: {},
          versionPerformance: {},
          scoreDistribution: [],
          recentTrends: []
        });
        setLoading(false);
        return;
      }

      // Calculate basic stats
      const scores = results.map(r => r.percentage);
      const totalStudents = results.length;
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalStudents;
      const highestScore = Math.max(...scores);
      const lowestScore = Math.min(...scores);

      // Calculate subject performance
      const subjectPerformance: Record<string, { total: number; count: number }> = {};
      
      results.forEach(result => {
        const subjectScores = result.subject_scores as Record<string, number>;
        if (subjectScores) {
          Object.entries(subjectScores).forEach(([subject, score]) => {
            if (!subjectPerformance[subject]) {
              subjectPerformance[subject] = { total: 0, count: 0 };
            }
            subjectPerformance[subject].total += score;
            subjectPerformance[subject].count += 1;
          });
        }
      });

      const subjectAverages = Object.fromEntries(
        Object.entries(subjectPerformance).map(([subject, data]) => [
          subject,
          { average: data.total / data.count, count: data.count }
        ])
      );

      // Calculate version performance
      const versionPerformance: Record<string, { total: number; count: number }> = {};
      
      results.forEach(result => {
        const version = (result.omr_sheets as any).sheet_version;
        if (!versionPerformance[version]) {
          versionPerformance[version] = { total: 0, count: 0 };
        }
        versionPerformance[version].total += result.percentage;
        versionPerformance[version].count += 1;
      });

      const versionAverages = Object.fromEntries(
        Object.entries(versionPerformance).map(([version, data]) => [
          version,
          { average: data.total / data.count, count: data.count }
        ])
      );

      // Calculate score distribution
      const scoreRanges = [
        { range: '90-100%', min: 90, max: 100 },
        { range: '80-89%', min: 80, max: 89 },
        { range: '70-79%', min: 70, max: 79 },
        { range: '60-69%', min: 60, max: 69 },
        { range: '50-59%', min: 50, max: 59 },
        { range: '0-49%', min: 0, max: 49 }
      ];

      const scoreDistribution = scoreRanges.map(range => ({
        range: range.range,
        count: scores.filter(score => score >= range.min && score <= range.max).length
      }));

      // Calculate recent trends (last 7 days)
      const recentTrends: { date: string; averageScore: number; count: number }[] = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const dayResults = results.filter(result => {
          const resultDate = new Date((result.omr_sheets as any).created_at).toISOString().split('T')[0];
          return resultDate === dateString;
        });

        const dayAverage = dayResults.length > 0 
          ? dayResults.reduce((sum, r) => sum + r.percentage, 0) / dayResults.length 
          : 0;

        recentTrends.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          averageScore: Math.round(dayAverage),
          count: dayResults.length
        });
      }

      setAnalyticsData({
        totalStudents,
        averageScore: Math.round(averageScore),
        highestScore: Math.round(highestScore),
        lowestScore: Math.round(lowestScore),
        subjectPerformance: subjectAverages,
        versionPerformance: versionAverages,
        scoreDistribution,
        recentTrends
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData || analyticsData.totalStudents === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No data available for analytics</p>
            <p className="text-sm">Upload and process some OMR sheets to see analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Completed evaluations</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.averageScore}%</div>
            <p className="text-xs text-muted-foreground">Class performance</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{analyticsData.highestScore}%</div>
            <p className="text-xs text-muted-foreground">Best performance</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lowest Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{analyticsData.lowestScore}%</div>
            <p className="text-xs text-muted-foreground">Needs improvement</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subjects" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="subjects">Subject Performance</TabsTrigger>
          <TabsTrigger value="versions">Version Analysis</TabsTrigger>
          <TabsTrigger value="distribution">Score Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Subject-wise Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(analyticsData.subjectPerformance).map(([subject, data]) => (
                <div key={subject} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="capitalize font-medium">{subject}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{data.count} students</Badge>
                      <span className="font-semibold">{data.average.toFixed(1)}/20</span>
                    </div>
                  </div>
                  <Progress 
                    value={(data.average / 20) * 100} 
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {((data.average / 20) * 100).toFixed(1)}% average
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Version Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(analyticsData.versionPerformance).map(([version, data]) => (
                <div key={version} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Version {version}</h4>
                    <p className="text-sm text-muted-foreground">{data.count} students</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{data.average.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Average score</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Score Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analyticsData.scoreDistribution.map((range) => (
                <div key={range.range} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{range.range}</span>
                    <span className="font-semibold">{range.count} students</span>
                  </div>
                  <Progress 
                    value={analyticsData.totalStudents > 0 ? (range.count / analyticsData.totalStudents) * 100 : 0} 
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {analyticsData.totalStudents > 0 ? 
                      ((range.count / analyticsData.totalStudents) * 100).toFixed(1) : 0}% of students
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {analyticsData.recentTrends.map((day, index) => (
              <div key={index} className="text-center p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{day.date}</p>
                <p className="font-semibold text-sm">{day.averageScore}%</p>
                <p className="text-xs text-muted-foreground">{day.count} tests</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};