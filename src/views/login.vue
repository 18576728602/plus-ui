<template>
  <div class="login">
    <div class="login-shell">
      <!-- 左侧品牌区 -->
      <section class="login-brand">
        <div class="brand-head">
          <div class="brand-logo">
            <span class="brand-badge">
              <svg-icon icon-class="logo" />
            </span>
            <div class="brand-tt">
              <strong>{{ title }}</strong>
              <em>COMPREHENSIVE BUDGET</em>
            </div>
          </div>
        </div>

        <div class="brand-mid">
          <h1 class="brand-title">{{ title }}</h1>
          <p class="brand-desc">
            统一管控预算编制、执行、调整与合并全流程，让每一笔预算有据可查、清晰可见。
          </p>
          <div class="brand-highlights">
            <span v-for="item in highlights" :key="item" class="highlight-chip">{{ item }}</span>
          </div>
        </div>

        <div class="brand-foot">Copyright © 全面预算管理系统 · 所有单位 All Rights Reserved.</div>
      </section>

      <!-- 右侧表单区 -->
      <el-form ref="loginRef" :model="loginForm" :rules="loginRules" class="login-form">
        <div class="title-box">
          <h3 class="title">登录</h3>
          <p class="subtitle">请输入用户名和密码登录系统</p>
        </div>

        <el-form-item v-if="tenantEnabled && showTenantSelect" prop="tenantId">
          <el-select
            v-model="loginForm.tenantId"
            filterable
            :placeholder="proxy.$t('login.selectPlaceholder')"
            style="width: 100%"
          >
            <el-option v-for="item in tenantList" :key="item.tenantId" :label="item.companyName" :value="item.tenantId"></el-option>
            <template #prefix><svg-icon icon-class="company" class="el-input__icon input-icon" /></template>
          </el-select>
        </el-form-item>

        <el-form-item prop="username">
          <el-input v-model="loginForm.username" type="text" size="large" auto-complete="off" :placeholder="proxy.$t('login.username')">
            <template #prefix><svg-icon icon-class="user" class="el-input__icon input-icon" /></template>
          </el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            size="large"
            auto-complete="off"
            :placeholder="proxy.$t('login.password')"
            @keyup.enter="handleLogin"
          >
            <template #prefix><svg-icon icon-class="password" class="el-input__icon input-icon" /></template>
          </el-input>
        </el-form-item>

        <el-form-item v-if="captchaEnabled" prop="code" class="captcha-row">
          <el-input v-model="loginForm.code" size="large" auto-complete="off" :placeholder="proxy.$t('login.code')" @keyup.enter="handleLogin">
            <template #prefix><svg-icon icon-class="validCode" class="el-input__icon input-icon" /></template>
          </el-input>
          <div class="login-code">
            <img :src="codeUrl" class="login-code-img" alt="验证码" title="看不清？点击换一张" @click="getCode" />
          </div>
          <div class="login-code-tip">看不清？点击图片换一张</div>
        </el-form-item>

        <div class="form-meta">
          <el-checkbox v-model="loginForm.rememberMe">{{ proxy.$t('login.rememberPassword') }}</el-checkbox>
          <router-link v-if="register" class="link-type" :to="'/register'">
            {{ proxy.$t('login.switchRegisterPage') }}
          </router-link>
        </div>

        <el-form-item class="submit-row">
          <el-button :loading="loading" size="large" type="primary" class="submit-button" @click.prevent="handleLogin">
            <span v-if="!loading">{{ proxy.$t('login.login') }}</span>
            <span v-else>{{ proxy.$t('login.logging') }}</span>
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!--  底部  -->
    <div class="el-login-footer">
      <span>Copyright © 2018-{{ currentYear }} 全面预算管理系统 All Rights Reserved.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCodeImg, getTenantList } from '@/api/login';
import { authRouterUrl } from '@/api/system/social/auth';
import { useUserStore } from '@/store/modules/user';
import { LoginData, TenantVO } from '@/api/types';
import { to } from 'await-to-js';
import { HttpStatus } from '@/enums/RespEnum';
import { useI18n } from 'vue-i18n';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const title = import.meta.env.VITE_APP_TITLE;
const currentYear = new Date().getFullYear();
const highlights = ['预算编制', '预算执行', '预算调整', '合并报表'];
const userStore = useUserStore();
const router = useRouter();
const { t } = useI18n();

const loginForm = ref<LoginData>({
  tenantId: '000000',
  username: 'admin',
  password: 'admin123',
  rememberMe: false,
  code: '',
  uuid: ''
} as LoginData);

const loginRules: ElFormRules = {
  tenantId: [{ required: true, trigger: 'blur', message: t('login.rule.tenantId.required') }],
  username: [{ required: true, trigger: 'blur', message: t('login.rule.username.required') }],
  password: [{ required: true, trigger: 'blur', message: t('login.rule.password.required') }],
  code: [{ required: true, trigger: 'change', message: t('login.rule.code.required') }]
};

const codeUrl = ref('');
const loading = ref(false);
// 验证码开关
const captchaEnabled = ref(true);
// 租户开关
const tenantEnabled = ref(true);
// 单位下拉开关：先隐藏，领导需要时改为 true 即可显示
const showTenantSelect = ref(false);

// 注册开关
const register = ref(false);
const redirect = ref('/');
const loginRef = ref<ElFormInstance>();
// 租户列表
const tenantList = ref<TenantVO[]>([]);

watch(
  () => router.currentRoute.value,
  (newRoute: any) => {
    redirect.value = newRoute.query && newRoute.query.redirect && decodeURIComponent(newRoute.query.redirect);
  },
  { immediate: true }
);

const handleLogin = () => {
  loginRef.value?.validate(async (valid: boolean, fields: any) => {
    if (valid) {
      loading.value = true;
      // 勾选了需要记住密码设置在 localStorage 中设置记住用户名和密码
      if (loginForm.value.rememberMe) {
        localStorage.setItem('tenantId', String(loginForm.value.tenantId));
        localStorage.setItem('username', String(loginForm.value.username));
        localStorage.setItem('password', String(loginForm.value.password));
        localStorage.setItem('rememberMe', String(loginForm.value.rememberMe));
      } else {
        // 否则移除
        localStorage.removeItem('tenantId');
        localStorage.removeItem('username');
        localStorage.removeItem('password');
        localStorage.removeItem('rememberMe');
      }
      // 调用action的登录方法
      const [err] = await to(userStore.login(loginForm.value));
      if (!err) {
        const redirectUrl = redirect.value || '/';
        await router.push(redirectUrl);
        loading.value = false;
      } else {
        loading.value = false;
        // 重新获取验证码
        if (captchaEnabled.value) {
          await getCode();
        }
      }
    } else {
      console.log('error submit!', fields);
    }
  });
};

/**
 * 获取验证码
 */
const getCode = async () => {
  const res = await getCodeImg();
  const { data } = res;
  captchaEnabled.value = data.captchaEnabled === undefined ? true : data.captchaEnabled;
  if (captchaEnabled.value) {
    // 刷新验证码时清空输入框
    loginForm.value.code = '';
    codeUrl.value = 'data:image/gif;base64,' + data.img;
    loginForm.value.uuid = data.uuid;
  }
};

const getLoginData = () => {
  const tenantId = localStorage.getItem('tenantId');
  const username = localStorage.getItem('username');
  const password = localStorage.getItem('password');
  const rememberMe = localStorage.getItem('rememberMe');
  loginForm.value = {
    tenantId: tenantId === null ? String(loginForm.value.tenantId) : tenantId,
    username: username === null ? String(loginForm.value.username) : username,
    password: password === null ? String(loginForm.value.password) : String(password),
    rememberMe: rememberMe === null ? false : Boolean(rememberMe)
  } as LoginData;
};

/**
 * 获取租户列表
 */
const initTenantList = async () => {
  const { data } = await getTenantList(false);
  tenantEnabled.value = data.tenantEnabled === undefined ? true : data.tenantEnabled;
  if (tenantEnabled.value) {
    tenantList.value = data.voList;
    if (tenantList.value != null && tenantList.value.length !== 0) {
      loginForm.value.tenantId = tenantList.value[0].tenantId;
    }
  }
};

/**
 * 第三方登录
 * @param type
 */
const doSocialLogin = (type: string) => {
  authRouterUrl(type, loginForm.value.tenantId).then((res: any) => {
    if (res.code === HttpStatus.SUCCESS) {
      // 获取授权地址跳转
      window.location.href = res.data;
    } else {
      ElMessage.error(res.msg);
    }
  });
};

onMounted(() => {
  getCode();
  initTenantList();
  getLoginData();
});
</script>

<style lang="scss" scoped>
/* ===== 清爽：浅色背景 + 白卡片，左右分栏 ===== */
.login {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px 88px;
  background:
    radial-gradient(circle at 8% 10%, rgba(37, 99, 235, 0.08), transparent 30%),
    radial-gradient(circle at 92% 88%, rgba(37, 99, 235, 0.08), transparent 30%),
    linear-gradient(160deg, #f5f8ff 0%, #eef4ff 55%, #f8fbff 100%);
}

.login-shell {
  width: min(980px, 100%);
  display: flex;
  background: #fff;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid #e6edf9;
  box-shadow: 0 24px 60px -26px rgba(30, 58, 138, 0.3);
}

/* ---------- 左侧品牌区 ---------- */
.login-brand {
  width: 46%;
  padding: 44px 38px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
  background: linear-gradient(150deg, #2563eb 0%, #1d4ed8 55%, #1e40af 100%);
}
.login-brand::before {
  content: '';
  position: absolute;
  top: -90px;
  right: -90px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
}
.login-brand::after {
  content: '';
  position: absolute;
  bottom: -130px;
  left: -70px;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
}
.brand-head,
.brand-mid,
.brand-foot {
  position: relative;
  z-index: 1;
}
.brand-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  :deep(svg) {
    width: 24px;
    height: 24px;
    color: #fff;
  }
}
.brand-tt {
  display: flex;
  flex-direction: column;

  strong {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  em {
    font-size: 10px;
    font-style: normal;
    letter-spacing: 0.16em;
    opacity: 0.72;
    margin-top: 3px;
    text-transform: uppercase;
  }
}
.brand-mid {
  margin-top: 26px;
}
.brand-title {
  margin: 0;
  font-size: 36px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
}
.brand-desc {
  margin: 16px 0 0;
  max-width: 320px;
  font-size: 14px;
  line-height: 1.9;
  opacity: 0.9;
}
.brand-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 26px;
}
.highlight-chip {
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.24);
}
.brand-foot {
  margin-top: 30px;
  font-size: 12px;
  opacity: 0.6;
}

/* ---------- 右侧表单区 ---------- */
.login-form {
  flex: 1;
  min-width: 0;
  padding: 42px 42px 30px;
  background: #fff;

  .el-input {
    height: 48px;

    input {
      height: 48px;
    }
  }

  .input-icon {
    height: 47px;
    width: 14px;
    margin-left: 0;
  }
}
.title-box {
  margin-bottom: 26px;

  .title {
    margin: 0;
    color: #0f172a;
    font-weight: 750;
    font-size: 28px;
    letter-spacing: -0.02em;
  }
  .subtitle {
    margin: 8px 0 0;
    color: #6b7280;
    font-size: 13px;
    line-height: 1.7;
  }
}

.captcha-row {
  :deep(.el-form-item__content) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 165px;
    gap: 12px;
  }
}

.form-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: -2px 0 18px;
}

.submit-row {
  margin-bottom: 0;
}
.submit-button {
  width: 100%;
  height: 50px;
  border-radius: 12px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
  box-shadow: 0 16px 30px -12px rgba(37, 99, 235, 0.55);
}
.login-form :deep(.el-input__wrapper) {
  min-height: 48px;
  background-color: #f9fbff;
  border-radius: 12px;
  box-shadow: 0 0 0 1px #dfe6f3 inset;
}
.login-form :deep(.el-input__wrapper.is-focus) {
  background-color: #fff;
  box-shadow:
    0 0 0 1px #2563eb inset,
    0 0 0 4px rgba(37, 99, 235, 0.12);
}
.login-form :deep(.el-select__wrapper) {
  min-height: 48px;
  background-color: #f9fbff;
  border-radius: 12px;
  box-shadow: 0 0 0 1px #dfe6f3 inset;
}
.login-form :deep(.el-select__wrapper.is-focused) {
  box-shadow:
    0 0 0 1px #2563eb inset,
    0 0 0 4px rgba(37, 99, 235, 0.12);
}
.login-form :deep(.el-checkbox__label) {
  color: #6b7280;
}
.login-form :deep(.el-button.is-circle) {
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #64748b;
}
.login-form :deep(.el-button.is-circle:hover) {
  background: rgba(37, 99, 235, 0.06);
  border-color: rgba(37, 99, 235, 0.25);
  color: #2563eb;
}

.login-code {
  height: 60px;
  box-sizing: border-box;
  border-radius: 12px;
  overflow: hidden;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;

  img {
    display: block;
    width: 100%;
    height: 60px;
    object-fit: fill;
    cursor: pointer;
  }
}

.captcha-row :deep(.login-code-tip) {
  grid-column: 2;
  grid-row: 2;
  margin-top: 2px;
  line-height: 14px;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}

.el-login-footer {
  height: 40px;
  line-height: 40px;
  position: fixed;
  bottom: 0;
  width: 100%;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.login-code-img {
  height: 48px;
  padding-left: 0;
}

/* ---------- 响应式 ---------- */
@media (max-width: 960px) {
  .login {
    padding: 24px 14px 80px;
  }
  .login-shell {
    flex-direction: column;
  }
  .login-brand {
    width: 100%;
    padding: 28px 26px;
  }
}
@media (max-width: 640px) {
  .login-brand {
    display: none;
  }
  .login-form {
    padding: 28px 20px 22px;
  }
  .title-box {
    flex-direction: column;
  }
  .social-panel {
    flex-direction: column;
    align-items: flex-start;
  }
  .social-actions {
    justify-content: flex-start;
  }
  .captcha-row :deep(.el-form-item__content) {
    grid-template-columns: 1fr;
  }
}
</style>