// 加载我的爱车页面
function loadMyCars() {
    const container = document.getElementById('customerContent');
    if (!container) return;
    
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="font-size: 1.5rem; color: #1e293b;">我的爱车</h2>
            <button class="btn btn-primary" onclick="showAddCarModal()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer;">
                <i class="fas fa-plus"></i> 添加爱车
            </button>
        </div>
        <div id="carsList" style="display: grid; gap: 20px;">
            <div style="text-align: center; padding: 40px; color: #64748b;">
                <div class="spinner" style="display: inline-block; width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 15px;">加载中...</p>
            </div>
        </div>
    `;
    
    loadUserCars();
}

// 加载用户车辆
async function loadUserCars() {
    const carsList = document.getElementById('carsList');
    if (!carsList || !currentUser) return;
    
    try {
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
                        <span style="font-size: 1.2rem; font-weight: 600; color: #3b82f6;">${car.plate}</span>
                        <span style="color: #64748b;">${car.model}</span>
                    </div>
                    <div style="margin: 10px 0; color: #475569;">
                        ${car.brand ? `<div style="margin-bottom: 5px;"><i class="fas fa-tag" style="width: 20px; color: #64748b;"></i> 品牌: ${car.brand}</div>` : ''}
                        ${car.color ? `<div style="margin-bottom: 5px;"><i class="fas fa-palette" style="width: 20px; color: #64748b;"></i> 颜色: ${car.color}</div>` : ''}
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
