import React, { useState, useEffect } from 'react';
import type { AppView, StakeholderRole, TraineeTab, ProviderTab, GovernmentTab } from '../types';
import logoSvg from '../assets/logo.svg';
import iconSvg from '../assets/icon.svg';
import { ArrowRight, LogOut, ChevronDown, Bell, Check, Menu, X, ShieldCheck } from 'lucide-react';
import { notificationService, type NotificationItem } from '../lib/api';
import type { AuthUser } from '../lib/api';

interface HeaderProps {
  currentView: AppView;
  currentRole: StakeholderRole | null;
  currentUser?: AuthUser | null;
  activeTraineeTab?: TraineeTab;
  activeProviderTab?: ProviderTab;
  activeGovernmentTab?: GovernmentTab;
  onNavigate: (view: AppView, role?: StakeholderRole) => void;
  onSelectTraineeTab?: (tab: TraineeTab) => void;
  onSelectProviderTab?: (tab: ProviderTab) => void;
  onSelectGovernmentTab?: (tab: GovernmentTab) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentView, 
  currentRole, 
  currentUser, 
  activeTraineeTab = 'overview',
  activeProviderTab = 'overview',
  activeGovernmentTab = 'overview',
  onNavigate, 
  onSelectTraineeTab,
  onSelectProviderTab,
  onSelectGovernmentTab,
  onLogout 
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const isTraineeContext = currentRole === 'trainee' || currentView === 'trainee-dashboard';
  const isProviderContext = currentRole === 'provider' || currentView === 'provider-dashboard';
  const isGovernmentContext = currentRole === 'government' || currentView === 'government-dashboard' || currentUser?.role === 'GOVERNMENT';

  // Navigation Items for Trainee Portal (Overview, Training, Outcomes, Journey, Follow-ups, Skill Gaps)
  const traineeNavItems = [
    {
      id: 'overview',
      label: 'Overview',
      onClick: () => {
        onNavigate('trainee-dashboard', 'trainee');
        onSelectTraineeTab?.('overview');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'trainee-dashboard' && activeTraineeTab === 'overview',
    },
    {
      id: 'training',
      label: 'Training',
      onClick: () => {
        onNavigate('trainee-dashboard', 'trainee');
        onSelectTraineeTab?.('training');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'trainee-dashboard' && activeTraineeTab === 'training',
    },
    {
      id: 'outcomes',
      label: 'Outcomes',
      onClick: () => {
        onNavigate('trainee-dashboard', 'trainee');
        onSelectTraineeTab?.('outcomes');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'trainee-dashboard' && activeTraineeTab === 'outcomes',
    },
    {
      id: 'journey',
      label: 'Journey',
      onClick: () => {
        onNavigate('trainee-dashboard', 'trainee');
        onSelectTraineeTab?.('journey');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'trainee-dashboard' && activeTraineeTab === 'journey',
    },
    {
      id: 'followups',
      label: 'Follow-ups',
      onClick: () => {
        onNavigate('trainee-dashboard', 'trainee');
        onSelectTraineeTab?.('followups');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'trainee-dashboard' && activeTraineeTab === 'followups',
    },
    {
      id: 'skills',
      label: 'Skill Gaps',
      onClick: () => {
        onNavigate('trainee-dashboard', 'trainee');
        onSelectTraineeTab?.('skills');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'trainee-dashboard' && activeTraineeTab === 'skills',
    },
  ];

  // Navigation Items for Provider Portal (Overview, Programmes, Trainees, Training Records, Outcomes, Skill Gaps, Non-Placement)
  const providerNavItems = [
    {
      id: 'overview',
      label: 'Overview',
      onClick: () => {
        onNavigate('provider-dashboard', 'provider');
        onSelectProviderTab?.('overview');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'provider-dashboard' && activeProviderTab === 'overview',
    },
    {
      id: 'programmes',
      label: 'Programmes',
      onClick: () => {
        onNavigate('provider-dashboard', 'provider');
        onSelectProviderTab?.('programmes');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'provider-dashboard' && activeProviderTab === 'programmes',
    },
    {
      id: 'trainees',
      label: 'Trainees',
      onClick: () => {
        onNavigate('provider-dashboard', 'provider');
        onSelectProviderTab?.('trainees');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'provider-dashboard' && activeProviderTab === 'trainees',
    },
    {
      id: 'training-records',
      label: 'Training Records',
      onClick: () => {
        onNavigate('provider-dashboard', 'provider');
        onSelectProviderTab?.('training-records');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'provider-dashboard' && activeProviderTab === 'training-records',
    },
    {
      id: 'outcomes',
      label: 'Outcomes',
      onClick: () => {
        onNavigate('provider-dashboard', 'provider');
        onSelectProviderTab?.('outcomes');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'provider-dashboard' && activeProviderTab === 'outcomes',
    },
    {
      id: 'skills',
      label: 'Skill Gaps',
      onClick: () => {
        onNavigate('provider-dashboard', 'provider');
        onSelectProviderTab?.('skills');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'provider-dashboard' && activeProviderTab === 'skills',
    },
    {
      id: 'non-placement',
      label: 'Non-Placement',
      onClick: () => {
        onNavigate('provider-dashboard', 'provider');
        onSelectProviderTab?.('non-placement');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'provider-dashboard' && activeProviderTab === 'non-placement',
    },
  ];

  // Navigation Items for Government Portal (Overview, Analytics, Programmes, Providers, Districts, Skill Gaps, Non-Placement, Attrition, Interventions, Follow-ups)
  const governmentNavItems = [
    {
      id: 'overview',
      label: 'Overview',
      onClick: () => {
        onNavigate('government-dashboard', 'government');
        onSelectGovernmentTab?.('overview');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'government-dashboard' && activeGovernmentTab === 'overview',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      onClick: () => {
        onNavigate('government-dashboard', 'government');
        onSelectGovernmentTab?.('analytics');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'government-dashboard' && activeGovernmentTab === 'analytics',
    },
    {
      id: 'programmes',
      label: 'Programmes',
      onClick: () => {
        onNavigate('government-dashboard', 'government');
        onSelectGovernmentTab?.('programmes');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'government-dashboard' && activeGovernmentTab === 'programmes',
    },
    {
      id: 'providers',
      label: 'Providers',
      onClick: () => {
        onNavigate('government-dashboard', 'government');
        onSelectGovernmentTab?.('providers');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'government-dashboard' && activeGovernmentTab === 'providers',
    },
    {
      id: 'districts',
      label: 'Districts',
      onClick: () => {
        onNavigate('government-dashboard', 'government');
        onSelectGovernmentTab?.('districts');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'government-dashboard' && activeGovernmentTab === 'districts',
    },
    {
      id: 'skills',
      label: 'Skill Gaps',
      onClick: () => {
        onNavigate('government-dashboard', 'government');
        onSelectGovernmentTab?.('skills');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'government-dashboard' && activeGovernmentTab === 'skills',
    },
    {
      id: 'non-placement',
      label: 'Non-Placement',
      onClick: () => {
        onNavigate('government-dashboard', 'government');
        onSelectGovernmentTab?.('non-placement');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'government-dashboard' && activeGovernmentTab === 'non-placement',
    },
    {
      id: 'attrition',
      label: 'Attrition',
      onClick: () => {
        onNavigate('government-dashboard', 'government');
        onSelectGovernmentTab?.('attrition');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'government-dashboard' && activeGovernmentTab === 'attrition',
    },
    {
      id: 'interventions',
      label: 'Interventions',
      onClick: () => {
        onNavigate('government-dashboard', 'government');
        onSelectGovernmentTab?.('interventions');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'government-dashboard' && activeGovernmentTab === 'interventions',
    },
    {
      id: 'follow-ups',
      label: 'Follow-ups',
      onClick: () => {
        onNavigate('government-dashboard', 'government');
        onSelectGovernmentTab?.('follow-ups');
        setMobileMenuOpen(false);
      },
      isActive: currentView === 'government-dashboard' && activeGovernmentTab === 'follow-ups',
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#FAF9F5]/95 backdrop-blur-md border-b border-[#D5CEAE] shadow-xs transition-all">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 h-[76px] sm:h-[84px] flex items-center justify-between gap-3">
        
        {/* Zone 1: Logo & Institutional Lockup (Left) */}
        <div className="flex items-center min-w-0 shrink-0">
          <button 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 sm:gap-3 group focus:outline-none text-left cursor-pointer min-w-0"
            aria-label="Kaushal Setu Homepage"
          >
            <img 
              src={logoSvg} 
              alt="Kaushal Setu कौशल सेतु" 
              className="h-8 sm:h-9 xl:h-10 w-auto object-contain hidden md:block shrink-0" 
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
        {isTraineeContext ? (
          <nav 
            className="hidden lg:flex items-center gap-1.5 xl:gap-2 font-mono text-xs shrink-0"
            aria-label="Trainee Horizontal Navigation"
          >
            {traineeNavItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`px-3 py-1.5 rounded text-xs font-medium tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                  item.isActive
                    ? 'bg-[#263B52] text-white shadow-xs font-semibold'
                    : 'text-[#47617C] hover:text-[#0F253B] hover:bg-[#EDE8D5]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : isProviderContext ? (
          <nav 
            className="hidden lg:flex items-center gap-1 xl:gap-1.5 font-mono text-xs shrink-0"
            aria-label="Provider Horizontal Navigation"
          >
            {providerNavItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`px-2.5 py-1.5 rounded text-xs font-medium tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                  item.isActive
                    ? 'bg-[#18324A] text-white shadow-xs font-semibold'
                    : 'text-[#47617C] hover:text-[#0F253B] hover:bg-[#EDE8D5]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : isGovernmentContext ? (
          <nav 
            className="hidden lg:flex items-center gap-1 xl:gap-1.5 font-mono text-[11px] shrink-0"
            aria-label="Government Horizontal Navigation"
          >
            {governmentNavItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`px-2 py-1 rounded font-medium tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                  item.isActive
                    ? 'bg-[#18324A] text-white shadow-xs font-semibold'
                    : 'text-[#47617C] hover:text-[#0F253B] hover:bg-[#EDE8D5]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : currentView === 'landing' ? (
          <nav 
            className="hidden xl:flex items-center gap-6 text-[12px] font-semibold uppercase tracking-wider text-[#47617C] shrink-0"
            aria-label="Primary Navigation"
          >
            <button 
              onClick={() => onNavigate('landing')}
              className="relative py-1.5 text-[#0F253B] font-bold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#263B52] cursor-pointer"
            >
              Overview
            </button>
            <a href="#lifecycle" className="py-1.5 hover:text-[#0F253B] transition-colors whitespace-nowrap">
              5-Stage Lifecycle
            </a>
            <a href="#metrics" className="py-1.5 hover:text-[#0F253B] transition-colors whitespace-nowrap">
              Outcomes
            </a>
            <a href="#stakeholders" className="py-1.5 hover:text-[#0F253B] transition-colors whitespace-nowrap">
              Stakeholders
            </a>
            <a href="#anti-ghosting" className="py-1.5 hover:text-[#0F253B] transition-colors whitespace-nowrap">
              Anti-Ghosting Audit
            </a>
          </nav>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono text-[#47617C] shrink-0">
            <span className="text-[#0F253B] font-bold uppercase tracking-wider truncate max-w-[130px] sm:max-w-none">
              {currentRole === 'employer' && 'EMPLOYER WORKSPACE · TATA'}
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] bg-[#D8EEDF] text-[#164627] font-semibold border border-[#B6DBC0] rounded">
              3P Verified ✓
            </span>
          </div>
        )}

        {/* Zone 3: Actions (Right) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Real Supabase Database Notifications */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-[#263B52] hover:bg-[#EDE8D5] rounded-full transition-colors cursor-pointer"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-[#D5CEAE] shadow-xl rounded-lg z-50 py-2 font-sans text-xs animate-in fade-in duration-150">
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
                                className="text-[10px] text-blue-700 hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer"
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

          {/* User Profile & Role Dropdown */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-mono bg-white hover:bg-[#FAF7EE] text-[#0F253B] border border-[#D5CEAE] rounded transition-colors cursor-pointer"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label="User Profile"
              >
                <div className="w-6 h-6 rounded-full bg-[#263B52] text-[#FAF7EE] flex items-center justify-center font-bold text-[11px] shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0) : 'P'}
                </div>
                <span className="hidden sm:inline font-semibold text-xs text-[#0F253B] truncate max-w-[120px]">
                  {currentUser.name}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#52667A] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-white border border-[#D5CEAE] shadow-xl rounded-lg z-50 py-2 font-mono text-xs animate-in fade-in duration-150"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="px-3.5 py-2 bg-[#FAF7EE] border-b border-[#D5CEAE]">
                    <div className="font-bold text-[#0F253B] truncate">{currentUser.name}</div>
                    <div className="text-[10px] text-[#52667A] uppercase flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>{currentUser.role} Authenticated</span>
                    </div>
                  </div>

                  <div className="py-1">
                    {currentUser.role === 'TRAINEE' && (
                      <button
                        onClick={() => onNavigate('trainee-dashboard', 'trainee')}
                        className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                          currentRole === 'trainee' ? 'bg-[#EDE8D5] text-[#0F253B] font-bold' : 'hover:bg-[#FAF7EE] text-[#47617C]'
                        }`}
                      >
                        <span>Trainee View</span>
                        {currentRole === 'trainee' && <span className="text-[10px] text-emerald-700 font-bold">Active</span>}
                      </button>
                    )}

                    {/* Only show other views if user has appropriate authorization */}
                    {currentUser.role === 'EMPLOYER' && (
                      <button
                        onClick={() => onNavigate('employer-dashboard', 'employer')}
                        className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                          currentRole === 'employer' ? 'bg-[#EDE8D5] text-[#0F253B] font-bold' : 'hover:bg-[#FAF7EE] text-[#47617C]'
                        }`}
                      >
                        <span>Employer Workspace</span>
                      </button>
                    )}

                    {currentUser.role === 'TRAINING_PROVIDER' && (
                      <button
                        onClick={() => onNavigate('provider-dashboard', 'provider')}
                        className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                          currentRole === 'provider' ? 'bg-[#EDE8D5] text-[#0F253B] font-bold' : 'hover:bg-[#FAF7EE] text-[#47617C]'
                        }`}
                      >
                        <span>Provider Portal</span>
                      </button>
                    )}

                    {currentUser.role === 'GOVERNMENT' && (
                      <button
                        onClick={() => onNavigate('government-dashboard', 'government')}
                        className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                          currentRole === 'government' ? 'bg-[#EDE8D5] text-[#0F253B] font-bold' : 'hover:bg-[#FAF7EE] text-[#47617C]'
                        }`}
                      >
                        <span>Government Portal</span>
                      </button>
                    )}
                  </div>

                  {onLogout && (
                    <div className="border-t border-[#D5CEAE] pt-1 mt-1">
                      <button
                        onClick={onLogout}
                        className="w-full text-left px-3.5 py-2 text-red-700 hover:bg-red-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : currentView === 'landing' ? (
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#263B52] hover:bg-[#0F253B] text-[#F4F4E7] text-xs font-semibold uppercase tracking-wider rounded border border-[#263B52] transition-colors group cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span>Stakeholder Login</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate('landing')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-[#263B52] hover:underline cursor-pointer shrink-0"
            >
              Back to Overview
            </button>
          )}

          {/* Primary Logout Button */}
          {currentUser && onLogout && (
            <button
              onClick={onLogout}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors cursor-pointer shrink-0"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}

          {/* Mobile Hamburger Menu Button */}
          {(isTraineeContext || isProviderContext || isGovernmentContext) && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#263B52] hover:bg-[#EDE8D5] rounded transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

        </div>

      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (isTraineeContext || isProviderContext || isGovernmentContext) && (
        <div className="lg:hidden bg-[#FAF7EE] border-b border-[#D5CEAE] px-4 py-3 space-y-1.5 font-mono text-xs animate-in slide-in-from-top-2 duration-150">
          <div className="text-[10px] uppercase font-bold text-[#52667A] px-2 py-1">
            {isTraineeContext 
              ? 'Trainee Portal Menu' 
              : isProviderContext 
                ? 'Training Provider Portal Menu' 
                : 'Government Outcome Intelligence Menu'}
          </div>
          {(isTraineeContext ? traineeNavItems : isProviderContext ? providerNavItems : governmentNavItems).map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-colors cursor-pointer flex items-center justify-between ${
                item.isActive
                  ? 'bg-[#18324A] text-white font-bold'
                  : 'text-[#263B52] hover:bg-[#EDE8D5]'
              }`}
            >
              <span>{item.label}</span>
              {item.isActive && <span className="text-[10px] font-bold">Active</span>}
            </button>
          ))}
          {currentUser && onLogout && (
            <div className="pt-2 border-t border-[#D5CEAE]">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full text-left px-3 py-2 text-red-700 hover:bg-red-50 rounded flex items-center gap-2 cursor-pointer font-bold"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({currentUser.name})</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
