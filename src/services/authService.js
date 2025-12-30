const API_BASE_URL = "https://laysapi-uyjc.onrender.com/api/v1/default";

/**
 * Logs in a user.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} The user object and token.
 */
export async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/user/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Login failed");
    }

    const data = await response.json();

    // Assuming the API returns token and user info structure like:
    // { token: "...", user: { ... } } or similar.
    // Adjust based on actual API response if needed.

    if (data.token) {
        localStorage.setItem('auth_token', data.token);
    }
    if (data.user) {
        localStorage.setItem('user_info', JSON.stringify(data.user));
    }

    return data;
  } catch (error) {
    console.error("Login Error:", error);
    throw error;
  }
}

/**
 * Registers a new user.
 * @param {Object} userData - { firstName, lastName, email, password }
 * @returns {Promise<Object>} The created user object/confirmation.
 */
export async function register(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Registration Error:", error);
    throw error;
  }
}

/**
 * Logs out the user by removing tokens from storage.
 */
export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
}
