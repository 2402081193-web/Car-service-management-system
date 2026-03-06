// 当前用户
let currentUser = null;
let currentPage = 'my-cars';

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, waiting for auth...');
});

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
            
            // 默认加载我的爱车
            loadMyCars();
            
        } catch (error) {
            console.error('Error:', error);
            alert('加载失败: ' + error.message);
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
document.querySelectorAll('.profile-menu li').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.profile-menu li').forEach(li => li.classList.remove('active'));
        item.classList.add('active');
        currentPage = item.dataset.page;
        loadCustomerPage(currentPage);
    });
});

// 加载页面
function loadCustomerPage(page) {
    const welcomeCard = document.getElementById('welcomeCard');
    const customerContent = document.getElementById('customerContent');
    
    if (welcomeCard) welcomeCard.style.display = 'none';
    if (customerContent) customerContent.style.display = 'block';
    
    switch(page) {
        case 'my-cars':
            loadMyCars();
            break;
        case 'my-appointments':
            loadMyAppointments();
            break;
        case 'my-services':
            loadMyServices();
            break;
        case 'my-payments':
            loadMyPayments();
            break;
    }
}

// 加载我的爱车
window.loadMyCars = function() {
    const container = document.getElementById('customerContent');
    if (!container) return;
    
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>我的爱车</h2>
            <button class="btn btn-primary" onclick="showAddCarModal()">
                <i class="fas fa-plus"></i> 添加爱车
            </button>
        </div>
        <div id="carsList">
            <div class="loading">
                <div class="spinner"></div>
                <p>加载中...</p>
            </div>
        </div>
    `;
    
    loadCarsList();
};

// 加载车辆列表
async function loadCarsList() {
    const container = document.getElementById('carsList');
    if (!container || !currentUser) return;
    
    try {
        const snapshot = await db.collection('cars')
            .where('userId', '==', currentUser.uid)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-car"></i>
                    <h3>还没有添加爱车</h3>
                    <p>点击"添加爱车"按钮开始添加</p>
                </div>
            `;
            return;
        }
        
        let html = '<div style="display: grid; gap: 20px;">';
        
        snapshot.forEach(doc => {
            const car = doc.data();
            html += `
                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3 style="color: #3b82f6;">${car.plate}</h3>
                        <span style="color: #64748b;">${car.model}</span>
                    </div>
                    <div style="color: #475569; margin-bottom: 15px;">
                        ${car.brand ? `<div>品牌: ${car.brand}</div>` : ''}
                        ${car.color ? `<div>颜色: ${car.color}</div>` : ''}
                        ${car.notes ? `<div style="margin-top: 10px;">备注: ${car.notes}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary" style="flex: 1;" onclick="showBookingModal('${doc.id}')">
                            预约
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `<div class="error">加载失败: ${error.message}</div>`;
    }
}

// 显示添加车辆模态框
window.showAddCarModal = function() {
    document.getElementById('addCarModal').classList.add('show');
};

window.closeAddCarModal = function() {
    document.getElementById('addCarModal').classList.remove('show');
};

// 提交添加车辆
window.submitAddCar = async function() {
    const plate = document.getElementById('carPlate')?.value;
    const model = document.getElementById('carModel')?.value;
    
    if (!plate || !model) {
        alert('请填写车牌号和车型');
        return;
    }
    
    const carData = {
        plate: plate,
        model: model,
        brand: document.getElementById('carBrand')?.value || '',
        color: document.getElementById('carColor')?.value || '',
        notes: document.getElementById('carNotes')?.value || '',
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
    };
    
    try {
        await db.collection('cars').add(carData);
        alert('添加成功');
        closeAddCarModal();
        loadMyCars();
    } catch (error) {
        alert('添加失败: ' + error.message);
    }
};

// 显示预约模态框
window.showBookingModal = function(carId) {
    const modal = document.getElementById('bookingModal');
    const select = document.getElementById('bookingCarId');
    
    if (select && carId) {
        // 设置默认选中的车辆
        Array.from(select.options).forEach(option => {
            if (option.value === carId) option.selected = true;
        });
    }
    
    // 设置默认日期
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
    }
    
    modal.classList.add('show');
};

window.closeBookingModal = function() {
    document.getElementById('bookingModal').classList.remove('show');
};

// 提交预约
window.submitBooking = async function() {
    const carId = document.getElementById('bookingCarId')?.value;
    const serviceType = document.getElementById('bookingServiceType')?.value;
    const date = document.getElementById('bookingDate')?.value;
    const time = document.getElementById('bookingTime')?.value;
    
    if (!carId || !serviceType || !date || !time) {
        alert('请填写完整信息');
        return;
    }
    
    const appointmentData = {
        carId: carId,
        serviceType: serviceType,
        date: date,
        time: time,
        notes: document.getElementById('bookingNotes')?.value || '',
        status: 'pending',
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
    };
    
    try {
        await db.collection('appointments').add(appointmentData);
        alert('预约成功');
        closeBookingModal();
    } catch (error) {
        alert('预约失败: ' + error.message);
    }
};

// 其他页面的占位函数
window.loadMyAppointments = function() {
    document.getElementById('customerContent').innerHTML = '<div style="text-align: center; padding: 50px;">预约功能开发中...</div>';
};

window.loadMyServices = function() {
    document.getElementById('customerContent').innerHTML = '<div style="text-align: center; padding: 50px;">服务记录功能开发中...</div>';
};

window.loadMyPayments = function() {
    document.getElementById('customerContent').innerHTML = '<div style="text-align: center; padding: 50px;">支付记录功能开发中...</div>';
};

// 登出
window.logout = async function() {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
};
