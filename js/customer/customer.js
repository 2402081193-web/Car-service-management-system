// 当前用户
let currentUser = null;
let currentPage = 'my-cars';

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    const user = auth.currentUser;
    if (user) {
        currentUser = user;
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            document.getElementById('userName').textContent = userData.name;
            document.getElementById('profileName').textContent = userData.name;
            document.getElementById('profileEmail').textContent = userData.email;
        }
    }

    loadMyCars();
});

// 菜单点击
document.querySelectorAll('.sidebar-menu li').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
        item.classList.add('active');
        currentPage = item.dataset.page;
        loadCustomerPage(currentPage);
    });
});

function loadCustomerPage(page) {
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

// 显示错误
function showError(message) {
    alert(message);
}

// 打开预约模态框
window.showBookingModal = function(carId) {
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
    select.innerHTML = '<option value="">加载中...</option>';
    
    try {
        const snapshot = await db.collection('cars')
            .where('userId', '==', currentUser.uid)
            .get();
        
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
    
    const appointmentData = {
        carId: document.getElementById('bookingCarId').value,
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