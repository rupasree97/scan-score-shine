import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Key, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnswerKey {
  id: string;
  name: string;
  version: string;
  subject_breakdown: Record<string, { start: number; end: number }>;
  answers: number[];
  total_questions: number;
  max_score: number;
  created_at: string;
}

interface AnswerKeyManagerProps {
  onUpdate: () => void;
}

export const AnswerKeyManager: React.FC<AnswerKeyManagerProps> = ({ onUpdate }) => {
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<AnswerKey | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    answersText: '',
    subjectBreakdown: {
      english: { start: 1, end: 20 },
      math: { start: 21, end: 40 },
      science: { start: 41, end: 60 },
      social: { start: 61, end: 80 },
      hindi: { start: 81, end: 100 }
    }
  });
  const { toast } = useToast();

  useEffect(() => {
    loadAnswerKeys();
  }, []);

  const loadAnswerKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('answer_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAnswerKeys((data || []).map(key => ({
        ...key,
        subject_breakdown: key.subject_breakdown as Record<string, { start: number; end: number }>,
        answers: key.answers as number[]
      })));
    } catch (error) {
      console.error('Error loading answer keys:', error);
      toast({
        title: "Error",
        description: "Failed to load answer keys",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (key?: AnswerKey) => {
    if (key) {
      setEditingKey(key);
      setFormData({
        name: key.name,
        version: key.version,
        answersText: key.answers.join(','),
        subjectBreakdown: key.subject_breakdown as any
      });
    } else {
      setEditingKey(null);
      setFormData({
        name: '',
        version: '',
        answersText: '',
        subjectBreakdown: {
          english: { start: 1, end: 20 },
          math: { start: 21, end: 40 },
          science: { start: 41, end: 60 },
          social: { start: 61, end: 80 },
          hindi: { start: 81, end: 100 }
        }
      });
    }
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingKey(null);
  };

  const generateRandomAnswers = () => {
    const answers = Array.from({ length: 100 }, () => Math.floor(Math.random() * 4) + 1);
    setFormData(prev => ({ ...prev, answersText: answers.join(',') }));
  };

  const saveAnswerKey = async () => {
    try {
      if (!formData.name || !formData.version || !formData.answersText) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      const answers = formData.answersText.split(',').map(a => parseInt(a.trim())).filter(a => !isNaN(a));
      
      if (answers.length !== 100) {
        toast({
          title: "Validation Error",
          description: "Please provide exactly 100 answers (1-4 for each question)",
          variant: "destructive"
        });
        return;
      }

      if (answers.some(a => a < 1 || a > 4)) {
        toast({
          title: "Validation Error",
          description: "All answers must be between 1 and 4",
          variant: "destructive"
        });
        return;
      }

      const keyData = {
        name: formData.name,
        version: formData.version,
        subject_breakdown: formData.subjectBreakdown,
        answers: answers,
        total_questions: 100,
        max_score: 100
      };

      if (editingKey) {
        const { error } = await supabase
          .from('answer_keys')
          .update(keyData)
          .eq('id', editingKey.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Answer key updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('answer_keys')
          .insert([keyData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Answer key created successfully"
        });
      }

      closeDialog();
      loadAnswerKeys();
      onUpdate();
    } catch (error: any) {
      console.error('Error saving answer key:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save answer key",
        variant: "destructive"
      });
    }
  };

  const deleteAnswerKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this answer key?')) return;

    try {
      const { error } = await supabase
        .from('answer_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Answer key deleted successfully"
      });

      loadAnswerKeys();
      onUpdate();
    } catch (error) {
      console.error('Error deleting answer key:', error);
      toast({
        title: "Error",
        description: "Failed to delete answer key",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Answer Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Answer Keys ({answerKeys.length})
            </CardTitle>
            <Button onClick={() => openDialog()} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Answer Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {answerKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No answer keys found</p>
              <p className="text-sm">Create your first answer key to start evaluating OMR sheets</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {answerKeys.map((key) => (
                <div key={key.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{key.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(key.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">Version {key.version}</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Questions:</span>
                      <span>{key.total_questions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Max Score:</span>
                      <span>{key.max_score}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Subjects:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(key.subject_breakdown).map(([subject, range]) => (
                        <Badge key={subject} variant="secondary" className="text-xs">
                          {subject.charAt(0).toUpperCase() + subject.slice(1)} ({range.start}-{range.end})
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(key)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAnswerKey(key.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingKey ? 'Edit Answer Key' : 'Create Answer Key'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Final Exam 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Version *</Label>
                <Select
                  value={formData.version}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, version: value }))}
                >
                  <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="answers">Answer Pattern (100 answers, comma-separated) *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateRandomAnswers}
                >
                  Generate Random
                </Button>
              </div>
              <Textarea
                id="answers"
                value={formData.answersText}
                onChange={(e) => setFormData(prev => ({ ...prev, answersText: e.target.value }))}
                placeholder="1,2,3,4,1,2,3,4,... (100 values from 1-4)"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Enter 100 comma-separated numbers (1-4) representing the correct answers.
                Current count: {formData.answersText ? formData.answersText.split(',').length : 0}
              </p>
            </div>

            <div className="space-y-4">
              <Label>Subject Breakdown</Label>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(formData.subjectBreakdown).map(([subject, range]) => (
                  <div key={subject} className="flex items-center gap-4">
                    <div className="w-20">
                      <Label className="capitalize text-sm">{subject}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={range.start}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          subjectBreakdown: {
                            ...prev.subjectBreakdown,
                            [subject]: { ...range, start: parseInt(e.target.value) || 1 }
                          }
                        }))}
                        className="w-20"
                        min="1"
                        max="100"
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="number"
                        value={range.end}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          subjectBreakdown: {
                            ...prev.subjectBreakdown,
                            [subject]: { ...range, end: parseInt(e.target.value) || 20 }
                          }
                        }))}
                        className="w-20"
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveAnswerKey} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {editingKey ? 'Update' : 'Create'} Answer Key
              </Button>
              <Button variant="outline" onClick={closeDialog}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};