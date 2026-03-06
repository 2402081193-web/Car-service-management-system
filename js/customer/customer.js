// 当前用户
let currentUser = null;
let currentPage = 'my-cars';

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, waiting for auth...');
    
    // 确保所有必要的元素存在
    ensureElements();
});

// 确保必要元素存在的函数
function ensureElements() {
    // 检查并创建必要的容器
    const elements = [
        'userName',
        'profileName', 
        'profileEmail',
        'welcomeName',
        'welcomeCard',
        'customerContent',
        'bookingModal',
        'addCarModal'
    ];
    
    elements.forEach(id => {
        if (!document.getElementById(id)) {
            console.warn(`Element ${id} not found, creating...`);
            createElement(id);
        }
    });
}

// 创建缺失的元素
function createElement(id) {
    const element = document.createElement('div');
    element.id = id;
    
    switch(id) {
        case 'welcomeCard':
            element.className = 'welcome-card';
            element.innerHTML = `
                <h2>欢迎回来，<span id="welcomeName">尊贵的车主</span></h2>
                <p>在这里您可以管理您的爱车、预约服务、查看历史记录等。</p>
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="showBookingModal()">
                        <i class="fas fa-calendar-plus"></i> 快速预约
                    </button>
                    <button class="btn btn-outline" onclick="loadMyCars()">
                        <i class="fas fa-car"></i> 查看爱车
                    </button>
                </div>
            `;
            document.querySelector('.content-area')?.appendChild(element);
            break;
            
        case 'customerContent':
            element.id = 'customerContent';
            element.style.display = 'none';
            element.innerHTML = '<div class="loading"><div class="spinner"></div><p>加载中...</p></div>';
            document.querySelector('.content-area')?.appendChild(element);
            break;
            
        default:
            // 其他元素添加到相应位置
            const target = document.getElementById(id) || document.body;
            if (!target.parentNode) {
                document.body.appendChild(element);
            }
    }
}

// 监听认证状态变化
auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed:', user ? 'logged in' : 'not logged in');
    
    if (user) {
        currentUser = user;
        
        try {
            // 获取用户信息
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                updateUserInfo(userData);
            } else {
                // 创建新用户文档
                const newUser = {
                    uid: user.uid,
                    name: user.displayName || '新用户',
                    email: user.email || '',
                    role: 'customer',
                    createdAt: new Date().toISOString()
                };
                await db.collection('users').doc(user.uid).set(newUser);
                updateUserInfo(newUser);
            }
            
            // 显示欢迎卡片
            showWelcomeCard();
            
            // 默认加载我的爱车
            setTimeout(() => {
                loadMyCars();
            }, 500);
            
        } catch (error) {
            console.error('加载用户信息失败:', error);
            showErrorMessage('加载用户信息失败: ' + error.message);
        }
    } else {
        // 未登录，跳转到登录页
        window.location.href = 'index.html';
    }
});

// 更新用户信息显示
function updateUserInfo(userData) {
    const userName = document.getElementById('userName');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const welcomeName = document.getElementById('welcomeName');
    
    if (userName) userName.textContent = userData.name || '用户';
    if (profileName) profileName.textContent = userData.name || '用户';
    if (profileEmail) profileEmail.textContent = userData.email || '';
    if (welcomeName) welcomeName.textContent = userData.name || '尊贵的车主';
}

// 显示欢迎卡片
function showWelcomeCard() {
    const welcomeCard = document.getElementById('welcomeCard');
    const customerContent = document.getElementById('customerContent');
    
    if (welcomeCard) {
        welcomeCard.style.display = 'block';
    }
    
    if (customerContent) {
        customerContent.style.display = 'none';
    }
}

// 显示内容区域
function showContent() {
    const welcomeCard = document.getElementById('welcomeCard');
    const customerContent = document.getElementById('customerContent');
    
    if (welcomeCard) {
        welcomeCard.style.display = 'none';
    }
    
    if (customerContent) {
        customerContent.style.display = 'block';
    }
}

// 菜单点击
document.addEventListener('click', (e) => {
    const menuItem = e.target.closest('.profile-menu li');
    if (menuItem) {
        document.querySelectorAll('.profile-menu li').forEach(li => li.classList.remove('active'));
        menuItem.classList.add('active');
        currentPage = menuItem.dataset.page;
        
        showContent();
        
        if (currentUser) {
            loadCustomerPage(currentPage);
        }
    }
});

// 加载对应页面
function loadCustomerPage(page) {
    if (!currentUser) {
        console.error('Cannot load page: no user');
        return;
    }
    
    const customerContent = document.getElementById('customerContent');
    if (customerContent) {
        customerContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>加载中...</p></div>';
    }
    
    switch(page) {
        case 'my-cars':
            if (typeof loadMyCars === 'function') {
                loadMyCars();
            } else {
                console.error('loadMyCars function not found');
                showErrorMessage('模块加载失败，请刷新页面重试');
            }
            break;
        case 'my-appointments':
            if (typeof loadMyAppointments === 'function') {
                loadMyAppointments();
            } else {
                console.error('loadMyAppointments function not found');
                showErrorMessage('模块加载失败，请刷新页面重试');
            }
            break;
        case 'my-services':
            if (typeof loadMyServices === 'function') {
                loadMyServices();
            } else {
                console.error('loadMyServices function not found');
                showErrorMessage('模块加载失败，请刷新页面重试');
            }
            break;
        case 'my-payments':
            if (typeof loadMyPayments === 'function') {
                loadMyPayments();
            } else {
                console.error('loadMyPayments function not found');
                showErrorMessage('模块加载失败，请刷新页面重试');
            }
            break;
        default:
            if (typeof loadMyCars === 'function') {
                loadMyCars();
            }
    }
}

// 显示错误消息
function showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 显示成功消息
function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 打开预约模态框
window.showBookingModal = function(carId) {
    if (!currentUser) {
        showErrorMessage('请先登录');
        return;
    }
    
    const modal = document.getElementById('bookingModal');
    if (!modal) {
        console.error('Booking modal not found');
        return;
    }
    
    const select = document.getElementById('bookingCarId');
    if (select) {
        loadCarOptions(select, carId);
    }
    
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
    }
    
    modal.classList.add('show');
};

// 关闭预约模态框
window.closeBookingModal = function() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.classList.remove('show');
    }
};

// 打开添加车辆模态框
window.showAddCarModal = function() {
    if (!currentUser) {
        showErrorMessage('请先登录');
        return;
    }
    
    const modal = document.getElementById('addCarModal');
    if (modal) {
        modal.classList.add('show');
    }
};

// 关闭添加车辆模态框
window.closeAddCarModal = function() {
    const modal = document.getElementById('addCarModal');
    if (modal) {
        modal.classList.remove('show');
    }
};

// 提交预约
window.submitBooking = async function() {
    const carId = document.getElementById('bookingCarId')?.value;
    const serviceType = document.getElementById('bookingServiceType')?.value;
    const date = document.getElementById('bookingDate')?.value;
    const time = document.getElementById('bookingTime')?.value;
    const notes = document.getElementById('bookingNotes')?.value;
    
    if (!carId || !serviceType || !date || !time) {
        showErrorMessage('请填写完整信息');
        return;
    }
    
    const appointmentData = {
        carId: carId,
        serviceType: serviceType,
        date: date,
        time: time,
        notes: notes || '',
        status: 'pending',
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
    };

    try {
        await db.collection('appointments').add(appointmentData);
        showSuccessMessage('预约成功！');
        closeBookingModal();
        
        if (currentPage === 'my-appointments') {
            loadMyAppointments();
        }
    } catch (error) {
        console.error('预约失败:', error);
        showErrorMessage('预约失败: ' + error.message);
    }
};

// 提交添加车辆
window.submitAddCar = async function() {
    const plate = document.getElementById('carPlate')?.value;
    const model = document.getElementById('carModel')?.value;
    const brand = document.getElementById('carBrand')?.value;
    const color = document.getElementById('carColor')?.value;
    const notes = document.getElementById('carNotes')?.value;
    
    if (!plate || !model) {
        showErrorMessage('请填写车牌号和车型');
        return;
    }

    const carData = {
        plate: plate,
        model: model,
        brand: brand || '',
        color: color || '',
        notes: notes || '',
        owner: document.getElementById('profileName')?.textContent || '车主',
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
    };

    try {
        // 检查车牌号是否已存在
        const existingCar = await db.collection('cars')
            .where('plate', '==', plate)
            .get();
        
        if (!existingCar.empty) {
            showErrorMessage('该车牌号已存在');
            return;
        }

        await db.collection('cars').add(carData);
        showSuccessMessage('爱车添加成功！');
        closeAddCarModal();
        
        if (currentPage === 'my-cars') {
            loadMyCars();
        }
    } catch (error) {
        console.error('添加失败:', error);
        showErrorMessage('添加失败: ' + error.message);
    }
};

// 加载车辆选项
async function loadCarOptions(select, selectedId) {
    if (!currentUser) {
        select.innerHTML = '<option value="">请先登录</option>';
        return;
    }
    
    select.innerHTML = '<option value="">加载中...</option>';
    
    try {
        const snapshot = await db.collection('cars')
            .where('userId', '==', currentUser.uid)
            .get();
        
        if (snapshot.empty) {
            select.innerHTML = '<option value="">暂无车辆，请先添加</option>';
            return;
        }
        
        select.innerHTML = '<option value="">请选择车辆</option>';
        
        snapshot.forEach(doc => {
            const car = doc.data();
            const selected = doc.id === selectedId ? 'selected' : '';
            select.innerHTML += `<option value="${doc.id}" ${selected}>${car.plate} - ${car.model}</option>`;
        });
    } catch (error) {
        console.error('加载车辆失败:', error);
        select.innerHTML = '<option value="">加载失败</option>';
    }
}

// 添加样式
const style = document.createElement('style');
style.textContent = `
    .error-toast, .success-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .error-toast {
        background: #ef4444;
    }
    
    .success-toast {
        background: #22c55e;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .loading {
        text-align: center;
        padding: 50px;
        color: #64748b;
    }
    
    .spinner {
        display: inline-block;
        width: 40px;
        height: 40px;
        border: 3px solid #e2e8f0;
        border-top: 3px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 15px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .modal.show {
        display: flex !important;
    }
`;
document.head.appendChild(style);
