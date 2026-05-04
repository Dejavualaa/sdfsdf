import React, { useState, useRef } from 'react';
import { Upload, FileText, FileImage, Loader2, Download, RefreshCw } from 'lucide-react';
import { processInput } from './services/geminiService';
import { extractTextFromPdf, downloadAsPdf } from './services/pdfService';
import { downloadAsDocx } from './services/docxService';
import { PreviewDisplay } from './components/PreviewDisplay';
import { TransformationResult, PendingMedia } from './types';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TransformationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      if (file.type === 'application/pdf') {
        const text = await extractTextFromPdf(file);
        if (text.trim().length > 50) {
          setInputText(prev => prev + (prev ? '\n\n' : '') + text);
        } else {
          // Scanned PDF or no text extracted, fallback to image/base64 if possible
          const base64 = await toBase64(file);
          setPendingMedia(prev => [...prev, { data: base64, mimeType: file.type }]);
        }
      } else if (file.type.startsWith('image/')) {
        const base64 = await toBase64(file);
        setPendingMedia(prev => [...prev, { data: base64, mimeType: file.type }]);
      } else {
        setError('Unsupported file type. Please upload a PDF or Image.');
      }
    } catch (err: any) {
      setError('Error processing file: ' + err.message);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async () => {
    if (!inputText.trim() && pendingMedia.length === 0) {
      setError('Please provide some text or upload a file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await processInput(inputText, pendingMedia);
      setResult(res);
    } catch (err: any) {
      setError('Error generating notes: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOver = () => {
    setResult(null);
    setInputText('');
    setPendingMedia([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-blue-900 mb-2 flex items-center justify-center gap-3">
            <FileText className="w-10 h-10 text-blue-600" />
            QuickDoc Scribe
          </h1>
          <p className="text-slate-600 text-lg">Elite Medical Intelligence Engine & Scribe</p>
        </header>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm">
            <p>{error}</p>
          </div>
        )}

        {!result ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-slate-100">
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Paste Medical Text, Lectures, or Notes
              </label>
              <textarea
                className="w-full h-64 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                placeholder="Paste your messy medical text here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="application/pdf,image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                  disabled={isLoading}
                >
                  <Upload className="w-5 h-5" />
                  Upload PDF / Image
                </button>
                
                {pendingMedia.length > 0 && (
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <FileImage className="w-4 h-4" />
                    {pendingMedia.length} file(s) attached
                  </span>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={isLoading || (!inputText.trim() && pendingMedia.length === 0)}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Generate High-Yield Notes'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <button
                onClick={handleStartOver}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Start Over
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={() => downloadAsDocx(result.structured)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Export DOCX
                </button>
                <button
                  onClick={() => downloadAsPdf(result.structured)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Export PDF
                </button>
              </div>
            </div>

            <PreviewDisplay content={result.structured} />
            
            {/* Optional: Show raw output for debugging */}
            <details className="mt-8 text-sm text-slate-500">
              <summary className="cursor-pointer hover:text-slate-700">Show Raw AI Output</summary>
              <pre className="mt-4 p-4 bg-slate-100 rounded-lg overflow-x-auto whitespace-pre-wrap">
                {result.raw}
              </pre>
            </details>
          </div>
        )}

      </div>
    </div>
  );
}
