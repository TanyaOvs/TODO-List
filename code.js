// Переменная для напоминания
let reminderCheckInterval;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Проверка всех необходимых элементов
    const requiredElements = [
        'currentDate', 'tasksContainer', 'emptyState', 
        'addTaskBtn', 'cancelTaskBtn', 'taskForm', 'clearCompletedBtn', 'clearAllBtn'
    ];
    
    requiredElements.forEach(id => {
        if (!document.getElementById(id)) {
            console.error(`Элемент с ID "${id}" не найден в DOM`);
        }
    });

    // Установка текущей даты
    updateCurrentDate();
    
    // Загрузка и отображение задач
    loadAndRenderTasks();
    
    // Установка обработчиков событий
    setupEventListeners();

    // Запуск проверки напоминаний
    startReminderChecker();
});

// Функция для запуска проверки напоминаний
function startReminderChecker() {
    // Проверяем сразу при загрузке
    checkReminders();
    
    // Устанавливаем периодическую проверку (каждую минуту)
    reminderCheckInterval = setInterval(checkReminders, 60000);
}

function scheduleReminderCheck() {
    // Очищаем предыдущий интервал, если он был
    if (reminderCheckInterval) {
        clearInterval(reminderCheckInterval);
    }
    
    // Проверяем сразу и затем каждые 5 секунд (вместо 60 секунд)
    checkReminders();
    reminderCheckInterval = setInterval(checkReminders, 5000);
    
    console.log('Reminder checker scheduled'); // Логирование запуска проверки
}

// Функция проверки напоминаний
function checkReminders() {
    const tasks = loadTasks();
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    
    console.log(`Checking reminders at ${currentHours}:${currentMinutes}`); // Логирование времени проверки

    tasks.forEach(task => {
        if (task.dueDate && task.reminderTime && !task.completed && !task.reminderShown) {
            // Проверяем, что дата задачи - сегодня
            const taskDate = new Date(task.dueDate);
            const today = new Date();
            
            if (taskDate.getDate() === today.getDate() && 
                taskDate.getMonth() === today.getMonth() && 
                taskDate.getFullYear() === today.getFullYear()) {
                
                // Разбираем время напоминания
                const [reminderHours, reminderMinutes] = task.reminderTime.split(':').map(Number);
                
                console.log(`Task "${task.title}" reminder set for ${reminderHours}:${reminderMinutes}`); // Логирование времени напоминания
                
                // Сравниваем часы и минуты
                if (currentHours === reminderHours && currentMinutes === reminderMinutes) {
                    console.log(`Showing notification for: "${task.title}"`);
                    showNotification(task);
                    task.reminderShown = true;
                    saveTasks(tasks);
                }
            }
        }
    });
}

// Функция показа уведомления
function showNotification(task) {
    if (!("Notification" in window)) {
        showFallbackNotification(task);
        return;
    }
    
    if (Notification.permission === "granted") {
        new Notification(`Напоминание по задаче: ${task.title}`, {
            body: `Время: ${task.reminderTime}\nДедлайн задачи: ${formatReminderTime(task.dueDate, '')}`
        });
    } else {
        showFallbackNotification(task);
    }
}

function showFallbackNotification(task) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="font-medium">Напоминание по задаче "${task.title}"</div>
        <div class="mt-1">Время: ${task.reminderTime}</div>
        <div>Дедлайн задачи: ${formatReminderTime(task.dueDate, '')}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 7000);
}

function formatReminderTime(dateStr, timeStr) {
    const date = new Date(dateStr);
    //return `${date.toLocaleDateString('ru-RU')} в ${timeStr}`;
    return `${date.toLocaleDateString('ru-RU')} ${timeStr}`;
}

function createNotification(task) {
    new Notification("Напоминание о дедлайне", {
        body: `Задача "${task.title}" должна быть выполнена сегодня!`,
        icon: "/favicon.ico"
    });
}

function showSimpleNotification(task) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="font-medium">Напоминание о дедлайне</div>
        <div>Задача "${task.title}" должна быть выполнена сегодня!</div>
    `;
    
    document.body.appendChild(notification);
    
    // Автоматически скрываем через 7 секунд
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 7000);
}

function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('ru-RU', options);
}

function loadAndRenderTasks() {
    const tasks = loadTasks();
    const sortedTasks = sortTasksByPriority(tasks); // Сортируем задачи
    renderTasks(sortedTasks);
    updateEmptyState(tasks); // Передаем исходные задачи для проверки пустого состояния
}

// Функция для сортировки задач по приоритету
function sortTasksByPriority(tasks) {
    const priorityOrder = {
        'high': 3,
        'medium': 2,
        'low': 1
    };
    
    return [...tasks].sort((a, b) => {
        // Сначала сортируем по приоритету
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        // Если приоритет одинаковый, сортируем по дате создания (новые выше)
        return priorityDiff !== 0 ? priorityDiff : 
            new Date(b.createdAt) - new Date(a.createdAt);
    });
}

function loadTasks() {
    return JSON.parse(localStorage.getItem('tasks')) || [];
}

function saveTasks(tasks) {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function setupEventListeners() {
    // Кнопка добавления задачи
    document.getElementById('addTaskBtn').addEventListener('click', openAddTaskModal);
    
    // Кнопка удаления выполненных задач
    document.getElementById('clearCompletedBtn').addEventListener('click', clearCompletedTasks);

    // Кнопка очистки всех задач
    document.getElementById('clearAllBtn').addEventListener('click', clearAllTasks);
    
    // Модальное окно задачи
    document.getElementById('cancelTaskBtn').addEventListener('click', closeTaskModal);
    document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);
    
    // Фильтры задач
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active', 'bg-purple-100', 'text-purple-700');
                b.classList.add('bg-gray-100', 'text-gray-700');
            });
            this.classList.add('active', 'bg-purple-100', 'text-purple-700');
            
            const filter = this.dataset.filter;
            filterTasks(filter);
        });
    });
}

function renderTasks(sortedTasks, containerId = 'tasksContainer') {
    const container = document.getElementById(containerId);
    const emptyState = document.getElementById('emptyState');
    
    if (!container || !emptyState) {
        console.error('Не найдены необходимые элементы DOM');
        return;
    }
    
    // Если нет задач, показываем пустое состояние
    if (!sortedTasks || sortedTasks.length === 0) {
        if (!emptyState.classList.contains('hidden')) return;
        
        const taskElements = container.querySelectorAll('.task-item');
        if (taskElements.length > 0) {
            taskElements.forEach(task => {
                task.classList.add('fade-out');
                setTimeout(() => task.remove(), 300);
            });
            
            setTimeout(() => {
                container.innerHTML = '';
                emptyState.classList.remove('hidden');
                emptyState.classList.add('fade-in');
            }, 300);
        } else {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            emptyState.classList.add('fade-in');
        }
        return;
    }
            
    // Если есть задачи, скрываем пустое состояние
    if (!emptyState.classList.contains('hidden')) {
        emptyState.classList.add('fade-out');
        setTimeout(() => {
            emptyState.classList.add('hidden');
            emptyState.classList.remove('fade-out');
        }, 300);
    }
    
    // Создаем карту существующих задач для сравнения
    const existingTasks = {};
    container.querySelectorAll('.task-item').forEach(taskEl => {
        existingTasks[taskEl.dataset.id] = taskEl;
    });
    
    // Создаем карту новых задач
    const newTasks = {};
    sortedTasks.forEach(task => {
        newTasks[task.id] = task;
    });
    
    // Удаляем задачи, которых больше нет
    Object.keys(existingTasks).forEach(taskId => {
        if (!newTasks[taskId]) {
            const taskEl = existingTasks[taskId];
            taskEl.classList.add('fade-out');
            setTimeout(() => taskEl.remove(), 300);
        }
    });
    
    // Добавляем новые задачи или обновляем существующие
    sortedTasks.forEach(task => {
        const existingTaskEl = existingTasks[task.id];
        if (existingTaskEl) {
            // Обновляем существующую задачу, если нужно
            updateTaskElement(existingTaskEl, task);
        } else {
            // Добавляем новую задачу с анимацией
            const taskElement = createTaskElement(task);
            taskElement.classList.add('fade-in');
            container.prepend(taskElement);
            
            // Удаляем анимацию после завершения
            setTimeout(() => {
                taskElement.classList.remove('fade-in');
            }, 300);
        }
    });
}

function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item p-4 border-b hover:bg-gray-50 cursor-pointer transition ${task.completed ? 'bg-gray-50' : ''} priority-${task.priority}`;
    taskElement.dataset.id = task.id;
    
    // Иконка приоритета
    let priorityIcon, priorityColor;
    switch(task.priority) {
        case 'high':
            priorityIcon = 'fa-arrow-up';
            priorityColor = 'text-red-500';
            break;
        case 'medium':
            priorityIcon = 'fa-equals';
            priorityColor = 'text-yellow-500';
            break;
        default:
            priorityIcon = 'fa-arrow-down';
            priorityColor = 'text-green-500';
    }
    
    // Текст даты выполнения
    let dueDateText = '';
    if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        
        // Устанавливаем время на 00:00:00 для обеих дат для точного сравнения
        dueDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        // Рассчитываем разницу в днях (без округления вверх)
        const timeDiff = dueDate - today;
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) {
            dueDateText = '<span class="text-red-500">Сегодня</span>';
        } else if (daysDiff === 1) {
            dueDateText = '<span class="text-orange-500">Завтра</span>';
        } else if (daysDiff < 0) {
            dueDateText = `<span class="text-red-500">Просрочено ${Math.abs(daysDiff)} дн.</span>`;
        } else {
            dueDateText = `Осталось ${daysDiff} дн.`;
        }
    }
    
    // Текст напоминания
    const reminderText = task.reminder 
        ? `<div class="text-xs text-gray-500 mt-1"><i class="far fa-bell mr-1"></i>${task.reminder}</div>`
        : '';
    
    taskElement.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex items-start">
                <button class="complete-btn mr-3 mt-1 p-2 rounded-full ${task.completed ? 'bg-green-100 text-green-600' : 'border text-gray-400 hover:border-green-300 hover:text-green-500'}">
                    <i class="fas ${task.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
                </button>
                <div>
                    <div class="font-medium ${task.completed ? 'line-through text-gray-400' : ''}">${task.title}</div>
                    ${reminderText}
                </div>
            </div>
            <div class="flex items-center">
                <div class="text-xs mr-3 text-right">
                    ${dueDateText}
                </div>
                <i class="fas ${priorityIcon} ${priorityColor} mr-2"></i>
                <button class="edit-btn p-2 text-gray-400 hover:text-purple-600">
                    <i class="fas fa-pencil-alt"></i>
                </button>
            </div>
        </div>
    `;
    
    // Обработчики событий
    taskElement.querySelector('.complete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTaskCompletion(task.id);
    });
    
    taskElement.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openEditTaskModal(task.id);
    });
    
    taskElement.addEventListener('click', () => {
        openEditTaskModal(task.id);
    });

    return taskElement;
}

function updateTaskElement(taskElement, task) {
    // Обновляем только необходимые части элемента
    const titleElement = taskElement.querySelector('.font-medium');
    const completeBtn = taskElement.querySelector('.complete-btn');
    const completeIcon = completeBtn.querySelector('i');
    const priorityIcon = taskElement.querySelector('.fa-arrow-up, .fa-equals, .fa-arrow-down');
    
    // Обновляем классы приоритета
    taskElement.className = `task-item p-4 border-b hover:bg-gray-50 cursor-pointer transition ${task.completed ? 'bg-gray-50' : ''} priority-${task.priority}`;
    
    // Обновляем заголовок
    if (titleElement.textContent !== task.title) {
        titleElement.textContent = task.title;
    }
    titleElement.className = `font-medium ${task.completed ? 'line-through text-gray-400' : ''}`;
    
    // Обновляем кнопку выполнения
    completeBtn.className = `complete-btn mr-3 mt-1 p-2 rounded-full ${task.completed ? 'bg-green-100 text-green-600' : 'border text-gray-400 hover:border-green-300 hover:text-green-500'}`;
    completeIcon.className = `fas ${task.completed ? 'fa-check-circle' : 'fa-circle'}`;
    
    // Обновляем иконку приоритета
    let newPriorityIcon, newPriorityColor;
    switch(task.priority) {
        case 'high':
            newPriorityIcon = 'fa-arrow-up';
            newPriorityColor = 'text-red-500';
            break;
        case 'medium':
            newPriorityIcon = 'fa-equals';
            newPriorityColor = 'text-yellow-500';
            break;
        default:
            newPriorityIcon = 'fa-arrow-down';
            newPriorityColor = 'text-green-500';
    }
    priorityIcon.className = `fas ${newPriorityIcon} ${newPriorityColor}`;
    
    // Обновляем дату выполнения
    let dueDateText = '';
    if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        
        // Устанавливаем время на 00:00:00 для обеих дат для точного сравнения
        dueDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        // Рассчитываем разницу в днях (без округления вверх)
        const timeDiff = dueDate - today;
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) {
            dueDateText = '<span class="text-red-500">Сегодня</span>';
        } else if (daysDiff === 1) {
            dueDateText = '<span class="text-orange-500">Завтра</span>';
        } else if (daysDiff < 0) {
            dueDateText = `<span class="text-red-500">Просрочено ${Math.abs(daysDiff)} дн.</span>`;
        } else {
            dueDateText = `Осталось ${daysDiff} дн.`;
        }
    }
    
    const dateElement = taskElement.querySelector('.text-xs');
    if (dateElement.innerHTML !== dueDateText) {
        dateElement.innerHTML = dueDateText;
    }
    
    // Обновляем напоминание
    const reminderText = task.reminder 
        ? `<div class="text-xs text-gray-500 mt-1"><i class="far fa-bell mr-1"></i>${task.reminder}</div>`
        : '';
    
    const reminderContainer = taskElement.querySelector('.text-xs + div');
    if (reminderContainer) {
        if (reminderContainer.innerHTML !== reminderText) {
            reminderContainer.innerHTML = reminderText;
        }
    } else if (reminderText) {
        // Если контейнера нет, но напоминание есть - добавляем
        const titleContainer = taskElement.querySelector('.font-medium').parentNode;
        titleContainer.insertAdjacentHTML('beforeend', reminderText);
    }
}

function toggleTaskCompletion(taskId) {
    const tasks = loadTasks().map(task => 
        task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    saveTasks(tasks);
    
    // Сортируем задачи для отображения
    const sortedTasks = sortTasksByPriority(tasks);
    renderTasks(sortedTasks);
    
    // Находим элемент задачи
    const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
    if (taskElement) {
        // Добавляем анимацию изменения состояния
        taskElement.classList.add('fade-out');
        setTimeout(() => {
            // Обновляем элемент после анимации
            updateTaskElement(taskElement, tasks.find(t => t.id === taskId));
            taskElement.classList.remove('fade-out');
            taskElement.classList.add('fade-in');
            
            setTimeout(() => {
                taskElement.classList.remove('fade-in');
            }, 300);
        }, 300);
    }
    
    // Обновляем состояние "пусто" на случай, если это была последняя задача
    updateEmptyState(tasks);
}

function filterTasks(filterType) {
    const tasks = loadTasks();
    let filteredTasks = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch(filterType) {
        case 'today':
            filteredTasks = tasks.filter(task => {
                if (!task.dueDate) return false;
                const taskDate = new Date(task.dueDate);
                taskDate.setHours(0, 0, 0, 0);
                return taskDate.getTime() === today.getTime();
            });
            break;
        case 'high':
            filteredTasks = tasks.filter(task => task.priority === 'high');
            break;
        case 'completed':
            filteredTasks = tasks.filter(task => task.completed);
            break;
        default:
            filteredTasks = tasks;
    }
    
    renderTasks(filteredTasks);
}

function openAddTaskModal() {
    document.getElementById('taskForm').reset();
    document.querySelector('input[name="priority"][value="medium"]').checked = true;
    document.getElementById('modalTitle').textContent = 'Новая задача';
    delete document.getElementById('taskForm').dataset.editingId;
    
    const modal = document.getElementById('taskModal');
    modal.classList.remove('hidden');
    modal.querySelector('div').classList.add('slide-in');
}

function openEditTaskModal(taskId) {
    const tasks = loadTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('taskTitle').value = task.title;
    document.querySelector(`input[name="priority"][value="${task.priority}"]`).checked = true;
    document.getElementById('taskDueDate').value = task.dueDate || '';
    
    // Исправленная строка - проверяем наличие элемента перед установкой значения
    const reminderTimeInput = document.getElementById('taskReminderTime');
    if (reminderTimeInput) {
        reminderTimeInput.value = task.reminderTime || '';
    }
    
    document.getElementById('modalTitle').textContent = 'Редактировать задачу';
    document.getElementById('taskForm').dataset.editingId = taskId;
    
    const modal = document.getElementById('taskModal');
    modal.classList.remove('hidden');
    modal.querySelector('div').classList.add('slide-in');
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.querySelector('div').classList.remove('slide-in');
    modal.querySelector('div').classList.add('fade-out');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.querySelector('div').classList.remove('fade-out');
    }, 300);
}

function handleTaskFormSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value.trim();
    if (!title) {
        alert('Пожалуйста, введите название задачи');
        return;
    }
    
    const priority = document.querySelector('input[name="priority"]:checked').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const reminderTime = document.getElementById('taskReminderTime').value;
    const isEditing = document.getElementById('taskForm').dataset.editingId;
    
    let tasks = loadTasks();
    
    if (isEditing) {
        // Редактирование существующей задачи
        tasks = tasks.map(task => 
            task.id === isEditing 
                ? { 
                    ...task, 
                    title, 
                    priority, 
                    dueDate, 
                    reminderTime,
                    reminderShown: false // Сбрасываем флаг показа при редактировании
                } 
                : task
        );
        saveTasks(tasks); // Сохраняем несортированный список
        
        // Сортируем задачи для отображения
        const sortedTasks = sortTasksByPriority(tasks);
        renderTasks(sortedTasks);

        // Находим элемент задачи и обновляем его
        const taskElement = document.querySelector(`.task-item[data-id="${isEditing}"]`);
        if (taskElement) {
            // Добавляем анимацию обновления
            taskElement.classList.add('bg-purple-50');
            setTimeout(() => {
                taskElement.classList.remove('bg-purple-50');
            }, 500);
            
            // Обновляем содержимое элемента
            updateTaskElement(taskElement, tasks.find(t => t.id === isEditing));
        }
    } else {
        // Добавление новой задачи
        const newTask = {
            id: Date.now().toString(),
            title,
            priority,
            dueDate,
            reminderTime,
            completed: false,
            createdAt: new Date().toISOString(),
            reminderShown: false
        };
        tasks.unshift(newTask);
        saveTasks(tasks);
        
        // Проверяем напоминание сразу после сохранения
        if (reminderTime) {
            scheduleReminderCheck();
        }

        // Создаем и добавляем новый элемент с анимацией
        const container = document.getElementById('tasksContainer');
        const taskElement = createTaskElement(newTask);
        taskElement.classList.add('fade-in');
        container.prepend(taskElement);
        
        // Обновляем состояние "пусто"
        updateEmptyState(tasks);

        // Рендерим отсортированные задачи
        const sortedTasks = sortTasksByPriority(tasks);
        renderTasks(sortedTasks);
        updateEmptyState(tasks);

        // Убираем класс анимации после завершения
        setTimeout(() => {
            taskElement.classList.remove('fade-in');
        }, 300);
    }
    // Проверяем напоминания сразу после сохранения
    if (reminderTime) {
        scheduleReminderCheck();
    }

    closeTaskModal();
}

function clearCompletedTasks() {
    if (confirm('Вы уверены, что хотите удалить все выполненные задачи?')) {
        const tasks = loadTasks();
        const uncompletedTasks = tasks.filter(task => !task.completed);
        
        // Анимация удаления выполненных задач
        const completedTaskElements = document.querySelectorAll('.task-item.bg-gray-50');
        completedTaskElements.forEach(taskElement => {
            taskElement.classList.add('fade-out');
            
            // Удаляем элемент после завершения анимации
            taskElement.addEventListener('transitionend', () => {
                taskElement.remove();
            }, { once: true });
        });
        
        // Сохраняем изменения и обновляем интерфейс
        setTimeout(() => {
            saveTasks(uncompletedTasks);
            //Полная перерисовка
            loadAndRenderTasks();
            
            // Локальное обновление
            // const sortedTasks = sortTasksByPriority(uncompletedTasks);
            // renderTasks(sortedTasks);
            // updateEmptyState(uncompletedTasks);
        }, 300);
    }
}

function clearAllTasks() {
    if (confirm('Вы уверены, что хотите удалить все задачи?')) {
        localStorage.removeItem('tasks');
        loadAndRenderTasks(); // Будет использовать сортировку

        // Анимация удаления всех задач
        const container = document.getElementById('tasksContainer');
        const tasks = container.querySelectorAll('.task-item');
        
        tasks.forEach(task => {
            task.classList.add('fade-out');
        });
        
        setTimeout(() => {
            localStorage.removeItem('tasks'); // Перерисовка списка
            loadAndRenderTasks();
        }, 300);
    }
}

function openStatsModal() {
    const modal = document.getElementById('statsModal');
    modal.classList.remove('hidden');
    modal.querySelector('div').classList.add('slide-in');
}

function updateEmptyState(tasks = []) {
    const emptyState = document.getElementById('emptyState');
    if (!emptyState) return;
    
    if (tasks.length === 0) {
        if (emptyState.classList.contains('hidden')) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('fade-in');
        }
    } else {
        if (!emptyState.classList.contains('hidden')) {
            emptyState.classList.add('fade-out');
            setTimeout(() => {
                emptyState.classList.add('hidden');
                emptyState.classList.remove('fade-out');
            }, 300);
        }
    }
}