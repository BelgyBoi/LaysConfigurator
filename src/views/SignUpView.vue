<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { register } from '../services/authService';

const firstName = ref('');
const lastName = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const error = ref('');
const validationErrors = ref({});
const isLoading = ref(false);
const router = useRouter();

const validateForm = () => {
  const errors = {};
  let isValid = true;

  if (!firstName.value) {
    errors.firstName = 'First Name is required';
    isValid = false;
  }

  if (!lastName.value) {
    errors.lastName = 'Last Name is required';
    isValid = false;
  }

  if (!email.value) {
    errors.email = 'Email is required';
    isValid = false;
  } else if (!/^\S+@\S+\.\S+$/.test(email.value)) {
    errors.email = 'Please enter a valid email';
    isValid = false;
  }

  if (!password.value) {
    errors.password = 'Password is required';
    isValid = false;
  } else if (password.value.length < 6) {
    errors.password = 'Password must be at least 6 characters';
    isValid = false;
  }

  if (password.value !== confirmPassword.value) {
    errors.confirmPassword = "Passwords do not match";
    isValid = false;
  }

  validationErrors.value = errors;
  return isValid;
};

const clearError = (field) => {
  if (validationErrors.value[field]) {
    delete validationErrors.value[field];
  }
};

const handleRegister = async () => {
  error.value = '';

  if (!validateForm()) return;

  isLoading.value = true;

  try {
    await register({
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value,
      password: password.value
    });
    // On success, redirect to login (or home with auto-login)
    router.push({ name: 'configurator' });
  } catch (err) {
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="auth-container">
    <div class="light-effect"></div>

    <div class="auth-card">
      <div class="logo-wrapper">
        <img src="/assets/logo-lays.png" alt="Lays Logo" class="auth-logo" />
      </div>

      <h1>Sign Up</h1>
      <p class="subtitle">Join the freshness!</p>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="name-row">
          <div class="form-group">
            <span v-if="validationErrors.firstName" class="input-error-msg">
              {{ validationErrors.firstName }}
            </span>
            <div class="floating-label-group">
              <input
                type="text"
                id="firstName"
                v-model="firstName"
                placeholder=" "
                @input="clearError('firstName')"
                :class="{ 'is-invalid': validationErrors.firstName }"
              />
              <label for="firstName">First Name</label>
            </div>
          </div>
          <div class="form-group">
            <span v-if="validationErrors.lastName" class="input-error-msg">
              {{ validationErrors.lastName }}
            </span>
            <div class="floating-label-group">
              <input
                type="text"
                id="lastName"
                v-model="lastName"
                placeholder=" "
                @input="clearError('lastName')"
                :class="{ 'is-invalid': validationErrors.lastName }"
              />
              <label for="lastName">Last Name</label>
            </div>
          </div>
        </div>

        <div class="form-group">
          <span v-if="validationErrors.email" class="input-error-msg">
            {{ validationErrors.email }}
          </span>
          <div class="floating-label-group">
            <input
              type="email"
              id="email"
              v-model="email"
              placeholder=" "
              @input="clearError('email')"
              :class="{ 'is-invalid': validationErrors.email }"
            />
            <label for="email">Email</label>
          </div>
        </div>

        <div class="form-group">
          <span v-if="validationErrors.password" class="input-error-msg">
            {{ validationErrors.password }}
          </span>
          <div class="floating-label-group">
            <input
              :type="showPassword ? 'text' : 'password'"
              id="password"
              v-model="password"
              placeholder=" "
              @input="clearError('password')"
              :class="{ 'is-invalid': validationErrors.password }"
            />
            <label for="password">Password</label>
            <button
              type="button"
              class="eye-btn"
              @click="showPassword = !showPassword"
              tabindex="-1"
            >
              <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" class="eye-icon">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" class="eye-icon">
                <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="form-group">
          <span v-if="validationErrors.confirmPassword" class="input-error-msg">
            {{ validationErrors.confirmPassword }}
          </span>
          <div class="floating-label-group">
            <input
              :type="showConfirmPassword ? 'text' : 'password'"
              id="confirmPassword"
              v-model="confirmPassword"
              placeholder=" "
              @input="clearError('confirmPassword')"
              :class="{ 'is-invalid': validationErrors.confirmPassword }"
            />
            <label for="confirmPassword">Confirm Password</label>
            <button
              type="button"
              class="eye-btn"
              @click="showConfirmPassword = !showConfirmPassword"
              tabindex="-1"
            >
              <svg v-if="!showConfirmPassword" viewBox="0 0 24 24" fill="none" class="eye-icon">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" class="eye-icon">
                <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button
          type="submit"
          class="submit-btn"
          :disabled="isLoading"
        >
          {{ isLoading ? 'Creating...' : 'Sign Me Up!' }}
        </button>
      </form>

      <div class="auth-footer">
        <p>Already have an account? <router-link to="/signin">Sign In</router-link></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Keyframes */
@keyframes popIn {
  0% { transform: scale(0.8) translateY(20px); opacity: 0; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh; /* Use min-height: 100vh instead of height: 100% for proper scrolling */
  width: 100%;
  /* Lays Brand Yellow Base */
  background-color: #f8e503;
  /* Sunburst Pattern */
  background-image: repeating-conic-gradient(
    from 0deg,
    #f8e503 0deg 15deg,
    #ffd400 15deg 30deg
  );
  position: relative;
  overflow: hidden;
  padding: 2rem 0;
}

/* Background Decorations - Real Chips Vibe */
.circles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.circle {
  position: absolute;
  /* Golden Chip Color */
  background: #ffcc00;
  box-shadow: inset -10px -10px 20px rgba(214, 137, 16, 0.3),
              5px 5px 15px rgba(0,0,0,0.1);
}

/* Chip 1 - Big Chip */
.c1 {
  width: 320px;
  height: 280px;
  border-radius: 50% 50% 45% 45%;
  top: -80px;
  right: -80px;
  animation: float 8s ease-in-out infinite;
  transform: rotate(25deg);
}

/* Chip 2 - Folding Chip */
.c2 {
  width: 240px;
  height: 200px;
  border-radius: 60% 40% 40% 60% / 50% 30% 70% 50%;
  bottom: -40px;
  left: -40px;
  animation: float 10s ease-in-out infinite reverse;
  transform: rotate(-15deg);
}

/* Chip 3 - Small Crisp */
.c3 {
  width: 100px;
  height: 100px;
  /* Blue Spice Flake */
  background: var(--blue);
  border-radius: 40% 60% 70% 30% / 40% 50% 50% 60%;
  top: 40%;
  right: 15%;
  border: none;
  box-shadow: none;
  animation: float 6s ease-in-out infinite;
  opacity: 0.8;
}

.auth-card {
  background: white;
  padding: 3rem 2.5rem;
  border-radius: 30px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.15);
  text-align: center;
  position: relative;
  z-index: 1;
  animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  border: 4px solid white;
  margin: auto;
}

.logo-wrapper {
  margin-top: -80px;
  margin-bottom: 1rem;
}

.auth-logo {
  width: 120px;
  height: auto;
  filter: drop-shadow(0 5px 10px rgba(0,0,0,0.1));
  animation: float 4s ease-in-out infinite;
}

h1 {
  margin: 0;
  color: var(--text-color);
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -1px;
}

.subtitle {
  color: #888;
  margin-bottom: 1.5rem;
  font-weight: 500;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.name-row {
  display: flex;
  gap: 1rem;
}

.name-row .form-group {
  flex: 1;
}

.form-group {
  text-align: left;
  display: flex;
  flex-direction: column;
}

.floating-label-group {
  position: relative;
}

/* Label styling */
label {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  background-color: white;
  padding: 0 5px;
  color: #888;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s ease;
  pointer-events: none;
  border-radius: 4px;
}

/* Input styling */
input {
  width: 100%;
  padding: 15px;
  border-radius: 12px;
  border: 2px solid #ccc;
  background: white;
  transition: all 0.2s ease;
  box-sizing: border-box;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
}

input:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 4px rgba(5, 168, 223, 0.1);
}

/* Floating Label Logic */
input:focus + label,
input:not(:placeholder-shown) + label {
  top: 0;
  font-size: 0.8rem;
  color: var(--blue);
  font-weight: 700;
}

/* Error State */
input.is-invalid {
  border-color: var(--red);
  background-color: #fff0f0;
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}

input.is-invalid:focus {
  border-color: var(--red);
  box-shadow: 0 0 0 4px rgba(236, 46, 46, 0.1);
}

input.is-invalid + label {
  color: var(--red);
}

.input-error-msg {
  color: var(--red);
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 6px;
  display: block;
  text-align: left;
  animation: slideDown 0.3s ease-out forwards;
}

input:focus {
  outline: none;
  border-color: var(--blue);
  background: white;
  transform: scale(1.02);
  box-shadow: 0 5px 15px rgba(5, 168, 223, 0.15);
}

.submit-btn {
  background: var(--red);
  color: white;
  border: none;
  font-weight: 800;
  font-size: 1.1rem;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  margin-top: 1rem;
  border-radius: 15px;
  box-shadow: 0 10px 20px rgba(236, 46, 46, 0.2);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-4px) scale(1.02);
  background: var(--red);
  box-shadow: 0 15px 30px rgba(236, 46, 46, 0.3);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.error-message {
  color: var(--red);
  background: #fff0f0;
  padding: 12px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  border: 2px solid rgba(236, 46, 46, 0.1);
}

.auth-footer {
  margin-top: 2rem;
  font-size: 0.95rem;
  font-weight: 500;
}

.auth-footer a {
  color: var(--blue);
  font-weight: 800;
  position: relative;
}

.auth-footer a::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 3px;
  bottom: -2px;
  left: 0;
  background-color: var(--accent-color);
  transform: scaleX(0);
  transition: transform 0.3s ease;
  transform-origin: right;
}

.auth-footer a:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}

.eye-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #888;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
  z-index: 2;
}

.eye-btn:hover {
  color: var(--blue);
}

.eye-icon {
  width: 20px;
  height: 20px;
}
</style>
