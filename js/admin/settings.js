// 系统设置功能

// 加载设置页面
function loadSettingsPage() {
    console.log('Loading settings page...');
    
    const container = document.getElementById('pageContent');
    if (!container) {
        console.error('Page content container not found');
        return;
    }
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-cog"></i> 系统设置</h3>
            </div>
            <div class="card-body">
                <div style="max-width: 500px; margin: 0 auto;">
                    <h4 style="margin-bottom: 20px; color: #1e293b;">修改管理员密码</h4>
                    
                    <div id="passwordError" class="alert alert-danger" style="display: none;"></div>
                    <div id="passwordSuccess" class="alert alert-success" style="display: none;"></div>
                    
                    <form id="changePasswordForm">
                        <div class="form-group">
                            <label>当前密码</label>
                            <input type="password" id="currentPassword" class="form-control" placeholder="请输入当前密码" required>
                        </div>
                        
                        <div class="form-group">
                            <label>新密码</label>
                            <input type="password" id="newPassword" class="form-control" placeholder="请输入新密码" required>
                            <small class="form-text text-muted">密码长度至少6位</small>
                        </div>
                        
                        <div class="form-group">
                            <label>确认新密码</label>
                            <input type="password" id="confirmPassword" class="form-control" placeholder="请再次输入新密码" required>
                        </div>
                        
                        <button type="submit" class="btn btn-primary" id="changePwdBtn">修改密码</button>
                    </form>
                    
                    <hr style="margin: 30px 0;">
                    
                    <h4 style="margin-bottom: 20px; color: #1e293b;">管理员注册密码</h4>
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i>
                        当前管理员注册密码: <strong>${window.ADMIN_REGISTER_PASSWORD || 'ADMIN2024'}</strong>
                    </div>
                    <p class="text-muted">
                        要修改管理员注册密码，需要直接修改 <code>js/firebase-config.js</code> 文件中的 
                        <code>ADMIN_REGISTER_PASSWORD</code> 变量
                    </p>
                </div>
            </div>
        </div>
    `;

    // 绑定修改密码表单提交
    const form = document.getElementById('changePasswordForm');
    if (form) {
        form.addEventListener('submit', handlePasswordChange);
    }
}

// 处理密码修改
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // 验证
    if (newPassword.length < 6) {
        showPasswordError('新密码长度至少6位');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showPasswordError('两次输入的新密码不一致');
        return;
    }
    
    const btn = document.getElementById('changePwdBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> 修改中...';
    btn.disabled = true;
    
    try {
        const user = auth.currentUser;
        
        if (!user) {
            throw new Error('用户未登录');
        }
        
        // 重新认证用户
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            currentPassword
        );
        
        await user.reauthenticateWithCredential(credential);
        
        // 修改密码
        await user.updatePassword(newPassword);
        
        // 显示成功消息
        showPasswordSuccess('密码修改成功！');
        
        // 清空表单
        document.getElementById('changePasswordForm').reset();
        
    } catch (error) {
        console.error('修改密码失败:', error);
        
        let errorMessage = '修改密码失败';
        switch(error.code) {
            case 'auth/wrong-password':
                errorMessage = '当前密码错误';
                break;
            case 'auth/weak-password':
                errorMessage = '新密码强度太弱';
                break;
            default:
                errorMessage = error.message;
        }
        
        showPasswordError(errorMessage);
        
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 显示密码错误
function showPasswordError(message) {
    const errorDiv = document.getElementById('passwordError');
    if (errorDiv) {
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorDiv.style.display = 'flex';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert('错误: ' + message);
    }
}

// 显示密码成功
function showPasswordSuccess(message) {
    const successDiv = document.getElementById('passwordSuccess');
    if (successDiv) {
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        successDiv.style.display = 'flex';
        
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    } else {
        alert('成功: ' + message);
    }
}

// 导出到全局
window.loadSettingsPage = loadSettingsPage;
window.handlePasswordChange = handlePasswordChange;

console.log('Settings.js loaded');
