// 当前选中的角色
let currentLoginRole = 'customer';
let currentRegisterRole = 'customer';

// 页面切换函数
window.showLogin = function() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'none';
    clearErrors();
};

window.showRegister = function() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('forgotPasswordForm').style.display = 'none';
    clearErrors();
};

window.showForgotPassword = function() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'block';
    clearErrors();
};

// 选择角色
window.selectRole = function(role) {
    currentLoginRole = role;
    document.getElementById('customerRole').classList.toggle('active', role === 'customer');
    document.getElementById('adminRole').classList.toggle('active', role === 'admin');
};

window.selectRegisterRole = function(role) {
    currentRegisterRole = role;
    document.getElementById('registerCustomerRole').classList.toggle('active', role === 'customer');
    document.getElementById('registerAdminRole').classList.toggle('active', role === 'admin');
    document.getElementById('adminInviteField').style.display = role === 'admin' ? 'block' : 'none';
};

// 密码显示切换
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
};

// 清除错误
function clearErrors() {
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('registerError').style.display = 'none';
    document.getElementById('resetError').style.display = 'none';
    document.getElementById('resetSuccess').style.display = 'none';
}

// 显示错误
function showError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// 显示成功
function showSuccess(elementId, message) {
    const successDiv = document.getElementById(elementId);
    successDiv.textContent = message;
    successDiv.style.display = 'block';
}

// 登录处理
window.handleLogin = async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const loginBtn = document.getElementById('loginBtn');

    loginBtn.innerHTML = '<span class="loading-spinner"></span> 登录中...';
    loginBtn.disabled = true;

    try {
        // 设置持久化
        if (rememberMe) {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } else {
            await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        }

        // 登录
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 获取用户角色
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            throw new Error('用户数据不存在');
        }

        const userData = userDoc.data();
        
        // 验证角色
        if (userData.role !== currentLoginRole) {
            await auth.signOut();
            throw new Error(`此账号不是${currentLoginRole === 'admin' ? '管理员' : '车主'}账号`);
        }

        // 更新最后登录时间
        await db.collection('users').doc(user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 跳转
        if (userData.role === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'customer-dashboard.html';
        }

    } catch (error) {
        console.error('登录失败:', error);
        
        let errorMessage = '登录失败，请重试';
        switch(error.code) {
            case 'auth/user-not-found':
                errorMessage = '用户不存在';
                break;
            case 'auth/wrong-password':
                errorMessage = '密码错误';
                break;
            case 'auth/invalid-email':
                errorMessage = '邮箱格式不正确';
                break;
            default:
                errorMessage = error.message;
        }
        
        showError('loginError', errorMessage);
        
        loginBtn.innerHTML = '登录';
        loginBtn.disabled = false;
    }
};

// 注册处理
window.handleRegister = async function(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const inviteCode = document.getElementById('inviteCode')?.value;
    
    const registerBtn = document.getElementById('registerBtn');

    // 验证
    if (password !== confirmPassword) {
        showError('registerError', '两次输入的密码不一致');
        return;
    }

    if (password.length < 6) {
        showError('registerError', '密码长度至少6位');
        return;
    }

    // 管理员验证
    if (currentRegisterRole === 'admin' && inviteCode !== 'ADMIN2024') {
        showError('registerError', '管理员邀请码错误');
        return;
    }

    registerBtn.innerHTML = '<span class="loading-spinner"></span> 注册中...';
    registerBtn.disabled = true;

    try {
        // 创建用户
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 更新资料
        await user.updateProfile({
            displayName: name
        });

        // 保存用户信息
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            name: name,
            email: email,
            role: currentRegisterRole,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        });

        // 跳转
        if (currentRegisterRole === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'customer-dashboard.html';
        }

    } catch (error) {
        console.error('注册失败:', error);
        
        let errorMessage = '注册失败，请重试';
        switch(error.code) {
            case 'auth/email-already-in-use':
                errorMessage = '邮箱已被注册';
                break;
            case 'auth/invalid-email':
                errorMessage = '邮箱格式不正确';
                break;
            default:
                errorMessage = error.message;
        }
        
        showError('registerError', errorMessage);
        
        registerBtn.innerHTML = '注册';
        registerBtn.disabled = false;
    }
};

// 重置密码
window.handleResetPassword = async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('resetEmail').value;

    try {
        await auth.sendPasswordResetEmail(email);
        showSuccess('resetSuccess', '密码重置邮件已发送，请检查您的邮箱');
        
        setTimeout(() => {
            showLogin();
        }, 3000);

    } catch (error) {
        console.error('重置失败:', error);
        
        let errorMessage = '重置失败，请重试';
        if (error.code === 'auth/user-not-found') {
            errorMessage = '用户不存在';
        }
        
        showError('resetError', errorMessage);
    }
};

// 登出
window.logout = async function() {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('登出失败:', error);
    }
};

// 检查登录状态
auth.onAuthStateChanged((user) => {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (user) {
        // 如果在登录页且已登录，跳转到对应页面
        if (currentPage === 'index.html') {
            db.collection('users').doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    const role = doc.data().role;
                    window.location.href = role === 'admin' ? 'admin-dashboard.html' : 'customer-dashboard.html';
                }
            });
        }
    } else {
        // 如果在后台页面且未登录，跳转到登录页
        if (currentPage !== 'index.html' && currentPage !== '') {
            window.location.href = 'index.html';
        }
    }
});