// Function to handle new user creation
export async function handleNewUser(userId: string, email: string, phone: string) {
  try {
    // Create profile with default active status
    const { error } = await fetch('/api/create-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: userId,
        email,
        phone,
        status: 'active', // Set default status to active
      }),
    });

    if (error) {
      console.error('Error creating profile:', error);
    }
  } catch (error) {
    console.error('Error in handleNewUser:', error);
  }
}