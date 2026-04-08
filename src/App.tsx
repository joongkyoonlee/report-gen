/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  RefreshCw, 
  Copy, 
  Download, 
  Check, 
  AlertCircle,
  ChevronRight,
  Info,
  Quote,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Simplified class merger utility
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

// --- Types ---
interface PressData {
  projectName: string;
  target: string;
  background: string;
  content: string;
  effect: string;
  quote: string;
}

// --- Constants & Templates ---
const INITIAL_DATA: PressData = {
  projectName: '',
  target: '',
  background: '',
  content: '',
  effect: '',
  quote: '',
};

// 보도자료 및 홍보기사 문체 패턴
const PATTERNS = {
  lead: [
    (data: PressData) => `의성군(군수 김주수)은 ${data.target}을 대상으로 하는 '${data.projectName}'을 본격 추진한다고 밝혔다.`,
    (data: PressData) => `의성군(군수 김주수)이 ${data.target}의 편의 증진과 지역 활성화를 위해 '${data.projectName}' 시행에 나섰다.`,
    (data: PressData) => `의성군(군수 김주수)은 최근 행정 수요 변화에 발맞춰 ${data.target}을 위한 '${data.projectName}'을 추진하기로 했다.`,
  ],
  promoLead: [
    (data: PressData) => `의성군(군수 김주수)은 지난 21일 ${data.target}과 함께하는 '${data.projectName}' 현장을 찾아 소통의 시간을 가졌다고 밝혔다.`,
    (data: PressData) => `의성군(군수 김주수)은 지역 매력을 널리 알리기 위해 추진 중인 '${data.projectName}'이 ${data.target}으로부터 큰 호응을 얻고 있다고 전했다.`,
    (data: PressData) => `의성군(군수 김주수)은 ${data.target}의 건강하고 활기찬 일상을 지원하기 위한 '${data.projectName}'을 적극 운영하고 있다.`,
  ],
  background: [
    (data: PressData) => `이번 사업은 ${data.background}에 따라 마련되었으며, 지역 사회의 긍정적인 변화를 이끌어내기 위한 취지다.`,
    (data: PressData) => `${data.background}라는 시대적 요구에 부응하여, 군은 선제적인 행정 서비스를 제공하고자 이번 계획을 수립했다.`,
    (data: PressData) => `군은 ${data.background} 상황을 엄중히 인식하고, 이를 해결하기 위한 실질적인 대책으로 이번 사업을 기획했다.`,
  ],
  content: [
    (data: PressData) => `주요 내용으로는 ${data.content} 등이 포함되어 있으며, 체계적인 운영을 통해 실효성을 높일 계획이다.`,
    (data: PressData) => `사업의 핵심은 ${data.content}으로, 군은 가용 자원을 총동원하여 차질 없이 진행할 방침이다.`,
    (data: PressData) => `구체적으로는 ${data.content}을 중점적으로 추진하며, 현장의 목소리를 반영한 맞춤형 서비스를 제공한다.`,
  ],
  effect: [
    (data: PressData) => `군은 이번 사업을 통해 ${data.effect} 등의 성과를 거둘 것으로 기대하고 있다.`,
    (data: PressData) => `사업이 완료되면 ${data.effect} 등 지역 발전에 새로운 활력을 불어넣을 전망이다.`,
    (data: PressData) => `${data.effect} 등 가시적인 효과가 나타날 수 있도록 사업 관리에 만전을 기할 예정이다.`,
  ],
  closing: [
    (data: PressData) => `김주수 의성군수는 "${data.quote}"라며, "앞으로도 군민이 체감할 수 있는 정책 발굴에 최선을 다하겠다"라고 말했다.`,
    (data: PressData) => `김주수 의성군수는 "${data.quote}"라고 강조하며, "군민 여러분의 많은 관심과 참여를 부탁드린다"라고 당부했다.`,
    (data: PressData) => `김주수 의성군수는 "${data.quote}"라며, "사업의 성공적인 안착을 위해 행정력을 집중하겠다"라고 밝혔다.`,
  ]
};

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'manual' | 'pdf'>('manual');
  const [formData, setFormData] = useState<PressData>(INITIAL_DATA);
  const [generatedResult, setGeneratedResult] = useState<{ title: string; body: string; type: 'press' | 'promo' } | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof PressData, string>>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PDF Processing Logic ---
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setPdfText('');
    try {
      // pdfjs-dist dynamic import
      const pdfjsModule = await import('pdfjs-dist');
      const pdfjs = (pdfjsModule as any).default || pdfjsModule;
      
      // Use a stable version for CDN worker loading
      const version = '4.10.38';
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      
      // cMapUrl is essential for Korean text extraction
      const loadingTask = pdfjs.getDocument({ 
        data: arrayBuffer,
        cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/cmaps/`,
        cMapPacked: true,
      });
      
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => (item as any).str).join(' ');
        fullText += pageText + '\n';
      }

      if (!fullText.trim()) {
        throw new Error('PDF에서 텍스트를 추출할 수 없습니다. 스캔된 이미지 형태의 PDF일 수 있습니다.');
      }

      setPdfText(fullText);
      await aiClassify(fullText);
    } catch (error: any) {
      console.error('PDF 분석 실패:', error);
      alert(`PDF 분석 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setIsAnalyzing(false);
      // Clear input value so the same file can be uploaded again
      if (e.target) e.target.value = '';
    }
  };

  // Gemini AI 기반 자동 분류 로직 (서버사이드 Netlify Function 호출)
  const aiClassify = async (text: string) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('AI 분석 요청 실패');
      }

      const result = await response.json();
      setFormData(result);
      setActiveTab('manual');
    } catch (error) {
      console.error('AI 분석 실패:', error);
      // AI 분석 실패 시 기존의 단순 규칙 기반 분류로 대체
      autoClassify(text);
    }
  };

  // 키워드 기반 자동 분류 로직 (Fallback)
  const autoClassify = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newData = { ...INITIAL_DATA };

    // 간단한 규칙 기반 파싱
    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('사업명') || lowerLine.includes('제목')) {
        newData.projectName = line.split(/[:：]/)[1]?.trim() || lines[index + 1] || '';
      } else if (lowerLine.includes('대상') || lowerLine.includes('인원')) {
        newData.target = line.split(/[:：]/)[1]?.trim() || lines[index + 1] || '';
      } else if (lowerLine.includes('배경') || lowerLine.includes('목적') || lowerLine.includes('필요성')) {
        newData.background = line.split(/[:：]/)[1]?.trim() || lines[index + 1] || '';
      } else if (lowerLine.includes('내용') || lowerLine.includes('개요') || lowerLine.includes('일시')) {
        newData.content = line.split(/[:：]/)[1]?.trim() || lines[index + 1] || '';
      } else if (lowerLine.includes('효과') || lowerLine.includes('기대')) {
        newData.effect = line.split(/[:：]/)[1]?.trim() || lines[index + 1] || '';
      } else if (line.includes('"') || line.includes('“') || lowerLine.includes('인용')) {
        newData.quote = line.replace(/["“”]/g, '').trim();
      }
    });

    // 만약 파싱이 잘 안되었다면 텍스트 덩어리에서 추출 시도 (Fallback)
    if (!newData.projectName && lines[0]) newData.projectName = lines[0].substring(0, 30);
    
    setFormData(newData);
    setActiveTab('manual'); // 분석 후 입력 탭으로 이동하여 확인 유도
  };

  // --- Generation Logic ---
  const validate = () => {
    const newErrors: Partial<Record<keyof PressData, string>> = {};
    if (!formData.projectName) newErrors.projectName = '사업명을 입력해주세요.';
    if (!formData.target) newErrors.target = '대상을 입력해주세요.';
    if (!formData.background) newErrors.background = '추진 배경을 입력해주세요.';
    if (!formData.content) newErrors.content = '주요 내용을 입력해주세요.';
    if (!formData.effect) newErrors.effect = '기대 효과를 입력해주세요.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generatePressRelease = () => {
    try {
      if (!validate()) return;

      const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

      const title = `의성군, '${formData.projectName}' 추진으로 지역 활력 제고`;
      
      const lead = getRandom(PATTERNS.lead)(formData);
      const backgroundPara = `[추진배경] ${getRandom(PATTERNS.background)(formData)}`;
      const contentPara = `[주요내용] ${getRandom(PATTERNS.content)(formData)}`;
      const effectPara = `[기대효과] ${getRandom(PATTERNS.effect)(formData)}`;
      const closingPara = formData.quote 
        ? getRandom(PATTERNS.closing)(formData)
        : `의성군 관계자는 "이번 사업이 지역 발전에 실질적인 도움이 되길 바란다"라며 "앞으로도 군민을 위한 적극 행정을 펼치겠다"라고 전했다.`;

      const body = `${lead}\n\n${backgroundPara}\n\n${contentPara}\n\n${effectPara}\n\n${closingPara}`;
      
      setGeneratedResult({ title, body, type: 'press' });
    } catch (err) {
      console.error('Generation error:', err);
      alert('보도자료 생성 중 오류가 발생했습니다.');
    }
  };

  const generatePromoArticle = () => {
    try {
      if (!validate()) return;

      const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

      const title = `의성군, '${formData.projectName}'으로 군민과 따뜻한 소통 이어가`;
      
      const lead = getRandom(PATTERNS.promoLead)(formData);
      const backgroundPara = `이번 '${formData.projectName}'은 ${formData.background}을 위해 마련됐으며, 현장에서는 ${formData.content} 등 다채로운 프로그램이 진행됐다.`;
      const effectPara = `특히 이를 통해 ${formData.target}이 지역의 매력을 생생하게 체감할 수 있는 계기를 제공했으며, 향후 ${formData.effect} 등 긍정적인 파급효과가 나타날 것으로 기대된다.`;
      const additionalPara = `의성군은 앞으로도 현장 중심의 행정을 통해 군민의 목소리를 경청하고, 지역 사회가 함께 성장할 수 있는 다양한 콘텐츠를 지속적으로 발굴해 나갈 계획이다.`;
      const closingPara = formData.quote 
        ? getRandom(PATTERNS.closing)(formData)
        : `김주수 의성군수는 "이번 활동을 통해 지역 공동체의 따뜻한 온기를 느낄 수 있었다"라며 "앞으로도 건강하고 활기찬 의성을 만드는 데 최선을 다하겠다"라고 말했다.`;

      const body = `${lead}\n\n${backgroundPara}\n\n${effectPara}\n\n${additionalPara}\n\n${closingPara}`;
      
      setGeneratedResult({ title, body, type: 'promo' });
    } catch (err) {
      console.error('Promo generation error:', err);
      alert('홍보기사 생성 중 오류가 발생했습니다.');
    }
  };

  // --- Utilities ---
  const handleReset = () => {
    setFormData(INITIAL_DATA);
    setGeneratedResult(null);
    setPdfText('');
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyToClipboard = () => {
    if (!generatedResult) return;
    const text = `${generatedResult.title}\n\n${generatedResult.body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const saveAsHtml = () => {
    if (!generatedResult) return;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${generatedResult.title}</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
          h1 { border-bottom: 2px solid #003b72; padding-bottom: 10px; color: #003b72; font-size: 24px; }
          .content { white-space: pre-wrap; margin-top: 20px; }
          .footer { margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>${generatedResult.title}</h1>
        <div class="content">${generatedResult.body}</div>
        <div class="footer">본 보도자료는 의성군 보도자료 AI 생성기를 통해 작성된 초안입니다.</div>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `보도자료_${formData.projectName || '초안'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Render Helpers ---
  const renderInput = (label: string, field: keyof PressData, placeholder: string, isTextArea = false) => (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-sm font-bold text-slate-700">{label}</label>
        {errors[field] && <span className="text-[10px] text-red-500 font-medium flex items-center gap-1"><AlertCircle size={10}/> {errors[field]}</span>}
      </div>
      {isTextArea ? (
        <textarea
          value={formData[field]}
          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
          className={cn(
            "w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/30 outline-none placeholder:text-slate-400 transition-all resize-none min-h-[80px]",
            errors[field] && "ring-1 ring-red-200 bg-red-50/30"
          )}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={formData[field]}
          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
          className={cn(
            "w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/30 outline-none placeholder:text-slate-400 transition-all",
            errors[field] && "ring-1 ring-red-200 bg-red-50/30"
          )}
          placeholder={placeholder}
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans selection:bg-primary/10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <FileText className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-primary tracking-tight leading-none">의성군 보도자료 AI</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Uiseong Press Intelligence</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex gap-6 text-sm font-bold text-slate-500">
              <a href="#" className="text-primary border-b-2 border-primary pb-1">생성기</a>
              <a href="#" className="hover:text-primary transition-colors">가이드라인</a>
              <a href="#" className="hover:text-primary transition-colors">문의하기</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Input Section */}
          <section className="lg:col-span-7 space-y-6">
            <div 
              className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">새 보도자료 작성</h2>
                  <p className="text-sm text-slate-400 mt-1">정보를 입력하거나 문서를 업로드하여 초안을 만드세요.</p>
                </div>
                <button 
                  onClick={handleReset}
                  className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-full transition-all"
                  title="초기화"
                >
                  <RefreshCw size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
                <button 
                  onClick={() => setActiveTab('manual')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all",
                    activeTab === 'manual' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <FileText size={16} /> 직접 입력
                </button>
                <button 
                  onClick={() => setActiveTab('pdf')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all",
                    activeTab === 'pdf' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Upload size={16} /> PDF 업로드
                </button>
              </div>

              {/* Tab Content */}
              <div className="mt-4">
                {activeTab === 'manual' ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {renderInput('사업명', 'projectName', '예: 의성 마늘 축제 개최')}
                      {renderInput('대상', 'target', '예: 의성군민 및 관광객')}
                    </div>
                    {renderInput('추진 배경', 'background', '사업의 필요성 및 배경을 입력하세요.', true)}
                    {renderInput('주요 내용', 'content', '일시, 장소, 프로그램 등 핵심 내용을 입력하세요.', true)}
                    {renderInput('기대 효과', 'effect', '지역 경제 활성화 및 브랜드 가치 제고 등')}
                    {renderInput('담당자 인용문 (선택)', 'quote', '주무부서장 또는 담당자의 코멘트를 입력하세요.', true)}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-all group"
                    >
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="text-slate-400 group-hover:text-primary" size={32} />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-bold text-slate-700">PDF 파일을 드래그하거나 클릭하세요</p>
                        <p className="text-xs text-slate-400 mt-1">문서 내 텍스트를 분석하여 항목을 자동 분류합니다.</p>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handlePdfUpload} 
                        accept=".pdf" 
                        className="hidden" 
                      />
                    </div>

                    {isAnalyzing && (
                      <div className="flex flex-col items-center justify-center gap-4 py-10 text-primary font-bold text-sm bg-primary/5 rounded-3xl border border-primary/20 animate-pulse">
                        <div className="relative">
                          <RefreshCw className="animate-spin" size={40} />
                          <Sparkles className="absolute -top-2 -right-2 text-amber-400" size={20} />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-base">Gemini AI 지능형 분석 중...</p>
                          <p className="text-xs text-slate-400 font-normal">문서의 핵심 내용을 파악하여 항목별로 자동 정리하고 있습니다.</p>
                        </div>
                      </div>
                    )}

                    {pdfText && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <Info size={14} className="text-primary" /> 추출된 텍스트 미리보기
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-5 text-xs text-slate-500 max-h-[200px] overflow-y-auto leading-relaxed border border-slate-100">
                          {pdfText}
                        </div>
                        <p className="text-[10px] text-slate-400 italic">* 분석 결과가 완벽하지 않을 수 있으니 직접 입력 탭에서 내용을 확인해 주세요.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons - Moved outside tab content to be always visible */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100">
                <button 
                  onClick={generatePressRelease}
                  className="bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  보도자료 생성 <ChevronRight size={18} />
                </button>
                <button 
                  onClick={generatePromoArticle}
                  className="bg-slate-800 text-white py-4 rounded-2xl font-black shadow-lg shadow-slate-800/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  홍보기사 생성 <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </section>

          {/* Right: Preview Section */}
          <section className="lg:col-span-5 sticky top-28">
            <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl shadow-slate-300/50 border border-slate-800 flex flex-col min-h-[600px]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-white tracking-tight">
                  {generatedResult?.type === 'press' ? '보도자료 미리보기' : '홍보기사 미리보기'}
                </h2>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/20 text-primary-fixed rounded-full">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {generatedResult?.type === 'press' ? 'Official Press' : 'Promo Article'}
                  </span>
                </div>
              </div>

              {generatedResult ? (
                <div className="flex-1 flex flex-col gap-6">
                  <div className="bg-white rounded-2xl p-8 shadow-inner flex-1 overflow-y-auto max-h-[500px] custom-scrollbar">
                    <div className="border-b-2 border-primary/10 pb-4 mb-6">
                      <h3 className="text-lg font-black text-slate-900 leading-tight">
                        {generatedResult.title}
                      </h3>
                    </div>
                    
                    <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
                      <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-primary font-medium text-slate-800">
                        {generatedResult.body.split('\n\n')[0]}
                      </div>
                      
                      {generatedResult.body.split('\n\n').slice(1).map((para, idx) => (
                        <p key={idx} className={para.startsWith('[') ? "font-medium" : ""}>
                          {para}
                        </p>
                      ))}
                    </div>

                    {formData.quote && (
                      <div className="mt-8 pt-6 border-t border-slate-100 flex gap-3">
                        <Quote className="text-primary/20 shrink-0" size={24} />
                        <p className="text-xs italic text-slate-500 leading-relaxed">
                          "{formData.quote}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={copyToClipboard}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all",
                        copySuccess ? "bg-green-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                      )}
                    >
                      {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                      {copySuccess ? "복사됨" : "클립보드 복사"}
                    </button>
                    <button 
                      onClick={saveAsHtml}
                      className="flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-2xl text-sm font-black hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                    >
                      <Download size={18} /> HTML 저장
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-40">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <FileText className="text-white" size={32} />
                  </div>
                  <p className="text-white font-bold">내용을 입력하고<br/>보도자료를 생성해 보세요</p>
                  <p className="text-slate-500 text-xs mt-2">입력된 데이터를 바탕으로<br/>공식 문체 초안이 작성됩니다.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/60 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-sm font-black text-primary tracking-widest uppercase">Uiseong-Gun Admin</span>
            <p className="text-[10px] text-slate-400 font-bold">© 2024 UISEONG-GUN. ALL RIGHTS RESERVED.</p>
          </div>
          <div className="flex gap-8 text-[11px] font-bold text-slate-500">
            <a href="#" className="hover:text-primary transition-colors">개인정보처리방침</a>
            <a href="#" className="hover:text-primary transition-colors">이용약관</a>
            <a href="#" className="hover:text-primary transition-colors">시스템 문의</a>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 cursor-pointer transition-all">
              <RefreshCw size={14} />
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 cursor-pointer transition-all">
              <Info size={14} />
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
