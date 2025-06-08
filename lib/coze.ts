const COZE_API_KEY = 'pat_enLi8cdt3d1MQdPscAdebUqJfseqAS7Um8ttBJ8AW9xmTJRgd8JLX7ygEMqYTG8O';
const COZE_WORKFLOW_ID = '7491659032533729292';

interface TravelPlanRequest {
  from: string;
  to: string;
  date: string;
  days: number;
}

interface PointOfInterest {
  name: string;
  image: string;
  intro: string;
  rating: number;
}

interface TravelPlanResponse {
  planText: string;
  poiList: PointOfInterest[];
}

export async function generateTravelPlan(params: TravelPlanRequest): Promise<TravelPlanResponse> {
  try {
    const response = await fetch(`https://project-ide/${COZE_PROJECT_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COZE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to generate travel plan');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating travel plan:', error);
    throw error;
  }
}