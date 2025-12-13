import { supabase } from './supabaseClient';
import { Task, User } from '../types';

export const isCloudEnabled = !!supabase;

// --- AUTH SERVICES ---

export const loginUser = async (email: string, password: string): Promise<{ user: User | null, error: string | null }> => {
  if (isCloudEnabled && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };
    
    if (data.user && data.session) {
      const username = data.user.user_metadata?.username || email.split('@')[0];
      const avatar = data.user.user_metadata?.avatar_url || '';

      return { 
        user: { 
          id: data.user.id, 
          email: data.user.email || '', 
          username: username,
          avatar: avatar
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
  // Default to empty avatar, will use initials in UI
  const avatar = '';

  if (isCloudEnabled && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
            username,
            avatar_url: avatar
        } 
      }
    });
    
    if (error) return { user: null, error: error.message };

    if (data.user && !data.session) {
        return { 
            user: null, 
            error: "Please check your email to confirm your account before logging in." 
        };
    }

    if (data.user && data.session) {
      return { 
        user: { id: data.user.id, email: data.user.email || '', username, avatar }, 
        error: null 
      };
    }
  } else {
    // Local Fallback
    const users = JSON.parse(localStorage.getItem('taskgenie-users') || '[]');
    if (users.find((u: any) => u.email === email)) return { user: null, error: 'User already exists locally' };
    
    const newUser = { 
        id: crypto.randomUUID(), 
        email, 
        username, 
        password,
        avatar 
    };
    
    localStorage.setItem('taskgenie-users', JSON.stringify([...users, newUser]));
    return { user: newUser, error: null };
  }
  return { user: null, error: 'Unknown error' };
};

export const updateUserProfile = async (username: string, avatarUrl?: string): Promise<{ success: boolean; error?: string }> => {
    if (isCloudEnabled && supabase) {
        const updates: any = { username };
        if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

        const { error } = await supabase.auth.updateUser({
            data: updates
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
    }
    // Local fallback - manually update the user in the array
    if (!isCloudEnabled) {
        try {
            const currentUser = JSON.parse(localStorage.getItem('taskgenie-current-user') || '{}');
            const users = JSON.parse(localStorage.getItem('taskgenie-users') || '[]');
            
            const updatedUser = { ...currentUser, username, ...(avatarUrl !== undefined ? { avatar: avatarUrl } : {}) };
            
            // Update current session
            localStorage.setItem('taskgenie-current-user', JSON.stringify(updatedUser));
            
            // Update user list
            const updatedUsers = users.map((u: any) => u.id === currentUser.id ? { ...u, username, ...(avatarUrl !== undefined ? { avatar: avatarUrl } : {}) } : u);
            localStorage.setItem('taskgenie-users', JSON.stringify(updatedUsers));
            
            return { success: true };
        } catch(e) {
            return { success: false, error: "Local update failed" };
        }
    }
    return { success: true };
};

export const changeUserPassword = async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (isCloudEnabled && supabase) {
        const { error } = await supabase.auth.updateUser({ password: password });
        if (error) return { success: false, error: error.message };
        return { success: true };
    }
    // Local password change
    try {
        const currentUser = JSON.parse(localStorage.getItem('taskgenie-current-user') || '{}');
        const users = JSON.parse(localStorage.getItem('taskgenie-users') || '[]');
        const updatedUsers = users.map((u: any) => u.id === currentUser.id ? { ...u, password } : u);
        localStorage.setItem('taskgenie-users', JSON.stringify(updatedUsers));
        return { success: true };
    } catch(e) {
        return { success: false, error: "Local update failed" };
    }
};

export const deleteUserAccount = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (isCloudEnabled && supabase) {
        await supabase.from('tasks').delete().eq('user_id', userId);
        return { success: true };
    }
    
    // Local
    const users = JSON.parse(localStorage.getItem('taskgenie-users') || '[]');
    const newUsers = users.filter((u: any) => u.id !== userId);
    localStorage.setItem('taskgenie-users', JSON.stringify(newUsers));
    localStorage.removeItem(`taskgenie-tasks-${userId}`);
    return { success: true };
};


// --- DATA SERVICES ---

export const subscribeToAuth = (callback: (user: User | null) => void) => {
    if (!isCloudEnabled || !supabase) return () => {};

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            const username = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User';
            const avatar = session.user.user_metadata?.avatar_url || '';
            
            callback({
                id: session.user.id,
                email: session.user.email || '',
                username: username,
                avatar: avatar
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
    // Local storage is handled by saveAllTasks
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