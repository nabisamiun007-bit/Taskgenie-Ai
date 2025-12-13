import React from 'react';
import { Task, Priority, Status } from '../types';
import { Calendar, CheckCircle2, Circle, Edit2, Trash2, Tag, ChevronDown, ChevronUp, FileText, Play, Pause } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (task: Task) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  isSelected, 
  onToggleSelection, 
  onEdit, 
  onDelete, 
  onToggleStatus, 
  onToggleSubtask 
}) => {
  const [showSubtasks, setShowSubtasks] = React.useState(false);
  const [showProgress, setShowProgress] = React.useState(false);

  const priorityColors = {
    [Priority.LOW]: 'bg-blue-50 text-blue-700 border-blue-200',
    [Priority.MEDIUM]: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    [Priority.HIGH]: 'bg-orange-50 text-orange-700 border-orange-200',
    [Priority.URGENT]: 'bg-red-50 text-red-700 border-red-200',
  };

  const isCompleted = task.status === Status.COMPLETED;
  const isInProgress = task.status === Status.IN_PROGRESS;
  
  const completedSubtasks = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubtasks = task.subtasks.length;
  const progress = totalSubtasks === 0 ? (isCompleted ? 100 : 0) : Math.round((completedSubtasks / totalSubtasks) * 100);

  return (
    <div 
      className={`group relative rounded-xl border transition-all duration-500 backdrop-blur-sm
        ${isCompleted ? 'scale-[0.98] opacity-80' : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100/50'}
        ${isSelected 
            ? 'border-primary-500 ring-1 ring-primary-500 bg-primary-50/80 shadow-lg' 
            : (isCompleted 
                ? 'border-gray-100 bg-white/40 shadow-none' 
                : isInProgress 
                    ? 'border-blue-200 ring-1 ring-blue-100 bg-white/90 shadow-blue-100/50' 
                    : 'border-gray-200/60 bg-white/80 shadow-sm shadow-slate-100')}`}
    >
      {/* Compact padding for mobile (p-3), standard for desktop (sm:p-5) */}
      <div className="p-3 sm:p-5">
        <div className="flex justify-between items-start mb-2 sm:mb-3 gap-2">
          <div className="flex items-start gap-2 sm:gap-3 overflow-hidden">
             {/* Selection & S.No */}
            <div className="pt-0.5 flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <input 
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelection(task.id)}
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer accent-primary-600"
              />
              <span className="font-mono text-[10px] sm:text-xs font-bold text-gray-500 bg-gray-100/80 px-1.5 py-0.5 rounded border border-gray-200">
                #{task.serialNumber}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${priorityColors[task.priority]} shadow-sm`}>
                {task.priority}
              </span>
              {isInProgress && (
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1 shadow-sm animate-pulse">
                    <Play size={8} fill="currentColor" /> <span className="hidden xs:inline">In Progress</span>
                </span>
              )}
              {task.tags.map((tag, idx) => (
                <span key={idx} className="hidden xs:flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-gray-100/80 text-gray-600 border border-gray-200 items-center gap-1 backdrop-blur-sm">
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>
          </div>
          
          {/* Always visible on mobile for accessibility, hover only on desktop */}
          <div className="flex gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button 
              onClick={() => onEdit(task)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              <Edit2 size={14} className="sm:w-4 sm:h-4" />
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 size={14} className="sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 sm:gap-3 mb-2 pl-0 sm:pl-9">
          {/* Status Controls */}
          <div className="mt-0.5 sm:mt-1 flex-shrink-0 flex gap-2">
            <button 
                onClick={() => onToggleStatus(task)} 
                className={`transition-all duration-300 ${isCompleted ? 'text-green-500 scale-110' : 'text-gray-300 hover:text-primary-500 hover:scale-105'}`}
            >
                {isCompleted ? <CheckCircle2 size={20} className="sm:w-6 sm:h-6" /> : <Circle size={20} className="sm:w-6 sm:h-6" />}
            </button>
            
            {!isCompleted && !isInProgress && (
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleStatus({ ...task, status: Status.IN_PROGRESS }); }}
                    className="text-gray-300 hover:text-blue-500 transition-colors"
                >
                    <Play size={20} className="sm:w-6 sm:h-6" />
                </button>
            )}

            {!isCompleted && isInProgress && (
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleStatus({ ...task, status: Status.PENDING }); }}
                    className="text-blue-500 hover:text-blue-700 transition-colors"
                >
                    <Pause size={20} className="sm:w-6 sm:h-6" />
                </button>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title - Smaller on mobile */}
            <h3 className={`font-semibold text-sm sm:text-lg text-slate-800 leading-snug truncate sm:whitespace-normal transition-all duration-300 ${isCompleted ? 'line-through text-slate-400 decoration-slate-300' : ''}`}>
              {task.title}
            </h3>
            {/* Description - Smaller text */}
            <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-2 ${isCompleted ? 'text-slate-300' : 'text-slate-500'}`}>{task.description}</p>
            
            {/* Image Thumbnails */}
            {task.images && task.images.length > 0 && (
                <div className={`flex gap-2 mt-2 sm:mt-3 overflow-x-auto pb-1 scrollbar-hide ${isCompleted ? 'opacity-50 grayscale' : ''}`}>
                    {task.images.map((img, i) => (
                        <div key={i} className="w-10 h-10 sm:w-16 sm:h-16 flex-shrink-0 rounded-md sm:rounded-lg border border-gray-200 overflow-hidden bg-gray-50 shadow-sm">
                            <img src={img} alt="attachment" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-100/50 pl-0 sm:pl-9">
          <div className="flex items-center text-[10px] sm:text-xs text-gray-400">
            <Calendar size={12} className="mr-1 sm:mr-1.5" />
            {new Date(task.dueDate).toLocaleDateString(undefined, { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                timeZone: 'UTC' 
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {task.progressNotes && (
                 <button 
                 onClick={() => setShowProgress(!showProgress)}
                 className={`flex items-center gap-1 text-[10px] sm:text-xs font-medium transition-colors ${showProgress ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 <FileText size={12} className="sm:w-3.5 sm:h-3.5" />
                 <span className="hidden sm:inline">Progress</span>
               </button>
            )}

            {totalSubtasks > 0 && (
                <button 
                onClick={() => setShowSubtasks(!showSubtasks)}
                className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                <div className="w-10 sm:w-16 h-1 sm:h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                    className="h-full bg-primary-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                    />
                </div>
                <span>{completedSubtasks}/{totalSubtasks}</span>
                {showSubtasks ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                </button>
            )}
          </div>
        </div>
      </div>

       {/* Progress Notes Section */}
       {showProgress && task.progressNotes && (
        <div className="bg-yellow-50/50 px-3 sm:px-5 py-2 sm:py-3 border-t border-yellow-100/50 animate-in slide-in-from-top-1 backdrop-blur-sm">
            <div className="pl-0 sm:pl-9 text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">
                <span className="font-semibold text-yellow-800 block mb-1 text-[10px] sm:text-xs uppercase tracking-wide">Current Progress:</span>
                {task.progressNotes}
            </div>
        </div>
      )}

      {/* Subtasks Dropdown */}
      {showSubtasks && totalSubtasks > 0 && (
        <div className="bg-gray-50/50 px-3 sm:px-5 py-2 sm:py-3 rounded-b-xl border-t border-gray-100/50 animate-in slide-in-from-top-2 backdrop-blur-sm">
          <ul className="space-y-1 sm:space-y-2 pl-0 sm:pl-9">
            {task.subtasks.map(sub => (
              <li key={sub.id} className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                 <button 
                  onClick={() => onToggleSubtask(task.id, sub.id)}
                  className={`${sub.isCompleted ? 'text-green-500' : 'text-gray-400 hover:text-primary-500'}`}
                >
                  {sub.isCompleted ? <CheckCircle2 size={14} className="sm:w-4 sm:h-4" /> : <Circle size={14} className="sm:w-4 sm:h-4" />}
                </button>
                <span className={sub.isCompleted ? 'line-through text-gray-400' : ''}>{sub.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TaskCard;