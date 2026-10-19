'use client';

import React, { useState, useEffect } from 'react';
import { Award, Upload, Save, CheckCircle2, RefreshCw, Eye, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { CertificateTemplate, CertificateData } from './CertificateTemplate';

interface CourseOption {
  id: string;
  title: string;
  certificateConfig?: any;
}

interface CertificateConfigTabProps {
  courses: CourseOption[];
  onConfigSaved?: () => void;
  showToast: (msg: string) => void;
}

export function CertificateConfigTab({ courses, onConfigSaved, showToast }: CertificateConfigTabProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [instructorName, setInstructorName] = useState('');
  const [instructorTitle, setInstructorTitle] = useState('Master Educadora');
  const [hours, setHours] = useState<number>(16);
  const [borderStyle, setBorderStyle] = useState<'GOLD' | 'SLATE' | 'CHAMPAGNE'>('GOLD');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [programmaticContent, setProgrammaticContent] = useState('');
  const [customText, setCustomText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Seleciona o curso atual e preenche o formulário
  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    const course = courses.find((c) => c.id === selectedCourseId);
    if (course?.certificateConfig) {
      const cfg = course.certificateConfig;
      setInstructorName(cfg.instructorName || '');
      setInstructorTitle(cfg.instructorTitle || 'Master Educadora');
      setHours(cfg.hours || 16);
      setBorderStyle(cfg.borderStyle || 'GOLD');
      setSignatureUrl(cfg.signatureUrl || '');
      setLogoUrl(cfg.logoUrl || '');
      setProgrammaticContent(cfg.programmaticContent || '');
      setCustomText(cfg.customText || '');
    } else {
      // Defaults sóbrios para preenchimento rápido
      setInstructorName('');
      setInstructorTitle('Master Educadora');
      setHours(16);
      setBorderStyle('GOLD');
      setSignatureUrl('');
      setLogoUrl('');
      setProgrammaticContent('');
      setCustomText('');
    }
  }, [selectedCourseId, courses]);

  // Upload de Assinatura Digitalizada
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingSignature(true);
    try {
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.url || res.data?.fileUrl;
      if (url) {
        setSignatureUrl(url);
        showToast('Assinatura digitalizada enviada com sucesso!');
      }
    } catch {
      showToast('Erro ao enviar imagem da assinatura.');
    } finally {
      setUploadingSignature(false);
    }
  };

  // Upload de Logotipo da Formação
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingLogo(true);
    try {
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.url || res.data?.fileUrl;
      if (url) {
        setLogoUrl(url);
        showToast('Logotipo do certificado enviado com sucesso!');
      }
    } catch {
      showToast('Erro ao enviar logotipo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedCourseId) {
      showToast('Selecione uma formação para salvar a configuração do certificado.');
      return;
    }

    setSaving(true);
    try {
      const certificateConfig = {
        instructorName: instructorName.trim() || null,
        instructorTitle: instructorTitle.trim() || 'Master Educadora',
        hours: Number(hours) || 16,
        borderStyle,
        signatureUrl: signatureUrl || null,
        logoUrl: logoUrl || null,
        programmaticContent: programmaticContent.trim() || null,
        customText: customText.trim() || null
      };

      await api.put(`/courses/${selectedCourseId}`, {
        certificateConfig
      });

      showToast('Modelo de certificado atualizado com sucesso!');
      if (onConfigSaved) onConfigSaved();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao salvar configuração do certificado.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  // Dados para o Live Preview em tempo real
  const previewData: CertificateData = {
    code: 'MSH-CERT-EXEMPLO',
    studentName: 'Juliana Mendes da Silva',
    courseTitle: selectedCourse?.title || 'Especialização Profissional',
    tenantName: 'Espaço Beleza & Estética',
    tenantLogoUrl: logoUrl || null,
    completedAt: new Date(),
    hours: Number(hours) || 16,
    instructorName: instructorName || 'Emanuelle Telles',
    instructorTitle: instructorTitle || 'Master Educadora',
    signatureUrl: signatureUrl || null,
    borderStyle,
    customText: customText || null,
    programmaticContent: programmaticContent || null,
    verificationUrl: 'https://marquesuahora.com.br/validar/MSH-CERT-EXEMPLO'
  };

  if (courses.length === 0) {
    return (
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-8 text-center text-zinc-500">
        <Award className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
        <p className="text-sm font-medium text-zinc-700">Nenhum curso cadastrado ainda.</p>
        <p className="text-xs text-zinc-500 mt-1">
          Cadastre seu primeiro curso na aba &quot;Cursos &amp; Aulas&quot; para configurar o modelo de certificado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra Superior de Seleção do Curso */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-zinc-100 rounded-xl text-zinc-700">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Configuração do Certificado Profissional</h3>
            <p className="text-xs text-zinc-500">
              Personalize a chancela, assinatura digitalizada e moldura para emissão às alunas formadas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-semibold text-zinc-600 whitespace-nowrap">Curso:</label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full md:w-64 px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Formulário de Configuração */}
        <div className="lg:col-span-5 bg-white border border-zinc-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-100 pb-2">
            Identidade do Diploma
          </h4>

          {/* Nome da Instrutora */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Nome da Instrutora / Master</label>
            <input
              type="text"
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
              placeholder="Ex: Emanuelle Telles"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {/* Título da Instrutora */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Título Profissional</label>
            <input
              type="text"
              value={instructorTitle}
              onChange={(e) => setInstructorTitle(e.target.value)}
              placeholder="Ex: Master Educadora Internacional em Nail Design"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {/* Carga Horária e Estilo da Borda */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Carga Horária (h)</label>
              <input
                type="number"
                min="1"
                max="500"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Estilo da Moldura</label>
              <select
                value={borderStyle}
                onChange={(e) => setBorderStyle(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                <option value="GOLD">Dourado Nobre</option>
                <option value="SLATE">Grafite Ardósia</option>
                <option value="CHAMPAGNE">Champagne Ouro</option>
              </select>
            </div>
          </div>

          {/* Assinatura Escaneada */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Assinatura Digitalizada da Instrutora (PNG transparente)
            </label>
            <div className="flex items-center gap-3">
              {signatureUrl ? (
                <div className="relative p-1 bg-zinc-50 border border-zinc-200 rounded-lg">
                  <img src={signatureUrl} alt="Assinatura" className="h-10 max-w-[120px] object-contain" />
                </div>
              ) : (
                <div className="text-xs text-zinc-400 italic">Nenhuma assinatura carregada</div>
              )}
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors border border-zinc-300">
                <Upload className="w-3.5 h-3.5" />
                {uploadingSignature ? 'Enviando...' : signatureUrl ? 'Trocar' : 'Carregar PNG'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleSignatureUpload}
                  disabled={uploadingSignature}
                />
              </label>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Dica: Fotografe sua assinatura em papel branco ou escaneie com fundo transparente.
            </p>
          </div>

          {/* Logotipo do Certificado */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Logotipo da Formação / Salão (Opcional)
            </label>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div className="relative p-1 bg-zinc-50 border border-zinc-200 rounded-lg">
                  <img src={logoUrl} alt="Logotipo" className="h-8 max-w-[100px] object-contain" />
                </div>
              ) : (
                <div className="text-xs text-zinc-400 italic">Usa o nome do salão</div>
              )}
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors border border-zinc-300">
                <Upload className="w-3.5 h-3.5" />
                {uploadingLogo ? 'Enviando...' : logoUrl ? 'Trocar' : 'Subir Logo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
              </label>
            </div>
          </div>

          {/* Conteúdo Programático */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Resumo do Conteúdo Programático (Opcional)
            </label>
            <textarea
              rows={2}
              value={programmaticContent}
              onChange={(e) => setProgrammaticContent(e.target.value)}
              placeholder="Ex: Anatomia da lâmina, biossegurança, aplicação de fibra de vidro e curvatura C."
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {/* Botão de Salvar */}
          <div className="pt-2 border-t border-zinc-100">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Salvando...' : 'Salvar Modelo de Certificado'}
            </button>
          </div>
        </div>

        {/* Coluna Direita: Live Preview em Tempo Real */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
            <div className="flex items-center gap-2 text-zinc-300 text-xs font-semibold">
              <Eye className="w-4 h-4 text-zinc-400" />
              Pré-Visualização ao Vivo (A4 Paisagem)
            </div>
            <span className="text-[11px] text-zinc-500 font-medium">Atualiza em tempo real</span>
          </div>

          <div className="w-full overflow-x-auto flex justify-center py-2">
            <div className="w-full max-w-xl shadow-2xl">
              <CertificateTemplate data={previewData} />
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 text-center mt-4">
            O certificado gerado para as alunas conterá o código de autenticação único e QR Code para validação em{' '}
            <strong className="text-zinc-300">marquesuahora.com.br/validar/:codigo</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
