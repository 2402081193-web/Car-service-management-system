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
        const plate = document.getElementById('plate').value.trim();
        const owner = document.getElementById('owner').value.trim();
        const model = document.getElementById('model').value.trim();
        const brand = document.getElementById('brand').value.trim();
        const color = document.getElementById('color').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const notes = document.getElementById('notes').value.trim();
        
        // 验证必填字段
        if (!plate) {
            showError('请输入车牌号');
            return;
        }
        if (!owner) {
            showError('请输入车主姓名');
            return;
        }
        if (!model) {
            showError('请输入车型');
            return;
        }
        
        const carData = {
            plate: plate.toUpperCase(), // 车牌号转大写
            owner: owner,
            model: model,
            brand: brand || '',
            color: color || '',
            phone: phone || '',
            notes: notes || '',
            createdAt: new Date().toISOString()
        };

        console.log('正在添加汽车:', carData);

        try {
            // 检查车牌号是否已存在
            const existingCar = await db.collection('cars')
                .where('plate', '==', carData.plate)
                .get();
            
            if (!existingCar.empty) {
                showError('该车牌号已存在');
                return;
            }

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
            try {
                // 获取时间戳值
                let timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                let timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeB - timeA;
            } catch {
                return 0;
            }
        });

        if (cars.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">暂无数据</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        
        cars.forEach(car => {
            // 处理车主姓名 - 如果没有则显示默认值
            let ownerDisplay = car.owner;
            if (!ownerDisplay) {
                // 尝试从其他字段获取车主信息
                ownerDisplay = car.ownerName || car.customerName || '未知';
            }
            
            // 处理联系电话
            let phoneDisplay = car.phone;
            if (!phoneDisplay) {
                phoneDisplay = car.mobile || car.tel || '-';
            }
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${escapeHtml(car.plate || '未知')}</strong></td>
                    <td>${escapeHtml(ownerDisplay)}</td>
                    <td>${escapeHtml(car.model || '未知')}</td>
                    <td>${escapeHtml(car.brand || '-')}</td>
                    <td>${escapeHtml(car.color || '-')}</td>
                    <td>${escapeHtml(phoneDisplay)}</td>
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

// 编辑汽车
window.editCar = async (carId) => {
    // 简单的编辑功能 - 可以后续完善
    const newOwner = prompt('请输入新的车主姓名:');
    if (newOwner !== null && newOwner.trim() !== '') {
        try {
            await db.collection('cars').doc(carId).update({
                owner: newOwner.trim()
            });
            loadCarsList();
            showSuccess('车主姓名已更新');
        } catch (error) {
            console.error('更新失败:', error);
            showError('更新失败: ' + error.message);
        }
    }
};

// 辅助函数：修复现有数据
window.fixCarData = async function() {
    if (!confirm('确定要修复所有汽车数据吗？这将为缺失的字段添加默认值。')) return;
    
    try {
        const snapshot = await db.collection('cars').get();
        const batch = db.batch();
        let count = 0;
        
        snapshot.forEach(doc => {
            const car = doc.data();
            const updates = {};
            
            if (!car.owner) {
                updates.owner = '未知车主';
                count++;
            }
            if (!car.phone && car.phone !== '') {
                updates.phone = '';
                count++;
            }
            
            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
            }
        });
        
        if (count > 0) {
            await batch.commit();
            showSuccess(`已修复 ${count} 条记录`);
            loadCarsList();
        } else {
            showSuccess('没有需要修复的记录');
        }
    } catch (error) {
        console.error('修复失败:', error);
        showError('修复失败: ' + error.message);
    }
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

// 在控制台添加修复按钮（可选）
console.log('可用修复命令: fixCarData()');
