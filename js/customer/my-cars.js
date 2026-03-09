// 加载用户车辆
async function loadUserCars() {
    const carsList = document.getElementById('carsList');
    if (!carsList || !currentUser) return;
    
    try {
        // 使用 userId（小写d）
        const snapshot = await db.collection('cars')
            .where('userId', '==', currentUser.uid)
            .get();
        
        if (snapshot.empty) {
            carsList.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                    <i class="fas fa-car" style="font-size: 4rem; color: #cbd5e1; margin-bottom: 20px;"></i>
                    <h3 style="font-size: 1.3rem; color: #1e293b; margin-bottom: 10px;">还没有添加爱车</h3>
                    <p style="color: #64748b; margin-bottom: 20px;">点击"添加爱车"按钮开始添加您的第一辆车</p>
                    <button class="btn btn-primary" onclick="showAddCarModal()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer;">
                        <i class="fas fa-plus"></i> 添加爱车
                    </button>
                </div>
            `;
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const car = doc.data();
            html += `
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <span style="font-size: 1.2rem; font-weight: 600; color: #3b82f6;">${car.plate || '未知'}</span>
                        <span style="color: #64748b;">${car.model || '未知'}</span>
                    </div>
                    <div style="margin: 10px 0; color: #475569;">
                        <div style="margin-bottom: 5px;"><i class="fas fa-user" style="width: 20px; color: #64748b;"></i> 车主: ${car.owner || '未知'}</div>
                        ${car.brand ? `<div style="margin-bottom: 5px;"><i class="fas fa-tag" style="width: 20px; color: #64748b;"></i> 品牌: ${car.brand}</div>` : ''}
                        ${car.color ? `<div style="margin-bottom: 5px;"><i class="fas fa-palette" style="width: 20px; color: #64748b;"></i> 颜色: ${car.color}</div>` : ''}
                        ${car.phone ? `<div style="margin-bottom: 5px;"><i class="fas fa-phone" style="width: 20px; color: #64748b;"></i> 电话: ${car.phone}</div>` : ''}
                        ${car.notes ? `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0;"><small style="color: #64748b;">备注: ${car.notes}</small></div>` : ''}
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn btn-primary" onclick="showBookingModal('${doc.id}')" style="flex: 1; padding: 8px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-calendar-plus"></i> 预约
                        </button>
                    </div>
                </div>
            `;
        });
        
        carsList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading cars:', error);
        carsList.innerHTML = `
            <div style="text-align: center; padding: 40px; background: #fee2e2; color: #991b1b; border-radius: 8px;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>加载失败: ${error.message}</p>
                <button onclick="loadMyCars()" style="margin-top: 15px; padding: 8px 16px; background: #991b1b; color: white; border: none; border-radius: 6px; cursor: pointer;">重试</button>
            </div>
        `;
    }
}

// 添加车辆时
window.submitAddCar = async function() {
    const plate = document.getElementById('carPlate')?.value;
    const model = document.getElementById('carModel')?.value;
    const brand = document.getElementById('carBrand')?.value;
    const color = document.getElementById('carColor')?.value;
    const phone = document.getElementById('carPhone')?.value; // 如果有电话字段
    const notes = document.getElementById('carNotes')?.value;
    
    if (!plate || !model) {
        showMessage('请填写车牌号和车型', 'error');
        return;
    }
    
    const carData = {
        plate: plate.toUpperCase(),
        owner: currentUser.displayName || '车主', // 使用当前用户名
        model: model,
        brand: brand || '',
        color: color || '',
        phone: phone || '',
        notes: notes || '',
        userId: currentUser.uid,  // 使用 userId（小写d）
        createdAt: new Date().toISOString()
    };
    
    try {
        // 检查车牌号是否已存在
        const existingCar = await db.collection('cars')
            .where('plate', '==', carData.plate)
            .get();
        
        if (!existingCar.empty) {
            showMessage('该车牌号已存在', 'error');
            return;
        }
        
        await db.collection('cars').add(carData);
        showMessage('爱车添加成功');
        closeAddCarModal();
        document.getElementById('addCarForm').reset();
        
        if (currentPage === 'my-cars') {
            loadMyCars();
        }
    } catch (error) {
        console.error('Error adding car:', error);
        showMessage('添加失败: ' + error.message, 'error');
    }
};
