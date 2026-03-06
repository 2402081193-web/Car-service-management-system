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
                    <input type="text" id="name" placeholder="车主姓名" required>
                </div>
                <div class="form-group">
                    <label>车型</label>
                    <input type="text" id="model" placeholder="例如: 特斯拉Model 3" required>
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
                        <th>联系电话</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="carsTableBody">
                    <tr><td colspan="5" class="loading">加载中...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    // 绑定表单提交
    document.getElementById('carForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const carData = {
            plate: document.getElementById('plate').value,
            owner: document.getElementById('owner').value,
            model: document.getElementById('model').value,
            phone: document.getElementById('phone').value,
            notes: document.getElementById('notes').value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('cars').add(carData);
            document.getElementById('carForm').reset();
            loadCarsList();
            showError('汽车添加成功');
        } catch (error) {
            console.error('添加失败:', error);
            showError('添加失败');
        }
    });

    // 加载列表
    loadCarsList();
}

// 加载汽车列表
async function loadCarsList() {
    const tbody = document.getElementById('carsTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="loading">加载中...</td></tr>';

    try {
        const snapshot = await db.collection('cars').orderBy('createdAt', 'desc').get();
        
        tbody.innerHTML = '';
        
        snapshot.forEach(doc => {
            const car = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><strong>${car.plate}</strong></td>
                    <td>${car.owner}</td>
                    <td>${car.model}</td>
                    <td>${car.phone || '-'}</td>
                    <td class="action-btns">
                        <button class="action-btn edit" onclick="editCar('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteCar('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">暂无数据</td></tr>';
        }

    } catch (error) {
        console.error('加载失败:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="error-message">加载失败</td></tr>';
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
        showError('删除成功');
    } catch (error) {
        console.error('删除失败:', error);
        showError('删除失败');
    }
};

window.editCar = (carId) => {
    alert('编辑功能开发中...');
};
