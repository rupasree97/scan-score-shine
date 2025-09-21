-- Create OMR Evaluation System Database Schema

-- Answer Keys table for different sheet versions
CREATE TABLE public.answer_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL, -- A, B, C, D for different sheet versions
  subject_breakdown JSONB NOT NULL, -- {"english": {"start": 1, "end": 20}, "math": {"start": 21, "end": 40}, ...}
  answers JSONB NOT NULL, -- Array of correct answers [1,2,3,4,1,2,3,4,...]
  total_questions INTEGER NOT NULL DEFAULT 100,
  max_score INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, version)
);

-- OMR Sheets table for uploaded sheets
CREATE TABLE public.omr_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT,
  student_id TEXT,
  roll_number TEXT,
  sheet_version TEXT, -- A, B, C, D
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase storage path
  processed_file_path TEXT, -- Path to processed/rectified image
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed', 'flagged')),
  uploaded_by UUID, -- Reference to user who uploaded
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- OMR Results table for evaluation results
CREATE TABLE public.omr_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id UUID NOT NULL REFERENCES public.omr_sheets(id) ON DELETE CASCADE,
  answer_key_id UUID NOT NULL REFERENCES public.answer_keys(id) ON DELETE CASCADE,
  detected_answers JSONB NOT NULL, -- Array of detected answers
  subject_scores JSONB NOT NULL, -- {"english": 15, "math": 18, "science": 16, "social": 14, "hindi": 12}
  total_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  incorrect_answers INTEGER NOT NULL DEFAULT 0,
  unanswered INTEGER NOT NULL DEFAULT 0,
  ambiguous_answers JSONB, -- Array of question numbers with ambiguous detections
  confidence_score DECIMAL(5,2), -- Overall confidence in detection
  processing_time INTEGER, -- Time taken in milliseconds
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit logs for tracking all operations
CREATE TABLE public.omr_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id UUID REFERENCES public.omr_sheets(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'upload', 'process', 'evaluate', 'review', 'export'
  details JSONB, -- Additional details about the action
  performed_by UUID, -- Reference to user
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omr_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omr_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (can be restricted later with auth)
CREATE POLICY "Answer keys are viewable by everyone" 
ON public.answer_keys FOR SELECT USING (true);

CREATE POLICY "Answer keys can be inserted by anyone" 
ON public.answer_keys FOR INSERT WITH CHECK (true);

CREATE POLICY "OMR sheets are viewable by everyone" 
ON public.omr_sheets FOR SELECT USING (true);

CREATE POLICY "OMR sheets can be inserted by anyone" 
ON public.omr_sheets FOR INSERT WITH CHECK (true);

CREATE POLICY "OMR sheets can be updated by anyone" 
ON public.omr_sheets FOR UPDATE USING (true);

CREATE POLICY "OMR results are viewable by everyone" 
ON public.omr_results FOR SELECT USING (true);

CREATE POLICY "OMR results can be inserted by anyone" 
ON public.omr_results FOR INSERT WITH CHECK (true);

CREATE POLICY "Audit logs are viewable by everyone" 
ON public.omr_audit_logs FOR SELECT USING (true);

CREATE POLICY "Audit logs can be inserted by anyone" 
ON public.omr_audit_logs FOR INSERT WITH CHECK (true);

-- Create storage bucket for OMR sheets
INSERT INTO storage.buckets (id, name, public) VALUES ('omr-sheets', 'omr-sheets', false);

-- Create storage policies
CREATE POLICY "OMR sheets can be uploaded by anyone" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'omr-sheets');

CREATE POLICY "OMR sheets can be viewed by anyone" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'omr-sheets');

CREATE POLICY "OMR sheets can be updated by anyone" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'omr-sheets');

-- Create indexes for better performance
CREATE INDEX idx_omr_sheets_status ON public.omr_sheets(status);
CREATE INDEX idx_omr_sheets_created_at ON public.omr_sheets(created_at);
CREATE INDEX idx_omr_results_sheet_id ON public.omr_results(sheet_id);
CREATE INDEX idx_omr_results_created_at ON public.omr_results(created_at);
CREATE INDEX idx_omr_audit_logs_sheet_id ON public.omr_audit_logs(sheet_id);
CREATE INDEX idx_omr_audit_logs_created_at ON public.omr_audit_logs(created_at);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_answer_keys_updated_at
  BEFORE UPDATE ON public.answer_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_omr_sheets_updated_at
  BEFORE UPDATE ON public.omr_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample answer keys for testing
INSERT INTO public.answer_keys (name, version, subject_breakdown, answers, total_questions, max_score) VALUES
('Sample Exam 2024', 'A', 
 '{"english": {"start": 1, "end": 20}, "math": {"start": 21, "end": 40}, "science": {"start": 41, "end": 60}, "social": {"start": 61, "end": 80}, "hindi": {"start": 81, "end": 100}}'::jsonb,
 '[1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4]'::jsonb,
 100, 100),
('Sample Exam 2024', 'B', 
 '{"english": {"start": 1, "end": 20}, "math": {"start": 21, "end": 40}, "science": {"start": 41, "end": 60}, "social": {"start": 61, "end": 80}, "hindi": {"start": 81, "end": 100}}'::jsonb,
 '[2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1]'::jsonb,
 100, 100);