<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理员登录 - Epheia 的短链接</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        /* 登录页面特定样式 */
        .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
            position: relative;
        }
        
        .login-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            padding: 3rem;
            width: 100%;
            max-width: 400px;
            border: 1px solid rgba(221, 160, 221, 0.2);
            animation: slideUp 0.5s ease-out;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        
        .login-logo {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--theme-color);
            margin-bottom: 1rem;
            display: inline-block;
            animation: logoPulse 2s ease-in-out infinite;
        }
        
        @keyframes logoPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        .login-subtitle {
            color: var(--text-secondary);
            font-size: 16px;
        }
        
        .login-form {
            margin-bottom: 1.5rem;
        }
        
        .form-group-enhanced {
            margin-bottom: 1.5rem;
        }
        
        .form-label-enhanced {
            display: block;
            margin-bottom: 0.75rem;
            font-weight: 500;
            color: var(--text-primary);
            font-size: 14px;
        }
        
        .form-control-enhanced {
            width: 100%;
            padding: 14px 18px;
            font-size: 16px;
            border: 2px solid var(--border-color);
            border-radius: 12px;
            background-color: var(--surface-color);
            color: var(--text-primary);
            transition: all 0.3s ease;
            outline: none;
        }
        
        .form-control-enhanced:focus {
            border-color: var(--theme-color);
            box-shadow: 0 0 0 3px rgba(221, 160, 221, 0.1);
            transform: translateY(-1px);
        }
        
        .form-control-enhanced:hover {
            border-color: var(--theme-color-light);
        }
        
        .btn-login {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, var(--theme-color), var(--theme-color-dark));
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(221, 160, 221, 0.3);
        }
        
        .btn-login:active {
            transform: translateY(0);
        }
        
        .btn-login::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s;
        }
        
        .btn-login:hover::before {
            left: 100%;
        }
        
        .error-message {
            background-color: #FEE2E2;
            border: 1px solid #EF4444;
            color: #991B1B;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 14px;
            animation: shake 0.5s ease-in-out;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        .login-footer {
            text-align: center;
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border-color);
        }
        
        .back-link {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 14px;
            transition: color 0.3s ease;
        }
        
        .back-link:hover {
            color: var(--theme-color);
            text-decoration: none;
        }
        
        .security-icon {
            display: inline-block;
            margin-bottom: 1rem;
            font-size: 3rem;
            animation: securityPulse 3s ease-in-out infinite;
        }
        
        @keyframes securityPulse {
            0%, 100% { 
                transform: scale(1);
                opacity: 1;
            }
            50% { 
                transform: scale(1.1);
                opacity: 0.8;
            }
        }
        
        /* 背景装饰 */
        .bg-decoration {
            position: absolute;
            width: 200px;
            height: 200px;
            background: radial-gradient(circle, rgba(221, 160, 221, 0.1) 0%, transparent 70%);
            border-radius: 50%;
            animation: float 6s ease-in-out infinite;
        }
        
        .bg-decoration:nth-child(1) {
            top: 10%;
            left: 10%;
            animation-delay: 0s;
        }
        
        .bg-decoration:nth-child(2) {
            top: 60%;
            right: 10%;
            animation-delay: 2s;
        }
        
        .bg-decoration:nth-child(3) {
            bottom: 10%;
            left: 20%;
            animation-delay: 4s;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-20px) rotate(120deg); }
            66% { transform: translateY(10px) rotate(240deg); }
        }
        
        @media (max-width: 768px) {
            .login-card {
                margin: 1rem;
                padding: 2rem;
            }
            
            .login-logo {
                font-size: 2rem;
            }
            
            .bg-decoration {
                display: none;
            }
        }
        
        @media (max-width: 480px) {
            .login-card {
                margin: 0.5rem;
                padding: 1.5rem;
                border-radius: 16px;
            }
            
            .form-control-enhanced {
                padding: 12px 16px;
            }
            
            .btn-login {
                padding: 14px;
            }
        }
    </style>
</head>
<body data-theme="light">
    <div class="login-container">
        <!-- 背景装饰 -->
        <div class="bg-decoration"></div>
        <div class="bg-decoration"></div>
        <div class="bg-decoration"></div>
        
        <div class="login-card">
            <!-- 登录头部 -->
            <div class="login-header">
                <div class="security-icon">🔐</div>
                <div class="login-logo">管理员登录</div>
                <div class="login-subtitle">请输入管理员密码继续</div>
            </div>
            
            <!-- 错误消息 -->
                        
            <!-- 登录表单 -->
            <form method="POST" class="login-form" id="loginForm">
                <div class="form-group-enhanced">
                    <label for="password" class="form-label-enhanced">
                        管理员密码
                    </label>
                    <input type="password" 
                           id="password" 
                           name="password" 
                           class="form-control-enhanced" 
                           placeholder="请输入管理员密码..." 
                           required 
                           autofocus
                           autocomplete="current-password">
                </div>
                
                <button type="submit" class="btn-login" id="loginBtn">
                    <span id="btnText">登录管理后台</span>
                    <span id="btnLoading" style="display: none;">
                        <span class="loading"></span> 验证中...
                    </span>
                </button>
            </form>
            
            <!-- 登录底部 -->
            <div class="login-footer">
                <a href="index.php.html" class="back-link">
                    ← 返回首页
                </a>
            </div>
        </div>
    </div>
    
    <script>
        // 装饰性JavaScript - 不影响核心功能
        document.addEventListener('DOMContentLoaded', function() {
            const loginForm = document.getElementById('loginForm');
            const loginBtn = document.getElementById('loginBtn');
            const btnText = document.getElementById('btnText');
            const btnLoading = document.getElementById('btnLoading');
            const passwordInput = document.getElementById('password');
            
            // 表单提交动画
            loginForm.addEventListener('submit', function(e) {
                if (passwordInput.value.trim() === '') {
                    e.preventDefault();
                    passwordInput.focus();
                    return;
                }
                
                // 显示加载状态
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline-flex';
                loginBtn.disabled = true;
                
                // 3秒后恢复（防止长时间等待）
                setTimeout(function() {
                    btnText.style.display = 'inline';
                    btnLoading.style.display = 'none';
                    loginBtn.disabled = false;
                }, 3000);
            });
            
            // 密码框回车键支持
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    loginForm.dispatchEvent(new Event('submit'));
                }
            });
            
            // 密码强度指示器（装饰性）
            passwordInput.addEventListener('input', function() {
                const value = this.value;
                const strength = calculatePasswordStrength(value);
                updatePasswordIndicator(strength);
            });
            
            function calculatePasswordStrength(password) {
                let strength = 0;
                if (password.length >= 6) strength++;
                if (password.length >= 8) strength++;
                if (/[a-z]/.test(password)) strength++;
                if (/[A-Z]/.test(password)) strength++;
                if (/[0-9]/.test(password)) strength++;
                if (/[^A-Za-z0-9]/.test(password)) strength++;
                return strength;
            }
            
            function updatePasswordIndicator(strength) {
                // 这里可以添加密码强度指示器的视觉更新
                // 由于是装饰性功能，暂时不实现具体视觉效果
            }
            
            // 键盘快捷键
            document.addEventListener('keydown', function(e) {
                // Ctrl/Cmd + L 聚焦密码框
                if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                    e.preventDefault();
                    passwordInput.focus();
                }
                
                // ESC 清除密码框
                if (e.key === 'Escape') {
                    passwordInput.blur();
                    passwordInput.value = '';
                }
            });
            
            // 页面加载动画
            setTimeout(function() {
                document.body.style.opacity = '1';
            }, 100);
            
            // 鼠标移动视差效果
            document.addEventListener('mousemove', function(e) {
                const decorations = document.querySelectorAll('.bg-decoration');
                const x = e.clientX / window.innerWidth;
                const y = e.clientY / window.innerHeight;
                
                decorations.forEach((decoration, index) => {
                    const speed = (index + 1) * 0.5;
                    const xOffset = (x - 0.5) * speed;
                    const yOffset = (y - 0.5) * speed;
                    decoration.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
                });
            });
        });
    </script>
</body>
</html>