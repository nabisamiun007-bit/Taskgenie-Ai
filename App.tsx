import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Task, Status, Priority, User } from './types';
import TaskCard from './components/TaskCard';
import TaskForm from './components/TaskForm';
import Modal from './components/Modal';
import ConfirmationModal from './components/ConfirmationModal';
import AccountSettings from './components/AccountSettings';
import AuthScreen from './components/AuthScreen';
import { Plus, Download, Upload, LayoutGrid, List as ListIcon, Search, CheckSquare, X, RefreshCw, Trash2, User as UserIcon, Menu, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchTasks, saveTask, saveAllTasks, deleteTask, deleteMultipleTasks, isCloudEnabled, subscribeToAuth } from './services/dataService';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  
  // App State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  
  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'danger' | 'success';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'info', onConfirm: () => {} });

  // Filters & Views
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | Priority>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load User Session & Tasks
  useEffect(() => {
    // Local check first
    const storedUser = localStorage.getItem('taskgenie-current-user');
    if (storedUser && !isCloudEnabled) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        localStorage.removeItem('taskgenie-current-user');
      }
    }

    // Subscribe to Cloud Auth
    const unsubscribe = subscribeToAuth((cloudUser) => {
        if (cloudUser) {
            setUser(cloudUser);
        } else if (isCloudEnabled) {
            setUser(null);
            setTasks([]);
        }
    });

    return () => unsubscribe();
  }, []);

  // Load Tasks whenever user logs in
  useEffect(() => {
    if (user) {
      loadUserData(user);
    } else {
      setTasks([]);
    }
  }, [user]);

  const loadUserData = async (currentUser: User) => {
    setIsLoadingTasks(true);
    try {
        const loadedTasks = await fetchTasks(currentUser);
        setTasks(loadedTasks);
    } catch (e) {
        console.error("Failed to load tasks", e);
    } finally {
        setIsLoadingTasks(false);
    }
  };

  // Auth Handlers
  const handleLogin = (loggedInUser: User) => {
    if (!isCloudEnabled) {
        localStorage.setItem('taskgenie-current-user', JSON.stringify(loggedInUser));
    }
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('taskgenie-current-user');
    setUser(null);
    setTasks([]); 
    setSelectedTaskIds(new Set());
    setIsAccountModalOpen(false);
  };

  // Helper for Confirmation Modal
  const confirmAction = (title: string, message: string, onConfirm: () => void, type: 'info' | 'danger' | 'success' = 'info') => {
      setConfirmModal({ isOpen: true, title, message, onConfirm, type });
  };

  // Derived State (Filtered Tasks)
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            task.serialNumber.toString().includes(searchQuery);
      const matchesStatus = statusFilter === 'All' ? true : task.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' ? true : task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    }).sort((a, b) => {
        // Force Completed tasks to the bottom
        if (a.status === Status.COMPLETED && b.status !== Status.COMPLETED) return 1;
        if (a.status !== Status.COMPLETED && b.status === Status.COMPLETED) return -1;
        
        // Then sort by Serial Number
        return a.serialNumber - b.serialNumber;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  // Handlers
  const handleCreateOrUpdateTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    if (!user) return;

    let updatedTasks = [...tasks];
    
    if (editingTask) {
      // Update
      const updatedTask = { ...editingTask, ...taskData };
      updatedTasks = updatedTasks.map(t => t.id === editingTask.id ? updatedTask : t);
      
      try {
        await saveTask(user, updatedTask);
        setTasks(updatedTasks);
      } catch (e: any) {
        alert(e.message);
        return;
      }
    } else {
      // Create
      const newTask: Task = {
        ...taskData,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      updatedTasks = [...updatedTasks, newTask];
      
      try {
        await saveTask(user, newTask);
        setTasks(updatedTasks);
      } catch (e: any) {
        alert(e.message);
        return;
      }
    }
    
    // Sync LocalStorage backup if in local mode
    if (!isCloudEnabled) saveAllTasks(user, updatedTasks);
    
    closeTaskModal();
  };

  const handleDeleteTask = async (id: string) => {
    if (!user) return;
    
    confirmAction(
        "Delete Task", 
        "Are you sure you want to delete this task?", 
        async () => {
            const updatedTasks = tasks.filter(t => t.id !== id);
            setTasks(updatedTasks);
            
            await deleteTask(id);
            if (!isCloudEnabled) saveAllTasks(user, updatedTasks);

            setSelectedTaskIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        },
        'danger'
    );
  };

  const handleDeleteSelected = async () => {
    if (!user || selectedTaskIds.size === 0) return;
    
    confirmAction(
        "Delete Selected",
        `Are you sure you want to delete ${selectedTaskIds.size} selected task(s)? This action cannot be undone.`,
        async () => {
            const idsToDelete = Array.from(selectedTaskIds) as string[];
            const updatedTasks = tasks.filter(t => !selectedTaskIds.has(t.id));
            setTasks(updatedTasks);
            
            await deleteMultipleTasks(idsToDelete);
            if (!isCloudEnabled) saveAllTasks(user, updatedTasks);

            setSelectedTaskIds(new Set());
        },
        'danger'
    );
  };

  const handleToggleStatus = async (task: Task) => {
    if (!user) return;
    
    const currentTask = tasks.find(t => t.id === task.id);
    if (!currentTask) return;

    let newStatus = task.status;
    
    if (task.status === currentTask.status) {
         newStatus = task.status === Status.COMPLETED ? Status.PENDING : Status.COMPLETED;
    }

    const updatedTask = { ...task, status: newStatus };
    
    const updatedTasks = tasks.map(t => t.id === task.id ? updatedTask : t);
    setTasks(updatedTasks);
    
    await saveTask(user, updatedTask);
    if (!isCloudEnabled) saveAllTasks(user, updatedTasks);
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s);
    const updatedTask = { ...task, subtasks: newSubtasks };

    const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
    setTasks(updatedTasks);

    await saveTask(user, updatedTask);
    if (!isCloudEnabled) saveAllTasks(user, updatedTasks);
  };

  const handleToggleSelection = (id: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedTaskIds(new Set());
  };

  // Auto-Renumber Logic
  const handleAutoRenumber = async () => {
    setIsMobileMenuOpen(false);
    if (!user) return;
    
    confirmAction(
        "Auto-Sort Tasks",
        "This will re-assign serial numbers based on urgency and due dates. Continue?",
        async () => {
            const priorityWeight = {
            [Priority.URGENT]: 4,
            [Priority.HIGH]: 3,
            [Priority.MEDIUM]: 2,
            [Priority.LOW]: 1
            };

            const sortedTasks = [...tasks].sort((a, b) => {
            // 1. Sort by Priority (Descending)
            const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
            if (pDiff !== 0) return pDiff;
            
            // 2. Sort by Due Date (Ascending)
            const dateA = new Date(a.dueDate).getTime();
            const dateB = new Date(b.dueDate).getTime();
            return dateA - dateB;
            });

            const renumberedTasks = sortedTasks.map((t, index) => ({
            ...t,
            serialNumber: index + 1
            }));

            setTasks(renumberedTasks);
            
            if (isCloudEnabled) {
                for (const t of renumberedTasks) {
                    await saveTask(user, t);
                }
            } else {
                saveAllTasks(user, renumberedTasks);
            }
        }
    );
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    setIsMobileMenuOpen(false);
    const tasksToExport = selectedTaskIds.size > 0 
      ? tasks.filter(t => selectedTaskIds.has(t.id))
      : tasks;

    if (tasksToExport.length === 0) {
      confirmAction("Export Failed", "No tasks available to export.", () => {}, 'danger');
      return;
    }

    // Sort by Serial Number for better organization
    tasksToExport.sort((a, b) => a.serialNumber - b.serialNumber);

    const dataToExport = tasksToExport.map(t => {
      // Safely extract YYYY-MM-DD from ISO string to prevent timezone offsets
      const dateStr = t.dueDate.includes('T') ? t.dueDate.split('T')[0] : t.dueDate;

      return {
        "S.No": t.serialNumber,
        "Title": t.title,
        "Description": t.description,
        "Priority": t.priority,
        "Status": t.status,
        "Due Date": dateStr,
        "Tags": t.tags ? t.tags.join(', ') : "",
        "Progress Notes": t.progressNotes || ""
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    
    const fileName = selectedTaskIds.size > 0 ? "SelectedTasks.csv" : "MyTasks.csv";
    XLSX.writeFile(wb, fileName, { bookType: 'csv' });
  };

  // Date Parsing Helper
  const parseExcelDate = (dateVal: any): string => {
      if (!dateVal) return new Date().toISOString();
      
      // If it's a number (Excel Serial Date)
      if (typeof dateVal === 'number') {
          const jsDate = new Date((dateVal - 25569) * 86400 * 1000);
          return jsDate.toISOString();
      }
      
      // If it's a string, try parsing
      const dateStr = String(dateVal).trim();
      const parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) {
          return new Date(parsed).toISOString();
      }
      
      return new Date().toISOString();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsMobileMenuOpen(false);
    const file = e.target.files?.[0];
    if (!file || !user) return;

    confirmAction(
        "Import Tasks",
        "Importing tasks will add them to your current list. Continue?",
        () => {
             const reader = new FileReader();
            reader.onload = async (event) => {
            const data = event.target?.result;
            if (data) {
                try {
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                    const newTasks: Task[] = [];
                    // Find highest current Serial Number
                    let maxSerial = tasks.length > 0 ? Math.max(...tasks.map(t => t.serialNumber)) : 0;

                    json.forEach((row: any) => {
                        // Case-insensitive key lookup
                        const getVal = (key: string) => {
                            const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
                            return foundKey ? row[foundKey] : undefined;
                        };

                        const title = getVal('title') || "Untitled Task";
                        // If Serial Number exists in CSV, use it if it's unique/valid, else auto-increment
                        const csvSerial = parseInt(getVal('s.no') || getVal('serial') || '0');
                        const serialNumber = csvSerial > 0 ? csvSerial : ++maxSerial;

                        const dueDateVal = getVal('due date') || getVal('due');
                        const dueDate = parseExcelDate(dueDateVal);
                        
                        const tagsRaw = getVal('tags');
                        const tags = tagsRaw ? String(tagsRaw).split(',').map(t => t.trim()) : [];
                        
                        const notes = getVal('progress notes') || getVal('progress');

                        newTasks.push({
                            id: crypto.randomUUID(),
                            serialNumber: serialNumber,
                            title: String(title),
                            description: String(getVal('description') || ""),
                            priority: (getVal('priority') as Priority) || Priority.MEDIUM,
                            status: (getVal('status') as Status) || Status.PENDING,
                            dueDate: dueDate,
                            createdAt: Date.now(),
                            subtasks: [],
                            tags: tags,
                            images: [],
                            progressNotes: String(notes || "")
                        });
                    });

                    const updatedTasks = [...tasks, ...newTasks];
                    setTasks(updatedTasks);
                    
                    // Save incrementally
                    for (const t of newTasks) {
                        await saveTask(user, t);
                    }
                    if (!isCloudEnabled) saveAllTasks(user, updatedTasks);

                } catch (error) {
                    console.error("Import Error:", error);
                    alert("Failed to import CSV. Please ensure the file format is correct.");
                }
            }
            };
            reader.readAsArrayBuffer(file);
        },
        'info'
    );
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  // Calculate Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === Status.COMPLETED).length;
  const pendingTasks = tasks.filter(t => t.status === Status.PENDING).length;
  const inProgressTasks = tasks.filter(t => t.status === Status.IN_PROGRESS).length;

  return (
    <div className="min-h-screen bg-slate-50 relative selection:bg-primary-100 selection:text-primary-900">
      
      {/* Decorative Background Mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-tr from-primary-600 to-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-primary-500/30">
                <CheckSquare size={20} className="stroke-[3px]" />
              </div>
              <h1 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 hidden sm:block">
                TaskGenie AI
              </h1>
            </div>

            <div className="flex-1 max-w-md mx-4 hidden md:block">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search tasks by title, description or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-full focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
               {/* Selection Actions */}
               {selectedTaskIds.size > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 mr-2">
                    <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-1 rounded-md hidden sm:inline-block">
                        {selectedTaskIds.size} Selected
                    </span>
                    <button
                        onClick={handleDeleteSelected}
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
                        title="Delete Selected"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button
                        onClick={clearSelection}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                        title="Clear Selection"
                    >
                        <X size={18} />
                    </button>
                </div>
              )}

              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors tooltip" title="Import CSV">
                    <Upload size={20} />
                </button>
                <button onClick={handleExportCSV} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors tooltip" title="Export CSV">
                    <Download size={20} />
                </button>
                <button onClick={handleAutoRenumber} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors tooltip" title="Auto-Sort & Renumber">
                    <RefreshCw size={20} />
                </button>
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <ListIcon size={18} />
                    </button>
                </div>
              </div>
              
              <button 
                onClick={() => setIsAccountModalOpen(true)}
                className="flex items-center gap-2 pl-2 rounded-full hover:bg-gray-50 transition-colors"
              >
                 <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white">
                    {user.avatar ? (
                        <img src={user.avatar} className="w-full h-full object-cover rounded-full" alt="Profile" />
                    ) : (
                        getInitials(user.username)
                    )}
                </div>
              </button>

                {/* Mobile Search Toggle */}
                <button 
                className={`md:hidden p-2 transition-colors rounded-full ${isMobileSearchOpen ? 'bg-gray-100 text-primary-600' : 'text-gray-600'}`}
                onClick={() => {
                    setIsMobileSearchOpen(!isMobileSearchOpen);
                    setIsMobileMenuOpen(false); // Close menu if search is opened
                }}
               >
                <Search size={22} />
               </button>

               {/* Mobile Menu Button */}
               <button 
                className="md:hidden p-2 text-gray-600"
                onClick={() => {
                    setIsMobileMenuOpen(!isMobileMenuOpen);
                    setIsMobileSearchOpen(false); // Close search if menu is opened
                }}
               >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
               </button>
            </div>
          </div>
          
           {/* Mobile Search Bar (Conditionally Rendered) */}
           {isMobileSearchOpen && (
               <div className="md:hidden py-3 animate-in slide-in-from-top-2 border-t border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all shadow-inner"
                        autoFocus
                        />
                    </div>
               </div>
           )}

           {/* Mobile Menu */}
           {isMobileMenuOpen && (
               <div className="md:hidden py-4 border-t border-gray-100 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-4 gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg text-xs text-gray-600 active:bg-gray-200">
                            <Upload size={20} className="mb-1"/> Import
                        </button>
                        <button onClick={handleExportCSV} className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg text-xs text-gray-600 active:bg-gray-200">
                            <Download size={20} className="mb-1"/> Export
                        </button>
                        <button onClick={handleAutoRenumber} className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg text-xs text-gray-600 active:bg-gray-200">
                            <RefreshCw size={20} className="mb-1"/> Sort
                        </button>
                        <button onClick={() => { setIsMobileMenuOpen(false); setIsAccountModalOpen(true); }} className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg text-xs text-gray-600 active:bg-gray-200">
                            <UserIcon size={20} className="mb-1"/> Profile
                        </button>
                    </div>
               </div>
           )}
        </div>
      </header>

      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportCSV}
        accept=".csv,.xlsx,.xls"
        className="hidden"
      />

       {/* Sticky Mobile Stats Panel */}
       <div className="sticky top-[64px] z-30 bg-white/90 backdrop-blur-md border-b border-gray-200/60 md:static md:bg-transparent md:border-0 md:z-auto transition-all">
         <div className="max-w-7xl mx-auto px-2 py-2 md:px-6 md:py-8">
            <div className="grid grid-cols-4 gap-2 md:gap-6">
                <div className="bg-white/60 md:bg-white p-2 md:p-6 rounded-lg md:rounded-2xl border border-gray-200/50 md:border-gray-100 shadow-sm flex flex-col items-center md:items-start transition-transform hover:scale-105 duration-300">
                    <div className="flex items-center gap-1 md:gap-4 mb-0 md:mb-2">
                        <div className="p-1 md:p-3 bg-blue-50 text-blue-600 rounded-md md:rounded-xl">
                            <ListIcon size={14} className="md:w-6 md:h-6" />
                        </div>
                        <span className="text-[10px] md:text-sm font-medium text-gray-500 uppercase tracking-wider">Total</span>
                    </div>
                    <span className="text-sm md:text-3xl font-bold text-gray-900">{totalTasks}</span>
                </div>
                
                <div className="bg-white/60 md:bg-white p-2 md:p-6 rounded-lg md:rounded-2xl border border-gray-200/50 md:border-gray-100 shadow-sm flex flex-col items-center md:items-start transition-transform hover:scale-105 duration-300">
                    <div className="flex items-center gap-1 md:gap-4 mb-0 md:mb-2">
                        <div className="p-1 md:p-3 bg-yellow-50 text-yellow-600 rounded-md md:rounded-xl">
                            <Clock size={14} className="md:w-6 md:h-6" />
                        </div>
                        <span className="text-[10px] md:text-sm font-medium text-gray-500 uppercase tracking-wider">Pending</span>
                    </div>
                    <span className="text-sm md:text-3xl font-bold text-gray-900">{pendingTasks}</span>
                </div>

                <div className="bg-white/60 md:bg-white p-2 md:p-6 rounded-lg md:rounded-2xl border border-gray-200/50 md:border-gray-100 shadow-sm flex flex-col items-center md:items-start transition-transform hover:scale-105 duration-300">
                     <div className="flex items-center gap-1 md:gap-4 mb-0 md:mb-2">
                        <div className="p-1 md:p-3 bg-indigo-50 text-indigo-600 rounded-md md:rounded-xl">
                            <AlertCircle size={14} className="md:w-6 md:h-6" />
                        </div>
                        <span className="text-[10px] md:text-sm font-medium text-gray-500 uppercase tracking-wider">In Progress</span>
                    </div>
                    <span className="text-sm md:text-3xl font-bold text-gray-900">{inProgressTasks}</span>
                </div>

                <div className="bg-white/60 md:bg-white p-2 md:p-6 rounded-lg md:rounded-2xl border border-gray-200/50 md:border-gray-100 shadow-sm flex flex-col items-center md:items-start transition-transform hover:scale-105 duration-300">
                     <div className="flex items-center gap-1 md:gap-4 mb-0 md:mb-2">
                        <div className="p-1 md:p-3 bg-green-50 text-green-600 rounded-md md:rounded-xl">
                            <CheckCircle2 size={14} className="md:w-6 md:h-6" />
                        </div>
                        <span className="text-[10px] md:text-sm font-medium text-gray-500 uppercase tracking-wider">Done</span>
                    </div>
                    <span className="text-sm md:text-3xl font-bold text-gray-900">{completedTasks}</span>
                </div>
            </div>
         </div>
       </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex gap-2">
             <span className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">Status:</span>
            {['All', ...Object.values(Status)].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all ${
                  statusFilter === status
                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="w-px bg-gray-200 hidden sm:block"></div>
          <div className="flex gap-2">
            <span className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">Priority:</span>
            {['All', ...Object.values(Priority)].map((priority) => (
              <button
                key={priority}
                onClick={() => setPriorityFilter(priority as any)}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all ${
                  priorityFilter === priority
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {priority}
              </button>
            ))}
          </div>
        </div>

        {/* Task Grid/List */}
        {isLoadingTasks ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <RefreshCw className="animate-spin mb-4" size={32} />
                <p>Loading your tasks...</p>
            </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-gray-300">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="text-gray-300" size={40} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No tasks found</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">Get started by creating a new task or importing from a CSV file.</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
            >
              <Plus size={20} className="mr-2" />
              Create Task
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6" 
            : "flex flex-col gap-3"
          }>
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isSelected={selectedTaskIds.has(task.id)}
                onToggleSelection={handleToggleSelection}
                onEdit={openEditModal}
                onDelete={handleDeleteTask}
                onToggleStatus={handleToggleStatus}
                onToggleSubtask={handleToggleSubtask}
              />
            ))}
          </div>
        )}
      </main>

       {/* Floating Action Button (Mobile) */}
       <button
        onClick={openCreateModal}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-primary-600 to-indigo-600 text-white rounded-full shadow-xl shadow-primary-500/40 flex items-center justify-center z-50 active:scale-90 transition-transform"
      >
        <Plus size={28} />
      </button>

      {/* Desktop Floating Add Button (Optional, usually visible in empty state or header) */}
      <button
          onClick={openCreateModal}
          className="hidden md:flex fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl hover:scale-105 hover:bg-black transition-all items-center gap-2 z-40"
      >
          <Plus size={20} /> New Task
      </button>

      {/* Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={closeTaskModal}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
      >
        <TaskForm
          initialTask={editingTask}
          onSubmit={handleCreateOrUpdateTask}
          onCancel={closeTaskModal}
          suggestedSerialNumber={tasks.length > 0 ? Math.max(...tasks.map(t => t.serialNumber)) + 1 : 1}
        />
      </Modal>

      {/* Account Settings Modal */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title="Account Settings"
      >
        {user && (
            <AccountSettings 
                user={user} 
                onUpdateUser={(updated) => setUser(updated)}
                onLogout={handleLogout}
                onClose={() => setIsAccountModalOpen(false)}
            />
        )}
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
};

export default App;