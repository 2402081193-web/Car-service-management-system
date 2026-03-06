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

    // 表单提交
    document.getElementById('serviceForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const serviceData = {
            carId: document.getElementById('serviceCarId').value,
            serviceType: document.getElementById('serviceType').value,
            date: document.getElementById('serviceDate').value,
            cost: parseFloat(document.getElementById('serviceCost').value),
            status: document.getElementById('serviceStatus').value,
            description: document.getElementById('serviceDescription').value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            const serviceRef = await db.collection('services').add(serviceData);
            
            // 如果服务已完成，创建支付记录
            if (serviceData.status === 'completed') {
                await db.collection('payments').add({
                    carId: serviceData.carId,
                    serviceId: serviceRef.id,
                    amount: serviceData.cost,
                    date: serviceData.date,
                    method: 'cash',
                    status: 'completed',
                    description: serviceData.description,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            document.getElementById('serviceForm').reset();
            document.getElementById('serviceDate').valueAsDate = new Date();
            loadServices('all');
            showError('服务记录添加成功');
        } catch (error) {
            console.error('添加服务记录失败:', error);
            showError('添加失败');
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
        const snapshot = await db.collection('cars').orderBy('plate').get();
        select.innerHTML = '<option value="">请选择汽车</option>';
        
        snapshot.forEach(doc => {
            const car = doc.data();
            select.innerHTML += `<option value="${doc.id}">${car.plate} - ${car.owner}</option>`;
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
        let query = db.collection('services').orderBy('date', 'desc');
        
        if (status !== 'all') {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无服务记录</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        
        for (const doc of snapshot.docs) {
            const service = doc.data();
            
            // 获取汽车信息
            const carDoc = await db.collection('cars').doc(service.carId).get();
            const plate = carDoc.exists ? carDoc.data().plate : '未知';
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${plate}</strong></td>
                    <td>${service.serviceType}</td>
                    <td>${service.date}</td>
                    <td>¥${service.cost.toFixed(2)}</td>
                    <td><span class="status-badge status-${service.status}">${getStatusText(service.status)}</span></td>
                    <td class="action-btns">
                        <button class="action-btn edit" onclick="editService('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteService('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('加载服务记录失败:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="error-message">加载失败</td></tr>';
    }
}

// 删除服务记录
window.deleteService = async (serviceId) => {
    if (!confirm('确定要删除这条服务记录吗？')) return;

    try {
        // 同时删除关联的支付记录
        const payments = await db.collection('payments').where('serviceId', '==', serviceId).get();
        
        const batch = db.batch();
        payments.forEach(doc => batch.delete(doc.ref));
        batch.delete(db.collection('services').doc(serviceId));
        
        await batch.commit();
        
        const activeTab = document.querySelector('.tab.active').dataset.status;
        loadServices(activeTab);
        showError('删除成功');
    } catch (error) {
        console.error('删除失败:', error);
        showError('删除失败');
    }
};

window.editService = (serviceId) => {
    alert('编辑功能开发中...');
};