// 认证辅助函数

// 显示错误消息
function showError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) {
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorDiv.style.display = 'flex';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

// 显示成功消息
function showSuccess(elementId, message) {
    const successDiv = document.getElementById(elementId);
    if (successDiv) {
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        successDiv.style.display = 'flex';
        
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    }
}

// 切换密码显示
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// 验证邮箱
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// 验证密码强度
function validatePassword(password) {
    return password.length >= 6;
}

// 登出
async function logout() {
    try {
        await auth.signOut();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('登出失败: ' + error.message);
    }
}

// 检查认证状态
auth.onAuthStateChanged((user) => {
    const currentPath = window.location.pathname;
    
    // 如果在登录/注册页且已登录，跳转到对应仪表板
    if (user && (currentPath.includes('login.html') || currentPath.includes('register.html'))) {
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                const role = doc.data().role;
                if (role === 'admin') {
                    window.location.href = '../admin/dashboard.html';
                } else {
                    window.location.href = '../customer/dashboard.html';
                }
            }
        });
    }
    
    // 如果在仪表板且未登录，跳转到首页
    if (!user && currentPath.includes('dashboard.html')) {
        window.location.href = '../index.html';
    }
});

// 导出函数到全局
window.showError = showError;
window.showSuccess = showSuccess;
window.togglePassword = togglePassword;
window.validateEmail = validateEmail;
window.validatePassword = validatePassword;
window.logout = logout;
