import React, { useState, useCallback } from 'react';
import { Upload, FileImage, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface OMRUploadProps {
  onUploadComplete: () => void;
}

export const OMRUpload: React.FC<OMRUploadProps> = ({ onUploadComplete }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (fileList: File[]) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const maxSize = 20 * 1024 * 1024; // 20MB

    const newFiles: UploadedFile[] = fileList
      .filter(file => {
        if (!validTypes.includes(file.type)) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported format. Please use JPG, PNG, or PDF.`,
            variant: "destructive"
          });
          return false;
        }
        if (file.size > maxSize) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 20MB. Please reduce the file size.`,
            variant: "destructive"
          });
          return false;
        }
        return true;
      })
      .map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending' as const,
        progress: 0
      }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFiles = async () => {
    if (!selectedVersion) {
      toast({
        title: "Version required",
        description: "Please select the sheet version (A, B, C, or D)",
        variant: "destructive"
      });
      return;
    }

    for (const fileUpload of files) {
      if (fileUpload.status !== 'pending') continue;

      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id 
            ? { ...f, status: 'uploading', progress: 10 }
            : f
        ));

        // Upload to Supabase storage
        const fileName = `${Date.now()}_${fileUpload.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('omr-sheets')
          .upload(fileName, fileUpload.file);

        if (uploadError) throw uploadError;

        // Update progress
        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id 
            ? { ...f, progress: 50 }
            : f
        ));

        // Create database record
        const { data: sheetData, error: dbError } = await supabase
          .from('omr_sheets')
          .insert({
            student_name: studentName || null,
            student_id: studentId || null,
            roll_number: rollNumber || null,
            sheet_version: selectedVersion,
            original_filename: fileUpload.file.name,
            file_path: uploadData.path,
            status: 'uploaded'
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // Update to processing and simulate processing
        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id 
            ? { ...f, status: 'processing', progress: 75 }
            : f
        ));

        // Simulate OMR processing
        await simulateOMRProcessing(sheetData.id);

        // Mark as completed
        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id 
            ? { ...f, status: 'completed', progress: 100 }
            : f
        ));

        // Log the upload action
        await supabase
          .from('omr_audit_logs')
          .insert({
            sheet_id: sheetData.id,
            action: 'upload',
            details: { 
              filename: fileUpload.file.name,
              version: selectedVersion,
              student_info: { studentName, studentId, rollNumber }
            }
          });

      } catch (error) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id 
            ? { ...f, status: 'error', error: 'Upload failed' }
            : f
        ));
        toast({
          title: "Upload failed",
          description: `Failed to upload ${fileUpload.file.name}`,
          variant: "destructive"
        });
      }
    }

    onUploadComplete();
  };

  const simulateOMRProcessing = async (sheetId: string) => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get a random answer key for the version
    const { data: answerKeys } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('version', selectedVersion)
      .limit(1);

    if (!answerKeys || answerKeys.length === 0) return;

    const answerKey = answerKeys[0];
    
    // Generate random detected answers for simulation
    const detectedAnswers = Array.from({ length: 100 }, () => 
      Math.random() > 0.1 ? Math.floor(Math.random() * 4) + 1 : 0 // 10% chance of no answer
    );

    // Calculate scores
    const correctAnswers = answerKey.answers as number[];
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    detectedAnswers.forEach((answer, index) => {
      if (answer === 0) {
        unanswered++;
      } else if (answer === correctAnswers[index]) {
        correct++;
      } else {
        incorrect++;
      }
    });

    // Calculate subject scores
    const subjectBreakdown = answerKey.subject_breakdown as any;
    const subjectScores: Record<string, number> = {};

    for (const [subject, range] of Object.entries(subjectBreakdown)) {
      const start = (range as any).start - 1;
      const end = (range as any).end - 1;
      let subjectCorrect = 0;
      
      for (let i = start; i <= end; i++) {
        if (detectedAnswers[i] === correctAnswers[i]) {
          subjectCorrect++;
        }
      }
      
      subjectScores[subject] = subjectCorrect;
    }

    const totalScore = correct;
    const percentage = (totalScore / answerKey.total_questions) * 100;

    // Insert results
    await supabase
      .from('omr_results')
      .insert({
        sheet_id: sheetId,
        answer_key_id: answerKey.id,
        detected_answers: detectedAnswers,
        subject_scores: subjectScores,
        total_score: totalScore,
        max_score: answerKey.max_score,
        percentage: Number(percentage.toFixed(2)),
        correct_answers: correct,
        incorrect_answers: incorrect,
        unanswered: unanswered,
        confidence_score: Math.random() * 20 + 80, // Random confidence 80-100%
        processing_time: Math.floor(Math.random() * 5000) + 1000 // 1-6 seconds
      });

    // Update sheet status
    await supabase
      .from('omr_sheets')
      .update({ status: 'completed' })
      .eq('id', sheetId);
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return <File className="h-4 w-4" />;
      case 'uploading': 
      case 'processing': return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>;
      case 'completed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="outline">Pending</Badge>;
      case 'uploading': return <Badge className="bg-blue-500">Uploading</Badge>;
      case 'processing': return <Badge className="bg-yellow-500">Processing</Badge>;
      case 'completed': return <Badge variant="default" className="bg-success">Completed</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload OMR Sheets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Student Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="studentName">Student Name (Optional)</Label>
              <Input
                id="studentName"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter student name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID (Optional)</Label>
              <Input
                id="studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter student ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rollNumber">Roll Number (Optional)</Label>
              <Input
                id="rollNumber"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="Enter roll number"
              />
            </div>
          </div>

          {/* Sheet Version Selection */}
          <div className="space-y-2">
            <Label>Sheet Version *</Label>
            <Select value={selectedVersion} onValueChange={setSelectedVersion}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Version A</SelectItem>
                <SelectItem value="B">Version B</SelectItem>
                <SelectItem value="C">Version C</SelectItem>
                <SelectItem value="D">Version D</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileImage className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Drop your OMR sheets here</h3>
            <p className="text-muted-foreground mb-4">
              Supports JPG, PNG, and PDF files up to 20MB each
            </p>
            <Button variant="outline" onClick={() => document.getElementById('fileInput')?.click()}>
              Browse Files
            </Button>
            <input
              id="fileInput"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Uploaded Files ({files.length})</h4>
                <Button 
                  onClick={uploadFiles}
                  disabled={files.some(f => f.status === 'uploading' || f.status === 'processing')}
                  variant="gradient"
                >
                  Process All Files
                </Button>
              </div>
              
              <div className="space-y-2">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    {getStatusIcon(file.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {file.progress > 0 && file.status !== 'completed' && (
                        <Progress value={file.progress} className="h-1 mt-1" />
                      )}
                    </div>
                    {getStatusBadge(file.status)}
                    {file.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};