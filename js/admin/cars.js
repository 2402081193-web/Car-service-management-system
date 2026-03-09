// 加载汽车管理页面
function loadCarsPage() {
    const container = document.getElementById('pageContent');
    container.innerHTML = `
        <div class="form-container">
            <h3 class="form-title">添加新汽车</h3>
            <form id="carForm" class="form-grid">
                <div class="form-group">
                    <label>选择车主</label>
                    <select id="userId" class="form-control" required>
                        <option value="">请选择车主</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>车牌号</label>
                    <input type="text" id="plate" placeholder="例如: 京A12345" required>
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
                        <th>联系电话</th>
                        <th>车型</th>
                        <th>品牌</th>
                        <th>颜色</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="carsTableBody">
                    <tr><td colspan="7" class="loading">加载中...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    // 加载车主列表
    loadUserOptions();

    // 绑定表单提交
    document.getElementById('carForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userId = document.getElementById('userId').value;
        const plate = document.getElementById('plate').value.trim().toUpperCase();
        const model = document.getElementById('model').value.trim();
        const brand = document.getElementById('brand').value.trim();
        const color = document.getElementById('color').value.trim();
        const notes = document.getElementById('notes').value.trim();
        
        if (!userId) {
            showError('请选择车主');
            return;
        }
        
        if (!plate) {
            showError('请输入车牌号');
            return;
        }
        
        if (!model) {
            showError('请输入车型');
            return;
        }
        
        // 检查车牌号是否已存在
        const existingCar = await db.collection('cars')
            .where('plate', '==', plate)
            .get();
        
        if (!existingCar.empty) {
            showError('该车牌号已存在');
            return;
        }
        
        const carData = {
            userId: userId,  // 只保存用户ID，不保存owner和phone
            plate: plate,
            model: model,
            brand: brand || '',
            color: color || '',
            notes: notes || '',
            createdAt: new Date().toISOString()
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

// 加载车主选项
async function loadUserOptions() {
    const select = document.getElementById('userId');
    if (!select) return;
    
    select.innerHTML = '<option value="">加载中...</option>';
    
    try {
        // 获取所有车主用户
        const snapshot = await db.collection('users')
            .where('role', '==', 'customer')
            .orderBy('name')
            .get();
        
        if (snapshot.empty) {
            select.innerHTML = '<option value="">暂无车主</option>';
            return;
        }
        
        select.innerHTML = '<option value="">请选择车主</option>';
        
        snapshot.forEach(doc => {
            const user = doc.data();
            select.innerHTML += `<option value="${doc.id}">${escapeHtml(user.name || '未知')} (${escapeHtml(user.phone || '无电话')})</option>`;
        });
        
    } catch (error) {
        console.error('加载车主失败:', error);
        select.innerHTML = '<option value="">加载失败</option>';
    }
}

// 加载汽车列表
async function loadCarsList() {
    const tbody = document.getElementById('carsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="loading"><div class="spinner"></div>加载中...</td></tr>';

    try {
        // 获取所有汽车
        const carsSnapshot = await db.collection('cars').get();
        
        if (carsSnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">暂无数据</td></tr>';
            return;
        }

        // 获取所有用户信息（用于关联）
        const usersSnapshot = await db.collection('users').get();
        const usersMap = new Map();
        usersSnapshot.forEach(doc => {
            usersMap.set(doc.id, doc.data());
        });

        // 在客户端排序
        const cars = [];
        carsSnapshot.forEach(doc => {
            cars.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // 按创建时间倒序排序
        cars.sort((a, b) => {
            try {
                let timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                let timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeB - timeA;
            } catch {
                return 0;
            }
        });

        tbody.innerHTML = '';
        
        for (const car of cars) {
            // 从 usersMap 获取车主信息
            const user = usersMap.get(car.userId) || {};
            const ownerName = user.name || '未知车主';
            const ownerPhone = user.phone || '-';
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${escapeHtml(car.plate || '未知')}</strong></td>
                    <td>${escapeHtml(ownerName)}</td>
                    <td>${escapeHtml(ownerPhone)}</td>
                    <td>${escapeHtml(car.model || '未知')}</td>
                    <td>${escapeHtml(car.brand || '-')}</td>
                    <td>${escapeHtml(car.color || '-')}</td>
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
        }

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

// 编辑汽车
window.editCar = (carId) => {
    alert('编辑功能开发中...');
};

// 辅助函数：转义HTML
function escapeHtml(text) {
    if (text === undefined || text === null) return '-';
    if (typeof text !== 'string') {
        text = String(text);
    }
    return text.replace(/[&<>"]/g, function(match) {
        if (match === '&') return '&amp;';
        if (match === '<') return '&lt;';
        if (match === '>') return '&gt;';
        if (match === '"') return '&quot;';
        return match;
    });
}

// 辅助函数：显示成功消息
function showSuccess(message) {
    if (typeof window.showSuccess === 'function') {
        window.showSuccess(message);
    } else {
        alert('✅ ' + message);
    }
}

// 辅助函数：显示错误消息
function showError(message) {
    if (typeof window.showError === 'function') {
        window.showError(message);
    } else {
        alert('❌ ' + message);
    }
}
