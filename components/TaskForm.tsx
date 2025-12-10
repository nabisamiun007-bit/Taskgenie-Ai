import React, { useState, useEffect, useRef } from 'react';
import { Task, Priority, Status, AIResponse } from '../types';
import { enhanceTaskWithAI } from '../services/geminiService';
import { Sparkles, Loader2, Plus, Trash2, Upload, AlertCircle } from 'lucide-react';

interface TaskFormProps {
  initialTask?: Task | null;
  onSubmit: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  suggestedSerialNumber: number;
}

const TaskForm: React.FC<TaskFormProps> = ({ initialTask, onSubmit, onCancel, suggestedSerialNumber }) => {
  const [title, setTitle] = useState('');
  const [serialNumber, setSerialNumber] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [status, setStatus] = useState<Status>(Status.PENDING);
  const [dueDate, setDueDate] = useState('');
  const [subtasksText, setSubtasksText] = useState<string[]>([]);
  // Use a string for tags input to prevent comma glitches while typing
  const [tagsInput, setTagsInput] = useState('');
  const [progressNotes, setProgressNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setSerialNumber(initialTask.serialNumber);
      setDescription(initialTask.description);
      setPriority(initialTask.priority);
      setStatus(initialTask.status);
      setDueDate(initialTask.dueDate.split('T')[0]);
      setSubtasksText(initialTask.subtasks.map(s => s.title));
      setTagsInput(initialTask.tags ? initialTask.tags.join(', ') : '');
      setProgressNotes(initialTask.progressNotes || '');
      setImages(initialTask.images || []);
    } else {
      // Default due date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDueDate(tomorrow.toISOString().split('T')[0]);
      setSerialNumber(suggestedSerialNumber);
    }
  }, [initialTask, suggestedSerialNumber]);

  const handleAIAutoFill = async () => {
    if (!title) return;
    setIsGenerating(true);
    setAiError(null);
    try {
      const aiData: AIResponse = await enhanceTaskWithAI(title);
      setDescription(aiData.description);
      setPriority(aiData.priority);
      setSubtasksText(aiData.subtasks);
      // Append new tags to existing ones if any
      const newTags = aiData.tags.join(', ');
      setTagsInput(prev => prev ? `${prev}, ${newTags}` : newTags);
    } catch (e: any) {
      console.error(e);
      setAiError(e.message || "Failed to generate AI content.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setImages(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file as Blob);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Parse tags string into array on submit
    const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    onSubmit({
      title,
      serialNumber,
      description,
      priority,
      status,
      dueDate: new Date(dueDate).toISOString(),
      subtasks: subtasksText.map(st => ({ id: crypto.randomUUID(), title: st, isCompleted: false })),
      tags: tagsArray,
      progressNotes,
      images
    });
  };

  const addSubtask = () => setSubtasksText([...subtasksText, '']);
  const updateSubtask = (idx: number, val: string) => {
    const newSub = [...subtasksText];
    newSub[idx] = val;
    setSubtasksText(newSub);
  };
  const removeSubtask = (idx: number) => setSubtasksText(subtasksText.filter((_, i) => i !== idx));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-4">
        {/* Serial Number */}
        <div className="w-24 space-y-2">
            <label className="block text-sm font-medium text-gray-700">S.No</label>
            <input
                type="number"
                required
                value={serialNumber}
                onChange={(e) => setSerialNumber(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-center font-mono"
            />
        </div>

        {/* Title Input with AI Button */}
        <div className="space-y-2 flex-1">
            <label className="block text-sm font-medium text-gray-700">Task Title</label>
            <div className="flex gap-2">
            <input
                type="text"
                required
                placeholder="e.g., Plan Marketing Strategy"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
            <button
                type="button"
                onClick={handleAIAutoFill}
                disabled={isGenerating || !title}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-md"
            >
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                AI
            </button>
            </div>
            {aiError && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle size={12}/> {aiError}
                </p>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
          >
            {Object.values(Priority).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Due Date</label>
          <input
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
          placeholder="Describe the task..."
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Progress Notes</label>
        <textarea
          rows={3}
          value={progressNotes}
          onChange={(e) => setProgressNotes(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none bg-yellow-50/50"
          placeholder="Write your progress updates here..."
        />
      </div>

       {/* Images Section */}
       <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Images</label>
        <div className="flex flex-wrap gap-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
              <img src={img} alt="Task attachment" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary-500 hover:text-primary-500 transition-colors"
          >
            <Upload size={20} />
            <span className="text-xs mt-1">Add</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            multiple
            className="hidden"
          />
        </div>
      </div>

      {/* Subtasks Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Subtasks</label>
          <button
            type="button"
            onClick={addSubtask}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            <Plus size={16} /> Add Step
          </button>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
          {subtasksText.map((st, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={st}
                onChange={(e) => updateSubtask(idx, e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 outline-none"
                placeholder={`Step ${idx + 1}`}
              />
              <button
                type="button"
                onClick={() => removeSubtask(idx)}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {subtasksText.length === 0 && (
            <p className="text-sm text-gray-400 italic">No subtasks added yet.</p>
          )}
        </div>
      </div>

       {/* Tags Section */}
       <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
        <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            placeholder="Work, Urgent, Review"
          />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors font-medium shadow-sm"
        >
          {initialTask ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
};

export default TaskForm;