// 加载汽车管理页面
function loadCarsPage() {
    const container = document.getElementById('pageContent');
    container.innerHTML = `
        <div class="form-container">
            <h3 class="form-title">添加新汽车</h3>
            <form id="carForm" class="form-grid">
                <div class="form-group">
                    <label>车牌号</label>
                    <input type="text" id="plate" placeholder="例如: 京A12345" required>
                </div>
                <div class="form-group">
                    <label>车主姓名</label>
                    <input type="text" id="owner" placeholder="车主姓名" required>
                </div>
                <div class="form-group">
                    <label>车型</label>
                    <input type="text" id="model" placeholder="例如: 特斯拉Model 3" required>
                </div>
                <div class="form-group">
                    <label>品牌</label>
                    <input type="text" id="brand" placeholder="例如: 特斯拉">
                </div>
                <div class="form-group">
                    <label>颜色</label>
                    <input type="text" id="color" placeholder="例如: 白色">
                </div>
                <div class="form-group">
                    <label>联系电话</label>
                    <input type="tel" id="phone" placeholder="手机号码">
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea id="notes" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">添加汽车</button>
                </div>
            </form>
        </div>

        <div class="table-container">
            <h3>汽车列表</h3>
            <table>
                <thead>
                    <tr>
                        <th>车牌号</th>
                        <th>车主</th>
                        <th>车型</th>
                        <th>品牌</th>
                        <th>颜色</th>
                        <th>联系电话</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="carsTableBody">
                    <tr><td colspan="7" class="loading">加载中...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    // 绑定表单提交
    document.getElementById('carForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 获取当前登录的管理员（可选）
        const currentUser = auth.currentUser;
        
        const carData = {
            plate: document.getElementById('plate').value,
            owner: document.getElementById('owner').value,  // 使用 owner 字段
            model: document.getElementById('model').value,
            brand: document.getElementById('brand').value || '',
            color: document.getElementById('color').value || '',
            phone: document.getElementById('phone').value || '',
            notes: document.getElementById('notes').value || '',
            createdAt: new Date().toISOString(),  // 使用普通日期字符串
            // 如果有关联用户，可以添加
            // userId: currentUser?.uid
        };

        try {
            await db.collection('cars').add(carData);
            document.getElementById('carForm').reset();
            loadCarsList();
            showSuccess('汽车添加成功');
        } catch (error) {
            console.error('添加失败:', error);
            showError('添加失败: ' + error.message);
        }
    });

    // 加载列表
    loadCarsList();
}

// 加载汽车列表
async function loadCarsList() {
    const tbody = document.getElementById('carsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="loading"><div class="spinner"></div>加载中...</td></tr>';

    try {
        // 获取所有汽车
        const snapshot = await db.collection('cars').get();
        
        // 在客户端排序
        const cars = [];
        snapshot.forEach(doc => {
            cars.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // 按创建时间倒序排序
        cars.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return b.createdAt.localeCompare(a.createdAt);
            }
            return 0;
        });

        if (cars.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">暂无数据</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        
        cars.forEach(car => {
            // 根据数据库实际字段名显示
            tbody.innerHTML += `
                <tr>
                    <td><strong>${escapeHtml(car.plate || '未知')}</strong></td>
                    <td>${escapeHtml(car.owner || '未知')}</td>
                    <td>${escapeHtml(car.model || '未知')}</td>
                    <td>${escapeHtml(car.brand || '-')}</td>
                    <td>${escapeHtml(car.color || '-')}</td>
                    <td>${escapeHtml(car.phone || '-')}</td>
                    <td class="action-btns">
                        <button class="action-btn edit" onclick="editCar('${car.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteCar('${car.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error('加载失败:', error);
        tbody.innerHTML = `<tr><td colspan="7" class="error-message">加载失败: ${error.message}</td></tr>`;
    }
}

// 删除汽车
window.deleteCar = async (carId) => {
    if (!confirm('确定删除吗？这将删除所有相关记录！')) return;

    try {
        // 删除相关记录
        const appointments = await db.collection('appointments').where('carId', '==', carId).get();
        const services = await db.collection('services').where('carId', '==', carId).get();
        const payments = await db.collection('payments').where('carId', '==', carId).get();
        
        const batch = db.batch();
        appointments.forEach(doc => batch.delete(doc.ref));
        services.forEach(doc => batch.delete(doc.ref));
        payments.forEach(doc => batch.delete(doc.ref));
        batch.delete(db.collection('cars').doc(carId));
        
        await batch.commit();
        
        loadCarsList();
        showSuccess('删除成功');
    } catch (error) {
        console.error('删除失败:', error);
        showError('删除失败: ' + error.message);
    }
};

// 编辑汽车（待实现）
window.editCar = (carId) => {
    alert('编辑功能开发中...');
};

// 辅助函数：转义HTML
function escapeHtml(text) {
    if (text === undefined || text === null) return '-';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 辅助函数：显示成功消息
function showSuccess(message) {
    // 使用全局的 showSuccess 如果存在
    if (typeof window.showSuccess === 'function') {
        window.showSuccess(message);
    } else {
        alert(message);
    }
}

// 辅助函数：显示错误消息
function showError(message) {
    // 使用全局的 showError 如果存在
    if (typeof window.showError === 'function') {
        window.showError(message);
    } else {
        alert('错误: ' + message);
    }
}
