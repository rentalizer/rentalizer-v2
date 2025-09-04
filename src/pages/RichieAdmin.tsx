import React from 'react';
import { RichieAdminPanel } from '@/components/RichieAdminPanel';
import { AdminLeadsPanel } from '@/components/AdminLeadsPanel';
import { Bot, Database } from 'lucide-react';

const RichieAdmin = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bot className="h-12 w-12 text-cyan-400" />
            <Database className="h-8 w-8 text-blue-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Ask Richie AI - Admin Panel
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Manage Richie's knowledge base and training materials
          </p>
        </div>

        {/* Admin Panel */}
        <RichieAdminPanel />
        
        {/* Lead Captures Panel */}
        <div className="mt-8">
          <AdminLeadsPanel />
        </div>
      </div>
    </div>
  );
};

export default RichieAdmin;