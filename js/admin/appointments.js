// 加载预约管理页面
function loadAppointmentsPage() {
    const container = document.getElementById('pageContent');
    container.innerHTML = `
        <div class="form-container">
            <h3 class="form-title">新建预约</h3>
            <form id="appointmentForm" class="form-grid">
                <div class="form-group">
                    <label>选择汽车</label>
                    <select id="appointmentCarId" required>
                        <option value="">请选择汽车</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>服务类型</label>
                    <select id="serviceType" required>
                        <option value="保养">保养</option>
                        <option value="维修">维修</option>
                        <option value="检测">检测</option>
                        <option value="美容">美容</option>
                        <option value="其他">其他</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>预约日期</label>
                    <input type="date" id="appointmentDate" required>
                </div>
                <div class="form-group">
                    <label>预约时间</label>
                    <input type="time" id="appointmentTime" required>
                </div>
                <div class="form-group">
                    <label>状态</label>
                    <select id="appointmentStatus">
                        <option value="pending">待处理</option>
                        <option value="completed">已完成</option>
                        <option value="cancelled">已取消</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea id="appointmentNotes" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">创建预约</button>
                </div>
            </form>
        </div>

        <div class="tabs">
            <div class="tab active" data-status="all">全部</div>
            <div class="tab" data-status="pending">待处理</div>
            <div class="tab" data-status="completed">已完成</div>
            <div class="tab" data-status="cancelled">已取消</div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>车牌号</th>
                        <th>车主</th>
                        <th>服务类型</th>
                        <th>预约时间</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="appointmentsTableBody">
                    <tr><td colspan="6" class="loading">加载中...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    // 设置默认日期
    document.getElementById('appointmentDate').valueAsDate = new Date();

    // 加载汽车选项
    loadAppointmentCarOptions();

    // 标签页切换
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadAppointments(tab.dataset.status);
        });
    });

    // 表单提交
    document.getElementById('appointmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const appointmentData = {
            carId: document.getElementById('appointmentCarId').value,
            serviceType: document.getElementById('serviceType').value,
            date: document.getElementById('appointmentDate').value,
            time: document.getElementById('appointmentTime').value,
            status: document.getElementById('appointmentStatus').value,
            notes: document.getElementById('appointmentNotes').value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('appointments').add(appointmentData);
            document.getElementById('appointmentForm').reset();
            document.getElementById('appointmentDate').valueAsDate = new Date();
            loadAppointments('all');
            showError('预约创建成功');
        } catch (error) {
            console.error('创建预约失败:', error);
            showError('创建预约失败');
        }
    });

    // 加载所有预约
    loadAppointments('all');
}

// 加载汽车选项
async function loadAppointmentCarOptions() {
    const select = document.getElementById('appointmentCarId');
    select.innerHTML = '<option value="">加载中...</option>';

    try {
        const snapshot = await db.collection('cars').orderBy('plate').get();
        select.innerHTML = '<option value="">请选择汽车</option>';
        
        snapshot.forEach(doc => {
            const car = doc.data();
            select.innerHTML += `<option value="${doc.id}">${car.plate} - ${car.owner} (${car.model})</option>`;
        });
    } catch (error) {
        console.error('加载汽车列表失败:', error);
        select.innerHTML = '<option value="">加载失败</option>';
    }
}

// 加载预约列表
async function loadAppointments(status = 'all') {
    const tbody = document.getElementById('appointmentsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading">加载中...</td></tr>';

    try {
        let query = db.collection('appointments').orderBy('date', 'desc').orderBy('time', 'desc');
        
        if (status !== 'all') {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无预约记录</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        
        for (const doc of snapshot.docs) {
            const apt = doc.data();
            
            // 获取汽车信息
            const carDoc = await db.collection('cars').doc(apt.carId).get();
            const car = carDoc.exists ? carDoc.data() : { plate: '未知', owner: '未知' };
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${car.plate}</strong></td>
                    <td>${car.owner}</td>
                    <td>${apt.serviceType}</td>
                    <td>${apt.date} ${apt.time}</td>
                    <td>
                        <select class="status-badge status-${apt.status}" onchange="updateAppointmentStatus('${doc.id}', this.value)" style="padding: 4px; border-radius: 4px;">
                            <option value="pending" ${apt.status === 'pending' ? 'selected' : ''}>待处理</option>
                            <option value="completed" ${apt.status === 'completed' ? 'selected' : ''}>已完成</option>
                            <option value="cancelled" ${apt.status === 'cancelled' ? 'selected' : ''}>已取消</option>
                        </select>
                    </td>
                    <td class="action-btns">
                        <button class="action-btn edit" onclick="editAppointment('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteAppointment('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('加载预约失败:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="error-message">加载失败</td></tr>';
    }
}

// 更新预约状态
window.updateAppointmentStatus = async (appointmentId, status) => {
    try {
        await db.collection('appointments').doc(appointmentId).update({ status });
        
        // 如果状态变为已完成，自动创建服务记录
        if (status === 'completed') {
            const aptDoc = await db.collection('appointments').doc(appointmentId).get();
            const apt = aptDoc.data();
            
            await db.collection('services').add({
                carId: apt.carId,
                serviceType: apt.serviceType,
                date: apt.date,
                description: apt.notes || apt.serviceType,
                cost: 0, // 需要手动输入
                status: 'pending',
                appointmentId: appointmentId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        const activeTab = document.querySelector('.tab.active').dataset.status;
        loadAppointments(activeTab);
        showError('状态更新成功');
    } catch (error) {
        console.error('更新失败:', error);
        showError('更新失败');
    }
};

// 删除预约
window.deleteAppointment = async (appointmentId) => {
    if (!confirm('确定要删除这个预约吗？')) return;

    try {
        await db.collection('appointments').doc(appointmentId).delete();
        const activeTab = document.querySelector('.tab.active').dataset.status;
        loadAppointments(activeTab);
        showError('删除成功');
    } catch (error) {
        console.error('删除失败:', error);
        showError('删除失败');
    }
};

// 编辑预约
window.editAppointment = (appointmentId) => {
    alert('编辑功能开发中...');
};