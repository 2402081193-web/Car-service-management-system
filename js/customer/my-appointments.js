// 加载我的预约页面
function loadMyAppointments() {
    if (!currentUser) {
        console.error('No user logged in');
        return;
    }
    
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
            <div class="loading">
                <div class="spinner"></div>
                <p>加载中...</p>
            </div>
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

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        'pending': '待处理',
        'confirmed': '已确认',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

// 获取状态颜色
function getStatusColor(status) {
    const colors = {
        'pending': '#eab308',
        'confirmed': '#3b82f6',
        'completed': '#22c55e',
        'cancelled': '#ef4444'
    };
    return colors[status] || '#64748b';
}

// 加载用户预约
async function loadUserAppointments(status = 'all') {
    if (!currentUser) {
        console.error('No user logged in');
        return;
    }
    
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
                    <h3>暂无预约</h3>
                    <p>请先在"我的爱车"中添加车辆</p>
                    <button class="btn btn-primary" onclick="loadMyCars()">
                        <i class="fas fa-car"></i> 去添加车辆
                    </button>
                </div>
            `;
            return;
        }

        // 由于索引正在构建，暂时使用客户端过滤（临时方案）
        let query = db.collection('appointments')
            .where('carId', 'in', carIds);
        
        // 如果指定了状态，添加状态过滤
        if (status !== 'all') {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <h3>暂无预约记录</h3>
                    <button class="btn btn-primary" onclick="showBookingModal()">
                        <i class="fas fa-calendar-plus"></i> 立即预约
                    </button>
                </div>
            `;
            return;
        }

        // 收集所有预约数据
        const appointments = [];
        for (const doc of snapshot.docs) {
            const apt = doc.data();
            
            // 获取车辆信息
            const carDoc = await db.collection('cars').doc(apt.carId).get();
            const car = carDoc.exists ? carDoc.data() : { plate: '未知' };
            
            appointments.push({
                id: doc.id,
                ...apt,
                carPlate: car.plate
            });
        }

        // 客户端排序（按日期倒序）
        appointments.sort((a, b) => {
            if (a.date && b.date) {
                if (a.date === b.date) {
                    return (b.time || '').localeCompare(a.time || '');
                }
                return b.date.localeCompare(a.date);
            }
            return 0;
        });

        // 构建显示内容
        container.innerHTML = '<div class="appointments-list"></div>';
        const listContainer = container.querySelector('.appointments-list');
        
        appointments.forEach(apt => {
            listContainer.innerHTML += `
                <div class="appointment-card" style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 15px; border-left: 4px solid ${getStatusColor(apt.status)};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div>
                            <span style="font-weight: 600; font-size: 1.1rem;">${apt.serviceType}</span>
                            <span style="margin-left: 10px; color: #3b82f6;">${apt.carPlate}</span>
                        </div>
                        <span class="badge badge-${apt.status}">${getStatusText(apt.status)}</span>
                    </div>
                    <div style="display: flex; gap: 20px; color: #64748b; margin-bottom: 10px;">
                        <span><i class="fas fa-calendar"></i> ${apt.date}</span>
                        <span><i class="fas fa-clock"></i> ${apt.time || '待定'}</span>
                    </div>
                    ${apt.notes ? `<div style="color: #64748b; font-size: 0.9rem; margin-bottom: 10px;">备注: ${apt.notes}</div>` : ''}
                    ${apt.status === 'pending' ? `
                        <div style="margin-top: 15px;">
                            <button class="btn btn-danger btn-sm" onclick="cancelAppointment('${apt.id}')">
                                <i class="fas fa-times"></i> 取消预约
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        // 添加统计信息
        const pendingCount = appointments.filter(a => a.status === 'pending').length;
        const completedCount = appointments.filter(a => a.status === 'completed').length;
        
        const statsDiv = document.createElement('div');
        statsDiv.style.cssText = `
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            gap: 20px;
            justify-content: space-around;
        `;
        statsDiv.innerHTML = `
            <div>
                <div style="color: #64748b; font-size: 0.9rem;">总预约</div>
                <div style="font-size: 1.3rem; font-weight: 600;">${appointments.length}</div>
            </div>
            <div>
                <div style="color: #64748b; font-size: 0.9rem;">待处理</div>
                <div style="font-size: 1.3rem; font-weight: 600; color: #eab308;">${pendingCount}</div>
            </div>
            <div>
                <div style="color: #64748b; font-size: 0.9rem;">已完成</div>
                <div style="font-size: 1.3rem; font-weight: 600; color: #22c55e;">${completedCount}</div>
            </div>
        `;
        
        container.prepend(statsDiv);

    } catch (error) {
        console.error('加载预约失败:', error);
        
        // 如果是索引构建中的错误，显示友好提示
        if (error.message.includes('index is currently building')) {
            container.innerHTML = `
                <div class="info-message" style="background: #cffafe; color: #155e75; padding: 20px; border-radius: 8px; text-align: center;">
                    <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <h3>系统正在优化中</h3>
                    <p>预约功能正在优化，请等待 2-3 分钟后刷新页面</p>
                    <button class="btn btn-primary" onclick="loadMyAppointments()" style="margin-top: 15px;">
                        <i class="fas fa-sync"></i> 刷新
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>加载失败: ${error.message}</p>
                    <button class="btn btn-primary" onclick="loadMyAppointments()">重试</button>
                </div>
            `;
        }
    }
}

// 取消预约
window.cancelAppointment = async (appointmentId) => {
    if (!currentUser) {
        showError('请先登录');
        return;
    }
    
    if (!confirm('确定要取消这个预约吗？')) return;

    try {
        await db.collection('appointments').doc(appointmentId).update({
            status: 'cancelled',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // 刷新当前标签页
        const activeTab = document.querySelector('.tab.active').dataset.status;
        loadUserAppointments(activeTab);
        
        // 显示成功提示
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #22c55e;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = '预约已取消';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
        
    } catch (error) {
        console.error('取消失败:', error);
        alert('取消失败: ' + error.message);
    }
};
