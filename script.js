// ==================== STATE MANAGEMENT ====================
class ProductivityApp {
    constructor() {
        this.tasks = this.loadFromStorage('tasks') || [];
        this.goals = this.loadFromStorage('goals') || [];
        this.timerState = {
            minutes: 25,
            seconds: 0,
            isRunning: false,
            interval: null,
            currentTaskId: null
        };
        this.stats = this.loadFromStorage('stats') || {
            totalTime: 0,
            lastActiveDate: null,
            streak: 0,
            tasksCompleted: []
        };
        this.currentFilter = 'all';
        this.currentGoalTab = 'short-term';
        this.theme = this.loadFromStorage('theme') || 'light';
        this.notificationsEnabled = false;
    }

    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error loading from storage:', e);
            return null;
        }
    }

    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving to storage:', e);
        }
    }

    // Task Management
    addTask(title, category, priority) {
        const task = {
            id: Date.now(),
            title,
            category,
            priority,
            completed: false,
            createdAt: new Date().toISOString(),
            timeSpent: 0
        };
        this.tasks.unshift(task);
        this.saveToStorage('tasks', this.tasks);
        this.updateTaskUI();
        this.updateStats();
        this.showToast('Task added successfully! 🎉');
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            if (task.completed) {
                this.stats.tasksCompleted.push({
                    date: new Date().toISOString(),
                    category: task.category
                });
                this.checkAchievements();
                this.showToast('Great job completing this task! 🌟');
            }
            this.saveToStorage('tasks', this.tasks);
            this.saveToStorage('stats', this.stats);
            this.updateTaskUI();
            this.updateStats();
            this.updateAIInsights();
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveToStorage('tasks', this.tasks);
        this.updateTaskUI();
        this.updateStats();
    }

    // Goal Management
    addGoal(title, deadline, type) {
        const goal = {
            id: Date.now(),
            title,
            deadline,
            type: type || this.currentGoalTab,
            progress: 0,
            completed: false,
            createdAt: new Date().toISOString()
        };
        this.goals.unshift(goal);
        this.saveToStorage('goals', this.goals);
        this.updateGoalUI();
        this.showToast('Goal set! Let\'s make it happen! 💪');
    }

    updateGoalProgress(id, progress) {
        const goal = this.goals.find(g => g.id === id);
        if (goal) {
            goal.progress = Math.min(100, Math.max(0, progress));
            goal.completed = goal.progress === 100;
            this.saveToStorage('goals', this.goals);
            this.updateGoalUI();
            if (goal.completed) {
                this.showToast('🎊 Goal achieved! You\'re amazing!');
                this.checkAchievements();
            }
        }
    }

    deleteGoal(id) {
        this.goals = this.goals.filter(g => g.id !== id);
        this.saveToStorage('goals', this.goals);
        this.updateGoalUI();
    }

    // Timer Management
    startTimer() {
        if (!this.timerState.isRunning) {
            this.timerState.isRunning = true;
            this.timerState.interval = setInterval(() => this.tickTimer(), 1000);
            this.updateTimerButtons();
            this.showToast('Focus time started! 🎯');
        }
    }

    pauseTimer() {
        if (this.timerState.isRunning) {
            this.timerState.isRunning = false;
            clearInterval(this.timerState.interval);
            this.updateTimerButtons();
        }
    }

    resetTimer(minutes = 25) {
        this.pauseTimer();
        this.timerState.minutes = minutes;
        this.timerState.seconds = 0;
        this.updateTimerDisplay();
        this.updateTimerButtons();
    }

    tickTimer() {
        if (this.timerState.seconds === 0) {
            if (this.timerState.minutes === 0) {
                this.timerComplete();
                return;
            }
            this.timerState.minutes--;
            this.timerState.seconds = 59;
        } else {
            this.timerState.seconds--;
        }
        this.stats.totalTime += 1;
        this.saveToStorage('stats', this.stats);
        this.updateTimerDisplay();
        this.updateStats();
    }

    timerComplete() {
        this.pauseTimer();
        this.resetTimer();
        this.showToast('⏰ Timer complete! Great focus session!');
        this.sendNotification('Focus Session Complete', 'Time for a break!');
        this.checkAchievements();
    }

    // UI Update Methods
    updateTaskUI() {
        const taskList = document.getElementById('taskList');
        const filteredTasks = this.tasks.filter(task => {
            if (this.currentFilter === 'all') return true;
            if (this.currentFilter === 'active') return !task.completed;
            if (this.currentFilter === 'completed') return task.completed;
            return true;
        });

        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<p class="empty-state">No tasks yet. Add one to get started!</p>';
            return;
        }

        taskList.innerHTML = filteredTasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <div class="task-content">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onchange="app.toggleTask(${task.id})" />
                    <div class="task-details">
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                        <div class="task-meta">
                            <span class="task-category ${task.category}">${this.getCategoryIcon(task.category)} ${task.category}</span>
                            <span class="task-priority priority-${task.priority}">${this.getPriorityIcon(task.priority)}</span>
                        </div>
                    </div>
                </div>
                <button class="btn-delete" onclick="app.deleteTask(${task.id})">🗑️</button>
            </div>
        `).join('');
    }

    updateGoalUI() {
        const goalList = document.getElementById('goalList');
        const filteredGoals = this.goals.filter(g => g.type === this.currentGoalTab);

        if (filteredGoals.length === 0) {
            goalList.innerHTML = '<p class="empty-state">No goals set. Create one to stay motivated!</p>';
            return;
        }

        goalList.innerHTML = filteredGoals.map(goal => `
            <div class="goal-item ${goal.completed ? 'completed' : ''}" data-id="${goal.id}">
                <div class="goal-header">
                    <h4>${this.escapeHtml(goal.title)}</h4>
                    <button class="btn-delete" onclick="app.deleteGoal(${goal.id})">🗑️</button>
                </div>
                <div class="goal-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${goal.progress}%"></div>
                    </div>
                    <span class="progress-text">${goal.progress}%</span>
                </div>
                <div class="goal-controls">
                    <button class="btn-sm" onclick="app.updateGoalProgress(${goal.id}, ${goal.progress - 10})">-10%</button>
                    <button class="btn-sm" onclick="app.updateGoalProgress(${goal.id}, ${goal.progress + 10})">+10%</button>
                    ${goal.deadline ? `<span class="goal-deadline">📅 ${new Date(goal.deadline).toLocaleDateString()}</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    updateTimerDisplay() {
        const minutesEl = document.getElementById('timerMinutes');
        const secondsEl = document.getElementById('timerSeconds');
        const labelEl = document.getElementById('timerLabel');
        
        minutesEl.textContent = String(this.timerState.minutes).padStart(2, '0');
        secondsEl.textContent = String(this.timerState.seconds).padStart(2, '0');
        
        if (this.timerState.isRunning) {
            labelEl.textContent = 'Stay focused! 🎯';
        } else if (this.timerState.minutes === 0 && this.timerState.seconds === 0) {
            labelEl.textContent = 'Ready to focus';
        } else {
            labelEl.textContent = 'Paused';
        }
    }

    updateTimerButtons() {
        const startBtn = document.getElementById('startTimer');
        const pauseBtn = document.getElementById('pauseTimer');
        
        startBtn.disabled = this.timerState.isRunning;
        pauseBtn.disabled = !this.timerState.isRunning;
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.completed).length;
        const totalHours = Math.floor(this.stats.totalTime / 3600);
        
        // Update streak
        this.updateStreak();
        
        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('totalTime').textContent = totalHours + 'h';
        document.getElementById('streak').textContent = this.stats.streak;
    }

    updateStreak() {
        const today = new Date().toDateString();
        const lastActive = this.stats.lastActiveDate ? new Date(this.stats.lastActiveDate).toDateString() : null;
        
        if (this.tasks.some(t => t.completed && new Date(t.createdAt).toDateString() === today)) {
            if (lastActive !== today) {
                const yesterday = new Date(Date.now() - 86400000).toDateString();
                if (lastActive === yesterday) {
                    this.stats.streak++;
                } else if (lastActive !== today) {
                    this.stats.streak = 1;
                }
                this.stats.lastActiveDate = new Date().toISOString();
                this.saveToStorage('stats', this.stats);
            }
        }
    }

    // AI Insights
    updateAIInsights() {
        const insightsEl = document.getElementById('aiInsights');
        const insights = this.generateInsights();
        
        insightsEl.innerHTML = insights.map(insight => 
            `<div class="ai-message"><strong>${insight.emoji}</strong> ${insight.text}</div>`
        ).join('');
    }

    generateInsights() {
        const insights = [];
        const completed = this.tasks.filter(t => t.completed);
        const active = this.tasks.filter(t => !t.completed);
        
        if (this.tasks.length === 0) {
            return [{ emoji: '👋', text: 'Welcome! Start by adding your first task to begin your productivity journey.' }];
        }

        // Productivity insights
        const completionRate = this.tasks.length > 0 ? (completed.length / this.tasks.length * 100).toFixed(0) : 0;
        if (completionRate > 70) {
            insights.push({ emoji: '🌟', text: `Amazing! You've completed ${completionRate}% of your tasks. Keep up the excellent work!` });
        } else if (completionRate > 40) {
            insights.push({ emoji: '💪', text: `Good progress! ${completionRate}% completion rate. You're building momentum!` });
        } else if (active.length > 5) {
            insights.push({ emoji: '🎯', text: 'You have many active tasks. Focus on completing a few high-priority items first!' });
        }

        // Category insights
        const categories = {};
        completed.forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + 1;
        });
        const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
        if (topCategory && completed.length > 3) {
            insights.push({ emoji: '📊', text: `You're most productive in ${topCategory[0]} tasks. Consider scheduling more of what works!` });
        }

        // Time insights
        const hours = Math.floor(this.stats.totalTime / 3600);
        if (hours > 10) {
            insights.push({ emoji: '⏱️', text: `You've logged ${hours} hours of focused work. That's dedication!` });
        }

        // Streak insights
        if (this.stats.streak >= 7) {
            insights.push({ emoji: '🔥', text: `${this.stats.streak} day streak! You're on fire! Consistency is key to success.` });
        } else if (this.stats.streak >= 3) {
            insights.push({ emoji: '✨', text: `${this.stats.streak} days in a row! Keep the momentum going!` });
        }

        // Motivational messages
        const motivational = [
            { emoji: '🚀', text: 'Every small step forward is progress. You\'re doing great!' },
            { emoji: '💡', text: 'Break large tasks into smaller chunks for better results.' },
            { emoji: '🎯', text: 'Focus on high-priority tasks during your peak energy hours.' },
            { emoji: '🌱', text: 'Growth happens outside your comfort zone. Challenge yourself!' }
        ];

        if (insights.length < 3) {
            insights.push(motivational[Math.floor(Math.random() * motivational.length)]);
        }

        return insights.slice(0, 4);
    }

    // Achievements & Gamification
    checkAchievements() {
        const badges = this.loadFromStorage('badges') || [];
        const newBadges = [];

        const achievements = [
            { id: 'first-task', name: 'First Steps', icon: '🎯', condition: () => this.tasks.length >= 1 },
            { id: 'task-master', name: 'Task Master', icon: '⭐', condition: () => this.tasks.filter(t => t.completed).length >= 10 },
            { id: 'week-warrior', name: 'Week Warrior', icon: '🔥', condition: () => this.stats.streak >= 7 },
            { id: 'time-lord', name: 'Time Lord', icon: '⏰', condition: () => this.stats.totalTime >= 36000 },
            { id: 'goal-getter', name: 'Goal Getter', icon: '🎊', condition: () => this.goals.filter(g => g.completed).length >= 3 },
            { id: 'focused', name: 'Deep Focus', icon: '🧠', condition: () => this.stats.totalTime >= 3600 }
        ];

        achievements.forEach(achievement => {
            if (!badges.includes(achievement.id) && achievement.condition()) {
                badges.push(achievement.id);
                newBadges.push(achievement);
            }
        });

        if (newBadges.length > 0) {
            this.saveToStorage('badges', badges);
            this.updateBadgesUI();
            newBadges.forEach(badge => {
                this.showToast(`🏆 Achievement Unlocked: ${badge.name}!`);
            });
        }
    }

    updateBadgesUI() {
        const badges = this.loadFromStorage('badges') || [];
        const badgesEl = document.getElementById('badgesList');
        
        const allAchievements = [
            { id: 'first-task', name: 'First Steps', icon: '🎯', desc: 'Create your first task' },
            { id: 'task-master', name: 'Task Master', icon: '⭐', desc: 'Complete 10 tasks' },
            { id: 'week-warrior', name: 'Week Warrior', icon: '🔥', desc: 'Maintain 7-day streak' },
            { id: 'time-lord', name: 'Time Lord', icon: '⏰', desc: 'Log 10 hours' },
            { id: 'goal-getter', name: 'Goal Getter', icon: '🎊', desc: 'Achieve 3 goals' },
            { id: 'focused', name: 'Deep Focus', icon: '🧠', desc: 'Log 1 hour' }
        ];

        badgesEl.innerHTML = allAchievements.map(achievement => `
            <div class="badge-card ${badges.includes(achievement.id) ? 'unlocked' : 'locked'}">
                <div class="badge-icon">${achievement.icon}</div>
                <div class="badge-name">${achievement.name}</div>
                <div class="badge-desc">${achievement.desc}</div>
            </div>
        `).join('');
    }

    // Charts
    updateChart() {
        const ctx = document.getElementById('productivityChart');
        if (!ctx) return;

        const last7Days = [];
        const tasksPerDay = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            
            const count = this.stats.tasksCompleted.filter(t => 
                new Date(t.date).toDateString() === dateStr
            ).length;
            tasksPerDay.push(count);
        }

        if (window.productivityChart) {
            window.productivityChart.destroy();
        }

        window.productivityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Tasks Completed',
                    data: tasksPerDay,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // Notifications
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                this.notificationsEnabled = permission === 'granted';
                if (this.notificationsEnabled) {
                    this.showToast('Notifications enabled! 🔔');
                }
            });
        } else if (Notification.permission === 'granted') {
            this.notificationsEnabled = true;
            this.showToast('Notifications are already enabled! 🔔');
        }
    }

    sendNotification(title, body) {
        if (this.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '🎯',
                badge: '🎯'
            });
        }
    }

    // Theme
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', this.theme);
        this.saveToStorage('theme', this.theme);
    }

    // Utilities
    showToast(message) {
        const toast = document.getElementById('motivationalToast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getCategoryIcon(category) {
        const icons = {
            work: '💼',
            personal: '👤',
            health: '💪',
            learning: '📚',
            other: '📌'
        };
        return icons[category] || '📌';
    }

    getPriorityIcon(priority) {
        const icons = {
            high: '🔴',
            medium: '🟡',
            low: '🟢'
        };
        return icons[priority] || '🟡';
    }

    // Initialize
    init() {
        // Apply theme
        document.body.setAttribute('data-theme', this.theme);

        // Update all UI
        this.updateTaskUI();
        this.updateGoalUI();
        this.updateTimerDisplay();
        this.updateTimerButtons();
        this.updateStats();
        this.updateAIInsights();
        this.updateBadgesUI();
        this.checkAchievements();
        
        // Initialize chart after a short delay to ensure DOM is ready
        setTimeout(() => this.updateChart(), 100);

        // Show welcome message
        if (this.tasks.length === 0 && this.goals.length === 0) {
            this.showToast('Welcome to ProductivityFlow! 🎯 Let\'s get started!');
        }

        // Send motivational nudges periodically
        setInterval(() => {
            const messages = [
                '💪 Keep pushing! You\'re doing great!',
                '🌟 Every effort counts towards your goals!',
                '🚀 Take a moment to review your progress!',
                '🎯 Focus on one task at a time for best results!'
            ];
            if (this.tasks.length > 0) {
                this.showToast(messages[Math.floor(Math.random() * messages.length)]);
            }
        }, 1800000); // Every 30 minutes
    }
}

// ==================== EVENT LISTENERS ====================
const app = new ProductivityApp();

document.addEventListener('DOMContentLoaded', () => {
    app.init();

    // Task Form
    document.getElementById('taskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('taskTitle').value.trim();
        const category = document.getElementById('taskCategory').value;
        const priority = document.getElementById('taskPriority').value;
        
        if (title) {
            app.addTask(title, category, priority);
            document.getElementById('taskForm').reset();
        }
    });

    // Task Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            app.currentFilter = btn.dataset.filter;
            app.updateTaskUI();
        });
    });

    // Goal Form
    document.getElementById('goalForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('goalTitle').value.trim();
        const deadline = document.getElementById('goalDeadline').value;
        
        if (title) {
            app.addGoal(title, deadline);
            document.getElementById('goalForm').reset();
        }
    });

    // Goal Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            app.currentGoalTab = btn.dataset.tab;
            app.updateGoalUI();
        });
    });

    // Timer Controls
    document.getElementById('startTimer').addEventListener('click', () => app.startTimer());
    document.getElementById('pauseTimer').addEventListener('click', () => app.pauseTimer());
    document.getElementById('resetTimer').addEventListener('click', () => app.resetTimer());

    // Timer Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const minutes = parseInt(btn.dataset.minutes);
            app.resetTimer(minutes);
        });
    });

    // AI Insights Refresh
    document.getElementById('refreshInsights').addEventListener('click', () => {
        app.updateAIInsights();
        app.showToast('Insights refreshed! 🤖');
    });

    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', () => app.toggleTheme());

    // Notifications
    document.getElementById('notificationBtn').addEventListener('click', () => app.requestNotificationPermission());
});