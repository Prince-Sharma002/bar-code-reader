const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Order = require('./models/Order');
const Product = require('./models/Product');

dotenv.config();

const mockProducts = [
  { sku: 'TSH-BLU-M', name: 'Blue T-Shirt - Medium', ean: '8901234567890', price: 15.99, stock: 100 },
  { sku: 'SHO-RUN-42', name: 'Running Shoes - Size 42', upc: '012345678905', asin: 'B0CDK1234X', price: 45.00, stock: 50 },
  { sku: 'CAP-RED-L', name: 'Red Cap - Large', fnsku: 'X123456789', price: 12.00, stock: 200 },
  { sku: 'BOT-WTR-1L', name: 'Water Bottle - 1 Liter', ean: '8909876543210', price: 9.99, stock: 150 }
];

const mockOrders = [
  {
    order_number: '123-1234567-1234567',
    customer: { name: 'John Doe', phone: '+1234567890', address: '123 Main St, NY' },
    items: [
      { sku: 'TSH-BLU-M', name: 'Blue T-Shirt - Medium', quantity: 1, price: 15.99 },
      { sku: 'SHO-RUN-42', name: 'Running Shoes - Size 42', quantity: 1, price: 45.00 }
    ],
    status: 'pending',
    platform: 'Amazon',
    tracking_number: 'EE123456789IN',
    awb: 'A123456789',
    total_amount: 60.99
  },
  {
    order_number: 'woo-22-9988',
    customer: { name: 'Alice Smith', phone: '+0987654321', address: '456 Oak St, CA' },
    items: [
      { sku: 'CAP-RED-L', name: 'Red Cap - Large', quantity: 2, price: 12.00 },
      { sku: 'BOT-WTR-1L', name: 'Water Bottle - 1 Liter', quantity: 1, price: 9.99 }
    ],
    status: 'packed',
    platform: 'WooCommerce',
    tracking_number: 'TRK987654321',
    awb: 'B987654321',
    total_amount: 33.99
  }
];

const seedData = async () => {
  try {
    await connectDB();

    console.log('Clearing old mocked data...');
    await Order.deleteMany({ user_id: 'demo_user' });
    await Product.deleteMany({ user_id: 'demo_user' });

    console.log('Inserting mock products...');
    await Product.insertMany(mockProducts.map(p => ({ ...p, user_id: 'demo_user' })));

    console.log('Inserting mock orders...');
    await Order.insertMany(mockOrders.map(o => ({ ...o, user_id: 'demo_user' })));

    console.log('Data seeding complete!');
    process.exit();
  } catch (error) {
    console.error('Error seeding data: ', error);
    process.exit(1);
  }
};

seedData();
