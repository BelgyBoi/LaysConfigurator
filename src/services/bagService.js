const API_BASE_URL = "/api/v1/default";

/**
 * Gets the auth headers with token.
 */
function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
}

/**
 * Fetches all created bags.
 * @returns {Promise<Array>} List of bags.
 */
export async function getAllBags() {
  try {
    const response = await fetch(`${API_BASE_URL}/bag`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bags: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data || json;
  } catch (error) {
    console.error("Get Bags Error:", error);
    throw error;
  }
}

/**
 * Creates a new bag.
 * @param {Object} bagData
 * @returns {Promise<Object>} Created bag.
 */
export async function createBag(bagData) {
  try {
    const response = await fetch(`${API_BASE_URL}/bag`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(bagData)
    });

    if (!response.ok) {
      // Try to get validation error details
      const errorBody = await response.json().catch(() => ({}));
      const message = errorBody.message || response.statusText;
      throw new Error(`Failed to create bag: ${message}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Create Bag Error:", error);
    throw error;
  }
}

/**
 * Votes for a specific bag.
 * @param {string} bagId
 * @returns {Promise<Object>} Updated bag/result.
 */
export async function voteForBag(bagId) {
  try {
    const response = await fetch(`${API_BASE_URL}/bag/${bagId}/vote`, {
      method: "POST",
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to vote: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Vote Error:", error);
    throw error;
  }
}
