import React, { useState, useEffect } from 'react';
import type { AppView, StakeholderRole } from '../types';
import logoSvg from '../assets/logo.svg';
import iconSvg from '../assets/icon.svg';
import { ArrowRight, Activity, LogOut, ChevronDown, Bell, Check } from 'lucide-react';
import { notificationService, type NotificationItem } from '../lib/api';
import type { AuthUser } from '../lib/api';

interface HeaderProps {
  currentView: AppView;
  currentRole: StakeholderRole | null;
  currentUser?: AuthUser | null;
  onNavigate: (view: AppView, role?: StakeholderRole) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, currentRole, currentUser, onNavigate, onLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }

    // 1. Initial fetch of notifications
    notificationService.getNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]));

    // 2. Realtime subscription strictly scoped to authenticated user_id
    const unsubscribe = notificationService.subscribeToUserNotifications(
      currentUser.id,
      (newNotification) => {
        // Prevent duplicate events
        setNotifications((prev) => {
          if (prev.some((n) => n.id === newNotification.id)) {
            return prev;
          }
          return [newNotification, ...prev];
        });
      },
      (err) => {
        console.warn('Realtime subscription notice:', err);
      }
    );

    // 3. Cleanup on unmount or user change/logout
    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const isDashboard = currentView.endsWith('-dashboard');

  return (
    <header className="sticky top-0 z-50 w-full bg-[#F4F4E7]/95 backdrop-blur-md border-b border-[#D5CEAE] transition-all">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 h-[90px] flex items-center justify-between flex-nowrap gap-2">
        
        {/* Zone 1: Logo & Institutional Lockup (Left) */}
        <div className="flex items-center min-w-0">
          <button 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 sm:gap-3 group focus:outline-none text-left cursor-pointer min-w-0"
            aria-label="Kaushal Setu Homepage"
          >
            <img 
              src={logoSvg} 
              alt="Kaushal Setu कौशल सेतु" 
              className="h-9 xl:h-11 w-auto object-contain hidden md:block shrink-0" 
            />
            <div className="flex items-center gap-1.5 sm:gap-2 md:hidden min-w-0">
              <img src={iconSvg} alt="Kaushal Setu" className="h-7 w-auto shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-xs tracking-tight text-[#263B52] leading-none truncate">KAUSHAL SETU</span>
                <span className="font-medium text-[9px] text-[#47617C] leading-none mt-0.5 truncate">कौशल सेतु</span>
              </div>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Center) */}
        {!isDashboard ? (
          <nav 
            className="hidden xl:flex items-center gap-6 text-[12px] font-semibold uppercase tracking-wider text-[#47617C] shrink-0"
            aria-label="Primary Navigation"
          >
            <button 
              onClick={() => onNavigate('landing')}
              className={`relative py-1.5 transition-colors cursor-pointer ${
                currentView === 'landing' 
                  ? 'text-[#0F253B] font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#263B52]' 
                  : 'hover:text-[#0F253B]'
              }`}
            >
              Overview
            </button>
            <a 
              href="#lifecycle" 
              className="py-1.5 hover:text-[#0F253B] transition-colors whitespace-nowrap"
            >
              5-Stage Lifecycle
            </a>
            <a 
              href="#metrics" 
              className="py-1.5 hover:text-[#0F253B] transition-colors whitespace-nowrap"
            >
              Outcomes
            </a>
            <a 
              href="#stakeholders" 
              className="py-1.5 hover:text-[#0F253B] transition-colors whitespace-nowrap"
            >
              Stakeholders
            </a>
            <a 
              href="#anti-ghosting" 
              className="py-1.5 hover:text-[#0F253B] transition-colors whitespace-nowrap"
            >
              Anti-Ghosting Audit
            </a>
          </nav>
        ) : (
          /* Dashboard Navigation Breadcrumb & Context */
          <div className="flex items-center gap-2 text-xs font-mono text-[#47617C] shrink-0">
            <span className="text-[#0F253B] font-bold uppercase tracking-wider truncate max-w-[130px] sm:max-w-none">
              {currentRole === 'trainee' && 'TRAINEE PORTAL · PRIYA'}
              {currentRole === 'employer' && 'EMPLOYER WORKSPACE · TATA'}
              {currentRole === 'provider' && 'PROVIDER PORTAL · CENTURION'}
              {currentRole === 'government' && 'SOVEREIGN INTELLIGENCE · NCVET'}
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] bg-[#D8EEDF] text-[#164627] font-semibold border border-[#B6DBC0] rounded">
              3P Verified ✓
            </span>
          </div>
        )}

        {/* Zone 3: Actions (Right) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick Stakeholder Role Selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-mono bg-white hover:bg-[#FAF7EE] text-[#263B52] border border-[#263B52] rounded transition-colors cursor-pointer shrink-0"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              aria-label="Select Stakeholder View"
            >
              <Activity className="w-3.5 h-3.5 text-[#263B52] shrink-0" />
              <span className="hidden sm:inline font-bold capitalize">{currentRole || 'Role'}</span>
              <ChevronDown className={`w-3 h-3 text-[#263B52] transition-transform shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-60 sm:w-64 bg-white border border-[#263B52] shadow-lg rounded z-50 py-1 font-mono text-xs animate-in fade-in duration-150"
                onClick={() => setDropdownOpen(false)}
              >
                <div className="px-3.5 py-2 bg-[#F4F4E7] border-b border-[#D5CEAE] text-[10px] text-[#47617C] uppercase font-bold tracking-wider">
                  Select Stakeholder Node
                </div>
                <button
                  onClick={() => onNavigate('trainee-dashboard', 'trainee')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#F2C8B4]/30 flex items-center justify-between text-[#0F253B] transition-colors cursor-pointer"
                >
                  <span className="font-medium">01. Trainee (Priya)</span>
                  <span className="text-[10px] bg-[#F2C8B4] px-1.5 py-0.5 rounded text-[#182A3A] font-semibold">Trainee</span>
                </button>
                <button
                  onClick={() => onNavigate('employer-dashboard', 'employer')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#C8C4F2]/30 flex items-center justify-between text-[#0F253B] transition-colors cursor-pointer"
                >
                  <span className="font-medium">02. Employer (Tata)</span>
                  <span className="text-[10px] bg-[#C8C4F2] px-1.5 py-0.5 rounded text-[#182A3A] font-semibold">Employer</span>
                </button>
                <button
                  onClick={() => onNavigate('provider-dashboard', 'provider')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#F3E8A8]/30 flex items-center justify-between text-[#0F253B] transition-colors cursor-pointer"
                >
                  <span className="font-medium">03. Training Partner (VTP)</span>
                  <span className="text-[10px] bg-[#F3E8A8] px-1.5 py-0.5 rounded text-[#182A3A] font-semibold">Provider</span>
                </button>
                <button
                  onClick={() => onNavigate('government-dashboard', 'government')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#C9DCF1]/30 flex items-center justify-between text-[#0F253B] transition-colors cursor-pointer"
                >
                  <span className="font-medium">04. State Mission (Gov)</span>
                  <span className="text-[10px] bg-[#C9DCF1] px-1.5 py-0.5 rounded text-[#182A3A] font-semibold">Government</span>
                </button>
              </div>
            )}
          </div>

          {/* Real Supabase Database Notifications */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-1.5 sm:p-2 text-[#263B52] hover:bg-[#EDE8D5] rounded-full transition-colors cursor-pointer"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-[#263B52] shadow-xl rounded-lg z-50 py-2 font-sans text-xs animate-in fade-in duration-150">
                  <div className="px-3.5 py-1.5 border-b border-[#D5CEAE] flex items-center justify-between">
                    <span className="font-bold text-[#0F253B]">Database Notifications</span>
                    <span className="text-[10px] font-mono text-[#52667A]">{unreadCount} unread</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-[#52667A]">No notifications in database</div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-3 transition-colors ${n.read ? 'bg-white opacity-70' : 'bg-[#FAF7EE]'}`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-semibold text-[#0F253B]">{n.title}</span>
                            {!n.read && (
                              <button
                                onClick={(e) => handleMarkAsRead(n.id, e)}
                                className="text-[10px] text-blue-700 hover:underline flex items-center gap-0.5 shrink-0"
                                title="Mark as read"
                              >
                                <Check className="w-3 h-3" /> Read
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-[#52667A] mt-1 leading-snug">{n.message}</p>
                          <span className="text-[9px] font-mono text-[#8B9DAF] mt-1 block">
                            {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Session & Primary Action */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold text-[#0F253B] truncate max-w-[140px]">{currentUser.name}</span>
                <span className="text-[10px] font-mono text-[#52667A] uppercase">{currentUser.role}</span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs font-mono text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors cursor-pointer shrink-0"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
            </div>
          ) : currentView === 'landing' ? (
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] text-[11px] sm:text-xs font-semibold uppercase tracking-wider rounded border border-[#263B52] transition-colors group cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span className="hidden sm:inline">Stakeholder Login</span>
              <span className="sm:hidden">Login</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate('landing')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-[#263B52] hover:underline cursor-pointer shrink-0"
            >
              Back to Overview
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
