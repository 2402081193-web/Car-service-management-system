// 加载我的爱车页面
function loadMyCars() {
    const container = document.getElementById('customerContent');
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>我的爱车</h2>
            <button class="btn btn-primary" onclick="showAddCarModal()">
                <i class="fas fa-plus"></i> 添加爱车
            </button>
        </div>

        <div id="myCarsContainer" class="cars-grid">
            <div class="loading">加载中...</div>
        </div>
    `;

    loadUserCars();
}

// 显示添加车辆模态框
function showAddCarModal() {
    const modal = document.createElement('div');
    modal.id = 'addCarModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; width: 90%; max-width: 500px;">
            <h3 style="margin-bottom: 20px;">添加爱车</h3>
            <form id="addCarForm">
                <div class="form-group">
                    <label>车牌号</label>
                    <input type="text" id="carPlate" placeholder="例如: 京A12345" required>
                </div>
                <div class="form-group">
                    <label>车型</label>
                    <input type="text" id="carModel" placeholder="例如: 特斯拉Model 3" required>
                </div>
                <div class="form-group">
                    <label>品牌</label>
                    <input type="text" id="carBrand" placeholder="例如: 特斯拉">
                </div>
                <div class="form-group">
                    <label>颜色</label>
                    <input type="text" id="carColor" placeholder="例如: 白色">
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea id="carNotes" rows="2"></textarea>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">添加</button>
                    <button type="button" class="btn" onclick="closeAddCarModal()" style="flex: 1;">取消</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // 表单提交
    document.getElementById('addCarForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const carData = {
            plate: document.getElementById('carPlate').value,
            model: document.getElementById('carModel').value,
            brand: document.getElementById('carBrand').value,
            color: document.getElementById('carColor').value,
            notes: document.getElementById('carNotes').value,
            userId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('cars').add(carData);
            closeAddCarModal();
            loadUserCars();
        } catch (error) {
            console.error('添加失败:', error);
            alert('添加失败，请重试');
        }
    });
}

// 关闭添加车辆模态框
function closeAddCarModal() {
    const modal = document.getElementById('addCarModal');
    if (modal) {
        modal.remove();
    }
}

// 加载用户车辆
async function loadUserCars() {
    const container = document.getElementById('myCarsContainer');
    
    try {
        const snapshot = await db.collection('cars')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-car"></i>
                    <p>还没有添加爱车，点击"添加爱车"开始</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        
        snapshot.forEach(doc => {
            const car = doc.data();
            container.innerHTML += `
                <div class="car-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <span style="font-size: 1.2rem; font-weight: 600; color: #3b82f6;">${car.plate}</span>
                        <span style="color: #64748b;">${car.model}</span>
                    </div>
                    <div style="margin: 10px 0; color: #475569;">
                        ${car.brand ? `<div><i class="fas fa-tag"></i> 品牌: ${car.brand}</div>` : ''}
                        ${car.color ? `<div><i class="fas fa-palette"></i> 颜色: ${car.color}</div>` : ''}
                        ${car.notes ? `<div style="margin-top: 10px;"><small>备注: ${car.notes}</small></div>` : ''}
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn btn-primary" style="flex: 1;" onclick="showBookingModal('${doc.id}')">
                            <i class="fas fa-calendar-plus"></i> 预约
                        </button>
                        <button class="btn" style="flex: 1;" onclick="viewCarHistory('${doc.id}')">
                            <i class="fas fa-history"></i> 历史
                        </button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('加载车辆失败:', error);
        container.innerHTML = '<div class="error-message">加载失败，请刷新重试</div>';
    }
}

// 查看车辆历史
window.viewCarHistory = async (carId) => {
    // 获取车辆信息
    const carDoc = await db.collection('cars').doc(carId).get();
    const car = carDoc.data();

    // 获取服务历史
    const services = await db.collection('services')
        .where('carId', '==', carId)
        .orderBy('date', 'desc')
        .limit(5)
        .get();

    let historyHtml = '';
    services.forEach(doc => {
        const service = doc.data();
        historyHtml += `
            <div style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between;">
                    <span><strong>${service.date}</strong> - ${service.serviceType}</span>
                    <span>¥${service.cost.toFixed(2)}</span>
                </div>
                <div style="color: #64748b; font-size: 0.9rem;">${service.description || ''}</div>
            </div>
        `;
    });

    if (!historyHtml) {
        historyHtml = '<div style="padding: 20px; text-align: center; color: #64748b;">暂无服务记录</div>';
    }

    // 显示历史弹窗
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto;">
            <h3 style="margin-bottom: 20px;">${car.plate} 服务历史</h3>
            ${historyHtml}
            <div style="margin-top: 20px; text-align: right;">
                <button class="btn" onclick="this.closest('.modal').remove()">关闭</button>
            </div>
        </div>
    `;
    modal.className = 'modal';
    document.body.appendChild(modal);
};