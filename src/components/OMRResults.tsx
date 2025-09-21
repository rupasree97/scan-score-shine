import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Eye, Search, Filter, MoreHorizontal, CheckCircle, AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OMRSheet {
  id: string;
  student_name: string | null;
  student_id: string | null;
  roll_number: string | null;
  sheet_version: string;
  original_filename: string;
  status: string;
  created_at: string;
  result?: {
    total_score: number;
    max_score: number;
    percentage: number;
    subject_scores: Record<string, number>;
    correct_answers: number;
    incorrect_answers: number;
    unanswered: number;
    confidence_score: number;
  };
}

export const OMRResults: React.FC = () => {
  const [sheets, setSheets] = useState<OMRSheet[]>([]);
  const [filteredSheets, setFilteredSheets] = useState<OMRSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [versionFilter, setVersionFilter] = useState('all');
  const [selectedSheet, setSelectedSheet] = useState<OMRSheet | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSheets();
  }, []);

  useEffect(() => {
    filterSheets();
  }, [sheets, searchTerm, statusFilter, versionFilter]);

  const loadSheets = async () => {
    try {
      const { data: sheetsData, error: sheetsError } = await supabase
        .from('omr_sheets')
        .select('*')
        .order('created_at', { ascending: false });

      if (sheetsError) throw sheetsError;

      const { data: resultsData, error: resultsError } = await supabase
        .from('omr_results')
        .select('*');

      if (resultsError) throw resultsError;

      const sheetsWithResults = sheetsData?.map(sheet => ({
        ...sheet,
        result: resultsData?.find(result => result.sheet_id === sheet.id) ? {
          ...resultsData.find(result => result.sheet_id === sheet.id)!,
          subject_scores: resultsData.find(result => result.sheet_id === sheet.id)!.subject_scores as Record<string, number>
        } : undefined
      })) || [];

      setSheets(sheetsWithResults);
    } catch (error) {
      console.error('Error loading sheets:', error);
      toast({
        title: "Error",
        description: "Failed to load OMR results",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterSheets = () => {
    let filtered = sheets;

    if (searchTerm) {
      filtered = filtered.filter(sheet => 
        sheet.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.roll_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(sheet => sheet.status === statusFilter);
    }

    if (versionFilter !== 'all') {
      filtered = filtered.filter(sheet => sheet.sheet_version === versionFilter);
    }

    setFilteredSheets(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'flagged': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'processing': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed': return <X className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="default" className="bg-success">Completed</Badge>;
      case 'flagged': return <Badge variant="default" className="bg-warning">Flagged</Badge>;
      case 'processing': return <Badge className="bg-blue-500">Processing</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">Uploaded</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Student Name',
      'Student ID', 
      'Roll Number',
      'Version',
      'Status',
      'Total Score',
      'Percentage',
      'English',
      'Math',
      'Science',
      'Social',
      'Hindi',
      'Correct',
      'Incorrect',
      'Unanswered',
      'Confidence',
      'Upload Date'
    ];

    const csvData = filteredSheets.map(sheet => [
      sheet.student_name || '',
      sheet.student_id || '',
      sheet.roll_number || '',
      sheet.sheet_version,
      sheet.status,
      sheet.result?.total_score || '',
      sheet.result?.percentage || '',
      sheet.result?.subject_scores?.english || '',
      sheet.result?.subject_scores?.math || '',
      sheet.result?.subject_scores?.science || '',
      sheet.result?.subject_scores?.social || '',
      sheet.result?.subject_scores?.hindi || '',
      sheet.result?.correct_answers || '',
      sheet.result?.incorrect_answers || '',
      sheet.result?.unanswered || '',
      sheet.result?.confidence_score || '',
      new Date(sheet.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omr_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Results exported to CSV file"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              OMR Results ({filteredSheets.length})
            </CardTitle>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, ID, roll number, or filename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={versionFilter} onValueChange={setVersionFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Version" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Versions</SelectItem>
                <SelectItem value="A">Version A</SelectItem>
                <SelectItem value="B">Version B</SelectItem>
                <SelectItem value="C">Version C</SelectItem>
                <SelectItem value="D">Version D</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Info</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSheets.map((sheet) => (
                  <TableRow key={sheet.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {sheet.student_name || 'Unknown Student'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ID: {sheet.student_id || 'N/A'} | Roll: {sheet.roll_number || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sheet.original_filename}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sheet.sheet_version}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(sheet.status)}
                        {getStatusBadge(sheet.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {sheet.result ? (
                        <span className="font-mono">
                          {sheet.result.total_score}/{sheet.result.max_score}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {sheet.result ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            sheet.result.percentage >= 80 ? 'text-success' :
                            sheet.result.percentage >= 60 ? 'text-warning' :
                            'text-destructive'
                          }`}>
                            {sheet.result.percentage.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(sheet.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setSelectedSheet(sheet)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredSheets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No results found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sheet Details Dialog */}
      <Dialog open={!!selectedSheet} onOpenChange={() => setSelectedSheet(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sheet Details</DialogTitle>
          </DialogHeader>
          {selectedSheet && (
            <div className="space-y-6">
              {/* Student Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Student Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedSheet.student_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Student ID</p>
                    <p className="font-medium">{selectedSheet.student_id || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Roll Number</p>
                    <p className="font-medium">{selectedSheet.roll_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sheet Version</p>
                    <p className="font-medium">{selectedSheet.sheet_version}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Results Summary */}
              {selectedSheet.result && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Results Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-success">{selectedSheet.result.total_score}</p>
                        <p className="text-sm text-muted-foreground">Total Score</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-primary">{selectedSheet.result.percentage.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">Percentage</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-success">{selectedSheet.result.correct_answers}</p>
                        <p className="text-sm text-muted-foreground">Correct</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-destructive">{selectedSheet.result.incorrect_answers}</p>
                        <p className="text-sm text-muted-foreground">Incorrect</p>
                      </div>
                    </div>

                    {/* Subject-wise Scores */}
                    <div>
                      <h4 className="font-semibold mb-3">Subject-wise Performance</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(selectedSheet.result.subject_scores).map(([subject, score]) => (
                          <div key={subject} className="flex justify-between items-center p-3 border rounded-lg">
                            <span className="capitalize font-medium">{subject}</span>
                            <span className="font-bold">{score}/20</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};