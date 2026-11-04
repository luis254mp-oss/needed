import React, { useState } from 'react';
import { DELIVERABLES_LIST } from '../data/pythonDeliverables';
import { CloudDeliverable } from '../types';
import { 
  FileCode, Terminal, Download, Copy, Check, ExternalLink, 
  Server, ShieldCheck, CheckCircle2, Cloud
} from 'lucide-react';

export const CloudExportView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<CloudDeliverable>(DELIVERABLES_LIST[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.filename.split('/').pop() || selectedFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-bold text-white tracking-tight">Cloud Deployment & Production Code Suite</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Full Python Flask backend, Procfile, templates, and deployment guides ready for Render or PythonAnywhere.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800">
            WSGI · Gunicorn · PyCryptodome AES-256
          </span>
        </div>
      </div>

      {/* Deployment Quick Guide Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4 text-rose-400" />
          <span>3-Step Cloud Deployment Process (Free Tier)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
            <div className="font-semibold text-rose-400 font-mono">01. Push to Free GitHub</div>
            <p className="text-[11px] text-slate-400">
              Initialize Git repo with <code className="text-slate-300 font-mono">app.py</code>, <code className="text-slate-300 font-mono">Procfile</code>, and <code className="text-slate-300 font-mono">requirements.txt</code>.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
            <div className="font-semibold text-amber-400 font-mono">02. Link to Render Web Service</div>
            <p className="text-[11px] text-slate-400">
              Create free Web Service, set build command: <code className="text-slate-300 font-mono">pip install -r requirements.txt</code>.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
            <div className="font-semibold text-emerald-400 font-mono">03. Inject Secret Keys</div>
            <p className="text-[11px] text-slate-400">
              Set <code className="text-slate-300 font-mono">SECRET_KEY</code>, <code className="text-slate-300 font-mono">ENCRYPTION_KEY</code> (32-byte AES-256), and deploy!
            </p>
          </div>
        </div>
      </div>

      {/* Code Inspector Tabs & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Deliverables Navigation Sidebar */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Generated Project Deliverables
          </div>

          {DELIVERABLES_LIST.map(item => (
            <button
              key={item.filename}
              onClick={() => setSelectedFile(item)}
              className={`w-full text-left p-3 rounded-lg text-xs transition space-y-1 ${
                selectedFile.filename === item.filename
                  ? 'bg-rose-950/70 border border-rose-800 text-white'
                  : 'bg-slate-950/60 border border-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold">{item.filename}</span>
                <span className="text-[10px] text-slate-400 uppercase font-mono">{item.language}</span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">{item.description}</p>
            </button>
          ))}
        </div>

        {/* Code Viewer Panel */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
          
          {/* Header of Viewer */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-mono font-bold text-xs text-rose-400 flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                <span>{selectedFile.path}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{selectedFile.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition flex items-center gap-1.5"
                title="Copy code to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="py-1.5 px-3 bg-rose-700 hover:bg-rose-600 text-white rounded text-xs transition flex items-center gap-1.5"
                title="Download this deliverable"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
            </div>
          </div>

          {/* Syntax Code Container */}
          <div className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[560px] text-slate-200 leading-relaxed selection:bg-rose-900">
            <pre>
              <code>{selectedFile.content}</code>
            </pre>
          </div>

          {/* Bottom Bar info */}
          <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-900/90 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Encoding: UTF-8 · Validated for Python 3.10+</span>
            <span>Target: Mapúa Malayan Colleges Laguna</span>
          </div>

        </div>

      </div>

    </div>
  );
};
