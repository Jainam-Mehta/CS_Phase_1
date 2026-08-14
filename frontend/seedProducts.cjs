const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
global.WebSocket = ws;
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { fetch: fetch } // fetch is native in Node 20
});

async function seed() {
  // 1. Categories
  const categories = [
    { name: 'Fruits', description: 'Fresh fruits' },
    { name: 'Vegetables', description: 'Fresh vegetables' },
    { name: 'Exotic Fruits', description: 'Imported and exotic fruits' },
    { name: 'Dairy', description: 'Dairy products' }
  ];

  for (const cat of categories) {
    const { data: existing } = await supabase.from('product_categories').select('id').eq('name', cat.name).maybeSingle();
    if (!existing) {
      await supabase.from('product_categories').insert(cat);
      console.log('Inserted category:', cat.name);
    }
  }

  // Get categories back
  const { data: allCats } = await supabase.from('product_categories').select('*');
  const catMap = {};
  allCats.forEach(c => catMap[c.name] = c.id);

  // 2. Products
  const products = [
    { name: 'Apple', category_id: catMap['Fruits'], shelf_life_days: 180, optimal_temp: 1, min_temp: 0, max_temp: 3, min_humidity: 90, max_humidity: 95 },
    { name: 'Banana', category_id: catMap['Fruits'], shelf_life_days: 14, optimal_temp: 14, min_temp: 13, max_temp: 15, min_humidity: 85, max_humidity: 90 },
    { name: 'Mango', category_id: catMap['Fruits'], shelf_life_days: 14, optimal_temp: 13, min_temp: 10, max_temp: 15, min_humidity: 85, max_humidity: 90 },
    { name: 'Tomato', category_id: catMap['Vegetables'], shelf_life_days: 14, optimal_temp: 10, min_temp: 8, max_temp: 12, min_humidity: 90, max_humidity: 95 },
    { name: 'Potato', category_id: catMap['Vegetables'], shelf_life_days: 180, optimal_temp: 5, min_temp: 4, max_temp: 6, min_humidity: 95, max_humidity: 98 },
    { name: 'Onion', category_id: catMap['Vegetables'], shelf_life_days: 180, optimal_temp: 0, min_temp: -1, max_temp: 2, min_humidity: 65, max_humidity: 70 },
    { name: 'Carrot', category_id: catMap['Vegetables'], shelf_life_days: 150, optimal_temp: 0, min_temp: 0, max_temp: 2, min_humidity: 95, max_humidity: 100 },
    { name: 'Orange', category_id: catMap['Fruits'], shelf_life_days: 90, optimal_temp: 5, min_temp: 3, max_temp: 8, min_humidity: 90, max_humidity: 95 },
    { name: 'Pomegranate', category_id: catMap['Fruits'], shelf_life_days: 90, optimal_temp: 5, min_temp: 4, max_temp: 7, min_humidity: 90, max_humidity: 95 },
    { name: 'Grapes', category_id: catMap['Exotic Fruits'], shelf_life_days: 60, optimal_temp: 0, min_temp: -1, max_temp: 1, min_humidity: 90, max_humidity: 95 },
    { name: 'Milk', category_id: catMap['Dairy'], shelf_life_days: 14, optimal_temp: 2, min_temp: 0, max_temp: 4, min_humidity: 0, max_humidity: 100 },
    { name: 'Butter', category_id: catMap['Dairy'], shelf_life_days: 60, optimal_temp: 4, min_temp: 0, max_temp: 5, min_humidity: 0, max_humidity: 100 },
    { name: 'Paneer', category_id: catMap['Dairy'], shelf_life_days: 20, optimal_temp: 4, min_temp: 2, max_temp: 6, min_humidity: 0, max_humidity: 100 }
  ];

  for (const prod of products) {
    const { data: existing } = await supabase.from('products').select('id').eq('name', prod.name).maybeSingle();
    if (!existing) {
      const { error: insErr } = await supabase.from('products').insert(prod);
      if (insErr) {
        console.error('Failed to insert', prod.name, insErr);
      } else {
        console.log('Inserted product:', prod.name);
      }
    }
  }

  console.log('Seeding completed!');
}
seed().catch(console.error);
