import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Task, Status, Priority, User } from './types';
import TaskCard from './components/TaskCard';
import TaskForm from './components/TaskForm';
import Modal from './components/Modal';
import AuthScreen from './components/AuthScreen';
import { Plus, Download, Upload, LayoutGrid, List as ListIcon, Search, CheckSquare, X, LogOut, FileSpreadsheet, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  
  // App State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | Priority>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load User Session
  useEffect(() => {
    const storedUser = localStorage.getItem('taskgenie-current-user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user session", e);
        localStorage.removeItem('taskgenie-current-user');
      }
    }
  }, []);

  // Load Tasks for Current User
  useEffect(() => {
    if (!user) return;
    const key = `taskgenie-tasks-${user.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load tasks", e);
      }
    } else {
      setTasks([]);
    }
  }, [user]);

  // Save Tasks for Current User
  useEffect(() => {
    if (!user) return;
    const key = `taskgenie-tasks-${user.id}`;
    localStorage.setItem(key, JSON.stringify(tasks));
  }, [tasks, user]);

  // Auth Handlers
  const handleLogin = (loggedInUser: User) => {
    localStorage.setItem('taskgenie-current-user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('taskgenie-current-user');
    setUser(null);
    setTasks([]);
    setSelectedTaskIds(new Set());
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
    }).sort((a, b) => a.serialNumber - b.serialNumber);
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  // Handlers
  const handleCreateOrUpdateTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t));
    } else {
      const newTask: Task = {
        ...taskData,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      setTasks(prev => [...prev, newTask]);
    }
    closeModal();
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setTasks(prev => prev.filter(t => t.id !== id));
      setSelectedTaskIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleToggleStatus = (task: Task) => {
    const newStatus = task.status === Status.COMPLETED ? Status.PENDING : Status.COMPLETED;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const newSubtasks = t.subtasks.map(s => s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s);
      return { ...t, subtasks: newSubtasks };
    }));
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

  // Auto-Renumber Logic based on Priority and Due Date
  const handleAutoRenumber = () => {
    if (!window.confirm("This will re-assign serial numbers based on urgency and due dates. Continue?")) return;

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
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleExportCSV = () => {
    const tasksToExport = selectedTaskIds.size > 0 
      ? tasks.filter(t => selectedTaskIds.has(t.id))
      : tasks;

    if (tasksToExport.length === 0) {
      alert("No tasks available to export.");
      return;
    }

    // Format for CSV
    const dataToExport = tasksToExport.map(t => ({
      "S.No": t.serialNumber,
      "Title": t.title,
      "Description": t.description,
      "Priority": t.priority,
      "Status": t.status,
      "Due Date": new Date(t.dueDate).toISOString().split('T')[0],
      "Tags": t.tags.join(', '),
      "Progress Notes": t.progressNotes || ""
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    
    // Export as CSV
    const fileName = selectedTaskIds.size > 0 ? "SelectedTasks.csv" : "MyTasks.csv";
    XLSX.writeFile(wb, fileName, { bookType: 'csv' });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Use raw parsing to handle headers flexibly
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!jsonData || jsonData.length === 0) {
          alert("No data found in file.");
          return;
        }

        let nextSerial = tasks.length > 0 ? Math.max(...tasks.map(t => t.serialNumber)) + 1 : 1;
        const newTasks: Task[] = [];

        jsonData.forEach((row: any) => {
            // Flexible Key Matching
            const getVal = (keys: string[]) => {
                for (const k of keys) {
                    // Try exact match, uppercase, lowercase
                    if (row[k] !== undefined) return row[k];
                    const foundKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
                    if (foundKey) return row[foundKey];
                }
                return undefined;
            };

            const title = getVal(['Title', 'Task Title', 'name']);
            if (!title) return; // Skip rows without title

            // Priority Parsing
            let priorityRaw = getVal(['Priority', 'Urgency']);
            let priority = Priority.MEDIUM;
            if (priorityRaw && Object.values(Priority).includes(priorityRaw)) {
                priority = priorityRaw;
            }

            // Status Parsing
            let statusRaw = getVal(['Status', 'State']);
            let status = Status.PENDING;
            if (statusRaw && Object.values(Status).includes(statusRaw)) {
                status = statusRaw;
            }

            // Serial Number Parsing
            let serialRaw = getVal(['S.No', 'Serial', 'No', 'ID']);
            let serial = serialRaw ? parseInt(serialRaw) : nextSerial++;
            if (isNaN(serial)) serial = nextSerial++;

            // Tags Parsing
            let tagsRaw = getVal(['Tags', 'Labels', 'Category']);
            let tags: string[] = [];
            if (typeof tagsRaw === 'string') {
                tags = tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean);
            }

             // Date Parsing
             let dateRaw = getVal(['Due Date', 'DueDate', 'Due', 'Date']);
             let dueDate = new Date().toISOString();
             if (dateRaw) {
                 const parsed = new Date(dateRaw);
                 if (!isNaN(parsed.getTime())) dueDate = parsed.toISOString();
             }

             // Description & Progress
             const description = getVal(['Description', 'Desc', 'Details']) || "";
             const progress = getVal(['Progress Notes', 'Progress', 'Notes']) || "";

            newTasks.push({
                id: crypto.randomUUID(),
                serialNumber: serial,
                title: String(title),
                description: String(description),
                priority,
                status,
                dueDate,
                createdAt: Date.now(),
                subtasks: [],
                tags,
                images: [],
                progressNotes: String(progress)
            });
        });

        if (newTasks.length > 0) {
            if (window.confirm(`Found ${newTasks.length} tasks. Import them?`)) {
                setTasks(prev => [...prev, ...newTasks]);
            }
        } else {
            alert("Could not recognize valid task data in the file.");
        }

      } catch (err) {
        console.error("Import Error:", err);
        alert("Failed to parse file. Please ensure it is a valid CSV or Excel file.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    
    // Read as binary string for robustness with diverse encoding
    reader.readAsBinaryString(file);
  };

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === Status.COMPLETED).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [tasks]);

  const nextAvailableSerial = useMemo(() => {
    return tasks.length > 0 ? Math.max(...tasks.map(t => t.serialNumber)) + 1 : 1;
  }, [tasks]);

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".csv,.xlsx,.xls" 
        className="hidden" 
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary-500 to-indigo-600 p-2 rounded-lg text-white">
               <CheckSquare size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 hidden sm:block">
              TaskGenie AI
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
             <div className="hidden lg:flex items-center text-sm font-medium text-gray-600 mr-2 bg-gray-100 px-3 py-1 rounded-full">
                {user.avatar ? <img src={user.avatar} className="w-5 h-5 rounded-full mr-2"/> : <div className="w-5 h-5 rounded-full bg-primary-200 mr-2"/>}
                {user.username}
             </div>

             {selectedTaskIds.size > 0 && (
               <button 
                 onClick={clearSelection}
                 className="hidden sm:flex items-center text-sm text-gray-500 hover:text-gray-700"
               >
                 <X size={14} className="mr-1"/> Clear ({selectedTaskIds.size})
               </button>
             )}

            <button
              onClick={handleAutoRenumber}
              className="p-2 text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
              title="Auto-Sort & Renumber by Urgency"
            >
              <RefreshCw size={18} />
            </button>
             
             <button
              onClick={handleImportClick}
              className="p-2 sm:px-4 sm:py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-primary-600 transition-colors shadow-sm"
              title="Import CSV"
            >
              <Upload size={16} className="sm:mr-2 inline-block"/>
              <span className="hidden sm:inline">Import</span>
            </button>

             <button
              onClick={handleExportCSV}
              className="p-2 sm:px-4 sm:py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-primary-600 transition-colors shadow-sm"
              title="Export to CSV"
            >
              <Download size={16} className="sm:mr-2 inline-block"/>
              <span className="hidden sm:inline">Export</span>
            </button>
            
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">New Task</span>
            </button>
            
             <button 
                onClick={handleLogout}
                className="ml-1 sm:ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
             >
                <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium">Total Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><CheckSquare size={20}/></div>
            </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium">Pending</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                </div>
                <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><ListIcon size={20}/></div>
            </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckSquare size={20}/></div>
            </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-start md:items-center">
            {/* Search */}
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text"
                    placeholder="Search by title, desc or serial no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none shadow-sm"
                />
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
                >
                    <option value="All">All Status</option>
                    <option value={Status.PENDING}>{Status.PENDING}</option>
                    <option value={Status.IN_PROGRESS}>{Status.IN_PROGRESS}</option>
                    <option value={Status.COMPLETED}>{Status.COMPLETED}</option>
                </select>

                <select 
                    value={priorityFilter} 
                    onChange={(e) => setPriorityFilter(e.target.value as any)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
                >
                    <option value="All">All Priorities</option>
                    {Object.values(Priority).map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>

                <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm ml-auto md:ml-2">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <ListIcon size={18} />
                    </button>
                </div>
            </div>
        </div>

        {/* Task Grid/List */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <FileSpreadsheet size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No tasks found</h3>
            <p className="text-gray-500 mt-1">Get started by creating a new task above.</p>
            <button 
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg font-medium hover:bg-primary-100 transition-colors"
            >
                Create your first task
            </button>
          </div>
        ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {filteredTasks.map(task => (
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

      {/* Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingTask ? 'Edit Task' : 'Create New Task'}
      >
        <TaskForm 
            initialTask={editingTask} 
            onSubmit={handleCreateOrUpdateTask} 
            onCancel={closeModal}
            suggestedSerialNumber={nextAvailableSerial}
        />
      </Modal>

    </div>
  );
};

export default App;