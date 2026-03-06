// 加载服务历史页面
function loadMyServices() {
    const container = document.getElementById('customerContent');
    container.innerHTML = `
        <h2 style="margin-bottom: 20px;">服务历史</h2>

        <div class="tabs">
            <div class="tab active" data-status="all">全部</div>
            <div class="tab" data-status="completed">已完成</div>
            <div class="tab" data-status="pending">进行中</div>
        </div>

        <div id="myServicesContainer" class="appointments-list">
            <div class="loading">加载中...</div>
        </div>
    `;

    // 标签页切换
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadUserServices(tab.dataset.status);
        });
    });

    loadUserServices('all');
}

// 加载用户服务记录
async function loadUserServices(status = 'all') {
    const container = document.getElementById('myServicesContainer');
    
    try {
        // 获取用户的所有车辆
        const cars = await db.collection('cars')
            .where('userId', '==', currentUser.uid)
            .get();
        
        const carIds = cars.docs.map(doc => doc.id);
        
        if (carIds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tools"></i>
                    <p>暂无服务记录</p>
                </div>
            `;
            return;
        }

        // 查询服务记录
        let query = db.collection('services')
            .where('carId', 'in', carIds)
            .orderBy('date', 'desc');
        
        if (status !== 'all') {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tools"></i>
                    <p>暂无服务记录</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        
        // 统计总消费
        let totalCost = 0;
        
        for (const doc of snapshot.docs) {
            const service = doc.data();
            totalCost += service.cost || 0;
            
            // 获取车辆信息
            const carDoc = await db.collection('cars').doc(service.carId).get();
            const car = carDoc.exists ? carDoc.data() : { plate: '未知' };
            
            container.innerHTML += `
                <div class="appointment-card" style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div>
                            <span style="font-weight: 600; font-size: 1.1rem;">${service.serviceType}</span>
                            <span style="margin-left: 10px; color: #3b82f6;">${car.plate}</span>
                        </div>
                        <span class="status-badge status-${service.status}">${getStatusText(service.status)}</span>
                    </div>
                    <div style="display: flex; gap: 20px; color: #64748b; margin-bottom: 10px;">
                        <span><i class="fas fa-calendar"></i> ${service.date}</span>
                        <span style="font-weight: 600; color: #1e293b;">¥${service.cost.toFixed(2)}</span>
                    </div>
                    <div style="color: #475569;">${service.description || ''}</div>
                </div>
            `;
        }

        // 添加统计信息
        const statsDiv = document.createElement('div');
        statsDiv.style.cssText = `
            background: #3b82f6;
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-around;
        `;
        statsDiv.innerHTML = `
            <div>
                <div style="font-size: 0.9rem; opacity: 0.9;">总服务次数</div>
                <div style="font-size: 1.5rem; font-weight: 600;">${snapshot.size}</div>
            </div>
            <div>
                <div style="font-size: 0.9rem; opacity: 0.9;">总消费</div>
                <div style="font-size: 1.5rem; font-weight: 600;">¥${totalCost.toFixed(2)}</div>
            </div>
            <div>
                <div style="font-size: 0.9rem; opacity: 0.9;">平均每次</div>
                <div style="font-size: 1.5rem; font-weight: 600;">¥${(totalCost / snapshot.size).toFixed(2)}</div>
            </div>
        `;
        
        container.prepend(statsDiv);

    } catch (error) {
        console.error('加载服务记录失败:', error);
        container.innerHTML = '<div class="error-message">加载失败，请刷新重试</div>';
    }
}