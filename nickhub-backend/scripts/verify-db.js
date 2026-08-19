require('dotenv').config({ path: ['.env.auth', '.env'] });
const prisma = require('../src/config/db');

async function verify() {
  const result = await prisma.$queryRaw`SELECT 1 AS connected`;
  console.log(result[0]?.connected === 1 ? 'Database connection verified' : 'Unexpected database response');
}

verify()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
