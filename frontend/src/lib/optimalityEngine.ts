export interface IOptimality {
  minTemp: number; // °C
  maxTemp: number; // °C
  minHum: number;  // %
  maxHum: number;  // %
  shelfLife: number; // Days
}

const OPTIMALITY_DICTIONARY: Record<string, IOptimality> = {
  'Avocado': { minTemp: 5, maxTemp: 7, minHum: 85, maxHum: 90, shelfLife: 30 },
  'Apple': { minTemp: -1, maxTemp: 4, minHum: 90, maxHum: 95, shelfLife: 180 },
  'Mango': { minTemp: 10, maxTemp: 13, minHum: 85, maxHum: 90, shelfLife: 21 },
  'Banana': { minTemp: 13, maxTemp: 15, minHum: 90, maxHum: 95, shelfLife: 21 },
  'Orange': { minTemp: 0, maxTemp: 2, minHum: 85, maxHum: 90, shelfLife: 70 },
  'Grapes': { minTemp: -1, maxTemp: 0, minHum: 90, maxHum: 95, shelfLife: 90 },
  'Tomato': { minTemp: 10, maxTemp: 15, minHum: 85, maxHum: 95, shelfLife: 18 },
  'Onion': { minTemp: 0, maxTemp: 2, minHum: 65, maxHum: 70, shelfLife: 210 },
  'Potato': { minTemp: 4, maxTemp: 10, minHum: 90, maxHum: 95, shelfLife: 200 },
  'Carrot': { minTemp: 0, maxTemp: 1, minHum: 95, maxHum: 100, shelfLife: 200 },
  'Capsicum': { minTemp: 7, maxTemp: 10, minHum: 95, maxHum: 98, shelfLife: 18 },
  'Dragon Fruit': { minTemp: 10, maxTemp: 14, minHum: 90, maxHum: 95, shelfLife: 23 },
  'Milk': { minTemp: 1, maxTemp: 4, minHum: 0, maxHum: 100, shelfLife: 10 },
};

// Fallback for general unclassified perishables
const DEFAULT_OPTIMALITY: IOptimality = {
  minTemp: 2,
  maxTemp: 8,
  minHum: 80,
  maxHum: 90,
  shelfLife: 14
};

export function getProductOptimality(productName: string | undefined): IOptimality {
    if (!productName) return DEFAULT_OPTIMALITY;
    
    // Attempt exact match or case-insensitive match
    const match = Object.keys(OPTIMALITY_DICTIONARY).find(
        key => key.toLowerCase() === productName.toLowerCase()
    );

    return match ? OPTIMALITY_DICTIONARY[match] : DEFAULT_OPTIMALITY;
}

export function evaluateCondition(current: number, min: number, max: number): { isOptimal: boolean; status: 'Optimal' | 'Too Low' | 'Too High'; diff: number } {
    if (current < min) return { isOptimal: false, status: 'Too Low', diff: min - current };
    if (current > max) return { isOptimal: false, status: 'Too High', diff: current - max };
    return { isOptimal: true, status: 'Optimal', diff: 0 };
}

export function generateAIRecommendation(productName: string, currentTemp: number, currentHum: number): string {
    const optimal = getProductOptimality(productName);
    
    const tempEval = evaluateCondition(currentTemp, optimal.minTemp, optimal.maxTemp);
    const humEval = evaluateCondition(currentHum, optimal.minHum, optimal.maxHum);

    if (tempEval.isOptimal && humEval.isOptimal) {
        return "Storage conditions are optimal. Maintain current environmental controls to maximize shelf life.";
    }

    let recommendation = "";

    if (tempEval.status === 'Too High') {
        recommendation += `Temperature is ${tempEval.diff.toFixed(1)}°C above recommended range. Reduce cooling by approximately ${tempEval.diff.toFixed(1)}°C to prevent rapid ripening. `;
    } else if (tempEval.status === 'Too Low') {
        recommendation += `Temperature is ${tempEval.diff.toFixed(1)}°C below recommended range. Increase temperature to prevent chilling injury. `;
    }

    if (humEval.status === 'Too High') {
        recommendation += `Humidity is too high. Increase ventilation to reduce fungal/spoilage risks. `;
    } else if (humEval.status === 'Too Low') {
        recommendation += `Humidity is lower than recommended. Increase humidity to reduce moisture loss and shriveling. `;
    }

    if (!tempEval.isOptimal || !humEval.isOptimal) {
        recommendation += `Expected shelf life may decrease by 10-15% if conditions remain unchanged.`;
    }

    return recommendation;
}
