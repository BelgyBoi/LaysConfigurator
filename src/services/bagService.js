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
 * Gets bags for the current user.
 * Performs client-side filtering as API returns all bags.
 * @returns {Promise<Array>} List of user's bags.
 */
export async function getMyBags() {
    try {
        const allBags = await getAllBags();
        const bagsList = Array.isArray(allBags) ? allBags : (allBags.lays || []);

        const userInfoStr = localStorage.getItem('user_info');
        if (!userInfoStr) return [];

        const user = JSON.parse(userInfoStr);
        const userId = user.id || user._id; // Handle both id formats if unsure
        const userName = user.firstName ? `${user.firstName} ${user.lastName}` : null;

        if (!userId) return [];

        return bagsList.filter(bag => {
            // Check by creator ID if available (ideal)
            if (bag.creatorId && bag.creatorId === userId) return true;
            // Fallback: Check by creator Name (less reliable but might be what we have)
            // Note: API might not return creatorId on the bag object, check FeedView usage.
            // FeedView uses: bag.creator (name string)
            // We should check if we can match by name if ID isn't there.
            if (userName && bag.creator === userName) return true;

             // If the API returns a 'user' field with _id
            if (bag.user && (bag.user === userId || bag.user._id === userId)) return true;

            return false;
        });
    } catch (error) {
        console.error("Get My Bags Error:", error);
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
 * Updates an existing bag.
 * @param {string} id
 * @param {Object} bagData
 * @returns {Promise<Object>} Updated bag.
 */
export async function updateBag(id, bagData) {
  try {
    const response = await fetch(`${API_BASE_URL}/bag/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(bagData)
    });

    if (!response.ok) {
       const errorBody = await response.json().catch(() => ({}));
       const message = errorBody.message || response.statusText;
       throw new Error(`Failed to update bag: ${message}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Update Bag Error:", error);
    throw error;
  }
}

/**
 * Gets a specific bag by ID.
 * @param {string} id
 * @returns {Promise<Object>} Bag details.
 */
export async function getBagById(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/bag/${id}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch bag: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data || json;
  } catch (error) {
    console.error("Get Bag Error:", error);
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
    const response = await fetch(`${API_BASE_URL}/vote/${bagId}`, {
      method: "POST",
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to vote: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Vote Error:", error);
    throw error;
  }
}

/**
 * Pings the API to wake it up from cold sleep.
 * @returns {Promise<void>}
 */
export async function wakeUpApi() {
  try {
    // We use a simple GET request to a public endpoint or one that doesn't need much processing.
    // getAllBags is a good candidate if it's not too heavy, otherwise just hitting the base URL might work depending on API configuration.
    // Here we'll just fire off a request to getAllBags but catch any error and ignore the result.
    // Ideally, there would be a specific /health endpoint.
    await fetch(`${API_BASE_URL}/bag`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    });
    console.log("Wake-up call sent to API");
  } catch {
    // We ignore errors here because this is just a best-effort wake-up call
    console.log("Wake-up call attempted (API might be waking up)");
  }
}
