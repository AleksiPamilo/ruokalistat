export interface MenuItem {
  name: string;
  diets: string[];
}

export interface MealCategory {
  title: string;
  diets?: string[];
  items: MenuItem[];
}

export interface DayMenu {
  date: string;
  weekday: string;
  categories: MealCategory[];
}

export interface RestaurantMenu {
  id: string;
  name: string;
  sourceUrl: string;
  isOpen: boolean;
  message?: string;
  days: DayMenu[];
}

export interface MenuApiResponse {
  date: string;
  updatedAt: string;
  restaurants: RestaurantMenu[];
}
