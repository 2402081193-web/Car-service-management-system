// 当前用户
let currentUser = null;
let currentPage = 'my-cars';

// 初始化 - 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, waiting for auth...');
});

// 监听认证状态变化
auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed:', user ? 'logged in' : 'not logged in');
    
    if (user) {
        currentUser = user;
        
        try {
            // 先等待 DOM 元素存在
            await waitForElements();
            
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // 安全地设置元素内容
                safeSetTextContent('userName', userData.name || '用户');
                safeSetTextContent('profileName', userData.name || '用户');
                safeSetTextContent('profileEmail', userData.email || '');
                safeSetTextContent('welcomeName', userData.name || '尊贵的车主');
            } else {
                // 如果用户文档不存在，创建默认
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    name: user.displayName || '新用户',
                    email: user.email,
                    role: 'customer',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                safeSetTextContent('userName', user.displayName || '新用户');
                safeSetTextContent('profileName', user.displayName || '新用户');
                safeSetTextContent('profileEmail', user.email || '');
                safeSetTextContent('welcomeName', user.displayName || '尊贵的车主');
            }
            
            // 显示欢迎卡片，隐藏内容容器
            safeSetDisplay('welcomeCard', 'block');
            safeSetDisplay('customerContent', 'none');
            
        } catch (error) {
            console.error('加载用户信息失败:', error);
        }
    } else {
        // 未登录，跳转到登录页
        window.location.href = 'index.html';
    }
});

// 安全设置文本内容的辅助函数
function safeSetTextContent(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    } else {
        console.warn(`Element with id '${elementId}' not found`);
    }
}

// 安全设置显示状态的辅助函数
function safeSetDisplay(elementId, displayValue) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = displayValue;
    } else {
        console.warn(`Element with id '${elementId}' not found`);
    }
}

// 等待元素加载的辅助函数
function waitForElements() {
    return new Promise((resolve) => {
        const checkElements = () => {
            const elements = ['userName', 'profileName', 'profileEmail', 'welcomeName', 'welcomeCard', 'customerContent'];
            const allExist = elements.every(id => document.getElementById(id));
            
            if (allExist) {
                resolve();
            } else {
                setTimeout(checkElements, 100);
            }
        };
        
        checkElements();
    });
}

// 菜单点击
document.querySelectorAll('.profile-menu li').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.profile-menu li').forEach(li => li.classList.remove('active'));
        item.classList.add('active');
        currentPage = item.dataset.page;
        
        // 隐藏欢迎卡片，显示内容容器
        const welcomeCard = document.getElementById('welcomeCard');
        const customerContent = document.getElementById('customerContent');
        
        if (welcomeCard) welcomeCard.style.display = 'none';
        if (customerContent) customerContent.style.display = 'block';
        
        if (currentUser) {
            loadCustomerPage(currentPage);
        }
    });
});

// 加载对应页面
function loadCustomerPage(page) {
    if (!currentUser) {
        console.error('Cannot load page: no user');
        return;
    }
    
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
        default:
            if (typeof loadMyCars === 'function') {
                loadMyCars();
            }
    }
}

// 显示错误消息
function showError(message) {
    console.error(message);
    
    // 检查是否有错误提示容器
    let errorContainer = document.getElementById('errorContainer');
    
    if (!errorContainer) {
        // 创建错误提示容器
        errorContainer = document.createElement('div');
        errorContainer.id = 'errorContainer';
        errorContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
            max-width: 350px;
        `;
        document.body.appendChild(errorContainer);
    }
    
    errorContainer.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    errorContainer.style.display = 'flex';
    
    setTimeout(() => {
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
    }, 5000);
}

// 显示成功消息
function showSuccess(message) {
    // 检查是否有成功提示容器
    let successContainer = document.getElementById('successContainer');
    
    if (!successContainer) {
        // 创建成功提示容器
        successContainer = document.createElement('div');
        successContainer.id = 'successContainer';
        successContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #22c55e;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
            max-width: 350px;
        `;
        document.body.appendChild(successContainer);
    }
    
    successContainer.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    successContainer.style.display = 'flex';
    
    setTimeout(() => {
        if (successContainer) {
            successContainer.style.display = 'none';
        }
    }, 3000);
}

// 打开预约模态框
window.showBookingModal = function(carId) {
    if (!currentUser) {
        showError('请先登录');
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
    
    // 设置默认日期
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
    
    modal.classList.add('show');
    modal.style.display = 'flex';
};

// 关闭预约模态框
window.closeBookingModal = function() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
};

// 打开添加车辆模态框
window.showAddCarModal = function() {
    if (!currentUser) {
        showError('请先登录');
        return;
    }
    
    const modal = document.getElementById('addCarModal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
};

// 关闭添加车辆模态框
window.closeAddCarModal = function() {
    const modal = document.getElementById('addCarModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
};

// 提交预约
window.submitBooking = async function() {
    const form = document.getElementById('bookingForm');
    if (!form) return;
    
    const carId = document.getElementById('bookingCarId')?.value;
    const serviceType = document.getElementById('bookingServiceType')?.value;
    const date = document.getElementById('bookingDate')?.value;
    const time = document.getElementById('bookingTime')?.value;
    const notes = document.getElementById('bookingNotes')?.value;
    
    if (!carId || !serviceType || !date || !time) {
        showError('请填写完整信息');
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
        showSuccess('预约成功！');
        closeBookingModal();
        
        if (currentPage === 'my-appointments') {
            loadMyAppointments();
        }
    } catch (error) {
        console.error('预约失败:', error);
        showError('预约失败: ' + error.message);
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
        showError('请填写车牌号和车型');
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
            showError('该车牌号已存在');
            return;
        }

        await db.collection('cars').add(carData);
        showSuccess('爱车添加成功！');
        closeAddCarModal();
        
        if (currentPage === 'my-cars') {
            loadMyCars();
        }
    } catch (error) {
        console.error('添加失败:', error);
        showError('添加失败: ' + error.message);
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

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
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
`;
if (!document.querySelector('#customer-styles')) {
    style.id = 'customer-styles';
    document.head.appendChild(style);
}
