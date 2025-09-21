import React, { useState, useEffect } from 'react';
import { Upload, BarChart3, FileSpreadsheet, Settings, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OMRUpload } from './OMRUpload';
import { OMRResults } from './OMRResults';
import { OMRAnalytics } from './OMRAnalytics';
import { AnswerKeyManager } from './AnswerKeyManager';

interface DashboardStats {
  totalSheets: number;
  completedSheets: number;
  averageScore: number;
  flaggedSheets: number;
}

export const OMRDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSheets: 0,
    completedSheets: 0,
    averageScore: 0,
    flaggedSheets: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load sheets count
      const { data: sheets, error: sheetsError } = await supabase
        .from('omr_sheets')
        .select('status');
      
      if (sheetsError) throw sheetsError;

      // Load results for completed sheets
      const { data: results, error: resultsError } = await supabase
        .from('omr_results')
        .select('percentage');
      
      if (resultsError) throw resultsError;

      const totalSheets = sheets?.length || 0;
      const completedSheets = sheets?.filter(s => s.status === 'completed').length || 0;
      const flaggedSheets = sheets?.filter(s => s.status === 'flagged').length || 0;
      const averageScore = results?.length > 0 
        ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length 
        : 0;

      setStats({
        totalSheets,
        completedSheets,
        averageScore: Math.round(averageScore),
        flaggedSheets
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    loadDashboardData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">OMR Evaluation System</h1>
              <p className="text-muted-foreground">Automated scoring and analysis platform</p>
            </div>
            <Button 
              variant="gradient" 
              onClick={refreshData}
              className="shadow-lg"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sheets</CardTitle>
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSheets}</div>
                  <p className="text-xs text-muted-foreground">Uploaded to system</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-success">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedSheets}</div>
                  <p className="text-xs text-muted-foreground">Successfully processed</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-accent">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averageScore}%</div>
                  <p className="text-xs text-muted-foreground">Across all sheets</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-warning">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Flagged</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.flaggedSheets}</div>
                  <p className="text-xs text-muted-foreground">Need review</p>
                </CardContent>
              </Card>
            </div>

            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Processing Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completed Sheets</span>
                    <span>{stats.completedSheets} / {stats.totalSheets}</span>
                  </div>
                  <Progress 
                    value={stats.totalSheets > 0 ? (stats.completedSheets / stats.totalSheets) * 100 : 0} 
                    className="h-2"
                  />
                </div>
                
                {stats.flaggedSheets > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-sm">
                      {stats.flaggedSheets} sheet{stats.flaggedSheets !== 1 ? 's' : ''} flagged for review
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => setActiveTab('upload')}
                  >
                    <Upload className="h-6 w-6 mb-2" />
                    Upload Sheets
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => setActiveTab('results')}
                  >
                    <FileSpreadsheet className="h-6 w-6 mb-2" />
                    View Results
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => setActiveTab('analytics')}
                  >
                    <BarChart3 className="h-6 w-6 mb-2" />
                    Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Answer Key Manager */}
            <AnswerKeyManager onUpdate={refreshData} />
          </TabsContent>

          <TabsContent value="upload">
            <OMRUpload onUploadComplete={refreshData} />
          </TabsContent>

          <TabsContent value="results">
            <OMRResults />
          </TabsContent>

          <TabsContent value="analytics">
            <OMRAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};