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
    
    // 获取所有表单字段
    const plate = document.getElementById('plate').value;
    const owner = document.getElementById('owner').value;  // 车主姓名
    const model = document.getElementById('model').value;
    const brand = document.getElementById('brand').value || '';
    const color = document.getElementById('color').value || '';
    const phone = document.getElementById('phone').value || '';  // 联系电话
    const notes = document.getElementById('notes').value || '';
    
    // 验证必填字段
    if (!plate || !owner || !model) {
        showError('请填写车牌号、车主姓名和车型');
        return;
    }
    
    const carData = {
        plate: plate,
        owner: owner,  // 确保保存车主姓名
        model: model,
        brand: brand,
        color: color,
        phone: phone,  // 确保保存联系电话
        notes: notes,
        createdAt: new Date().toISOString()
    };

    console.log('正在添加汽车:', carData);  // 调试用

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
        
        // 修复排序：处理不同的日期格式
        cars.sort((a, b) => {
            try {
                // 获取时间戳值
                let timeA = 0;
                let timeB = 0;
                
                // 处理 a.createdAt
                if (a.createdAt) {
                    if (typeof a.createdAt === 'string') {
                        timeA = new Date(a.createdAt).getTime();
                    } else if (a.createdAt instanceof Date) {
                        timeA = a.createdAt.getTime();
                    } else if (a.createdAt?.toDate) {
                        // Firebase Timestamp 对象
                        timeA = a.createdAt.toDate().getTime();
                    } else if (typeof a.createdAt === 'number') {
                        timeA = a.createdAt;
                    }
                }
                
                // 处理 b.createdAt
                if (b.createdAt) {
                    if (typeof b.createdAt === 'string') {
                        timeB = new Date(b.createdAt).getTime();
                    } else if (b.createdAt instanceof Date) {
                        timeB = b.createdAt.getTime();
                    } else if (b.createdAt?.toDate) {
                        // Firebase Timestamp 对象
                        timeB = b.createdAt.toDate().getTime();
                    } else if (typeof b.createdAt === 'number') {
                        timeB = b.createdAt;
                    }
                }
                
                // 降序排列（新的在前）
                return timeB - timeA;
                
            } catch (error) {
                console.warn('排序错误:', error);
                return 0;
            }
        });

        if (cars.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">暂无数据</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        
        cars.forEach(car => {
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
