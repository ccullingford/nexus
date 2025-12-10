import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  ClipboardList, 
  BarChart3, 
  Link2, 
  FileType, 
  Activity,
  Menu,
  X,
  ChevronRight,
  LogOut
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: 'Dashboard' },
  { name: 'Invoice Manager', icon: FileText, path: 'InvoiceManager' },
  { name: 'HOA Manager', icon: Building2, path: 'HOAManager' },
  { name: 'Resident Forms', icon: ClipboardList, path: 'ResidentForms' },
  { name: 'Survey Hub', icon: BarChart3, path: 'SurveyHub' },
  { name: 'Link Vault', icon: Link2, path: 'LinkVault' },
  { name: 'PDFForge', icon: FileType, path: 'PDFForge' },
  { name: 'Property Pulse', icon: Activity, path: 'PropertyPulse' },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const user = {
    initials: 'CM',
    name: 'Chris Cullingford',
    email: 'cm@cullingford.net',
    role: 'Super Admin'
  };

  return (
    <div className="min-h-screen bg-[#f8f8fb] flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${sidebarCollapsed ? 'w-20' : 'w-72'}
          bg-[#414257] text-white
          transform transition-all duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Sidebar Header */}
        <div className={`h-16 flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-6'} border-b border-white/10`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <span className="text-lg font-bold">N</span>
              </div>
              <span className="text-xl font-semibold tracking-tight">Nexus</span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="text-lg font-bold">N</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto">
          <div className={`${sidebarCollapsed ? 'px-2' : 'px-4'} space-y-1`}>
            {navItems.map((item) => {
              const isActive = currentPageName === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={createPageUrl(item.path)}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group flex items-center gap-3 
                    ${sidebarCollapsed ? 'justify-center px-3 py-3' : 'px-4 py-3'}
                    rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-white text-[#414257] shadow-lg shadow-black/10' 
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }
                  `}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#414257]' : ''}`} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="font-medium flex-1">{item.name}</span>
                      {isActive && <ChevronRight className="w-4 h-4" />}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer - Collapse Toggle (desktop only) */}
        <div className={`hidden lg:block ${sidebarCollapsed ? 'px-2' : 'px-4'} py-4 border-t border-white/10`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`
              w-full flex items-center gap-3 
              ${sidebarCollapsed ? 'justify-center px-3 py-3' : 'px-4 py-3'}
              rounded-xl text-white/70 hover:bg-white/10 hover:text-white
              transition-all duration-200
            `}
          >
            <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${sidebarCollapsed ? '' : 'rotate-180'}`} />
            {!sidebarCollapsed && <span className="font-medium">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-[#414257]" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-[#414257]">
                {navItems.find(item => item.path === currentPageName)?.name || 'Nexus'}
              </h1>
            </div>
          </div>

          {/* Right side - User */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-[#414257]">{user.name}</p>
              <p className="text-xs text-[#5c5f7a]">{user.role}</p>
            </div>
            <div className="relative group">
              <button className="w-10 h-10 rounded-full bg-[#414257] text-white font-semibold flex items-center justify-center hover:bg-[#5c5f7a] transition-colors">
                {user.initials}
              </button>
              
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                  <p className="text-sm font-medium text-[#414257]">{user.name}</p>
                  <p className="text-xs text-[#5c5f7a]">{user.email}</p>
                </div>
                <button className="w-full px-4 py-2 text-left text-sm text-[#414257] hover:bg-gray-50 flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}