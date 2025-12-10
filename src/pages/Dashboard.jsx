import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Building2, 
  FileText, 
  ClipboardList, 
  BarChart3, 
  Link2, 
  FileType, 
  Activity,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const tools = [
  {
    name: 'HOA Manager',
    description: 'Manage homeowner associations, board members, and community operations.',
    icon: Building2,
    path: 'HOAManager',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    status: 'coming_soon'
  },
  {
    name: 'Invoice Flow',
    description: 'Streamline invoice processing, approvals, and payment tracking.',
    icon: FileText,
    path: 'InvoiceFlow',
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50',
    status: 'coming_soon'
  },
  {
    name: 'Resident Forms',
    description: 'Create and manage resident requests, applications, and submissions.',
    icon: ClipboardList,
    path: 'ResidentForms',
    color: 'from-violet-500 to-violet-600',
    bgColor: 'bg-violet-50',
    status: 'coming_soon'
  },
  {
    name: 'Survey Hub',
    description: 'Design surveys, collect responses, and analyze community feedback.',
    icon: BarChart3,
    path: 'SurveyHub',
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-50',
    status: 'coming_soon'
  },
  {
    name: 'Link Vault',
    description: 'Organize and share important links, documents, and resources.',
    icon: Link2,
    path: 'LinkVault',
    color: 'from-rose-500 to-rose-600',
    bgColor: 'bg-rose-50',
    status: 'coming_soon'
  },
  {
    name: 'PDFForge',
    description: 'Generate, merge, and transform PDF documents with ease.',
    icon: FileType,
    path: 'PDFForge',
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-50',
    status: 'coming_soon'
  },
  {
    name: 'Property Pulse',
    description: 'Monitor property metrics, maintenance schedules, and insights.',
    icon: Activity,
    path: 'PropertyPulse',
    color: 'from-fuchsia-500 to-fuchsia-600',
    bgColor: 'bg-fuchsia-50',
    status: 'coming_soon'
  },
];

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#414257] to-[#5c5f7a] p-8 lg:p-12 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Welcome to your command center</span>
          </div>
          
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">
            Welcome to Nexus
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Your central hub for all internal tools and operations. Access HOA management, 
            invoice processing, resident services, and more — all from one unified platform.
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-[#414257]">Your Tools</h2>
            <p className="text-[#5c5f7a] mt-1">Quick access to all applets</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            
            return (
              <Link
                key={tool.path}
                to={createPageUrl(tool.path)}
                className="group"
              >
                <Card className="h-full border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden bg-white">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl ${tool.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-6 h-6 bg-gradient-to-br ${tool.color} bg-clip-text text-transparent`} style={{color: tool.color.includes('blue') ? '#3b82f6' : tool.color.includes('emerald') ? '#10b981' : tool.color.includes('violet') ? '#8b5cf6' : tool.color.includes('amber') ? '#f59e0b' : tool.color.includes('rose') ? '#f43f5e' : tool.color.includes('cyan') ? '#06b6d4' : '#d946ef'}} />
                      </div>
                      {tool.status === 'coming_soon' && (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#e3e4ed] text-[#5c5f7a]">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg text-[#414257] group-hover:text-[#5c5f7a] transition-colors">
                      {tool.name}
                    </CardTitle>
                    <CardDescription className="text-[#5c5f7a] leading-relaxed">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#414257] group-hover:text-[#5c5f7a] transition-colors">
                      <span>Open tool</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Associations', value: '—', change: null },
          { label: 'Pending Invoices', value: '—', change: null },
          { label: 'Open Forms', value: '—', change: null },
          { label: 'Survey Responses', value: '—', change: null },
        ].map((stat, index) => (
          <Card key={index} className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <p className="text-sm text-[#5c5f7a] mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-[#414257]">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}