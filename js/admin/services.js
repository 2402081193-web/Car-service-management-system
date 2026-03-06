// 加载服务管理页面
function loadServicesPage() {
    const container = document.getElementById('pageContent');
    container.innerHTML = `
        <div class="form-container">
            <h3 class="form-title">添加服务记录</h3>
            <form id="serviceForm" class="form-grid">
                <div class="form-group">
                    <label>选择汽车</label>
                    <select id="serviceCarId" required>
                        <option value="">请选择汽车</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>服务类型</label>
                    <input type="text" id="serviceType" placeholder="例如: 更换机油" required>
                </div>
                <div class="form-group">
                    <label>服务日期</label>
                    <input type="date" id="serviceDate" required>
                </div>
                <div class="form-group">
                    <label>费用 (¥)</label>
                    <input type="number" id="serviceCost" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label>状态</label>
                    <select id="serviceStatus">
                        <option value="completed">已完成</option>
                        <option value="pending">待处理</option>
                        <option value="cancelled">已取消</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>服务描述</label>
                    <textarea id="serviceDescription" rows="2" required></textarea>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">添加记录</button>
                </div>
            </form>
        </div>

        <div class="tabs">
            <div class="tab active" data-status="all">全部</div>
            <div class="tab" data-status="completed">已完成</div>
            <div class="tab" data-status="pending">待处理</div>
            <div class="tab" data-status="cancelled">已取消</div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>车牌号</th>
                        <th>服务类型</th>
                        <th>服务日期</th>
                        <th>费用</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="servicesTableBody">
                    <tr><td colspan="6" class="loading">加载中...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    // 加载汽车选项
    loadServiceCarOptions();

    // 设置默认日期
    document.getElementById('serviceDate').valueAsDate = new Date();

    // 标签页切换
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadServices(tab.dataset.status);
        });
    });

    // 表单提交 - 修复时间戳问题
    document.getElementById('serviceForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // 验证必填字段
        const carId = document.getElementById('serviceCarId').value;
        if (!carId) {
            alert('请选择汽车');
            return;
        }

        const cost = parseFloat(document.getElementById('serviceCost').value);
        if (isNaN(cost) || cost < 0) {
            alert('请输入有效的费用');
            return;
        }

        // 创建数据对象 - 使用普通日期字符串，不用 Firebase 时间戳
        const serviceData = {
            carId: carId,
            serviceType: document.getElementById('serviceType').value,
            date: document.getElementById('serviceDate').value,
            cost: cost,
            status: document.getElementById('serviceStatus').value,
            description: document.getElementById('serviceDescription').value,
            // 使用普通 JavaScript 日期，不是 Firebase 时间戳
            createdAt: new Date().toISOString()
        };

        try {
            // 添加服务记录
            const serviceRef = await db.collection('services').add(serviceData);
            
            // 如果服务已完成，自动创建支付记录
            if (serviceData.status === 'completed') {
                await db.collection('payments').add({
                    carId: serviceData.carId,
                    serviceId: serviceRef.id,
                    amount: serviceData.cost,
                    date: serviceData.date,
                    method: 'cash',
                    status: 'completed',
                    description: serviceData.description,
                    createdAt: new Date().toISOString()
                });
            }

            // 重置表单
            document.getElementById('serviceForm').reset();
            document.getElementById('serviceDate').valueAsDate = new Date();
            
            // 刷新列表
            const activeTab = document.querySelector('.tab.active').dataset.status;
            loadServices(activeTab);
            
            alert('服务记录添加成功');
            
        } catch (error) {
            console.error('添加服务记录失败:', error);
            alert('添加失败: ' + error.message);
        }
    });

    // 加载服务记录
    loadServices('all');
}

// 加载汽车选项
async function loadServiceCarOptions() {
    const select = document.getElementById('serviceCarId');
    select.innerHTML = '<option value="">加载中...</option>';

    try {
        // 获取所有汽车，不排序避免索引问题
        const snapshot = await db.collection('cars').get();
        
        if (snapshot.empty) {
            select.innerHTML = '<option value="">暂无汽车数据</option>';
            return;
        }
        
        // 在客户端排序
        const cars = [];
        snapshot.forEach(doc => {
            cars.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // 按车牌号排序
        cars.sort((a, b) => (a.plate || '').localeCompare(b.plate || ''));
        
        select.innerHTML = '<option value="">请选择汽车</option>';
        
        cars.forEach(car => {
            select.innerHTML += `<option value="${car.id}">${car.plate} - ${car.owner || '未知'}</option>`;
        });
        
    } catch (error) {
        console.error('加载汽车列表失败:', error);
        select.innerHTML = '<option value="">加载失败</option>';
    }
}

// 加载服务记录
async function loadServices(status = 'all') {
    const tbody = document.getElementById('servicesTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading">加载中...</td></tr>';

    try {
        // 获取所有服务记录
        let query = db.collection('services');
        
        // 如果有状态筛选
        if (status !== 'all') {
            query = query.where('status', '==', status);
        }
        
        const snapshot = await query.get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无服务记录</td></tr>';
            return;
        }

        // 在客户端排序
        const services = [];
        snapshot.forEach(doc => {
            services.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // 按日期倒序排序
        services.sort((a, b) => {
            if (a.date && b.date) {
                return b.date.localeCompare(a.date);
            }
            return 0;
        });

        tbody.innerHTML = '';
        
        for (const service of services) {
            // 获取汽车信息
            let plate = '未知';
            try {
                if (service.carId) {
                    const carDoc = await db.collection('cars').doc(service.carId).get();
                    if (carDoc.exists) {
                        plate = carDoc.data().plate || '未知';
                    }
                }
            } catch (error) {
                console.error('Error loading car:', error);
            }
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${plate}</strong></td>
                    <td>${service.serviceType || '-'}</td>
                    <td>${service.date || '-'}</td>
                    <td>¥${(service.cost || 0).toFixed(2)}</td>
                    <td><span class="badge badge-${service.status || 'pending'}">${getServiceStatusText(service.status)}</span></td>
                    <td class="action-btns">
                        <button class="action-btn edit" onclick="editService('${service.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteService('${service.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('加载服务记录失败:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="error-message">加载失败: ${error.message}</td></tr>`;
    }
}

// 获取服务状态文本
function getServiceStatusText(status) {
    const statusMap = {
        'pending': '待处理',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return statusMap[status] || status || '未知';
}

// 删除服务记录
window.deleteService = async (serviceId) => {
    if (!confirm('确定要删除这条服务记录吗？')) return;

    try {
        // 同时删除关联的支付记录
        const payments = await db.collection('payments')
            .where('serviceId', '==', serviceId)
            .get();
        
        const batch = db.batch();
        payments.forEach(doc => batch.delete(doc.ref));
        batch.delete(db.collection('services').doc(serviceId));
        
        await batch.commit();
        
        const activeTab = document.querySelector('.tab.active').dataset.status;
        loadServices(activeTab);
        alert('删除成功');
    } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败: ' + error.message);
    }
};

// 编辑服务记录
window.editService = (serviceId) => {
    alert('编辑功能开发中...');
};

// 添加 badge 样式
const style = document.createElement('style');
style.textContent = `
    .badge-pending {
        background: #fef9c3;
        color: #854d0e;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.85rem;
    }
    
    .badge-completed {
        background: #dcfce7;
        color: #166534;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.85rem;
    }
    
    .badge-cancelled {
        background: #fee2e2;
        color: #991b1b;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.85rem;
    }
    
    .empty-state {
        text-align: center;
        padding: 40px;
        color: #64748b;
    }
    
    .error-message {
        text-align: center;
        padding: 20px;
        background: #fee2e2;
        color: #991b1b;
        border-radius: 8px;
    }
`;
document.head.appendChild(style);
