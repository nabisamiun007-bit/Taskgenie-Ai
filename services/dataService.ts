import { supabase } from './supabaseClient';
import { Task, User } from '../types';

export const isCloudEnabled = !!supabase;

// --- AUTH SERVICES ---

export const loginUser = async (email: string, password: string): Promise<{ user: User | null, error: string | null }> => {
  if (isCloudEnabled && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };
    
    if (data.user && data.session) {
      return { 
        user: { 
          id: data.user.id, 
          email: data.user.email || '', 
          username: data.user.user_metadata?.username || email.split('@')[0] 
        }, 
        error: null 
      };
    } else {
        return { user: null, error: "Login failed. Please check your email verification." };
    }
  } else {
    // Local Fallback
    const users = JSON.parse(localStorage.getItem('taskgenie-users') || '[]');
    const user = users.find((u: any) => u.email === email && u.password === password);
    if (user) return { user, error: null };
    return { user: null, error: 'Invalid email or password (Local)' };
  }
};

export const registerUser = async (email: string, password: string, username: string): Promise<{ user: User | null, error: string | null }> => {
  if (isCloudEnabled && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    
    if (error) return { user: null, error: error.message };

    // CRITICAL FIX: Check if we actually got a session. 
    // If 'Confirm Email' is ON in Supabase, data.session will be null.
    if (data.user && !data.session) {
        return { 
            user: null, 
            error: "Please check your email to confirm your account before logging in." 
        };
    }

    if (data.user && data.session) {
      return { 
        user: { id: data.user.id, email: data.user.email || '', username }, 
        error: null 
      };
    }
  } else {
    // Local Fallback
    const users = JSON.parse(localStorage.getItem('taskgenie-users') || '[]');
    if (users.find((u: any) => u.email === email)) return { user: null, error: 'User already exists locally' };
    const newUser = { id: crypto.randomUUID(), email, username, password };
    localStorage.setItem('taskgenie-users', JSON.stringify([...users, newUser]));
    return { user: newUser, error: null };
  }
  return { user: null, error: 'Unknown error' };
};

// --- DATA SERVICES ---

export const subscribeToAuth = (callback: (user: User | null) => void) => {
    if (!isCloudEnabled || !supabase) return () => {};

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            callback({
                id: session.user.id,
                email: session.user.email || '',
                username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User'
            });
        } else {
            callback(null);
        }
    });

    return () => subscription.unsubscribe();
};

export const fetchTasks = async (user: User): Promise<Task[]> => {
  if (isCloudEnabled && supabase) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) {
      console.error("Error fetching tasks:", error);
      throw new Error(error.message);
    }
    
    return (data || []).map((t: any) => ({
      id: t.id,
      serialNumber: t.serial_number,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      dueDate: t.due_date,
      createdAt: t.created_at,
      subtasks: t.subtasks || [],
      tags: t.tags || [],
      images: t.images || [],
      progressNotes: t.progress_notes || ''
    }));

  } else {
    const key = `taskgenie-tasks-${user.id}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  }
};

export const saveTask = async (user: User, task: Task): Promise<void> => {
  if (isCloudEnabled && supabase) {
    const dbTask = {
      id: task.id,
      user_id: user.id,
      title: task.title,
      serial_number: task.serialNumber,
      description: task.description,
      priority: task.priority,
      status: task.status,
      due_date: task.dueDate,
      created_at: task.createdAt,
      subtasks: task.subtasks,
      tags: task.tags,
      images: task.images,
      progress_notes: task.progressNotes
    };

    const { error } = await supabase.from('tasks').upsert(dbTask, { onConflict: 'id' });
    
    if (error) {
        console.error("Supabase Save Error:", error);
        throw new Error(`Failed to save to cloud: ${error.message}`);
    }
  } else {
    // Local storage is handled by saveAllTasks in the main App logic for simplicity,
    // but individual save logic would go here if needed.
  }
};

export const saveAllTasks = async (user: User, tasks: Task[]): Promise<void> => {
  if (!isCloudEnabled) {
    const key = `taskgenie-tasks-${user.id}`;
    localStorage.setItem(key, JSON.stringify(tasks));
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  if (isCloudEnabled && supabase) {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) console.error("Error deleting task:", error);
  }
};

export const deleteMultipleTasks = async (taskIds: string[]): Promise<void> => {
    if (isCloudEnabled && supabase) {
      const { error } = await supabase.from('tasks').delete().in('id', taskIds);
      if (error) console.error("Error deleting multiple tasks:", error);
    }
  };
