// 当前用户
let currentUser = null;
let currentPage = 'my-cars';

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, waiting for auth...');
    
    // 确保欢迎卡片存在
    ensureWelcomeCard();
});

// 确保欢迎卡片存在
function ensureWelcomeCard() {
    const customerContent = document.getElementById('customerContent');
    if (!customerContent) return;
    
    // 检查是否已有欢迎卡片
    if (!document.getElementById('welcomeCard')) {
        const welcomeCard = document.createElement('div');
        welcomeCard.id = 'welcomeCard';
        welcomeCard.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);';
        welcomeCard.innerHTML = `
            <h2 style="font-size: 2rem; margin-bottom: 15px;">欢迎回来，<span id="welcomeName">尊贵的车主</span></h2>
            <p style="font-size: 1.1rem; opacity: 0.9; margin-bottom: 25px;">在这里您可以管理您的爱车、预约服务、查看历史记录等。</p>
            <div style="display: flex; gap: 15px;">
                <button class="btn btn-primary" onclick="showBookingModal()" style="padding: 12px 30px; background: white; color: #667eea; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                    <i class="fas fa-calendar-plus"></i> 快速预约
                </button>
                <button class="btn btn-outline" onclick="loadMyCars()" style="padding: 12px 30px; background: transparent; border: 2px solid white; color: white; border-radius: 8px; font-weight: 600; cursor: pointer;">
                    <i class="fas fa-car"></i> 查看爱车
                </button>
            </div>
        `;
        customerContent.appendChild(welcomeCard);
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
                // 创建新用户
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
            
        } catch (error) {
            console.error('Error loading user:', error);
            showMessage('加载用户信息失败', 'error');
        }
    } else {
        window.location.href = 'index.html';
    }
});

// 更新用户信息
function updateUserInfo(userData) {
    const elements = {
        userName: document.getElementById('userName'),
        profileName: document.getElementById('profileName'),
        profileEmail: document.getElementById('profileEmail'),
        welcomeName: document.getElementById('welcomeName')
    };
    
    if (elements.userName) elements.userName.textContent = userData.name || '用户';
    if (elements.profileName) elements.profileName.textContent = userData.name || '用户';
    if (elements.profileEmail) elements.profileEmail.textContent = userData.email || '';
    if (elements.welcomeName) elements.welcomeName.textContent = userData.name || '尊贵的车主';
}

// 菜单点击
document.querySelectorAll('.sidebar-menu li').forEach(item => {
    item.addEventListener('click', () => {
        // 移除所有active类
        document.querySelectorAll('.sidebar-menu li').forEach(li => {
            li.style.background = '';
            li.style.color = '#475569';
            li.style.fontWeight = 'normal';
        });
        
        // 添加active类到当前项
        item.style.background = '#dbeafe';
        item.style.color = '#3b82f6';
        item.style.fontWeight = '500';
        
        currentPage = item.dataset.page;
        loadCustomerPage(currentPage);
    });
});

// 加载页面
function loadCustomerPage(page) {
    const customerContent = document.getElementById('customerContent');
    if (!customerContent) return;
    
    // 隐藏欢迎卡片
    const welcomeCard = document.getElementById('welcomeCard');
    if (welcomeCard) {
        welcomeCard.style.display = 'none';
    }
    
    // 清空并显示加载状态
    customerContent.innerHTML = '<div style="text-align: center; padding: 50px;"><div class="spinner" style="display: inline-block; width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div><p style="margin-top: 15px; color: #64748b;">加载中...</p></div>';
    
    // 添加动画样式
    if (!document.querySelector('#spin-style')) {
        const style = document.createElement('style');
        style.id = 'spin-style';
        style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }
    
    // 根据页面加载不同模块
    switch(page) {
        case 'my-cars':
            if (typeof loadMyCars === 'function') {
                loadMyCars();
            }
            break;
        case 'my-appointments':
            if (typeof loadMyAppointments === 'function') {
                loadMyAppointments();
            }
            break;
        case 'my-services':
            if (typeof loadMyServices === 'function') {
                loadMyServices();
            }
            break;
        case 'my-payments':
            if (typeof loadMyPayments === 'function') {
                loadMyPayments();
            }
            break;
    }
}

// 显示消息
function showMessage(text, type = 'success') {
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#22c55e' : '#ef4444'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    msgDiv.textContent = text;
    document.body.appendChild(msgDiv);
    
    setTimeout(() => {
        msgDiv.remove();
    }, 3000);
}

// 预约模态框
window.showBookingModal = function(carId) {
    const modal = document.getElementById('bookingModal');
    if (!modal) return;
    
    // 加载车辆选项
    loadCarOptions(carId);
    
    // 设置默认日期
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
    }
    
    modal.style.display = 'flex';
};

window.closeBookingModal = function() {
    document.getElementById('bookingModal').style.display = 'none';
};

// 加载车辆选项
async function loadCarOptions(selectedId) {
    const select = document.getElementById('bookingCarId');
    if (!select || !currentUser) return;
    
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
        console.error('Error loading cars:', error);
        select.innerHTML = '<option value="">加载失败</option>';
    }
}

// 提交预约
window.submitBooking = async function() {
    const carId = document.getElementById('bookingCarId')?.value;
    const serviceType = document.getElementById('bookingServiceType')?.value;
    const date = document.getElementById('bookingDate')?.value;
    const time = document.getElementById('bookingTime')?.value;
    const notes = document.getElementById('bookingNotes')?.value;
    
    if (!carId || !serviceType || !date || !time) {
        showMessage('请填写完整信息', 'error');
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
        showMessage('预约成功');
        closeBookingModal();
        
        if (currentPage === 'my-appointments') {
            loadMyAppointments();
        }
    } catch (error) {
        console.error('Error booking:', error);
        showMessage('预约失败: ' + error.message, 'error');
    }
};

// 添加车辆模态框
window.showAddCarModal = function() {
    document.getElementById('addCarModal').style.display = 'flex';
};

window.closeAddCarModal = function() {
    document.getElementById('addCarModal').style.display = 'none';
};

// 提交添加车辆
window.submitAddCar = async function() {
    const plate = document.getElementById('carPlate')?.value;
    const model = document.getElementById('carModel')?.value;
    const brand = document.getElementById('carBrand')?.value;
    const color = document.getElementById('carColor')?.value;
    const notes = document.getElementById('carNotes')?.value;
    
    if (!plate || !model) {
        showMessage('请填写车牌号和车型', 'error');
        return;
    }
    
    // 检查车牌号格式（简单验证）
    if (plate.length < 5) {
        showMessage('请输入有效的车牌号', 'error');
        return;
    }
    
    const carData = {
        plate: plate.toUpperCase(),
        model: model,
        brand: brand || '',
        color: color || '',
        notes: notes || '',
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
    };
    
    try {
        // 检查车牌号是否已存在
        const existingCar = await db.collection('cars')
            .where('plate', '==', carData.plate)
            .get();
        
        if (!existingCar.empty) {
            showMessage('该车牌号已存在', 'error');
            return;
        }
        
        await db.collection('cars').add(carData);
        showMessage('爱车添加成功');
        closeAddCarModal();
        
        // 清空表单
        document.getElementById('addCarForm').reset();
        
        if (currentPage === 'my-cars') {
            loadMyCars();
        }
    } catch (error) {
        console.error('Error adding car:', error);
        showMessage('添加失败: ' + error.message, 'error');
    }
};

// 登出
window.logout = async function() {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('登出失败', 'error');
    }
};
