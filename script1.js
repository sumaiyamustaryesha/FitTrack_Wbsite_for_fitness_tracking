// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const closeButtons = document.querySelectorAll('.close');
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-link');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const calorieBudgetDisplay = document.getElementById('calorieBudgetDisplay');
const consumedCalories = document.getElementById('consumedCalories');
const caloriesLeft = document.getElementById('caloriesLeft');
const addFoodBtn = document.getElementById('addFoodBtn');
const startNewCountBtn = document.getElementById('startNewCountBtn');
const foodList = document.getElementById('foodList');
const bmrForm = document.getElementById('bmrForm');
const bmrResult = document.getElementById('bmrResult');
const weightForm = document.getElementById('weightForm');
const progressChart = document.getElementById('progressChart');
const startingWeight = document.getElementById('startingWeight');
const currentWeight = document.getElementById('currentWeight');
const weightChange = document.getElementById('weightChange');
const checklistItems = document.querySelectorAll('.checklist-item input[type="checkbox"]');
const resetChecklist = document.getElementById('resetChecklist');
const checklistProgress = document.getElementById('checklistProgress');
const progressBar = document.querySelector('.progress-bar');
const chatbox = document.getElementById('chatbox');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const contactForm = document.getElementById('contactForm');
const newsletterForm = document.getElementById('newsletterForm');

// ---------- Firebase helper object (will be populated in firebaseInit) ----------
const fb = {
    // will hold imported functions and instances, e.g.:
    // createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged
    // ref, set, push
    authInstance: null,
    dbInstance: null
};

// Food database with calories (per standard unit)
const foodDatabase = {
    'egg': {calories: 80, unit: 'piece'},
    'white bread': {calories: 125, unit: 'slice'},
    'brown bread': {calories: 175, unit: 'slice'},
    'rice': {calories: 210, unit: 'plate (150g)'},
    'paratha': {calories: 260, unit: 'piece'},
    'potato': {calories: 130, unit: 'medium (150g)'},
    'date': {calories: 20, unit: 'piece'},
    'nut (almond)': {calories: 7, unit: 'piece'},
    'honey': {calories: 60, unit: 'tbsp'},
    'burger': {calories: 350, unit: 'regular'},
    'sandwich': {calories: 300, unit: 'regular'},
    'apple': {calories: 95, unit: 'medium'},
    'banana': {calories: 105, unit: 'medium'},
    'chicken breast': {calories: 165, unit: '100g'},
    'salmon': {calories: 200, unit: '100g'},
    'pasta': {calories: 220, unit: 'cooked cup'},
    'milk': {calories: 120, unit: 'glass (250ml)'},
    'yogurt': {calories: 150, unit: 'cup (200g)'},
    'cheese': {calories: 110, unit: 'slice (28g)'},
    'orange': {calories: 60, unit: 'medium'},
    'carrot': {calories: 40, unit: 'medium'},
    'broccoli': {calories: 50, unit: 'cup chopped'},
    'tomato': {calories: 20, unit: 'medium'},
    'cucumber': {calories: 15, unit: '100g'}
};

// App State
let currentUser = null;
let calorieBudget = 0;
let consumedCaloriesValue = 0;
let weightLogs = [];
let checklistCompleted = 0;
let chatMessages = [
    {
        sender: 'bot',
        text: 'Hello! I\'m your Health Assistant. How can I help you today?'
    }
];

// ---------- Firebase initialization using dynamic imports ----------
async function firebaseInit() {
    // If window.auth and window.db are already available (from your module <script>), use them.
    // We'll also dynamically import the firebase modules to get the functions we need.
    try {
        // import auth and database function modules (version matches the SDK you used in HTML)
        const authModule = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js');
        const dbModule = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js');

        // store the functions we need
        fb.createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;
        fb.signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
        fb.signOut = authModule.signOut;
        fb.sendPasswordResetEmail = authModule.sendPasswordResetEmail;
        fb.onAuthStateChanged = authModule.onAuthStateChanged;

        fb.ref = dbModule.ref;
        fb.set = dbModule.set;
        fb.push = dbModule.push;

        // Use instances created in your module script (we placed window.auth and window.db earlier)
        fb.authInstance = window.auth ?? null;
        fb.dbInstance = window.db ?? null;

        // If for some reason those are not available, try to create them (will fail unless firebase app exists globally)
        // (Usually window.auth and window.db will be present because of your earlier module snippet.)
        if (!fb.authInstance || !fb.dbInstance) {
            console.warn('window.auth or window.db not found. Make sure Firebase app initialisation script (type=module) is present in HTML.');
        }

        // set up auth state listener
        if (fb.authInstance && fb.onAuthStateChanged) {
            fb.onAuthStateChanged(fb.authInstance, (user) => {
                if (user) {
                    // user is signed in -> fetch stored profile from localStorage OR DB will be used at sign-up
                    currentUser = {
                        uid: user.uid,
                        email: user.email,
                        // name may be in localStorage or DB; we'll try localStorage first
                        name: JSON.parse(localStorage.getItem('currentUser'))?.name || null
                    };
                    saveData();
                    enableFeatures();
                } else {
                    // user signed out
                    currentUser = null;
                    saveData();
                    disableFeatures();
                }
            });
        }
    } catch (err) {
        console.error('Firebase init error:', err);
        // don't break the app — features will remain client-side only
    }
}

// Initialize the app
function init() {
    // Hide all sections except dashboard
    sections.forEach(section => {
        if (section.id !== 'dashboard') {
            section.style.display = 'none';
        }
    });
    
    // Show auth required message
    showAuthMessage();
    
    // Load data and update UI
    loadData();
    updateCalorieDisplay();
    updateChecklistProgress();
    renderChatMessages();
    setupEventListeners();
}

// Show authentication required message
function showAuthMessage() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard.querySelector('.auth-message')) {
        const authMessage = document.createElement('div');
        authMessage.className = 'auth-message';
        authMessage.innerHTML = `
            <p>Please <a href="#" id="signupPrompt">Sign Up</a> or 
            <a href="#" id="loginPrompt">Login</a> to use all features</p>
            <p>You can use the BMR calculator without signing in</p>
        `;
        dashboard.insertBefore(authMessage, dashboard.firstChild);
        
        // Add event listeners to prompt links
        document.getElementById('signupPrompt').addEventListener('click', () => {
            signupModal.style.display = 'block';
        });
        document.getElementById('loginPrompt').addEventListener('click', () => {
            loginModal.style.display = 'block';
        });
    }
}

// Check authentication state
function checkAuthState() {
    if (!currentUser) {
        disableFeatures();
    } else {
        enableFeatures();
    }
}

// Disable features for non-logged in users
function disableFeatures() {
    addFoodBtn.disabled = true;
    startNewCountBtn.disabled = true;
    weightForm.querySelector('button').disabled = true;
    document.querySelectorAll('.checklist-item input').forEach(input => {
        input.disabled = true;
    });
    resetChecklist.disabled = true;
    chatInput.disabled = true;
    sendBtn.disabled = true;
    contactForm.querySelector('button').disabled = true;
}

// Enable features for logged in users
function enableFeatures() {
    addFoodBtn.disabled = false;
    startNewCountBtn.disabled = false;
    weightForm.querySelector('button').disabled = false;
    document.querySelectorAll('.checklist-item input').forEach(input => {
        input.disabled = false;
    });
    resetChecklist.disabled = false;
    chatInput.disabled = false;
    sendBtn.disabled = false;
    contactForm.querySelector('button').disabled = false;
    
    // Remove auth message if exists
    const authMessage = document.querySelector('.auth-message');
    if (authMessage) authMessage.remove();
}

// Load data from localStorage
function loadData() {
    if (localStorage.getItem('currentUser')) {
        currentUser = JSON.parse(localStorage.getItem('currentUser'));
    }
    
    if (localStorage.getItem('calorieBudget')) {
        calorieBudget = parseInt(localStorage.getItem('calorieBudget'));
    }
    
    if (localStorage.getItem('consumedCalories')) {
        consumedCaloriesValue = parseInt(localStorage.getItem('consumedCalories'));
    }
    
    if (localStorage.getItem('weightLogs')) {
        weightLogs = JSON.parse(localStorage.getItem('weightLogs'));
        updateWeightChart();
    }
    
    if (localStorage.getItem('checklistCompleted')) {
        checklistCompleted = parseInt(localStorage.getItem('checklistCompleted'));
        updateCheckboxStates();
    }

    // If user is present, enable features
    checkAuthState();
}

// Save data to localStorage
function saveData() {
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
        localStorage.removeItem('currentUser');
    }
    localStorage.setItem('calorieBudget', calorieBudget);
    localStorage.setItem('consumedCalories', consumedCaloriesValue);
    localStorage.setItem('weightLogs', JSON.stringify(weightLogs));
    localStorage.setItem('checklistCompleted', checklistCompleted);
}

// Set up event listeners
function setupEventListeners() {
    // Modal buttons
    loginBtn.addEventListener('click', () => loginModal.style.display = 'block');
    signupBtn.addEventListener('click', () => signupModal.style.display = 'block');
    
    // Close modals
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            loginModal.style.display = 'none';
            signupModal.style.display = 'none';
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) loginModal.style.display = 'none';
        if (e.target === signupModal) signupModal.style.display = 'none';
    });
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            // Hide all sections
            sections.forEach(section => {
                section.style.display = 'none';
            });
            
            // Show target section
            document.getElementById(targetId).style.display = 'block';
            
            // Update active nav link
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');
            
            // Special cases
            if (targetId === 'progress') {
                updateWeightChart();
            }
        });
    });
    
    // Signup form
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        // If Firebase available, use Auth + DB; otherwise fallback to local behavior
        if (fb.createUserWithEmailAndPassword && fb.authInstance && fb.set && fb.ref) {
            try {
                const userCredential = await fb.createUserWithEmailAndPassword(fb.authInstance, email, password);
                const user = userCredential.user;
                // Save extra info to Realtime DB
                await fb.set(fb.ref(fb.dbInstance, 'users/' + user.uid), {
                    name: name,
                    email: email,
                    createdAt: Date.now()
                });
                // set current user
                currentUser = { uid: user.uid, name, email };
                saveData();
                enableFeatures();
                signupModal.style.display = 'none';
                alert(`Welcome ${name}! You're now signed up. Please set your calorie budget.`);
                // Navigate to BMR calculator to set budget
                document.querySelector('a[href="#bmr"]').click();
            } catch (error) {
                alert(error.message || 'Signup failed');
            }
        } else {
            // Fallback (original behaviour)
            currentUser = { name, email };
            saveData();
            enableFeatures();
            signupModal.style.display = 'none';
            alert(`Welcome ${name}! You're now signed up. Please set your calorie budget.`);
            document.querySelector('a[href="#bmr"]').click();
        }
    });
    
    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        // If Firebase available, attempt sign in
        if (fb.signInWithEmailAndPassword && fb.authInstance) {
            try {
                const userCredential = await fb.signInWithEmailAndPassword(fb.authInstance, email, password);
                const user = userCredential.user;
                // Try to fetch name from localStorage fallback — DB read not added to keep minimal
                const savedName = JSON.parse(localStorage.getItem('currentUser'))?.name || null;
                currentUser = { uid: user.uid, email: user.email, name: savedName };
                saveData();
                enableFeatures();
                loginModal.style.display = 'none';
                alert('You are now logged in!');
            } catch (error) {
                alert(error.message || 'Login failed');
            }
        } else {
            // Fallback (original behaviour)
            currentUser = { email };
            saveData();
            enableFeatures();
            loginModal.style.display = 'none';
            alert('You are now logged in!');
        }
    });

    // Create or attach "Forgot Password" link in login modal
    (function ensureForgotPasswordUI() {
        try {
            // look for an existing element with id forgotPassword
            let forgot = document.getElementById('forgotPassword');
            if (!forgot) {
                // find the password input's parent inside loginModal and append link
                const loginPasswordElem = loginModal.querySelector('#loginPassword');
                if (loginPasswordElem) {
                    const link = document.createElement('a');
                    link.href = '#';
                    link.id = 'forgotPassword';
                    link.style.display = 'block';
                    link.style.marginTop = '8px';
                    link.textContent = 'Forgot Password?';
                    loginPasswordElem.parentElement.appendChild(link);
                    forgot = link;
                }
            }
            if (forgot) {
                forgot.addEventListener('click', async (ev) => {
                    ev.preventDefault();
                    const email = prompt('Enter your email to receive a password reset link:');
                    if (!email) return;
                    if (fb.sendPasswordResetEmail && fb.authInstance) {
                        try {
                            await fb.sendPasswordResetEmail(fb.authInstance, email);
                            alert('Password reset email sent. Check your inbox.');
                        } catch (err) {
                            alert(err.message || 'Failed to send reset email');
                        }
                    } else {
                        alert('Password reset is not available right now (Firebase not initialised).');
                    }
                });
            }
        } catch (e) {
            console.warn('Could not create forgot password UI', e);
        }
    })();
    
    // Calorie Tracker
    addFoodBtn.addEventListener('click', showFoodSelection);
    startNewCountBtn.addEventListener('click', resetCalorieCounter);
    
    // BMR Calculator (always enabled)
    bmrForm.addEventListener('submit', calculateBMR);
    
    // Weight Tracker
    weightForm.addEventListener('submit', logWeight);
    
    // Checklist
    checklistItems.forEach(item => {
        item.addEventListener('change', updateChecklistProgress);
    });
    resetChecklist.addEventListener('click', resetChecklistItems);
    
    // Chatbot
    sendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    
    // Forms
    contactForm.addEventListener('submit', submitContactForm);
    newsletterForm.addEventListener('submit', subscribeNewsletter);

    // Optional: if there's a logout button on your page with id="logoutBtn", hook it up
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (fb.signOut && fb.authInstance) {
                try {
                    await fb.signOut(fb.authInstance);
                    currentUser = null;
                    saveData();
                    disableFeatures();
                    alert('Logged out successfully.');
                } catch (err) {
                    alert(err.message || 'Logout failed');
                }
            } else {
                // fallback local logout
                currentUser = null;
                saveData();
                disableFeatures();
                alert('Logged out (local).');
            }
        });
    }
}

// Show food selection dialog with quantity input
function showFoodSelection() {
    if (!currentUser) {
        alert('Please login first. Click "Login" in the top right corner.');
        return;
    }
    
    if (calorieBudget <= 0) {
        alert('Please set your calorie budget first using the BMR calculator');
        document.querySelector('a[href="#bmr"]').click();
        return;
    }
    
    let foodOptions = '<div class="food-selection">';
    foodOptions += '<h3>Select Food Items</h3>';
    foodOptions += '<div class="food-grid">';
    
    for (const [food, data] of Object.entries(foodDatabase)) {
        foodOptions += `
            <div class="food-item" onclick="showFoodQuantityDialog('${food}', ${data.calories}, '${data.unit}')">
                <span class="food-name">${food}</span>
                <span class="food-calories">${data.calories} kcal per ${data.unit}</span>
            </div>
        `;
    }
    
    foodOptions += '</div></div>';
    
    // Create modal for food selection
    const foodModal = document.createElement('div');
    foodModal.className = 'food-modal';
    foodModal.innerHTML = `
        <div class="food-modal-content">
            <span class="close-food-modal">&times;</span>
            ${foodOptions}
        </div>
    `;
    
    document.body.appendChild(foodModal);
    
    // Close modal
    foodModal.querySelector('.close-food-modal').addEventListener('click', () => {
        foodModal.remove();
    });
    
    // Close when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === foodModal) {
            foodModal.remove();
        }
    });
}

// Show quantity input dialog for selected food
window.showFoodQuantityDialog = function(food, caloriesPerUnit, unit) {
    const quantity = prompt(`Enter quantity of ${food} (in ${unit}):\n${caloriesPerUnit} kcal per ${unit}`, '1');
    if (quantity === null) return;
    
    const quantityValue = parseFloat(quantity);
    if (isNaN(quantityValue)) {
        alert('Please enter a valid number');
        return;
    }
    
    const totalCalories = Math.round(caloriesPerUnit * quantityValue);
    addSelectedFood(food, totalCalories, quantityValue, unit);
};

// Add selected food with quantity
window.addSelectedFood = function(food, totalCalories, quantity, unit) {
    if (!currentUser) return;
    
    consumedCaloriesValue += totalCalories;
    updateCalorieDisplay();
    
    // Add to food list
    const foodItem = document.createElement('div');
    foodItem.className = 'food-item';
    foodItem.innerHTML = `
        <span class="food-name">${food}</span>
        <span class="food-quantity">${quantity} ${unit}</span>
        <span class="food-calories">${totalCalories} kcal</span>
        <button class="delete-food"><i class="fas fa-times"></i></button>
    `;
    
    foodList.appendChild(foodItem);
    
    // Add delete event
    foodItem.querySelector('.delete-food').addEventListener('click', () => {
        consumedCaloriesValue -= totalCalories;
        updateCalorieDisplay();
        foodItem.remove();
    });
    
    // Close food modal if exists
    document.querySelector('.food-modal')?.remove();
};

// Update calorie display with human figure visualization
function updateCalorieDisplay() {
    if (calorieBudget <= 0) {
        progressFill.style.height = '0%';
        progressText.textContent = 'Set Budget';
        calorieBudgetDisplay.textContent = 'Not set';
        consumedCalories.textContent = '0 kcal';
        caloriesLeft.textContent = 'Set Budget';
        return;
    }
    
    const progressPercentage = Math.min(100, (consumedCaloriesValue / calorieBudget) * 100);
    const caloriesLeftValue = Math.max(0, calorieBudget - consumedCaloriesValue);
    
    progressFill.style.height = `${progressPercentage}%`;
    progressText.textContent = `${Math.round(progressPercentage)}%`;
    calorieBudgetDisplay.textContent = `${calorieBudget} kcal`;
    consumedCalories.textContent = `${consumedCaloriesValue} kcal`;
    caloriesLeft.textContent = `${caloriesLeftValue} kcal`;
    
    // Add blood flow animation
    progressFill.style.background = `linear-gradient(to top, #ff0000, #cc0000)`;
    progressFill.style.animation = 'bloodFlow 2s infinite alternate';
    
    saveData();
}

// Reset calorie counter
function resetCalorieCounter() {
    if (!currentUser) {
        alert('Please login first. Click "Login" in the top right corner.');
        return;
    }
    
    if (confirm('Are you sure you want to reset your calorie count?')) {
        consumedCaloriesValue = 0;
        updateCalorieDisplay();
        foodList.innerHTML = '';
    }
}

// Calculate BMR and show results with all options
function calculateBMR(e) {
    e.preventDefault();
    
    const age = parseInt(document.getElementById('age').value);
    const gender = document.getElementById('gender').value;
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const activity = parseFloat(document.getElementById('activity').value);
    
    let bmr;
    if (gender === 'male') {
        bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
        bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
    
    const maintenanceCalories = Math.round(bmr * activity);
    const weightLossCalories = maintenanceCalories - 500;
    const weightGainCalories = maintenanceCalories + 500;
    
    bmrResult.innerHTML = `
        <h3>Your Results</h3>
        <div class="bmr-result-grid">
            <div class="bmr-result-option">
                <p><span>BMR:</span> ${Math.round(bmr)} calories/day</p>
                <button class="btn-submit" onclick="setCalorieBudget(${Math.round(bmr)})">
                    <i class="fas fa-check me-1"></i> Set as Budget
                </button>
            </div>
            <div class="bmr-result-option">
                <p><span>Maintenance:</span> ${maintenanceCalories} calories/day</p>
                <button class="btn-submit" onclick="setCalorieBudget(${maintenanceCalories})">
                    <i class="fas fa-check me-1"></i> Set as Budget
                </button>
            </div>
            <div class="bmr-result-option">
                <p><span>Weight Loss:</span> ${weightLossCalories} calories/day</p>
                <button class="btn-submit" onclick="setCalorieBudget(${weightLossCalories})">
                    <i class="fas fa-check me-1"></i> Set as Budget
                </button>
            </div>
            <div class="bmr-result-option">
                <p><span>Weight Gain:</span> ${weightGainCalories} calories/day</p>
                <button class="btn-submit" onclick="setCalorieBudget(${weightGainCalories})">
                    <i class="fas fa-check me-1"></i> Set as Budget
                </button>
            </div>
        </div>
    `;
    
    bmrResult.classList.add('show');
}

// Set the calorie budget
window.setCalorieBudget = function(calories) {
    calorieBudget = calories;
    updateCalorieDisplay();
    bmrResult.classList.remove('show');
    alert(`Your calorie budget has been set to ${calories} kcal/day`);
    
    // If user wasn't logged in, prompt them to sign up
    if (!currentUser) {
        if (confirm('Would you like to sign up to save your progress?')) {
            document.getElementById('signupBtn').click();
        }
    }
};

// Log weight and update chart
function logWeight(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please login first. Click "Login" in the top right corner.');
        return;
    }
    
    const weight = parseFloat(document.getElementById('weightInput').value);
    if (isNaN(weight)) return;
    
    const today = new Date().toISOString().split('T')[0];
    weightLogs.push({ date: today, weight });
    
    // Keep only the last 30 entries
    if (weightLogs.length > 30) {
        weightLogs = weightLogs.slice(-30);
    }
    
    saveData();
    updateWeightChart();
    document.getElementById('weightInput').value = '';
}

// Update weight chart with trend line
function updateWeightChart() {
    if (weightLogs.length === 0) return;
    
    const dates = weightLogs.map(entry => entry.date);
    const weights = weightLogs.map(entry => entry.weight);
    
    // Calculate trend line (simple linear regression)
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = weightLogs.length;
    
    weightLogs.forEach((entry, index) => {
        sumX += index;
        sumY += entry.weight;
        sumXY += index * entry.weight;
        sumXX += index * index;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const trendLine = weightLogs.map((_, index) => intercept + slope * index);
    
    // Update stats
    startingWeight.textContent = `${weightLogs[0].weight} kg`;
    currentWeight.textContent = `${weightLogs[weightLogs.length - 1].weight} kg`;
    
    const weightDiff = weightLogs[weightLogs.length - 1].weight - weightLogs[0].weight;
    weightChange.textContent = `${weightDiff > 0 ? '+' : ''}${weightDiff.toFixed(1)} kg`;
    weightChange.style.color = weightDiff < 0 ? '#4CAF50' : weightDiff > 0 ? '#F44336' : '#2196F3';
    
    // Create or update chart
    if (window.weightChart) {
        window.weightChart.data.labels = dates;
        window.weightChart.data.datasets[0].data = weights;
        window.weightChart.data.datasets[1].data = trendLine;
        window.weightChart.update();
    } else {
        const ctx = progressChart.getContext('2d');
        window.weightChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Weight (kg)',
                        data: weights,
                        borderColor: '#4a89dc',
                        backgroundColor: 'rgba(74, 137, 220, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Trend',
                        data: trendLine,
                        borderColor: '#e9573f',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }
}

// Update checklist progress
function updateChecklistProgress() {
    if (!currentUser) return;
    
    let checkedCount = 0;
    checklistItems.forEach(item => {
        if (item.checked) checkedCount++;
    });
    
    checklistCompleted = checkedCount;
    const percentage = Math.round((checkedCount / checklistItems.length) * 100);
    checklistProgress.textContent = `${percentage}%`;
    
    // Update progress circle
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;
    progressBar.style.strokeDashoffset = offset;
    
    saveData();
}

// Update checkbox states from saved data
function updateCheckboxStates() {
    const percentage = (checklistCompleted / checklistItems.length) * 100;
    checklistProgress.textContent = `${Math.round(percentage)}%`;
    
    // Update progress circle
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;
    progressBar.style.strokeDashoffset = offset;
}

// Reset checklist items
function resetChecklistItems() {
    if (!currentUser) {
        alert('Please login first. Click "Login" in the top right corner.');
        return;
    }
    
    if (confirm('Are you sure you want to reset your checklist?')) {
        checklistItems.forEach(item => {
            item.checked = false;
        });
        checklistCompleted = 0;
        updateChecklistProgress();
    }
}

// Render chat messages
function renderChatMessages() {
    chatbox.innerHTML = '';
    chatMessages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.sender}-message`;
        messageDiv.textContent = message.text;
        chatbox.appendChild(messageDiv);
    });
    chatbox.scrollTop = chatbox.scrollHeight;
}

// Send chat message
function sendChatMessage() {
    if (!currentUser) {
        alert('Please login first. Click "Login" in the top right corner.');
        return;
    }
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message
    chatMessages.push({
        sender: 'user',
        text: message
    });
    
    // Add bot response
    const botResponse = generateBotResponse(message);
    setTimeout(() => {
        chatMessages.push({
            sender: 'bot',
            text: botResponse
        });
        renderChatMessages();
    }, 1000);
    
    renderChatMessages();
    chatInput.value = '';
}

// Generate bot response
function generateBotResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('lose weight') || lowerMessage.includes('weight loss')) {
        return "To lose weight effectively, focus on a calorie deficit (burn more than you consume), eat protein-rich foods, reduce processed sugars, and combine cardio with strength training. Aim for 1-2 lbs loss per week for sustainable results.";
    } else if (lowerMessage.includes('food') || lowerMessage.includes('eat')) {
        return "For weight loss, prioritize whole foods like vegetables, lean proteins, whole grains, and healthy fats. Avoid processed foods, sugary drinks, and excessive carbs. Portion control is key!";
    } else if (lowerMessage.includes('exercise') || lowerMessage.includes('workout')) {
        return "The most effective exercises for weight loss include HIIT, strength training, walking, swimming, and cycling. Aim for 150+ minutes of moderate activity or 75+ minutes of vigorous activity weekly.";
    } else if (lowerMessage.includes('water') || lowerMessage.includes('drink')) {
        return "The general recommendation is 8-10 glasses (2-2.5 liters) of water daily. Needs vary based on activity level and climate. Water helps metabolism and reduces overeating.";
    } else {
        return "I'm your health assistant. For personalized advice, track your progress using our tools. You can ask about weight loss tips, nutrition, exercise, or general health advice.";
    }
}

// Quick question from tips
window.quickQuestion = function(question) {
    if (!currentUser) {
        alert('Please login first. Click "Login" in the top right corner.');
        return;
    }
    chatInput.value = question;
    sendChatMessage();
};

// Submit contact form
async function submitContactForm(e) {
    e.preventDefault();

    const name = e.target.querySelector('#contactName')?.value || '';
    const email = e.target.querySelector('#contactEmail')?.value || '';
    const message = e.target.querySelector('#contactMessage')?.value || '';

    // If Firebase DB available, push contact to DB
    if (fb.push && fb.ref && fb.set && fb.dbInstance) {
        try {
            const contactRef = fb.push(fb.ref(fb.dbInstance, 'contacts'));
            await fb.set(contactRef, {
                name,
                email,
                message,
                uid: currentUser?.uid || null,
                timestamp: Date.now()
            });
            alert('Thank you for your message! We will get back to you soon.');
            e.target.reset();
            return;
        } catch (err) {
            console.warn('Failed to save contact to Firebase, falling back to local alert.', err);
            alert('Thank you for your message! (Note: could not save to server.)');
            e.target.reset();
            return;
        }
    } else {
        // fallback behaviour (original)
        alert('Thank you for your message! We will get back to you soon.');
        e.target.reset();
    }
}

// Subscribe to newsletter
function subscribeNewsletter(e) {
    e.preventDefault();
    const email = e.target.querySelector('input').value;
    alert(`Thank you for subscribing with ${email}! You'll receive our newsletter soon.`);
    e.target.reset();
}

// Add CSS styles
function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Human figure styling */
        .human-figure {
            width: 180px;
            height: 300px;
            background-color: #f0f0f0;
            border-radius: 90px 90px 10px 10px;
            position: relative;
            overflow: hidden;
            box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200"><circle cx="50" cy="40" r="20" fill="none" stroke="%234a89dc" stroke-width="2"/><path d="M50,60 L50,120 M30,80 L70,80 M40,150 L50,120 L60,150 M40,180 L50,150 L60,180" stroke="%234a89dc" stroke-width="2" fill="none"/></svg>');
            background-position: center;
            background-repeat: no-repeat;
            background-size: 80%;
        }
        
        /* Blood flow animation */
        @keyframes bloodFlow {
            0% { background: linear-gradient(to top, #ff0000, #cc0000); }
            100% { background: linear-gradient(to top, #cc0000, #990000); }
        }
        
        /* Food selection modal */
        .food-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .food-modal-content {
            background: white;
            padding: 20px;
            border-radius: 10px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        }
        
        .close-food-modal {
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 24px;
            cursor: pointer;
        }
        
        .food-selection h3 {
            text-align: center;
            margin-bottom: 20px;
            color: var(--primary);
        }
        
        .food-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
        }
        
        .food-item {
            padding: 10px;
            border: 1px solid var(--gray);
            border-radius: 6px;
            cursor: pointer;
            transition: var(--transition);
        }
        
        .food-item:hover {
            background-color: var(--light);
            transform: translateY(-3px);
        }
        
        .food-name {
            display: block;
            font-weight: 500;
        }
        
        .food-calories, .food-quantity {
            display: block;
            font-size: 0.9rem;
            color: var(--text-light);
        }
        
        .auth-message {
            background-color: var(--light);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .auth-message a {
            color: var(--primary);
            font-weight: 500;
            text-decoration: none;
        }
        
        .auth-message a:hover {
            text-decoration: underline;
        }
        
        .bmr-result-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 15px;
        }
        
        .bmr-result-option {
            background-color: var(--light);
            padding: 15px;
            border-radius: 8px;
        }
        
        .bmr-result-option p {
            margin-bottom: 10px;
        }
        
        .bmr-result-option span {
            font-weight: 500;
        }
        
        .food-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid var(--gray);
        }
        
        .food-item .delete-food {
            background: none;
            border: none;
            color: var(--danger);
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    addStyles();
    await firebaseInit(); // ensure firebase functions are ready (if possible)
    init();
});
