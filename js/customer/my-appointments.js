// 加载我的预约页面
function loadMyAppointments() {
    const container = document.getElementById('customerContent');
    container.innerHTML = `
        <h2 style="margin-bottom: 20px;">我的预约</h2>

        <div class="tabs">
            <div class="tab active" data-status="all">全部</div>
            <div class="tab" data-status="pending">待处理</div>
            <div class="tab" data-status="completed">已完成</div>
            <div class="tab" data-status="cancelled">已取消</div>
        </div>

        <div id="myAppointmentsContainer" class="appointments-list">
            <div class="loading">加载中...</div>
        </div>
    `;

    // 标签页切换
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadUserAppointments(tab.dataset.status);
        });
    });

    loadUserAppointments('all');
}

// 加载用户预约
async function loadUserAppointments(status = 'all') {
    const container = document.getElementById('myAppointmentsContainer');
    
    try {
        // 先获取用户的所有车辆
        const cars = await db.collection('cars')
            .where('userId', '==', currentUser.uid)
            .get();
        
        const carIds = cars.docs.map(doc => doc.id);
        
        if (carIds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <p>暂无预约，请先添加车辆</p>
                </div>
            `;
            return;
        }

        // 查询预约
        let query = db.collection('appointments')
            .where('carId', 'in', carIds)
            .orderBy('date', 'desc')
            .orderBy('time', 'desc');
        
        if (status !== 'all') {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <p>暂无预约记录</p>
                    <button class="btn btn-primary" onclick="showBookingModal()">立即预约</button>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        
        for (const doc of snapshot.docs) {
            const apt = doc.data();
            
            // 获取车辆信息
            const carDoc = await db.collection('cars').doc(apt.carId).get();
            const car = carDoc.exists ? carDoc.data() : { plate: '未知' };
            
            container.innerHTML += `
                <div class="appointment-card" style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 15px; border-left: 4px solid ${getStatusColor(apt.status)};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div>
                            <span style="font-weight: 600; font-size: 1.1rem;">${apt.serviceType}</span>
                            <span style="margin-left: 10px; color: #3b82f6;">${car.plate}</span>
                        </div>
                        <span class="status-badge status-${apt.status}">${getStatusText(apt.status)}</span>
                    </div>
                    <div style="display: flex; gap: 20px; color: #64748b; margin-bottom: 10px;">
                        <span><i class="fas fa-calendar"></i> ${apt.date}</span>
                        <span><i class="fas fa-clock"></i> ${apt.time}</span>
                    </div>
                    ${apt.notes ? `<div style="color: #64748b;">备注: ${apt.notes}</div>` : ''}
                    ${apt.status === 'pending' ? `
                        <div style="margin-top: 15px;">
                            <button class="btn btn-danger" onclick="cancelAppointment('${doc.id}')">
                                取消预约
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    } catch (error) {
        console.error('加载预约失败:', error);
        container.innerHTML = '<div class="error-message">加载失败，请刷新重试</div>';
    }
}

// 获取状态颜色
function getStatusColor(status) {
    const colors = {
        'pending': '#eab308',
        'completed': '#22c55e',
        'cancelled': '#ef4444'
    };
    return colors[status] || '#64748b';
}

// 取消预约
window.cancelAppointment = async (appointmentId) => {
    if (!confirm('确定要取消这个预约吗？')) return;

    try {
        await db.collection('appointments').doc(appointmentId).update({
            status: 'cancelled'
        });
        
        const activeTab = document.querySelector('.tab.active').dataset.status;
        loadUserAppointments(activeTab);
        alert('预约已取消');
    } catch (error) {
        console.error('取消失败:', error);
        alert('取消失败，请重试');
    }
};