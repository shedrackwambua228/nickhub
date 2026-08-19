require('dotenv').config({ path: ['.env.auth', '.env'] });
const app = require('./app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`NICKHUB API running on port ${PORT}`);
});
