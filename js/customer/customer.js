// 当前用户
let currentUser = null;
let currentPage = 'my-cars';

// 初始化 - 等待 auth 状态
document.addEventListener('DOMContentLoaded', () => {
    // 先不加载内容，等待 auth 状态
    console.log('DOM loaded, waiting for auth...');
});

// 监听认证状态变化
auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed:', user ? 'logged in' : 'not logged in');
    
    if (user) {
        currentUser = user;
        
        try {
            // 获取用户详细信息
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                document.getElementById('userName').textContent = userData.name || '用户';
                document.getElementById('profileName').textContent = userData.name || '用户';
                document.getElementById('profileEmail').textContent = userData.email || '';
            } else {
                // 如果用户文档不存在，创建一个
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    name: user.displayName || '新用户',
                    email: user.email,
                    role: 'customer',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                document.getElementById('userName').textContent = user.displayName || '新用户';
                document.getElementById('profileName').textContent = user.displayName || '新用户';
                document.getElementById('profileEmail').textContent = user.email || '';
            }
            
            // 加载默认页面
            loadCustomerPage('my-cars');
            
        } catch (error) {
            console.error('加载用户信息失败:', error);
            showError('加载用户信息失败');
        }
    } else {
        // 未登录，跳转到登录页
        console.log('No user, redirecting to login');
        window.location.href = 'index.html';
    }
});

// 菜单点击
document.querySelectorAll('.sidebar-menu li').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
        item.classList.add('active');
        currentPage = item.dataset.page;
        
        // 只有在用户已登录时才加载页面
        if (currentUser) {
            loadCustomerPage(currentPage);
        } else {
            console.warn('User not logged in, cannot load page');
            window.location.href = 'index.html';
        }
    });
});

function loadCustomerPage(page) {
    if (!currentUser) {
        console.error('Cannot load page: no user');
        return;
    }
    
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
        default:
            loadMyCars();
    }
}

// 显示错误
function showError(message) {
    console.error(message);
    // 可以添加一个 toast 提示
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// 打开预约模态框
window.showBookingModal = function(carId) {
    if (!currentUser) {
        showError('请先登录');
        return;
    }
    
    const modal = document.getElementById('bookingModal');
    const select = document.getElementById('bookingCarId');
    
    // 加载车辆选项
    loadCarOptions(select, carId);
    
    // 设置默认日期
    document.getElementById('bookingDate').valueAsDate = new Date();
    
    modal.style.display = 'flex';
};

window.closeBookingModal = function() {
    document.getElementById('bookingModal').style.display = 'none';
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

// 预约表单提交
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
        showError('请先登录');
        return;
    }
    
    const carId = document.getElementById('bookingCarId').value;
    if (!carId) {
        showError('请选择车辆');
        return;
    }
    
    const appointmentData = {
        carId: carId,
        serviceType: document.getElementById('bookingServiceType').value,
        date: document.getElementById('bookingDate').value,
        time: document.getElementById('bookingTime').value,
        notes: document.getElementById('bookingNotes').value,
        status: 'pending',
        userId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('appointments').add(appointmentData);
        alert('预约成功！');
        closeBookingModal();
        document.getElementById('bookingForm').reset();
        
        // 如果当前在预约页面，刷新列表
        if (currentPage === 'my-appointments') {
            loadMyAppointments();
        }
    } catch (error) {
        console.error('预约失败:', error);
        alert('预约失败，请重试');
    }
});

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
document.head.appendChild(style);
